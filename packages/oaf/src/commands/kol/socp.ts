import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { dataOfLoathingClient } from "../../clients/dataOfLoathing.js";
import { createEmbed } from "../../clients/discord.js";
import { getMallPrice, kolClient } from "../../clients/kol.js";
import { embedForItem } from "../wiki/item.js";

export const data = new SlashCommandBuilder()
  .setName("socp")
  .setDescription("Check the daily special from the Skeleton of Crimbo Past");

async function checkDailySpecial(): Promise<[descid: number, price: number]> {
  const page = await kolClient.fetchText("main.php", {
    searchParams: { talktosocp: "1" },
  });

  const match = page.match(
    /Daily Special:.*?descitem\((\d+)\).*?\((\d+) knucklebones\)/,
  );

  if (!match) return [0, 0];

  return [Number(match[1]), Number(match[2])];
}

const numberFormat = new Intl.NumberFormat();

let checkedFamiliars = false;
let hasFamiliar = false;

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  if (!checkedFamiliars) {
    const fams = await kolClient.getFamiliars();
    hasFamiliar = fams.some((f) => f.id === 326);
    checkedFamiliars = true;
  }

  if (!hasFamiliar) {
    return void (await interaction.editReply(
      "Sorry, I don't have a Skeleton of Crimbo Past familiar to check the daily special",
    ));
  }

  const [descid, price] = await checkDailySpecial();

  const item = dataOfLoathingClient.items.find((i) => i.descid === descid);

  if (!item) {
    return void (await interaction.editReply(
      "I've never heard of the daily special item before!",
    ));
  }

  const fields = [
    { name: "Item", value: item.name },
    { name: "Price", value: `${numberFormat.format(price)} knucklebones` },
  ];

  if (price > 0) {
    const meatPerKnuckle = item.tradeable
      ? numberFormat.format(
          Math.round((await getMallPrice(item.id)).mallPrice / price),
        )
      : "♾️";
    fields.push({
      name: "Value",
      value: `${meatPerKnuckle} meat/🦴`,
    });
  }

  const embed = createEmbed()
    .setTitle(`Skeleton of Crimbo Past`)
    .addFields(fields);

  const itemEmbed = await embedForItem(item.id);

  if (!itemEmbed) {
    return void (await interaction.editReply(
      "I've never heard of the daily special item before!",
    ));
  }

  await interaction.editReply({ content: null, embeds: [embed, itemEmbed] });
}
