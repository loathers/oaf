import {
  type Attachment,
  ChannelType,
  DiscordAPIError,
  EmbedBuilder,
  Events,
  type Guild,
  type GuildBasedChannel,
  type GuildTextBasedChannel,
  type Message,
  type MessageCreateOptions,
  type MessageEditOptions,
  type MessageReaction,
  MessageReferenceType,
  type MessageSnapshot,
  type OmitPartialGroupDMChannel,
  type PartialMessage,
  type PartialMessageReaction,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  type Sticker,
} from "discord.js";

import {
  claimStarboardMessage,
  clearStarboardPost,
  deleteStarboardMessage,
  findStarboardMessage,
  findStarboardMessageByPostId,
  setStarboardPost,
  setStarboardScore,
  suppressStarboardMessage,
} from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";
import { config } from "../../config.js";
import { isAtLeastRole } from "../../discordUtils.js";

// ── Deciding and rendering ──
//
// Everything down to describeStarboardPost is free of Discord and database
// access, so it can be tested directly.

// Reactions are matched by emoji name rather than snowflake so the feature
// survives the emoji being deleted and re-uploaded.
const PLUS_ONE = "plusone";
const MINUS_ONE = "minusone";

// Messages older than this can't newly reach the starboard, so nobody can
// necro-react their way in. Unstarring an old message is still allowed.
const MAX_MESSAGE_AGE = 30 * 24 * 60 * 60 * 1000;

const DESCRIPTION_LIMIT = 4000;
const FIELD_LIMIT = 1024;
const REPLY_PREVIEW_LIMIT = 100;

// Discord's attachment URLs are signed and expire, so we re-upload images we
// want to keep. Anything bigger than the default upload limit stays a link.
export const MAX_REUPLOAD_SIZE = 8 * 1024 * 1024;

export function parseExcludedChannelIds(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0),
  );
}

export function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

type Voter = {
  id: string;
  bot: boolean;
};

export function countStars(voters: Voter[], authorId: string) {
  const counted = new Set(
    voters.filter((v) => !v.bot && v.id !== authorId).map((v) => v.id),
  );
  return counted.size;
}

type StarboardAction = "post" | "edit" | "delete" | "nothing";

export type ExistingStarboardMessage = {
  starboardMessageId: string | null;
  score: number;
  suppressed: boolean;
};

export function decideAction({
  score,
  threshold,
  vetoed,
  existing,
}: {
  score: number;
  threshold: number;
  vetoed: boolean;
  existing: ExistingStarboardMessage | null | undefined;
}): StarboardAction {
  // A human removed our post, or the previous starboard bot already handled
  // this message. Either way it is never ours to post again.
  if (existing?.suppressed) return "nothing";

  const posted = existing?.starboardMessageId ?? null;

  if (vetoed || score < threshold) {
    return posted ? "delete" : "nothing";
  }

  if (!posted) return "post";

  // Reaction traffic that doesn't move the score shouldn't cost an edit
  return score === existing?.score ? "nothing" : "edit";
}

export type StarboardAttachment = {
  name: string;
  url: string;
  size: number;
  contentType: string | null;
};

export type StarboardSource = {
  url: string;
  authorName: string;
  authorAvatarUrl: string;
  content: string;
  createdAt: Date;
  attachments: StarboardAttachment[];
  embedImageUrl: string | null;
  stickerName: string | null;
  stickerUrl: string | null;
  replyPreview: { authorName: string; content: string; url: string } | null;
  forwarded: boolean;
};

type StarboardRender = {
  score: number;
  content: string;
  author: { name: string; iconURL: string };
  description: string;
  timestamp: Date;
  imageUrl: string | null;
  // Set when imageUrl refers to a file we should re-upload rather than link.
  reuploadAttachment: StarboardAttachment | null;
  fields: { name: string; value: string }[];
};

function describeReply(source: StarboardSource) {
  if (!source.replyPreview) return null;
  const { authorName, content, url } = source.replyPreview;
  const preview = truncate(content.replaceAll("\n", " "), REPLY_PREVIEW_LIMIT);
  return `> [replying to ${authorName}](${url}): ${preview}`;
}

function pickImage(source: StarboardSource) {
  const image = source.attachments.find((a) =>
    a.contentType?.startsWith("image/"),
  );

  if (image) {
    return {
      imageUrl: image.url,
      reuploadAttachment: image.size <= MAX_REUPLOAD_SIZE ? image : null,
      used: image,
    };
  }

  if (source.embedImageUrl) {
    return {
      imageUrl: source.embedImageUrl,
      reuploadAttachment: null,
      used: null,
    };
  }

  if (source.stickerUrl) {
    return {
      imageUrl: source.stickerUrl,
      reuploadAttachment: null,
      used: null,
    };
  }

  return { imageUrl: null, reuploadAttachment: null, used: null };
}

export function hasRenderableContent(source: StarboardSource) {
  return Boolean(
    source.content ||
      source.attachments.length > 0 ||
      source.embedImageUrl ||
      source.stickerName,
  );
}

export function describeStarboardPost(
  source: StarboardSource,
  { emoji, score }: { emoji: string; score: number },
): StarboardRender {
  const lines: string[] = [];

  const reply = describeReply(source);
  if (reply) lines.push(reply);
  if (source.forwarded) lines.push("*Forwarded:*");
  if (source.content) lines.push(source.content);
  if (source.stickerName) lines.push(`*Sticker: ${source.stickerName}*`);

  const image = pickImage(source);

  const remaining = source.attachments.filter((a) => a !== image.used);
  const fields =
    remaining.length > 0
      ? [
          {
            name: "Attachments",
            value: truncate(
              remaining.map((a) => `[${a.name}](${a.url})`).join("\n"),
              FIELD_LIMIT,
            ),
          },
        ]
      : [];

  return {
    score,
    content: `${emoji} **${score}** | ${source.url}`,
    author: { name: source.authorName, iconURL: source.authorAvatarUrl },
    description: truncate(lines.join("\n"), DESCRIPTION_LIMIT),
    timestamp: source.createdAt,
    imageUrl: image.imageUrl,
    reuploadAttachment: image.reuploadAttachment,
    fields,
  };
}

// ── Discord plumbing ──

const FALLBACK_EMOJI = "⭐";

const MISSING_ACCESS_CODES: number[] = [
  RESTJSONErrorCodes.MissingAccess,
  RESTJSONErrorCodes.MissingPermissions,
  RESTJSONErrorCodes.CannotExecuteActionOnThisChannelType,
];

let excludedChannelIds = new Set<string>();
let starboardChannel: GuildTextBasedChannel | null = null;

// One alert per channel per process, so being locked out of a busy channel
// can't flood #alerts
const alertedChannelIds = new Set<string>();

function isDiscordError(error: unknown, code: number) {
  return error instanceof DiscordAPIError && error.code === code;
}

function isMissingAccess(error: unknown) {
  return (
    error instanceof DiscordAPIError &&
    MISSING_ACCESS_CODES.includes(Number(error.code))
  );
}

async function alertOncePerChannel(channelId: string, error: unknown) {
  if (alertedChannelIds.has(channelId)) return;
  alertedChannelIds.add(channelId);
  await discordClient.alert(
    `Starboard: missing access to channel ${channelId}`,
    undefined,
    error,
  );
}

function isRelevantEmoji(name: string | null) {
  const lowered = name?.toLowerCase();
  return lowered === PLUS_ONE || lowered === MINUS_ONE;
}

// Threads inherit their parent's eligibility, otherwise excluding a channel is
// trivially bypassed by starting a thread in it.
function getGoverningChannel(channel: GuildBasedChannel) {
  if (channel.isThread()) return channel.parent ?? channel;
  return channel;
}

function isPubliclyVisible(channel: GuildBasedChannel, guild: Guild) {
  return Boolean(
    channel
      .permissionsFor(guild.roles.everyone)
      ?.has(PermissionFlagsBits.ViewChannel),
  );
}

function isEligibleChannel(channel: GuildBasedChannel, guild: Guild) {
  if (channel.id === config.STARBOARD_CHANNEL_ID) return false;
  if (channel.type === ChannelType.PrivateThread) return false;

  const governing = getGoverningChannel(channel);

  if (excludedChannelIds.has(channel.id)) return false;
  if (excludedChannelIds.has(governing.id)) return false;
  if (!isPubliclyVisible(governing, guild)) return false;
  if ("nsfw" in governing && governing.nsfw) return false;

  return true;
}

function toStarboardAttachment(attachment: Attachment): StarboardAttachment {
  return {
    name: attachment.name,
    url: attachment.url,
    size: attachment.size,
    contentType: attachment.contentType,
  };
}

async function describeReplyPreview(message: Message) {
  if (message.reference?.type !== MessageReferenceType.Default) return null;

  try {
    const parent = await message.fetchReference();
    return {
      authorName: parent.member?.displayName ?? parent.author.username,
      content: parent.content,
      url: parent.url,
    };
  } catch {
    // The message being replied to is gone; not worth mentioning
    return null;
  }
}

// A forward carries no content of its own - everything visible lives in the
// snapshot, which is why naive starboards post forwards as blanks.
function getSnapshot(message: Message): MessageSnapshot | null {
  if (message.reference?.type !== MessageReferenceType.Forward) return null;
  return message.messageSnapshots.first() ?? null;
}

async function toStarboardSource(message: Message): Promise<StarboardSource> {
  const snapshot = getSnapshot(message);
  const body = snapshot ?? message;

  const attachments = [...body.attachments.values()].map(toStarboardAttachment);
  const sticker: Sticker | undefined = body.stickers.first();
  const [embed] = body.embeds;

  return {
    url: message.url,
    authorName: message.member?.displayName ?? message.author.username,
    authorAvatarUrl:
      message.member?.displayAvatarURL() ?? message.author.displayAvatarURL(),
    content: body.content ?? "",
    createdAt: message.createdAt,
    attachments,
    embedImageUrl: embed?.image?.url ?? embed?.thumbnail?.url ?? null,
    stickerName: sticker?.name ?? null,
    stickerUrl: sticker?.url ?? null,
    replyPreview: await describeReplyPreview(message),
    forwarded: snapshot !== null,
  };
}

function toEmbed(render: StarboardRender, imageUrl: string | null) {
  const embed = new EmbedBuilder()
    .setColor(0xffd700)
    .setAuthor(render.author)
    .setDescription(render.description || null)
    .setTimestamp(render.timestamp);

  if (imageUrl) embed.setImage(imageUrl);
  if (render.fields.length > 0) embed.addFields(render.fields);

  return embed;
}

// Attachment URLs are signed and expire within a day, so the post takes its own
// copy of the image rather than hotlinking one that will rot.
function toCreateOptions(render: StarboardRender): MessageCreateOptions {
  const reupload = render.reuploadAttachment;

  if (!reupload) {
    return {
      content: render.content,
      embeds: [toEmbed(render, render.imageUrl)],
      allowedMentions: { parse: [] },
    };
  }

  return {
    content: render.content,
    embeds: [toEmbed(render, `attachment://${reupload.name}`)],
    files: [{ attachment: reupload.url, name: reupload.name }],
    allowedMentions: { parse: [] },
  };
}

// Edits never touch files - the attachment uploaded at creation persists, so
// the embed keeps referring to it.
function toEditOptions(
  render: StarboardRender,
  existing: Message,
): MessageEditOptions {
  const existingAttachment = existing.attachments.first();
  const imageUrl = existingAttachment
    ? `attachment://${existingAttachment.name}`
    : render.imageUrl;

  return {
    content: render.content,
    embeds: [toEmbed(render, imageUrl)],
    allowedMentions: { parse: [] },
  };
}

async function fetchAllReactors(reaction: MessageReaction) {
  const voters: Voter[] = [];
  let after: string | undefined;

  for (;;) {
    const page = await reaction.users.fetch({ limit: 100, after });
    for (const user of page.values()) {
      voters.push({ id: user.id, bot: user.bot });
    }
    if (page.size < 100) return voters;
    after = page.lastKey();
  }
}

// reaction.count can't be trusted: it is null on partials, and _patch only ever
// fills it in when unset, so a cached count drifts across missed events. The
// reactor list is authoritative, and we need it anyway to drop bots and the
// author's own star.
function findReactions(message: Message, emojiName: string) {
  return [...message.reactions.cache.values()].filter(
    (reaction) => reaction.emoji.name?.toLowerCase() === emojiName,
  );
}

async function collectVoters(message: Message, emojiName: string) {
  const voters: Voter[] = [];
  // Several entries can share a name if the emoji was re-uploaded, or if
  // someone reacted with a same-named emoji from another guild
  for (const reaction of findReactions(message, emojiName)) {
    voters.push(...(await fetchAllReactors(reaction)));
  }
  return voters;
}

async function isVetoed(message: Message, guild: Guild) {
  const detractors = await collectVoters(message, MINUS_ONE);

  for (const detractor of detractors) {
    if (detractor.bot) continue;
    if (
      await isAtLeastRole(guild, detractor.id, config.EXTENDED_TEAM_ROLE_ID)
    ) {
      return true;
    }
  }

  return false;
}

function getEmoji(guild: Guild) {
  return (
    guild.emojis.cache.find((e) => e.name === PLUS_ONE)?.toString() ??
    FALLBACK_EMOJI
  );
}

async function fetchStarboardPost(starboardMessageId: string) {
  if (!starboardChannel) return null;
  try {
    return await starboardChannel.messages.fetch(starboardMessageId);
  } catch (error) {
    if (isDiscordError(error, RESTJSONErrorCodes.UnknownMessage)) return null;
    throw error;
  }
}

async function removeStarboardPost(
  sourceMessageId: string,
  starboardMessageId: string,
) {
  // Cleared first so our own deletion isn't mistaken for a human removing the
  // post, which would suppress the message permanently
  await clearStarboardPost(sourceMessageId);

  const post = await fetchStarboardPost(starboardMessageId);
  if (!post) return;

  try {
    await post.delete();
  } catch (error) {
    if (!isDiscordError(error, RESTJSONErrorCodes.UnknownMessage)) throw error;
  }
}

async function post(message: Message, render: StarboardRender) {
  if (!starboardChannel) return;

  const claimed = await claimStarboardMessage({
    sourceMessageId: message.id,
    sourceChannelId: message.channelId,
  });

  // Another evaluation owns this message; it will post and we would duplicate
  if (!claimed) return;

  const sent = await send(starboardChannel, render);
  await setStarboardPost(message.id, sent.id, render.score);
}

async function send(channel: GuildTextBasedChannel, render: StarboardRender) {
  try {
    return await channel.send(toCreateOptions(render));
  } catch (error) {
    if (!render.reuploadAttachment) throw error;
    // Re-uploading the image failed, so hotlink it instead and accept that the
    // signed URL will eventually expire
    return await channel.send(
      toCreateOptions({ ...render, reuploadAttachment: null }),
    );
  }
}

async function edit(
  message: Message,
  render: StarboardRender,
  starboardMessageId: string,
) {
  const existing = await fetchStarboardPost(starboardMessageId);

  if (!existing) {
    await suppressStarboardMessage(message.id);
    return;
  }

  try {
    await existing.edit(toEditOptions(render, existing));
    await setStarboardScore(message.id, render.score);
  } catch (error) {
    if (!isDiscordError(error, RESTJSONErrorCodes.UnknownMessage)) throw error;
    await suppressStarboardMessage(message.id);
  }
}

async function evaluateMessage(channel: GuildTextBasedChannel, id: string) {
  const guild = channel.guild;
  const message = await channel.messages.fetch({ message: id, force: true });

  if (message.system) return;

  const existing = await findStarboardMessage(id);
  const score = countStars(
    await collectVoters(message, PLUS_ONE),
    message.author.id,
  );
  const vetoed = score > 0 ? await isVetoed(message, guild) : false;

  const action = decideAction({
    score,
    threshold: config.STARBOARD_THRESHOLD,
    vetoed,
    existing,
  });

  if (action === "nothing") return;

  if (action === "delete") {
    if (!existing?.starboardMessageId) return;
    await removeStarboardPost(id, existing.starboardMessageId);
    return;
  }

  const source = await toStarboardSource(message);

  // Creating a post is gated on age and having something to show; editing or
  // deleting an existing one is not, so old posts stay correctable
  if (action === "post") {
    const age = Date.now() - message.createdTimestamp;
    if (age > MAX_MESSAGE_AGE) return;
    if (!hasRenderableContent(source)) return;
  }

  const render = describeStarboardPost(source, {
    emoji: getEmoji(guild),
    score,
  });

  if (action === "post") {
    await post(message, render);
    return;
  }

  // decideAction only returns "edit" when a post already exists
  if (existing?.starboardMessageId) {
    await edit(message, render, existing.starboardMessageId);
  }
}

async function evaluate(channelId: string, messageId: string) {
  try {
    const guild = discordClient.guild;
    if (!guild) return;

    const channel = await guild.channels.fetch(channelId);
    if (!channel?.isTextBased()) return;

    // Checked before fetching the message so reaction traffic in an ineligible
    // channel costs us nothing
    if (!isEligibleChannel(channel, guild)) return;

    await evaluateMessage(channel, messageId);
  } catch (error) {
    if (isDiscordError(error, RESTJSONErrorCodes.UnknownMessage)) {
      // The source message went away mid-evaluation
      await cleanUpDeletedSource(messageId);
      return;
    }

    if (isMissingAccess(error)) {
      await alertOncePerChannel(channelId, error);
      return;
    }

    await discordClient.alert(
      `Starboard: failed to evaluate message ${messageId}`,
      undefined,
      error,
    );
  }
}

// Reaction bursts on one message must not race into duplicate posts. Every
// evaluation re-reads live state, so one queued run behind the running one is
// always enough to catch up.
const running = new Map<string, Promise<void>>();
const pending = new Set<string>();

export function enqueue(channelId: string, messageId: string) {
  if (pending.has(messageId)) return;

  const previous = running.get(messageId);
  if (previous !== undefined) pending.add(messageId);

  const next = (previous ?? Promise.resolve()).then(async () => {
    pending.delete(messageId);
    await evaluate(channelId, messageId);
  });

  running.set(messageId, next);

  void next.finally(() => {
    if (running.get(messageId) === next) running.delete(messageId);
  });
}

async function resolveReaction(
  reaction: MessageReaction | PartialMessageReaction,
) {
  const resolved = reaction.partial ? await reaction.fetch() : reaction;
  if (resolved.message.partial) await resolved.message.fetch();
  return resolved;
}

export async function onReactionChange(
  reaction: MessageReaction | PartialMessageReaction,
) {
  try {
    if (!isRelevantEmoji(reaction.emoji.name)) return;

    const resolved = await resolveReaction(reaction);
    const { message } = resolved;
    if (message.guildId !== config.GUILD_ID) return;

    enqueue(message.channelId, message.id);
  } catch (error) {
    if (isDiscordError(error, RESTJSONErrorCodes.UnknownMessage)) return;
    if (isMissingAccess(error)) {
      await alertOncePerChannel(reaction.message.channelId, error);
      return;
    }
    await discordClient.alert(
      "Starboard: failed to handle a reaction",
      undefined,
      error,
    );
  }
}

export function onReactionsCleared(
  message: OmitPartialGroupDMChannel<Message | PartialMessage>,
) {
  if (message.guildId !== config.GUILD_ID) return;
  enqueue(message.channelId, message.id);
}

async function cleanUpDeletedSource(messageId: string) {
  const row = await findStarboardMessage(messageId);
  if (!row) return;

  if (row.starboardMessageId) {
    await removeStarboardPost(messageId, row.starboardMessageId);
  }

  await deleteStarboardMessage(messageId);
}

export async function onMessageDelete(
  message: OmitPartialGroupDMChannel<Message | PartialMessage>,
) {
  try {
    // A deletion in the starboard channel means a human took our post down.
    // Our own deletions clear the row first, so they don't land here.
    if (message.channelId === config.STARBOARD_CHANNEL_ID) {
      const row = await findStarboardMessageByPostId(message.id);
      if (row) await suppressStarboardMessage(row.sourceMessageId);
      return;
    }

    await cleanUpDeletedSource(message.id);
  } catch (error) {
    await discordClient.alert(
      `Starboard: failed to handle the deletion of ${message.id}`,
      undefined,
      error,
    );
  }
}

async function resolveStarboardChannel() {
  if (!config.STARBOARD_CHANNEL_ID) return;

  const guild = discordClient.guild;
  if (!guild) return;

  let channel: GuildBasedChannel | null = null;
  try {
    channel = await guild.channels.fetch(config.STARBOARD_CHANNEL_ID);
  } catch {
    // Reported below alongside a misconfigured channel
  }

  if (!channel?.isTextBased() || !channel.isSendable()) {
    await discordClient.alert(
      "Starboard: channel not found or not sendable, feature is inert",
    );
    return;
  }

  starboardChannel = channel;
}

export function init() {
  if (!config.STARBOARD_CHANNEL_ID) return;

  excludedChannelIds = parseExcludedChannelIds(
    config.STARBOARD_EXCLUDED_CHANNEL_IDS,
  );

  discordClient.once(Events.ClientReady, () => void resolveStarboardChannel());

  discordClient.on(
    Events.MessageReactionAdd,
    (reaction) => void onReactionChange(reaction),
  );
  discordClient.on(
    Events.MessageReactionRemove,
    (reaction) => void onReactionChange(reaction),
  );
  discordClient.on(
    Events.MessageReactionRemoveEmoji,
    (reaction) => void onReactionChange(reaction),
  );
  discordClient.on(Events.MessageReactionRemoveAll, onReactionsCleared);
  discordClient.on(
    Events.MessageDelete,
    (message) => void onMessageDelete(message),
  );
  discordClient.on(Events.MessageBulkDelete, (messages) => {
    for (const message of messages.values()) {
      void onMessageDelete(message);
    }
  });
}
