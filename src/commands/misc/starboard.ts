import {
  type Attachment,
  ChannelType,
  DiscordAPIError,
  EmbedBuilder,
  Events,
  type Guild,
  type GuildBasedChannel,
  type GuildTextBasedChannel,
  hyperlink,
  type Message,
  type MessageCreateOptions,
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
  deleteStarboardMessage,
  findStarboardMessage,
  findStarboardMessageByPostId,
  releaseStarboardMessage,
  setStarboardPost,
  setStarboardScore,
  suppressStarboardMessage,
} from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";
import { config } from "../../config.js";
import type { StarboardMessage } from "../../database-types.js";
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

export type ExistingStarboardMessage = Pick<
  StarboardMessage,
  "starboardMessageId" | "score" | "suppressed"
>;

export function decideAction({
  score,
  threshold,
  vetoed,
  existing,
}: {
  score: number;
  threshold: number;
  vetoed: boolean;
  existing: ExistingStarboardMessage | undefined;
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
  // The filename to re-upload imageUrl under, when we want the post to own a
  // copy rather than link one that will expire.
  reuploadName: string | null;
  fields: { name: string; value: string }[];
};

function describeReply(source: StarboardSource) {
  if (!source.replyPreview) return null;
  const { authorName, content, url } = source.replyPreview;
  const preview = truncate(content.replaceAll("\n", " "), REPLY_PREVIEW_LIMIT);
  return `> ${hyperlink(`replying to ${authorName}`, url)}: ${preview}`;
}

function pickImage(source: StarboardSource) {
  const image = source.attachments.find((a) =>
    a.contentType?.startsWith("image/"),
  );

  if (image) {
    return {
      imageUrl: image.url,
      reuploadName: image.size <= MAX_REUPLOAD_SIZE ? image.name : null,
      remaining: source.attachments.filter((a) => a !== image),
    };
  }

  return {
    imageUrl: source.embedImageUrl ?? source.stickerUrl,
    reuploadName: null,
    remaining: source.attachments,
  };
}

function describeAttachments(attachments: StarboardAttachment[]) {
  if (attachments.length === 0) return [];

  return [
    {
      name: "Attachments",
      value: truncate(
        attachments.map((a) => hyperlink(a.name, a.url)).join("\n"),
        FIELD_LIMIT,
      ),
    },
  ];
}

export function hasRenderableContent(source: StarboardSource) {
  return Boolean(
    source.content ||
      source.attachments.length > 0 ||
      source.embedImageUrl ||
      source.stickerName,
  );
}

export function describeCountLine(emoji: string, score: number, url: string) {
  // The bare URL is deliberate: Discord unfurls a message link into a
  // channel-name chip, which doubles as the jump link
  return `${emoji} **${score}** | ${url}`;
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

  return {
    score,
    content: describeCountLine(emoji, score, source.url),
    author: { name: source.authorName, iconURL: source.authorAvatarUrl },
    description: truncate(lines.join("\n"), DESCRIPTION_LIMIT),
    timestamp: source.createdAt,
    imageUrl: image.imageUrl,
    reuploadName: image.reuploadName,
    fields: describeAttachments(image.remaining),
  };
}

// ── Discord plumbing ──

const FALLBACK_EMOJI = "⭐";

const MISSING_ACCESS_CODES = [
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
  return MISSING_ACCESS_CODES.some((code) => isDiscordError(error, code));
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
  if (channel.type === ChannelType.PrivateThread) return false;

  const governing = getGoverningChannel(channel);

  // Governing rather than the channel itself, so threads people start off a
  // starboard post don't get mirrored back into it
  if (governing.id === config.STARBOARD_CHANNEL_ID) return false;
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

// Deliberately not createEmbed() - that appends the standard contribute
// footer, and a mirrored post should look like the message it mirrors.
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

// Attachment URLs are signed and expire within a day, so where we can the post
// takes its own copy of the image rather than hotlinking one that will rot.
function toMessageOptions(render: StarboardRender): MessageCreateOptions {
  const { imageUrl, reuploadName } = render;

  return {
    content: render.content,
    embeds: [
      toEmbed(render, reuploadName ? `attachment://${reuploadName}` : imageUrl),
    ],
    ...(reuploadName && imageUrl
      ? { files: [{ attachment: imageUrl, name: reuploadName }] }
      : {}),
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
async function collectVoters(message: Message, emojiName: string) {
  // Several entries can share a name if the emoji was re-uploaded, or if
  // someone reacted with a same-named emoji from another guild
  const reactions = [...message.reactions.cache.values()].filter(
    (reaction) => reaction.emoji.name?.toLowerCase() === emojiName,
  );

  const voters: Voter[] = [];
  for (const reaction of reactions) {
    voters.push(...(await fetchAllReactors(reaction)));
  }
  return voters.filter((voter) => !voter.bot);
}

async function isVetoed(message: Message, guild: Guild) {
  for (const detractor of await collectVoters(message, MINUS_ONE)) {
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
    guild.emojis.cache
      .find((e) => e.name?.toLowerCase() === PLUS_ONE)
      ?.toString() ?? FALLBACK_EMOJI
  );
}

async function deleteStarboardPost(starboardMessageId: string) {
  if (!starboardChannel) return;

  try {
    await starboardChannel.messages.delete(starboardMessageId);
  } catch (error) {
    if (!isDiscordError(error, RESTJSONErrorCodes.UnknownMessage)) throw error;
  }
}

async function removeStarboardPost(
  sourceMessageId: string,
  starboardMessageId: string,
) {
  // Released first so our own deletion isn't mistaken for a human removing the
  // post, which would suppress the message permanently
  await releaseStarboardMessage(sourceMessageId);
  await deleteStarboardPost(starboardMessageId);
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

  try {
    // The row going missing means the source was deleted while we were
    // sending, so the post mirrors something that isn't there any more
    const recorded = await setStarboardPost(message.id, sent.id, render.score);
    if (!recorded) await deleteStarboardPost(sent.id);
  } catch (error) {
    // Nothing records the post, so hand the claim back and take the post down
    // rather than strand it where no later evaluation can reach it
    await removeStarboardPost(message.id, sent.id);
    throw error;
  }
}

async function send(channel: GuildTextBasedChannel, render: StarboardRender) {
  try {
    return await channel.send(toMessageOptions(render));
  } catch (error) {
    if (!render.reuploadName) throw error;
    // Re-uploading the image failed, so hotlink it instead and accept that the
    // signed URL will eventually expire
    return await channel.send(
      toMessageOptions({ ...render, reuploadName: null }),
    );
  }
}

async function edit(
  sourceMessageId: string,
  starboardMessageId: string,
  content: string,
  score: number,
) {
  if (!starboardChannel) return;

  try {
    await starboardChannel.messages.edit(starboardMessageId, { content });
    await setStarboardScore(sourceMessageId, score);
  } catch (error) {
    if (!isDiscordError(error, RESTJSONErrorCodes.UnknownMessage)) throw error;
    await suppressStarboardMessage(sourceMessageId);
  }
}

async function createStarboardPost(
  message: Message,
  guild: Guild,
  score: number,
) {
  // Creating a post is gated on age and having something to show; editing and
  // deleting are not, so an old post stays correctable
  if (Date.now() - message.createdTimestamp > MAX_MESSAGE_AGE) return;

  const source = await toStarboardSource(message);
  if (!hasRenderableContent(source)) return;

  await post(
    message,
    describeStarboardPost(source, { emoji: getEmoji(guild), score }),
  );
}

async function evaluateMessage(channel: GuildTextBasedChannel, id: string) {
  const guild = channel.guild;

  // Read first: a suppressed message can never be posted again, and the ones
  // adopted from the previous starboard bot are exactly the popular messages
  // that keep attracting reactions
  const existing = await findStarboardMessage(id);
  if (existing?.suppressed) return;

  const message = await channel.messages.fetch({ message: id, force: true });
  if (message.system) return;

  const threshold = config.STARBOARD_THRESHOLD;
  const score = countStars(
    await collectVoters(message, PLUS_ONE),
    message.author.id,
  );

  // Below the threshold the outcome is the same either way, so don't pay for
  // the detractor list and a member lookup each
  const vetoed = score >= threshold ? await isVetoed(message, guild) : false;

  switch (decideAction({ score, threshold, vetoed, existing })) {
    case "post":
      await createStarboardPost(message, guild, score);
      return;

    // Only the count can have changed - a starred message's content is
    // deliberately never refreshed - so patch that and leave the embed be
    case "edit":
      if (existing?.starboardMessageId) {
        await edit(
          id,
          existing.starboardMessageId,
          describeCountLine(getEmoji(guild), score, message.url),
          score,
        );
      }
      return;

    case "delete":
      if (existing?.starboardMessageId) {
        await removeStarboardPost(id, existing.starboardMessageId);
      }
      return;

    case "nothing":
      return;
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

// A reaction event always carries the message's id, channel and guild, even
// when the message itself is a partial, and evaluate re-fetches the message
// anyway - so there is nothing here worth resolving the partial for.
export async function onReactionChange(
  reaction: MessageReaction | PartialMessageReaction,
) {
  if (!isRelevantEmoji(reaction.emoji.name)) return;

  const { message } = reaction;
  if (message.guildId !== config.GUILD_ID) return;

  await evaluate(message.channelId, message.id);
}

export async function onReactionsCleared(
  message: OmitPartialGroupDMChannel<Message | PartialMessage>,
) {
  if (message.guildId !== config.GUILD_ID) return;
  await evaluate(message.channelId, message.id);
}

async function cleanUpDeletedSource(messageId: string) {
  // Deleting the row first both tells us whether we had posted it and stops
  // our own deletion being read as a human removing the post
  const starboardMessageId = await deleteStarboardMessage(messageId);
  if (starboardMessageId) await deleteStarboardPost(starboardMessageId);
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
  discordClient.on(
    Events.MessageReactionRemoveAll,
    (message) => void onReactionsCleared(message),
  );
  discordClient.on(
    Events.MessageDelete,
    (message) => void onMessageDelete(message),
  );
  // Serialised rather than fanned out: a 100-message purge firing 100 queries
  // at once would just queue behind the connection pool
  discordClient.on(Events.MessageBulkDelete, (messages) => {
    void (async () => {
      for (const message of messages.values()) {
        await onMessageDelete(message);
      }
    })();
  });
}
