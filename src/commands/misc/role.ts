import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { config } from "../../config.js";

export const data = new SlashCommandBuilder()
  .setName("role")
  .setDescription("Self-serve certain roles on the server")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("alerts")
      .setDescription(
        "Toggle whether you receive listener alerts on the server",
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("subscriber")
      .setDescription(
        "Toggle whether you want to get pinged when subscriptions are rolling in the Kingdom of Loathing",
      ),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const subcommand = interaction.options.getSubcommand();

  const member = interaction.member;

  if (!member || !("guild" in member)) {
    return await interaction.editReply(
      "You have to perform this action from within a Guild.",
    );
  }

  switch (subcommand) {
    case "pronouns": {
      const roleId = interaction.options.getString("pronoun", true);
      const role = await member.guild.roles.fetch(roleId);

      if (!role) {
        return await interaction.editReply(
          `Relevant role(s) not found. Is this being used on the right Guild?`,
        );
      }

      const desired = !member.roles.cache.has(roleId);

      if (desired) {
        await member.roles.add(role, "Member added via slash command");
      } else {
        await member.roles.remove(role, "Member removed via slash command");
      }

      return await interaction.editReply(
        `${desired ? "Added" : "Removed"} ${
          role.name
        } pronouns from your account on this server`,
      );
    }
    case "alerts": {
      const listener = await member.guild.roles.fetch(config.LISTENER_ROLE_ID);
      const noAlerts = await member.guild.roles.fetch(config.NO_ALERTS_ROLE_ID);

      if (!listener || !noAlerts) {
        return await interaction.editReply(
          `Relevant role(s) not found. Is this being used on the right Guild?`,
        );
      }

      const desired = !member.roles.cache.has(config.LISTENER_ROLE_ID);

      if (desired) {
        await member.roles.add(
          config.LISTENER_ROLE_ID,
          "Member added via slash command",
        );
        await member.roles.remove(
          config.NO_ALERTS_ROLE_ID,
          'Adding "listener" automatically removes "no alerts"',
        );
      } else {
        await member.roles.remove(
          config.LISTENER_ROLE_ID,
          "Member removed via slash command",
        );
        await member.roles.add(
          config.NO_ALERTS_ROLE_ID,
          'Removing "listener" automatically adds "no alerts"',
        );
      }

      return await interaction.editReply(
        `You will ${desired ? "now" : "no longer"} receive listener alerts`,
      );
    }
    case "subscriber": {
      const subscriber = await member.guild.roles.fetch(
        config.SUBSCRIBER_ROLE_ID,
      );

      if (!subscriber) {
        return await interaction.editReply(
          `Relevant role(s) not found. Is this being used on the right Guild?`,
        );
      }

      const desired = !member.roles.cache.has(config.SUBSCRIBER_ROLE_ID);

      if (desired) {
        await member.roles.add(
          config.SUBSCRIBER_ROLE_ID,
          "Member added via slash command",
        );
      } else {
        await member.roles.remove(
          config.SUBSCRIBER_ROLE_ID,
          "Member removed via slash command",
        );
      }

      return await interaction.editReply(
        `You will ${
          desired ? "now" : "no longer"
        } receive pings when subs roll`,
      );
    }

    default:
      return await interaction.editReply(
        "Invalid subcommand. It shouldn't be possible to see this message. Please report it.",
      );
  }
}
