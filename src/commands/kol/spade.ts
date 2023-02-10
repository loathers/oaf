import { ApplicationCommandOptionType } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";
import { DiscordClient } from "../../discord";
import { KoLClient } from "../../kol";
import { WikiSearcher } from "../../wikisearch";
import { Command } from "../type";

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

async function spadeItem(client: KoLClient, itemId: number) {
  let itemtype = ItemType.Unknown as ItemType;
  let additionalInfo = "";
  const exists = !/Nopers/.test(
    await client.tryRequestWithLogin("inv_equip.php", {
      action: "equip",
      which: 2,
      whichitem: itemId,
    })
  );
  const tradeable = !/That item cannot be sold or transferred/.test(
    await client.tryRequestWithLogin("town_sellflea.php", {
      whichitem: itemId,
      sellprice: "",
      selling: "Yep.",
    })
  );
  if (exists) {
    for (let property of ITEM_SPADING_CALLS) {
      const { url, visitMatch, type } = property;
      const page = (await client.tryRequestWithLogin(
        ...(url(itemId) as [string, object])
      )) as string;

      const match = visitMatch.test(page);
      if (match) {
        itemtype = type;
        break;
      }
    }
  }
  return { id: itemId, exists, tradeable, itemtype, additionalInfo };
}

async function spadeFamiliar(client: KoLClient, famId: number) {
  const page = await client.tryRequestWithLogin("desc_familiar.php", { which: famId });

  if (page.includes("No familiar was found.")) return "none";

  const name = /<font face=Arial,Helvetica><center><b>([^<]+)<\/b>/.exec(page)?.[1];
  return name ?? "none";
}

async function spadeSkill(client: KoLClient, skillId: number) {
  const page = await client.tryRequestWithLogin("runskillz.php", {
    action: "Skillz",
    whichskill: skillId,
    targetplayer: 1,
    quantity: 1,
  });

  // If the skill doesn't exist on the dev server, the response ends with an exclamation mark
  return page.includes("You don't have that skill.");
}

async function spade(
  interaction: CommandInteraction,
  kolClient: KoLClient,
  wiki: WikiSearcher
): Promise<void> {
  switch (interaction.options.getString("spadeable", true)) {
    case "item":
      await spadeItems(interaction, kolClient, wiki);
      return;
    case "familiar":
      await spadeFamiliars(interaction, kolClient, wiki);
      return;
    case "skill":
      await spadeSkills(interaction, kolClient, wiki);
      return;
    default:
      await interaction.reply({
        content: "It shouldn't be possible to see this message. Please report it.",
        ephemeral: true,
      });
  }
}

async function spadeItems(
  interaction: CommandInteraction,
  kolClient: KoLClient,
  wiki: WikiSearcher
): Promise<void> {
  await interaction.deferReply();
  const requestedStart = interaction.options.getInteger("start", false);
  const finalId = wiki.lastItem;
  if (finalId < 0 && !requestedStart) {
    interaction.editReply("Our wiki search isn't configured properly!");
    return;
  }

  await kolClient.ensureFamiliar(SpadingFamiliars.GHOST);
  const start = requestedStart ?? finalId + 1;
  const data = [];
  for (let id = start; id <= start + HORIZON; id++) {
    const spadeData = await spadeItem(kolClient, id);
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

async function spadeFamiliars(
  interaction: CommandInteraction,
  kolClient: KoLClient,
  wiki: WikiSearcher
): Promise<void> {
  await interaction.deferReply();
  const requestedStart = interaction.options.getInteger("start", false);
  const finalId = wiki.lastFamiliar;
  if (finalId < 0 && !requestedStart) {
    interaction.editReply("Our wiki search isn't configured properly!");
    return;
  }

  const start = Math.max(requestedStart || 0, finalId + 1);
  const data = [`Spading familiars with ids starting with ${start}.`];
  for (let id = start; id <= start + HORIZON; id++) {
    const name = await spadeFamiliar(kolClient, id);
    if (name === "none") {
      data.push(`No familiar ${id} found. Sorry!`);
      break;
    } else {
      data.push(`Familiar ${id} exists, and is called ${name}.`);
    }
  }

  interaction.editReply(data.join("\n"));
}

async function spadeSkills(
  interaction: CommandInteraction,
  kolClient: KoLClient,
  wiki: WikiSearcher
): Promise<void> {
  await interaction.deferReply();
  const finalSkills = wiki.lastSkills;
  if (Object.keys(finalSkills).length === 0) {
    interaction.editReply("Our wiki search isn't configured properly!");
    return;
  }
  const data = [];
  for (const finalId of Object.values(finalSkills)) {
    for (let id = finalId + 1; id <= finalId + HORIZON; id++) {
      const exists = await spadeSkill(kolClient, id);
      if (exists) {
        data.push(`Skill ${id} exists`);
      } else {
        break;
      }
    }
  }

  if (data.length === 0) {
    data.push("No new skills found");
  }

  interaction.editReply(data.join("\n"));
}

const command: Command = {
  attach: ({ discordClient, kolClient, wikiSearcher }) =>
    discordClient.attachCommand(
      "spade",
      [
        {
          name: "spadeable",
          description: "What to spade.",
          type: ApplicationCommandOptionType.String,
          choices: [
            { name: "Familiars", value: "familiar" },
            { name: "Items", value: "item" },
            { name: "Skills", value: "skill" },
          ],
          required: true,
        },
        {
          name: "start",
          description: "Familiar or Item ID to start spading with",
          type: ApplicationCommandOptionType.Integer,
          required: false,
        },
      ],
      (interaction: CommandInteraction) => spade(interaction, kolClient, wikiSearcher),
      "Spade the existence and tradeability of as yet unreleased stuff."
    ),
};

export default command;
