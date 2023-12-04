import { discordClient } from "./clients/discord.js";
import { config } from "./config.js";

export default async function astrayDarnedContestRole(
  username: string,
): Promise<void> {
  const guild = await discordClient.guilds.fetch(config.GUILD_ID);
  const member = guild.members.cache.find(
    ({ user }) => user.globalName?.toLowerCase() === username.toLowerCase(),
  );
  if (!member)
    return void discordClient.alert(
      `Failed to find user ${username} for ASTRAY DARNED OAF`,
    );
  return void (await member.roles.add(config.ASTRAY_DARNED_ROLE_ID));
}
