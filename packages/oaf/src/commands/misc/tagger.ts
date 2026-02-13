import { ApplicationCommandType } from "discord-api-types/v10";
import {
  ActionRowBuilder,
  ContextMenuCommandBuilder,
  ContextMenuCommandInteraction,
  DiscordjsError,
  DiscordjsErrorCodes,
  Message,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
  blockQuote,
  bold,
  hyperlink,
  inlineCode,
} from "discord.js";

import {
  deleteTag,
  findTagByMessage,
  findTagByName,
  replaceTag,
} from "../../clients/database.js";
import { config } from "../../config.js";
import { init } from "./tag.js";

export const data = new ContextMenuCommandBuilder()
  .setName("Tag message")
  .setType(ApplicationCommandType.Message);

async function getExistingTagForMessage(message: Message<true>) {
  return (
    (await findTagByMessage(message.guildId, message.channelId, message.id)) ??
    null
  );
}

export async function execute(interaction: ContextMenuCommandInteraction) {
  if (!interaction.isMessageContextMenuCommand())
    throw new Error(
      "Somehow you're trying to tag something that isn't a message",
    );

  if (!interaction.inCachedGuild()) {
    throw new Error("This can only be done in guild");
  }

  const roleToCompare = await interaction.guild.roles.fetch(
    config.EXTENDED_TEAM_ROLE_ID,
  );

  if (!roleToCompare) {
    throw new Error("Comparison role does not exist for tagging permissions");
  }

  const highestRole = interaction.member.roles.highest;
  const canPost = interaction.guild.roles.comparePositions(
    highestRole,
    roleToCompare,
  );

  if (canPost < 0) {
    await interaction.reply({
      ephemeral: true,
      content:
        'This is only available for members with the role "Extended Team" or higher',
    });
    return;
  }

  const customId = `messageTagger-${interaction.targetId}`;

  const existing = await getExistingTagForMessage(interaction.targetMessage);

  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle("Tag message");

  const tagName = new ActionRowBuilder<TextInputBuilder>().addComponents(
    new TextInputBuilder()
      .setCustomId("messageTaggerTag")
      .setLabel("Pick a short tag for this message")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(existing?.tag ?? ""),
  );

  const reason = new ActionRowBuilder<TextInputBuilder>().addComponents(
    new TextInputBuilder()
      .setCustomId("messageTaggerReason")
      .setLabel("Context")
      .setPlaceholder("In case it isn't obvious many years from now")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setValue(existing?.reason ?? ""),
  );

  modal.addComponents(tagName, reason);

  await interaction.showModal(modal);

  try {
    const submit = await interaction.awaitModalSubmit({
      filter: (i) => i.customId === customId,
      time: 120_000, // 2 minutes should be fine?
    });

    await handleModal(interaction.targetMessage, submit);
  } catch (error) {
    if (
      error instanceof DiscordjsError &&
      error.code === DiscordjsErrorCodes.InteractionCollectorError
    ) {
      // User never botherd filling in modal which is not a problem
      return;
    }

    throw error;
  }
}

async function handleModal(
  targetMessage: Message<true>,
  interaction: ModalSubmitInteraction,
) {
  await interaction.deferReply({ ephemeral: true });
  const tag = interaction.fields
    .getTextInputValue("messageTaggerTag")
    .toLowerCase();
  const reason = interaction.fields.getTextInputValue("messageTaggerReason");

  const tagNameInUse = await findTagByName(tag);

  const existing = await getExistingTagForMessage(targetMessage);

  // A special tag name can be used to delete existing tags
  if (tag === "!delete") {
    if (!existing) {
      await interaction.editReply("This message hasn't got an existing tag");
      return;
    }

    await deleteTag(existing.tag);
    await interaction.editReply(
      `Tag removed from the message that was previously tagged with ${bold(
        existing.tag,
      )}`,
    );
    return;
  }

  // Tag names are unique, error out if in use
  if (tagNameInUse) {
    const reasonQuote = reason
      ? ` To save you having to retype, your reason was\n${blockQuote(reason)}`
      : "";
    await interaction.editReply(
      `Tag ${bold(
        tag,
      )} is already in use, so you'll have to try again.${reasonQuote}`,
    );
    return;
  }

  await replaceTag(existing?.tag ?? null, {
    tag,
    reason,
    messageId: targetMessage.id,
    channelId: targetMessage.channelId,
    guildId: targetMessage.guildId,
    createdBy: interaction.user.id,
  });

  // Update cache
  await init();

  const verb = existing ? `retagged from ${bold(existing.tag)} to` : `tagged`;

  await interaction.editReply(
    `A ${hyperlink("message", targetMessage.url)} has been ${verb} ${bold(
      tag,
    )}. From now on, running ${inlineCode(
      `/tag ${tag}`,
    )} will drop a link to this message!`,
  );

  return;
}
