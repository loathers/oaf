import {
  ChatInputCommandInteraction,
  GuildMember,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  Role,
  SlashCommandBuilder,
  User,
} from "discord.js";

import { discordClient } from "../../clients/discord";

const ROLES_CHANNEL = "741479910886866944";

const THEY_THEM = "741479573337800706";
const HE_HIM = "741479366319538226";
const SHE_HER = "741479514902757416";
const LISTENER = "466622497991688202";
const NO_ALERTS = "512522219574919179";
const LFG = "754473984661258391";

const EMOJI_TO_ROLE = new Map([
  ["🇹", THEY_THEM],
  ["♀️", SHE_HER],
  ["♂️", HE_HIM],
  ["👂", LISTENER],
  ["🚫", NO_ALERTS],
  ["✅", LFG],
]);

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
      .setDescription("Let us know how you want to be notified on the server")
      .addStringOption((option) =>
        option
          .setName("choice")
          .setDescription("Select your perferred alerts. These are mutually exclusive")
          .addChoices(
            { name: "Listener (occasional alerts)", value: LISTENER },
            { name: "No alerts (no alerrts)", value: NO_ALERTS }
          )
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("gaming")
      .setDescription(
        "Let us know if you want to receive alerts when folks are looking for gaming parties"
      )
      .addBooleanOption((option) =>
        option
          .setName("choice")
          .setDescription("Well are you looking for games or not?")
          .setRequired(true)
      )
  );

async function resolveRoleMutices(member: GuildMember, role: Role, via: string) {
  if (role.id === LISTENER || role.id === NO_ALERTS) {
    const other = role.guild.roles.cache.get(role.id === LISTENER ? NO_ALERTS : LISTENER);
    if (!other) return false;
    await member.roles.remove(
      other,
      `Removed automatically as member added ${role.name} via ${via}`
    );
  }

  await member.roles.add(role, `Member added via ${via}`);
  return true;
}

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
      const roleId = interaction.options.getString("choice", true);
      const role = member.guild.roles.cache.get(roleId);

      if (!role || !resolveRoleMutices(member, role, "slash command")) {
        return await interaction.editReply(
          `Relevant role(s) not found. Is this being used on the right Guild?`
        );
      }

      return await interaction.editReply(
        `Added ${role!.name} role (and removed the other role if you had it)`
      );
    }
    case "gaming": {
      const desired = interaction.options.getBoolean("choice", true);
      const role = member.guild.roles.cache.get(LFG);

      if (!role) {
        return await interaction.editReply(
          `Relevant role not found. Is this being used on the right Guild?`
        );
      }

      if (desired) {
        await member.roles.add(role, "Member added via slash command");
      } else {
        await member.roles.remove(role, "Member removed via slash command");
      }

      return await interaction.editReply(
        `${desired ? "Added" : "Removed"} "looking for games" role`
      );
    }
    default:
      return await interaction.editReply(
        "Invalid subcommand. It shouldn't be possible to see this message. Please report it."
      );
  }
}

async function getRoleAndMember(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) {
  if (reaction.message.channelId !== ROLES_CHANNEL) return null;
  if (!reaction.message.guild) return null;

  if (reaction.partial || user.partial) {
    try {
      await reaction.fetch();
      await user.fetch();
      if (user.partial || reaction.partial) {
        throw "Still partial";
      }
    } catch (error) {
      console.error("Something went wrong when fetching the message: ", error);
      return null;
    }
  }

  const roleId = (reaction.emoji.name && EMOJI_TO_ROLE.get(reaction.emoji.name)) || null;
  const role = roleId && reaction.message.guild.roles.cache.get(roleId);
  const member = reaction.message.guild.members.cache.get(user.id);

  if (!member || !role) return null;
  return [role, member] as const;
}

export async function init() {
  discordClient.on("messageReactionAdd", async (reaction, user) => {
    const result = await getRoleAndMember(reaction, user);
    if (!result) return;
    const [role, member] = result;
    await resolveRoleMutices(member, role, "emoji reaction");
  });

  discordClient.on("messageReactionRemove", async (reaction, user) => {
    const result = await getRoleAndMember(reaction, user);
    if (!result) return;
    const [role, member] = result;
    await member.roles.remove(role, "Member removed via emoji reaction");
  });
}
