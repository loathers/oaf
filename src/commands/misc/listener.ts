import { Client, Events, GuildMember } from "discord.js";

import { discordClient } from "../../clients/discord.js";
import { config } from "../../config.js";

async function onJoinServer(member: GuildMember) {
  if (!member || !("guild" in member)) return;

  const role = await member.guild.roles.fetch(config.LISTENER_ROLE_ID);
  if (!role) {
    await discordClient.alert(
      `Failed to grant member ${member.displayName} the Listener role because role doesn't exist`,
    );
    return;
  }
  await member.roles.add(role, "Member added upon joining server");
}

async function synchroniseRoles(client: Client) {
  const guild = await client.guilds.fetch(config.GUILD_ID);

  const role = await guild.roles.fetch(config.LISTENER_ROLE_ID);

  if (!role) {
    await discordClient.alert("Listener role doesn't exist");
    return;
  }

  const results = await Promise.all(
    guild.members.cache
      .filter((member) => member.roles.cache.size < 1)
      .map((member) => member.roles.add(role)),
  );

  if (results.length === 0) return;

  await discordClient.alert(
    `Added listener role to ${results.length} listener(s) who had no roles.`,
  );
}

export async function init() {
  discordClient.on(Events.GuildMemberAdd, onJoinServer);

  discordClient.on(Events.ClientReady, synchroniseRoles);
}
