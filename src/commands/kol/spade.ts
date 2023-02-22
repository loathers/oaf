import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { kolClient } from "../../clients/kol";
import { wikiClient } from "../../clients/wiki";

// This is the maximum number of items we can have in our embeds
const HORIZON = 25;

enum SpadingFamiliars {
  DEFAULT = 198,
  GHOST = 282,
}

enum ItemType {
  Food = "Food",
  Booze = "Booze",
  Spleen = "Spleen Item",
  Offhand = "Offhand",
  SpecificFamiliarEquip = "Familiar Equipment (Specific)",
  GenericFamiliarEquipment = "Familiar Equipment (Generic)",
  Unknown = "",
}

const ITEM_SPADING_CALLS = [
  {
    url: (id: number) => [
      "inv_equip.php",
      {
        action: "equip",
        which: 2,
        whichitem: id,
      },
    ],
    visitMatch: /You can't equip an off-hand item while wielding a 2-handed weapon/,
    type: ItemType.Offhand,
  },
  {
    url: (id: number) => [
      "inv_equip.php",
      {
        action: "equip",
        which: 2,
        whichitem: id,
      },
    ],
    visitMatch: /Ghosts can't wear equipment/,
    type: ItemType.GenericFamiliarEquipment,
  },
  {
    url: (id: number) => [
      "inv_eat.php",
      {
        which: 1,
        whichitem: id,
      },
    ],
    visitMatch: /You don't have the item you're trying to use/,
    type: ItemType.Food,
  },
  {
    url: (id: number) => [
      "inv_booze.php",
      {
        which: 1,
        whichitem: id,
      },
    ],
    visitMatch: /You don't have the item you're trying to use/,
    type: ItemType.Booze,
  },
  {
    url: (id: number) => [
      "inv_spleen.php",
      {
        which: 1,
        whichitem: id,
      },
    ],
    visitMatch: /You don't have the item you're trying to use/,
    type: ItemType.Spleen,
  },
] as const;

export const data = new SlashCommandBuilder()
  .setName("spade")
  .setDescription("Spade the existence and tradeability of as yet unreleased stuff.")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("items")
      .setDescription("Spade unreleased items")
      .addIntegerOption((option) =>
        option
          .setName("start")
          .setDescription("Latest item id from which to start spading.")
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("familiars")
      .setDescription("Spade unreleased familiars")
      .addIntegerOption((option) =>
        option
          .setName("start")
          .setDescription("Latest familiar id from which to start spading.")
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("skills")
      .setDescription("Spade unreleased skills")
      .addIntegerOption((option) =>
        option.setName("classid").setDescription("class ID to spade skills for").setRequired(false)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case "items":
      return await spadeItems(interaction);
    case "familiars":
      return await spadeFamiliars(interaction);
    case "skills":
      return await spadeSkills(interaction);
    default:
      return await interaction.reply({
        content:
          "Invalid subcommand. It shouldn't be possible to see this message. Please report it.",
        ephemeral: true,
      });
  }
}

// Items

async function spadeItems(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const requestedStart = interaction.options.getInteger("start", false);
  const finalId = wikiClient.lastItem;
  if (finalId < 0 && !requestedStart) {
    interaction.editReply("Our wiki search isn't configured properly!");
    return;
  }

  await kolClient.ensureFamiliar(SpadingFamiliars.GHOST);
  const start = requestedStart ?? finalId + 1;
  const data = [];
  for (let id = start; id <= start + HORIZON; id++) {
    const spadeData = await spadeItem(id);
    data.push(spadeData);
    if (!spadeData.exists) break;
  }
  await kolClient.ensureFamiliar(SpadingFamiliars.DEFAULT);

  // This is separated from the rest of our spading requests to stop us from constantly juggling familiars
  for (const spadeData of data) {
    if (spadeData.itemtype !== ItemType.GenericFamiliarEquipment) continue;

    const familiar = await kolClient.getEquipmentFamiliar(spadeData.id);
    if (familiar !== null) {
      spadeData.itemtype = ItemType.SpecificFamiliarEquip;
      spadeData.additionalInfo = familiar.trim() || "Familiar not yet public";
    }
  }

  interaction.editReply({
    content: null,
    embeds: [
      {
        title: "Spaded items",
        description: `Searched items with ids starting with ${start}:`,
        fields: data.map(({ id, exists, tradeable, itemtype, additionalInfo }) => ({
          name: `Item ${id}`,
          value: exists
            ? `${tradeable ? "Tradeable" : "Untradeable"}\n${itemtype}${
                additionalInfo ? `\n${additionalInfo}` : ""
              }`
            : "Does not exist",
          inline: true,
        })),
        footer: {
          text: `OAF can detect the following item types: ${Object.values(ItemType)
            .filter((type) => type)
            .join(", ")}. If no type is shown, the item is none of these.`,
        },
      },
    ],
  });
}

async function spadeItem(itemId: number) {
  const exists = !/Nopers/.test(
    await kolClient.tryRequestWithLogin("inv_equip.php", {
      action: "equip",
      which: 2,
      whichitem: itemId,
    })
  );

  let itemtype = ItemType.Unknown as ItemType;
  let additionalInfo = "";

  if (!exists) {
    return { id: itemId, exists, tradeable: false, itemtype, additionalInfo };
  }

  const tradeable = !/That item cannot be sold or transferred/.test(
    await kolClient.tryRequestWithLogin("town_sellflea.php", {
      whichitem: itemId,
      sellprice: "",
      selling: "Yep.",
    })
  );

  for (let property of ITEM_SPADING_CALLS) {
    const { url, visitMatch, type } = property;
    const page = (await kolClient.tryRequestWithLogin(
      ...(url(itemId) as [string, object])
    )) as string;

    const match = visitMatch.test(page);
    if (match) {
      itemtype = type;
      break;
    }
  }

  return { id: itemId, exists, tradeable, itemtype, additionalInfo };
}

// Familiars

async function spadeFamiliars(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const requestedStart = interaction.options.getInteger("start", false);
  const finalId = wikiClient.lastFamiliar;
  if (finalId < 0 && !requestedStart) {
    interaction.editReply("Our wiki search isn't configured properly!");
    return;
  }

  const start = Math.max(requestedStart || 0, finalId + 1);
  const data = [`Spading familiars with ids starting with ${start}.`];
  for (let id = start; id <= start + HORIZON; id++) {
    const name = await spadeFamiliar(id);
    if (name === "none") {
      data.push(`No familiar ${id} found. Sorry!`);
      break;
    } else {
      data.push(`Familiar ${id} exists, and is called ${name}.`);
    }
  }

  interaction.editReply(data.join("\n"));
}

async function spadeFamiliar(famId: number) {
  const page = await kolClient.tryRequestWithLogin("desc_familiar.php", { which: famId });

  if (page.includes("No familiar was found.")) return "none";

  const name = /<font face=Arial,Helvetica><center><b>([^<]+)<\/b>/.exec(page)?.[1];
  return name ?? "none";
}

// Skills

async function spadeSkills(interaction: ChatInputCommandInteraction) {
  const classId = interaction.options.getInteger("classid", false);

  const finalIds = Object.values(wikiClient.lastSkills);

  if (finalIds.length === 0) {
    interaction.editReply("Our wiki search isn't configured properly!");
    return;
  }

  await interaction.deferReply();

  if (classId) {
    finalIds.push(classId * 1000);
  }

  const data = [];
  for (const finalId of finalIds) {
    for (let id = finalId + 1; id <= finalId + HORIZON; id++) {
      const exists = await spadeSkill(id);
      if (exists) data.push(`Skill ${id} exists`);
    }
  }

  if (data.length === 0) {
    data.push("No new skills found");
  }

  await interaction.editReply(data.join("\n"));
}

async function spadeSkill(skillId: number) {
  const page = await kolClient.tryRequestWithLogin("runskillz.php", {
    action: "Skillz",
    whichskill: skillId,
    targetplayer: 1,
    quantity: 1,
  });

  // If the skill doesn't exist on the dev server, the response ends with an exclamation mark
  return page.includes("You don't have that skill.");
}
