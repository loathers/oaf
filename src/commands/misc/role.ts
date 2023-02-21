import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

const THEY_THEM = "741479573337800706";
const HE_HIM = "741479366319538226";
const SHE_HER = "741479514902757416";
const LISTENER = "466622497991688202";
const NO_ALERTS = "512522219574919179";

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
            { name: "they/them", value: THEY_THEM },
            { name: "he/him", value: HE_HIM },
            { name: "she/her", value: SHE_HER }
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
      const role = member.guild.roles.cache.get(roleId);

      if (!role) {
        return await interaction.editReply(
          `Relevant role(s) not found. Is this being used on the right Guild?`
        );
      }

      const desired = !member.roles.cache.some((r) => r.id === roleId);

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
      const listener = member.guild.roles.cache.get(LISTENER);
      const noAlerts = member.guild.roles.cache.get(NO_ALERTS);

      if (!listener || !noAlerts) {
        return await interaction.editReply(
          `Relevant role(s) not found. Is this being used on the right Guild?`
        );
      }

      const desired = !member.roles.cache.some((r) => r.id === LISTENER);

      if (desired) {
        await member.roles.add(LISTENER, "Member added via slash command");
        await member.roles.remove(NO_ALERTS, 'Adding "listener" automatically removes "no alerts"');
      } else {
        await member.roles.remove(LISTENER, "Member removed via slash command");
        await member.roles.add(NO_ALERTS, 'Removing "listener" automatically adds "no alerts"');
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
