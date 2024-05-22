import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  hyperlink,
} from "discord.js";

import { createEmbed } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import { wikiClient } from "../../clients/wiki.js";

export const data = new SlashCommandBuilder()
  .setName("bookmobile")
  .setDescription("Find information about the current bookmobile status");

async function visitBookMobile(): Promise<string> {
  const page = await kolClient.actionMutex.runExclusive(async () => {
    await kolClient.fetchText("town.php");
    const p = await kolClient.fetchText("place.php", {
      params: { whichplace: "town_market", action: "town_bookmobile" },
    });
    if (p.includes("name=whichchoice")) {
      await kolClient.fetchText("choice.php", {
        body: {
          whichchoice: 1200,
          option: 2,
        },
      });
    }
    return p;
  });

  return page;
}

export function parseBookMobile(page: string) {
  const pattern =
    /this week, I've got (.*?) copies of(?: the)? <b>(.*?)<\/b>.*?<b>([0-9,]+) Meat<\/b>/s;
  const match = page.match(pattern);

  if (!match) return null;
  const [, copies, title, price] = match;

  return { copies, title, price: Number(price.replaceAll(",", "")) };
}

const numberFormat = new Intl.NumberFormat();

export async function execute(interaction: ChatInputCommandInteraction) {
  interaction.deferReply();

  const page = await visitBookMobile();

  if (!page.includes("name=whichchoice"))
    return void (await interaction.editReply(
      "The Bookmobile doesn't seem to be in town!",
    ));

  const info = parseBookMobile(page);

  if (!info)
    return void (await interaction.editReply(
      "I wasn't able to understand what The Bookmobile bro said",
    ));

  const embed = createEmbed().setTitle(`The Bookmobile`);

  const item = wikiClient.items.find((i) => i.name === info.title);
  let itemInfo = info.title;

  if (item) {
    item.addImageToEmbed(embed);
    const link = await wikiClient.getWikiLink(item);
    if (link) itemInfo = hyperlink(item.name, link);
  }

  embed.addFields([
    { name: "Book", value: itemInfo },
    { name: "Copies left", value: info.copies },
    { name: "Current price", value: `${numberFormat.format(info.price)} 🥩` },
  ]);

  interaction.editReply({ content: null, embeds: [embed] });
}
