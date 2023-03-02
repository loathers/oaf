import { Prisma } from "@prisma/client";
import {
  ActionRowBuilder,
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  ContextMenuCommandInteraction,
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

export const customId = "messageTagger";

async function getExistingTag(message: Message<true>) {
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

export async function execute(interaction: ContextMenuCommandInteraction) {
  if (!interaction.isMessageContextMenuCommand())
    throw "Somehow you're trying to tag something that isn't a message";

  const message = interaction.targetMessage;

  if (!message.inGuild()) {
    throw "This can only be done in a guild";
  }

  const existing = await getExistingTag(message);

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

  const submit = await interaction.awaitModalSubmit({
    filter: (i) => i.customId === customId,
    time: 15_000,
  });

  await handleModal(message, submit);
}

async function handleModal(message: Message<true>, interaction: ModalSubmitInteraction) {
  const tag = interaction.fields.getTextInputValue("messageTaggerTag");
  const reason = interaction.fields.getTextInputValue("messageTaggerReason");

  // We shouldn't do async things without first marking the reply as deferred. However, because we are using this
  // to validate the modal input, we want to reply ephemerally on failure and publicly on success. Thus we need
  // to hope that this create command completes within the limit for undeferred replies.

  const existing = await getExistingTag(message);

  try {
    await prisma.$transaction(async (tx) => {
      if (existing) await tx.tag.delete({ where: { tag: existing.tag } });

      await prisma.tag.create({
        data: {
          tag,
          reason,
          messageId: message.id,
          channelId: message.channelId,
          guildId: message.guildId,
          createdBy: interaction.user.id,
        },
      });
    });

    // Update cache
    await init();

    const verb = existing ? `retagged from ${bold(existing.tag)} to` : `tagged`;

    await interaction.reply(
      `A ${hyperlink("message", message.url)} has been ${verb} ${bold(
        tag
      )}. From now on, running ${inlineCode(`/tag ${tag}`)} will drop a link to this message!`
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const reasonQuote = reason
        ? ` To save you having to retype, your reason was\n${blockQuote(reason)}`
        : "";
      await interaction.reply({
        content: `Tag ${bold(tag)} is already in use, so you'll have to try again.${reasonQuote}`,
        ephemeral: true,
      });
      return;
    }

    throw error;
  }
}
