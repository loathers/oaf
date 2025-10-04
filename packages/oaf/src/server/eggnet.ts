import { hyperlink } from "discord.js";

import { dataOfLoathingClient } from "../clients/dataOfLoathing.js";
import { createEmbed, discordClient } from "../clients/discord.js";
import { config } from "../config.js";

type Details = {
  monsterId: number;
};

async function getNextMonster() {
  const response = await fetch("https://eggnet.loathers.net/status");
  const json = (await response.json()) as { eggs: Record<number, number> };
  const closest = Object.entries(json.eggs)
    .filter(([, count]) => count < 100)
    .reduce((e, acc) => (e[1] > acc[1] ? e : acc));
  return [Number(closest[0]), closest[1]] as const;
}

export async function eggnet({ monsterId }: Details) {
  const guild = await discordClient.guilds.fetch(config.GUILD_ID);
  const iotmChannel = guild?.channels.cache.get(config.IOTM_CHANNEL_ID);

  if (!iotmChannel?.isTextBased()) {
    await discordClient.alert(
      "Someone has tried to hit an Eggnet webhook but the guild or iotm channel are incorrectly configured",
    );
    throw new Error("Something is configured wrong");
  }

  const monster = dataOfLoathingClient.monsters.find((i) => i.id === monsterId);

  if (!monster) {
    await discordClient.alert(
      `Eggnet reported monster with id ${monsterId} was completed, but they're not in our database`,
    );
    throw new Error("Something is configured wrong");
  }

  let content = `Huh? ${monster.name} came out of its egg 🥚! New monster available in the ${hyperlink("Mimic DNA Bank", "https://eggnet.loathers.net")}.`;

  const [nextMonsterId, nextEggs] = await getNextMonster();
  const nextMonster = dataOfLoathingClient.monsters.find(
    (i) => i.id === nextMonsterId,
  );

  if (nextMonster) {
    const r = 100 - nextEggs;
    content += ` Time to go work on ${nextMonster.name}, who only needs ${r} more egg${r === 1 ? "" : "s"}!`;
  }

  const embed = createEmbed();
  embed
    .setTitle(monster.name)
    .setURL(await dataOfLoathingClient.getWikiLink(monster));
  await monster.addToEmbed(embed);

  await iotmChannel.send({
    content,
    embeds: [embed],
  });
}
