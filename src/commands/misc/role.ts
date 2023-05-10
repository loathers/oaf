import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

const THEY_THEM_ROLE_ID = process.env.THEY_THEM_ROLE_ID!;
const HE_HIM_ROLE_ID = process.env.HE_HIM_ROLE_ID!;
const SHE_HER_ROLE_ID = process.env.SHE_HER_ROLE_ID!;
const LISTENER_ROLE_ID = process.env.LISTENER_ROLE_ID!;
const NO_ALERTS_ROLE_ID = process.env.NO_ALERTS_ROLE_ID!;

export const data = new SlashCommandBuilder()
  .setName("role")
  .setDescription("Self-serve certain roles on the server")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("pronouns")
      .setDescription("Please indicate your preferred pronouns")
      .addStringOption((option) =>
        option
          .setName("pronoun")
          .setDescription("Toggle a preferred pronoun. You can come back to set multiple")
          .addChoices(
            { name: "they/them", value: THEY_THEM_ROLE_ID },
            { name: "he/him", value: HE_HIM_ROLE_ID },
            { name: "she/her", value: SHE_HER_ROLE_ID }
          )
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("alerts")
      .setDescription("Toggle whether you receive listener alerts on the server")
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const subcommand = interaction.options.getSubcommand();

  const member = interaction.member;

  if (!member || !("guild" in member)) {
    return await interaction.editReply("You have to perform this action from within a Guild.");
  }

  switch (subcommand) {
    case "pronouns": {
      const roleId = interaction.options.getString("pronoun", true);
      const role = await member.guild.roles.fetch(roleId);

      if (!role) {
        return await interaction.editReply(
          `Relevant role(s) not found. Is this being used on the right Guild?`
        );
      }

      const desired = !member.roles.cache.has(roleId);

      if (desired) {
        await member.roles.add(role, "Member added via slash command");
      } else {
        await member.roles.remove(role, "Member removed via slash command");
      }

      return await interaction.editReply(
        `${desired ? "Added" : "Removed"} ${role.name} pronouns from your account on this server`
      );
    }
    case "alerts": {
      const listener = await member.guild.roles.fetch(LISTENER_ROLE_ID);
      const noAlerts = await member.guild.roles.fetch(NO_ALERTS_ROLE_ID);

      if (!listener || !noAlerts) {
        return await interaction.editReply(
          `Relevant role(s) not found. Is this being used on the right Guild?`
        );
      }

      const desired = !member.roles.cache.has(LISTENER_ROLE_ID);

      if (desired) {
        await member.roles.add(LISTENER_ROLE_ID, "Member added via slash command");
        await member.roles.remove(
          NO_ALERTS_ROLE_ID,
          'Adding "listener" automatically removes "no alerts"'
        );
      } else {
        await member.roles.remove(LISTENER_ROLE_ID, "Member removed via slash command");
        await member.roles.add(
          NO_ALERTS_ROLE_ID,
          'Removing "listener" automatically adds "no alerts"'
        );
      }

      return await interaction.editReply(
        `You will ${desired ? "now" : "no longer"} receive listener alerts`
      );
    }
    default:
      return await interaction.editReply(
        "Invalid subcommand. It shouldn't be possible to see this message. Please report it."
      );
  }
}
