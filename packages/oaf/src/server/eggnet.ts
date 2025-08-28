import { hyperlink } from "discord.js";

import { createEmbed, discordClient } from "../clients/discord.js";
import { mafiaClient } from "../clients/mafia.js";
import { config } from "../config.js";

type Details = {
  monsterId: number;
};

export async function eggnet({ monsterId }: Details) {
  const guild = await discordClient.guilds.fetch(config.GUILD_ID);
  const iotmChannel = guild?.channels.cache.get(config.IOTM_CHANNEL_ID);

  if (!iotmChannel?.isTextBased()) {
    await discordClient.alert(
      "Someone has tried to hit a Samsara webhook but the guild or unrestricted channel are incorrectly configured",
    );
    throw new Error("Something is configured wrong");
  }

  const monster = mafiaClient.monsters.find((i) => i.id === monsterId);

  if (!monster) {
    await discordClient.alert(
      `Eggnet reported monster with id ${monsterId} was completed, but they're not in our database`,
    );
    throw new Error("Something is configured wrong");
  }

  const embed = createEmbed();
  embed.setTitle(monster.name).setURL(await mafiaClient.getWikiLink(monster));
  await monster.addToEmbed(embed);

  await iotmChannel.send({
    content: `Huh? ${monster.name} came out of its egg 🥚! New monster available in the ${hyperlink("Mimic DNA Bank", "https://eggnet.loathers.net")}`,
    embeds: [embed],
  });
}
