import {
  ActionRowBuilder,
  ApplicationCommandType,
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

import { prisma } from "../../clients/database";
import { init } from "./tag";

export const data = new ContextMenuCommandBuilder()
  .setName("Tag message")
  .setType(ApplicationCommandType.Message);

async function getExistingTagForMessage(message: Message<true>) {
  return await prisma.tag.findUnique({
    where: {
      guildId_channelId_messageId: {
        guildId: message.guildId,
        channelId: message.channelId,
        messageId: message.id,
      },
    },
  });
}

const EXTENDED_TEAM_ROLE = "473316929768128512";

export async function execute(interaction: ContextMenuCommandInteraction) {
  if (!interaction.isMessageContextMenuCommand())
    throw "Somehow you're trying to tag something that isn't a message";

  if (!interaction.inCachedGuild()) {
    throw "This can only be done in guild";
  }

  const highestRole = interaction.member.roles.highest;
  const canPost = interaction.guild.roles.comparePositions(highestRole, EXTENDED_TEAM_ROLE);

  if (canPost < 0) {
    await interaction.reply({
      ephemeral: true,
      content: 'This is only available for members with the role "Extended Team" or higher',
    });
    return;
  }

  const customId = `messageTagger-${interaction.targetId}`;

  const existing = await getExistingTagForMessage(interaction.targetMessage);

  const modal = new ModalBuilder().setCustomId(customId).setTitle("Tag message");

  const tagName = new ActionRowBuilder<TextInputBuilder>().addComponents(
    new TextInputBuilder()
      .setCustomId("messageTaggerTag")
      .setLabel("Pick a short tag for this message")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setValue(existing?.tag ?? "")
  );

  const reason = new ActionRowBuilder<TextInputBuilder>().addComponents(
    new TextInputBuilder()
      .setCustomId("messageTaggerReason")
      .setLabel("Context")
      .setPlaceholder("In case it isn't obvious many years from now")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setValue(existing?.reason ?? "")
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

async function handleModal(targetMessage: Message<true>, interaction: ModalSubmitInteraction) {
  const tag = interaction.fields.getTextInputValue("messageTaggerTag").toLowerCase();
  const reason = interaction.fields.getTextInputValue("messageTaggerReason");

  const tagNameInUse = await prisma.tag.findUnique({ where: { tag } });

  // We shouldn't do async things without first marking the reply as deferred. However, we want to reply ephemerally
  // on failure and publicly on success. So here we are deferring reply to a little later than normal.

  const existing = await getExistingTagForMessage(targetMessage);

  // A special tag name can be used to delete existing tags
  if (tag === "!delete") {
    if (!existing) {
      await interaction.reply({
        ephemeral: true,
        content: "This message hasn't got an existing tag",
      });
      return;
    }

    await interaction.deferReply();

    await prisma.tag.delete({ where: { tag: existing.tag } });
    await interaction.editReply(
      `Tag removed from the message that was previously tagged with ${bold(existing.tag)}`
    );
    return;
  }

  // Tag names are unique, error out if in use
  if (tagNameInUse) {
    const reasonQuote = reason
      ? ` To save you having to retype, your reason was\n${blockQuote(reason)}`
      : "";
    await interaction.reply({
      content: `Tag ${bold(tag)} is already in use, so you'll have to try again.${reasonQuote}`,
      ephemeral: true,
    });
    return;
  }

  // We are now out of error cases so can defer reply early
  await interaction.deferReply();

  await prisma.$transaction(async (tx) => {
    if (existing) await tx.tag.delete({ where: { tag: existing.tag } });

    await prisma.tag.create({
      data: {
        tag,
        reason,
        messageId: targetMessage.id,
        channelId: targetMessage.channelId,
        guildId: targetMessage.guildId,
        createdBy: interaction.user.id,
      },
    });
  });

  // Update cache
  await init();

  const verb = existing ? `retagged from ${bold(existing.tag)} to` : `tagged`;

  await interaction.editReply(
    `A ${hyperlink("message", targetMessage.url)} has been ${verb} ${bold(
      tag
    )}. From now on, running ${inlineCode(`/tag ${tag}`)} will drop a link to this message!`
  );

  return;
}
