import { Events, GuildMember } from "discord.js";

import { discordClient } from "../../clients/discord.js";
import { config } from "../../config.js";

async function onJoinServer(member: GuildMember) {
  if (!member || !("guild" in member)) return;

  const role = await member.guild.roles.fetch(config.LISTENER_ROLE_ID);
  if (!role) {
    await discordClient.alert(
      `Failed to grant member ${member.displayName} the Listener role`,
    );
    return;
  }
  await member.roles.add(role, "Member added upon joining server");
}

export async function init() {
  discordClient.on(Events.GuildMemberAdd, onJoinServer);
}
