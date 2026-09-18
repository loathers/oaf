import { Collection, DiscordAPIError, RESTJSONErrorCodes } from "discord.js";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type {
  ExistingStarboardMessage,
  StarboardAttachment,
  StarboardSource,
} from "./starboard.js";

const {
  claimStarboardMessage,
  clearStarboardPost,
  deleteStarboardMessage,
  findStarboardMessage,
  findStarboardMessageByPostId,
  setStarboardPost,
  setStarboardScore,
  suppressStarboardMessage,
} = vi.hoisted(() => ({
  claimStarboardMessage: vi.fn(),
  clearStarboardPost: vi.fn(),
  deleteStarboardMessage: vi.fn(),
  findStarboardMessage: vi.fn(),
  findStarboardMessageByPostId: vi.fn(),
  setStarboardPost: vi.fn(),
  setStarboardScore: vi.fn(),
  suppressStarboardMessage: vi.fn(),
}));

const { alert, isAtLeastRole } = vi.hoisted(() => ({
  alert: vi.fn(),
  isAtLeastRole: vi.fn(),
}));

const { config } = vi.hoisted(() => ({
  config: {
    GUILD_ID: "guild",
    STARBOARD_CHANNEL_ID: "starboard",
    STARBOARD_THRESHOLD: 5,
    STARBOARD_EXCLUDED_CHANNEL_IDS: "excluded",
    EXTENDED_TEAM_ROLE_ID: "mods",
  } as Record<string, unknown>,
}));

vi.mock("../../clients/database.js", () => ({
  claimStarboardMessage,
  clearStarboardPost,
  deleteStarboardMessage,
  findStarboardMessage,
  findStarboardMessageByPostId,
  setStarboardPost,
  setStarboardScore,
  suppressStarboardMessage,
}));

vi.mock("../../discordUtils.js", () => ({ isAtLeastRole }));
vi.mock("../../config.js", () => ({ config }));

const guild = {
  id: "guild",
  roles: { everyone: "everyone" },
  emojis: {
    cache: new Collection([
      ["1", { name: "plusone", toString: () => "<:p:1>" }],
    ]),
  },
  channels: { fetch: vi.fn() },
};

const starboardSend = vi.fn();
const starboardEdit = vi.fn();
const starboardDelete = vi.fn();

vi.mock("../../clients/discord.js", () => ({
  discordClient: {
    alert,
    on: vi.fn(),
    once: vi.fn(),
    get guild() {
      return guild;
    },
  },
}));

const {
  countStars,
  decideAction,
  describeStarboardPost,
  enqueue,
  hasRenderableContent,
  init,
  MAX_REUPLOAD_SIZE,
  onMessageDelete,
  onReactionChange,
  onReactionsCleared,
  parseExcludedChannelIds,
  truncate,
} = await import("./starboard.js");

const unknownMessage = new DiscordAPIError(
  { code: RESTJSONErrorCodes.UnknownMessage, message: "Unknown Message" },
  RESTJSONErrorCodes.UnknownMessage,
  404,
  "GET",
  "",
  {},
);

const missingAccess = new DiscordAPIError(
  { code: RESTJSONErrorCodes.MissingAccess, message: "Missing Access" },
  RESTJSONErrorCodes.MissingAccess,
  403,
  "GET",
  "",
  {},
);

const AVATAR = "https://cdn.discordapp.com/avatars/1/a.png";

type ChannelOptions = {
  id?: string;
  thread?: boolean;
  parentId?: string;
  nsfw?: boolean;
  visible?: boolean;
  type?: number;
};

type TestChannel = {
  id: string;
  type: number;
  guild: typeof guild;
  nsfw: boolean;
  parent: TestChannel | undefined;
  isThread: () => boolean;
  isTextBased: () => boolean;
  isSendable: () => boolean;
  permissionsFor: () => { has: () => boolean };
  messages: { fetch: ReturnType<typeof vi.fn> };
  send: ReturnType<typeof vi.fn>;
};

function makeChannel(options: ChannelOptions = {}): TestChannel {
  const {
    id = "source",
    thread = false,
    parentId,
    nsfw = false,
    visible = true,
    type = 0,
  } = options;

  const parent: TestChannel | undefined = parentId
    ? makeChannel({ id: parentId, nsfw, visible })
    : undefined;

  return {
    id,
    type,
    guild,
    nsfw,
    parent,
    isThread: () => thread,
    isTextBased: () => true,
    isSendable: () => true,
    permissionsFor: () => ({ has: () => visible }),
    messages: { fetch: vi.fn() },
    send: vi.fn(),
  };
}

type MessageOptions = {
  id?: string;
  channel?: TestChannel;
  authorId?: string;
  plusOne?: { id: string; bot?: boolean }[];
  minusOne?: { id: string; bot?: boolean }[];
  createdTimestamp?: number;
  content?: string;
  system?: boolean;
};

function makeReaction(name: string, users: { id: string; bot?: boolean }[]) {
  return {
    emoji: { name },
    users: {
      fetch: vi
        .fn()
        .mockResolvedValue(
          new Collection(
            users.map((u) => [u.id, { id: u.id, bot: u.bot ?? false }]),
          ),
        ),
    },
  };
}

function makeMessage(options: MessageOptions = {}) {
  const {
    id = "source-message",
    channel = makeChannel(),
    authorId = "author",
    plusOne = [],
    minusOne = [],
    createdTimestamp = Date.now(),
    content = "a funny message",
    system = false,
  } = options;

  const reactions = new Collection<string, unknown>();
  if (plusOne.length) reactions.set("p", makeReaction("plusone", plusOne));
  if (minusOne.length) reactions.set("m", makeReaction("minusone", minusOne));

  return {
    id,
    url: `https://discord.com/channels/guild/${channel.id}/${id}`,
    channelId: channel.id,
    guildId: "guild",
    system,
    content,
    createdTimestamp,
    createdAt: new Date(createdTimestamp),
    author: {
      id: authorId,
      username: "someone",
      displayAvatarURL: () => AVATAR,
    },
    member: { displayName: "Someone", displayAvatarURL: () => AVATAR },
    reference: null,
    messageSnapshots: new Collection(),
    attachments: new Collection(),
    stickers: new Collection(),
    embeds: [],
    reactions: { cache: reactions },
  };
}

const starboardChannel = {
  id: "starboard",
  isTextBased: () => true,
  isSendable: () => true,
  send: starboardSend,
  messages: { edit: starboardEdit, delete: starboardDelete },
};

const channels = new Map<string, unknown>();

function register(channel: TestChannel) {
  channels.set(channel.id, channel);
  return channel;
}

/** Registers a channel whose message fetch resolves to `message`. */
function serve(message: ReturnType<typeof makeMessage>) {
  const channel = makeChannel({ id: message.channelId });
  channel.messages.fetch.mockResolvedValue(message);
  return register(channel);
}

/** Runs init() and the ClientReady hook so the starboard channel resolves. */
async function boot() {
  const { discordClient } = await import("../../clients/discord.js");
  const once = vi.mocked(discordClient.once);
  init();
  const [, ready] = once.mock.calls.at(-1) ?? [];
  (ready as () => void)();
  await vi.waitFor(() => expect(guild.channels.fetch).toHaveBeenCalled());
}

const POSTED_ROW = {
  sourceMessageId: "source-message",
  starboardMessageId: "post",
  score: 5,
  suppressed: false,
};

/** A list of `count` distinct non-bot voters. */
function stars(count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: `voter-${i}` }));
}

beforeEach(async () => {
  vi.clearAllMocks();
  channels.clear();
  channels.set("starboard", starboardChannel);
  guild.channels.fetch.mockImplementation((id: string) =>
    Promise.resolve(channels.get(id) ?? null),
  );
  config.STARBOARD_EXCLUDED_CHANNEL_IDS = "excluded";
  findStarboardMessage.mockResolvedValue(undefined);
  findStarboardMessageByPostId.mockResolvedValue(undefined);
  claimStarboardMessage.mockResolvedValue(true);
  isAtLeastRole.mockResolvedValue(false);
  starboardSend.mockResolvedValue({ id: "post" });
  deleteStarboardMessage.mockResolvedValue(null);
  await boot();
});

describe("reaction filtering", () => {
  test("ignores an emoji that is neither plusone nor minusone", async () => {
    const message = makeMessage();
    const channel = serve(message);

    await onReactionChange({
      partial: false,
      emoji: { name: "thumbsup" },
      message,
    } as never);

    expect(channel.messages.fetch).not.toHaveBeenCalled();
  });

  test("handles a partial reaction without resolving it", async () => {
    const message = makeMessage({ plusOne: stars(5) });
    const channel = serve(message);
    const fetch = vi.fn();

    // The ids we need are on the partial, and the evaluation re-fetches the
    // message anyway
    await onReactionChange({
      partial: true,
      emoji: { name: "plusone" },
      message: { id: message.id, channelId: channel.id, guildId: "guild" },
      fetch,
    } as never);

    expect(fetch).not.toHaveBeenCalled();
    expect(starboardSend).toHaveBeenCalledOnce();
  });

  test("ignores reactions from outside the configured guild", async () => {
    const message = makeMessage();
    const channel = serve(message);

    await onReactionChange({
      partial: false,
      emoji: { name: "plusone" },
      message: { ...message, guildId: "elsewhere" },
    } as never);

    expect(channel.messages.fetch).not.toHaveBeenCalled();
  });
});

describe("eligibility", () => {
  const react = async (channel: TestChannel) => {
    const message = makeMessage({
      channel,
      plusOne: stars(5),
    });
    channel.messages.fetch.mockResolvedValue(message);
    register(channel);
    await enqueue(channel.id, message.id);
  };

  test("posts from an ordinary channel", async () => {
    await react(makeChannel({ id: "ordinary" }));
    expect(starboardSend).toHaveBeenCalledOnce();
  });

  test("skips an excluded channel", async () => {
    await react(makeChannel({ id: "excluded" }));
    expect(starboardSend).not.toHaveBeenCalled();
  });

  test("skips a thread whose parent is excluded", async () => {
    await react(
      makeChannel({ id: "thread", thread: true, parentId: "excluded" }),
    );
    expect(starboardSend).not.toHaveBeenCalled();
  });

  test("skips the starboard channel itself", async () => {
    await react(makeChannel({ id: "starboard" }));
    expect(starboardSend).not.toHaveBeenCalled();
  });

  test("skips a channel everyone cannot view", async () => {
    await react(makeChannel({ id: "staff", visible: false }));
    expect(starboardSend).not.toHaveBeenCalled();
  });

  test("skips an nsfw channel", async () => {
    await react(makeChannel({ id: "spicy", nsfw: true }));
    expect(starboardSend).not.toHaveBeenCalled();
  });

  test("skips a system message", async () => {
    const channel = makeChannel({ id: "ordinary" });
    const message = makeMessage({
      channel,
      system: true,
      plusOne: stars(5),
    });
    channel.messages.fetch.mockResolvedValue(message);
    register(channel);

    await enqueue(channel.id, message.id);

    expect(starboardSend).not.toHaveBeenCalled();
  });
});

describe("posting", () => {
  test("claims before sending and records the post", async () => {
    const message = makeMessage({ plusOne: stars(5) });
    serve(message);

    await enqueue(message.channelId, message.id);

    expect(claimStarboardMessage).toHaveBeenCalledWith({
      sourceMessageId: message.id,
      sourceChannelId: message.channelId,
    });
    expect(starboardSend).toHaveBeenCalledOnce();
    expect(setStarboardPost).toHaveBeenCalledWith(message.id, "post", 5);
  });

  test("leads the post with the plusone emoji, count and message link", async () => {
    const message = makeMessage({ plusOne: stars(5) });
    serve(message);

    await enqueue(message.channelId, message.id);

    const [options] = starboardSend.mock.calls[0] as [{ content: string }];
    expect(options.content).toBe(`<:p:1> **5** | ${message.url}`);
  });

  test("does not post below the threshold", async () => {
    const message = makeMessage({ plusOne: stars(1) });
    serve(message);

    await enqueue(message.channelId, message.id);

    expect(starboardSend).not.toHaveBeenCalled();
  });

  test("ignores bot reactions and the author's own star", async () => {
    const message = makeMessage({
      plusOne: [...stars(5), { id: "author" }, { id: "oaf", bot: true }],
    });
    serve(message);

    await enqueue(message.channelId, message.id);

    expect(setStarboardPost).toHaveBeenCalledWith(message.id, "post", 5);
  });

  test("posts only once when reactions arrive together", async () => {
    // What the real claim does once a row holds a post id
    claimStarboardMessage.mockResolvedValueOnce(true).mockResolvedValue(false);

    const message = makeMessage({ plusOne: stars(5) });
    serve(message);

    await Promise.all([
      enqueue(message.channelId, message.id),
      enqueue(message.channelId, message.id),
      enqueue(message.channelId, message.id),
    ]);

    expect(starboardSend).toHaveBeenCalledOnce();
    // Coalesced: however many events arrive, a burst costs at most one queued
    // evaluation behind the running one
    expect(claimStarboardMessage).toHaveBeenCalledTimes(2);
  });

  test("does not post when another evaluation holds the claim", async () => {
    claimStarboardMessage.mockResolvedValue(false);
    const message = makeMessage({ plusOne: stars(5) });
    serve(message);

    await enqueue(message.channelId, message.id);

    expect(starboardSend).not.toHaveBeenCalled();
  });

  test("does not post a message older than the age limit", async () => {
    const message = makeMessage({
      plusOne: stars(5),
      createdTimestamp: Date.now() - 31 * 24 * 60 * 60 * 1000,
    });
    serve(message);

    await enqueue(message.channelId, message.id);

    expect(starboardSend).not.toHaveBeenCalled();
  });

  test("does not post a message with nothing to show", async () => {
    const message = makeMessage({ plusOne: stars(5), content: "" });
    serve(message);

    await enqueue(message.channelId, message.id);

    expect(starboardSend).not.toHaveBeenCalled();
  });
});

describe("moderator veto", () => {
  test("blocks a message a moderator has minusoned", async () => {
    isAtLeastRole.mockResolvedValue(true);
    const message = makeMessage({
      plusOne: stars(5),
      minusOne: [{ id: "mod" }],
    });
    serve(message);

    await enqueue(message.channelId, message.id);

    expect(starboardSend).not.toHaveBeenCalled();
  });

  test("ignores a minusone from a non-moderator", async () => {
    const message = makeMessage({
      plusOne: stars(5),
      minusOne: [{ id: "nobody" }],
    });
    serve(message);

    await enqueue(message.channelId, message.id);

    expect(starboardSend).toHaveBeenCalledOnce();
  });

  test("posts once the moderator removes their minusone", async () => {
    isAtLeastRole.mockResolvedValue(true);
    const vetoed = makeMessage({
      plusOne: stars(5),
      minusOne: [{ id: "mod" }],
    });
    serve(vetoed);

    await enqueue(vetoed.channelId, vetoed.id);
    expect(starboardSend).not.toHaveBeenCalled();

    // The veto lives only in the reactions, so taking it off is enough
    const cleared = makeMessage({ plusOne: stars(5) });
    serve(cleared);

    await enqueue(cleared.channelId, cleared.id);

    expect(starboardSend).toHaveBeenCalledOnce();
  });

  test("takes down a post that a moderator later vetoes", async () => {
    isAtLeastRole.mockResolvedValue(true);
    findStarboardMessage.mockResolvedValue(POSTED_ROW);

    const message = makeMessage({
      plusOne: stars(5),
      minusOne: [{ id: "mod" }],
    });
    serve(message);

    await enqueue(message.channelId, message.id);

    expect(clearStarboardPost).toHaveBeenCalledWith(message.id);
    expect(starboardDelete).toHaveBeenCalledWith("post");
  });
});

describe("updating an existing post", () => {
  beforeEach(() => {
    findStarboardMessage.mockResolvedValue(POSTED_ROW);
  });

  test("edits only the count line when the score moves", async () => {
    const message = makeMessage({ plusOne: stars(6) });
    serve(message);

    await enqueue(message.channelId, message.id);

    // The embed is deliberately left alone, so the patch carries content only
    expect(starboardEdit).toHaveBeenCalledWith("post", {
      content: `<:p:1> **6** | ${message.url}`,
    });
    expect(starboardSend).not.toHaveBeenCalled();
    expect(setStarboardScore).toHaveBeenCalledWith(message.id, 6);
  });

  test("does nothing when the score has not moved", async () => {
    const message = makeMessage({ plusOne: stars(5) });
    serve(message);

    await enqueue(message.channelId, message.id);

    expect(starboardEdit).not.toHaveBeenCalled();
    expect(starboardSend).not.toHaveBeenCalled();
  });

  test("clears the row before deleting, so the deletion is not treated as manual", async () => {
    const order: string[] = [];
    clearStarboardPost.mockImplementation(() => {
      order.push("clear");
      return Promise.resolve();
    });
    starboardDelete.mockImplementation(() => {
      order.push("delete");
      return Promise.resolve();
    });

    const message = makeMessage({ plusOne: stars(1) });
    serve(message);

    await enqueue(message.channelId, message.id);

    expect(order).toEqual(["clear", "delete"]);
  });

  test("still unstars a message that is past the age limit", async () => {
    const message = makeMessage({
      plusOne: stars(1),
      createdTimestamp: Date.now() - 31 * 24 * 60 * 60 * 1000,
    });
    serve(message);

    await enqueue(message.channelId, message.id);

    expect(starboardDelete).toHaveBeenCalledWith("post");
  });

  test("suppresses the message when the post has already been removed", async () => {
    starboardEdit.mockRejectedValue(unknownMessage);

    const message = makeMessage({ plusOne: stars(6) });
    serve(message);

    await enqueue(message.channelId, message.id);

    expect(suppressStarboardMessage).toHaveBeenCalledWith(message.id);
    expect(starboardSend).not.toHaveBeenCalled();
  });
});

describe("deletions", () => {
  test("removes our post and row when the source is deleted", async () => {
    deleteStarboardMessage.mockResolvedValue("post");

    await onMessageDelete({
      id: "source-message",
      channelId: "source",
      guildId: "guild",
    } as never);

    expect(deleteStarboardMessage).toHaveBeenCalledWith("source-message");
    expect(starboardDelete).toHaveBeenCalledWith("post");
  });

  test("leaves the starboard alone for an unstarred message", async () => {
    await onMessageDelete({
      id: "whatever",
      channelId: "source",
      guildId: "guild",
    } as never);

    expect(starboardDelete).not.toHaveBeenCalled();
  });

  test("suppresses the source when a human deletes our post", async () => {
    findStarboardMessageByPostId.mockResolvedValue({
      sourceMessageId: "source-message",
      starboardMessageId: "post",
      score: 5,
      suppressed: false,
    });

    await onMessageDelete({
      id: "post",
      channelId: "starboard",
      guildId: "guild",
    } as never);

    expect(suppressStarboardMessage).toHaveBeenCalledWith("source-message");
  });

  test("does not suppress when we deleted the post ourselves", async () => {
    // Our own deletes clear the row first, so the lookup finds nothing
    findStarboardMessageByPostId.mockResolvedValue(undefined);

    await onMessageDelete({
      id: "post",
      channelId: "starboard",
      guildId: "guild",
    } as never);

    expect(suppressStarboardMessage).not.toHaveBeenCalled();
  });
});

describe("error handling", () => {
  test("cleans up quietly when the source message has gone", async () => {
    findStarboardMessage.mockResolvedValue(POSTED_ROW);
    deleteStarboardMessage.mockResolvedValue("post");

    const channel = makeChannel();
    channel.messages.fetch.mockRejectedValue(unknownMessage);
    register(channel);

    await enqueue("source", "source-message");

    expect(deleteStarboardMessage).toHaveBeenCalledWith("source-message");
    expect(alert).not.toHaveBeenCalled();
  });

  test("alerts only once per channel we cannot read", async () => {
    const channel = makeChannel({ id: "locked" });
    channel.messages.fetch.mockRejectedValue(missingAccess);
    register(channel);

    await enqueue("locked", "one");
    await enqueue("locked", "two");

    expect(alert).toHaveBeenCalledOnce();
  });
});

describe("clearing all reactions", () => {
  test("re-evaluates the message", async () => {
    findStarboardMessage.mockResolvedValue(POSTED_ROW);

    const message = makeMessage();
    serve(message);

    await onReactionsCleared({
      id: message.id,
      channelId: message.channelId,
      guildId: "guild",
    } as never);

    expect(starboardDelete).toHaveBeenCalledWith("post");
  });
});

describe("parseExcludedChannelIds", () => {
  test.each([
    ["an unset variable", undefined, []],
    ["an empty variable", "", []],
    ["a single id", "123", ["123"]],
    [
      "several ids, tolerating whitespace",
      "123, 456 ,789",
      ["123", "456", "789"],
    ],
    ["a trailing comma", "123,", ["123"]],
  ])("parses %s", (_label, raw, expected) => {
    expect([...parseExcludedChannelIds(raw as string | undefined)]).toEqual(
      expected,
    );
  });
});

describe("countStars", () => {
  const voter = (id: string, bot = false) => ({ id, bot });

  test("counts nothing when nobody has reacted", () => {
    expect(countStars([], "author")).toBe(0);
  });

  test("dedupes a user who appears twice", () => {
    expect(countStars([voter("a"), voter("a"), voter("b")], "author")).toBe(2);
  });

  test("excludes bots", () => {
    expect(countStars([voter("a"), voter("oaf", true)], "author")).toBe(1);
  });

  test("excludes the author's own star", () => {
    expect(countStars([voter("a"), voter("author")], "author")).toBe(1);
  });
});

describe("decideAction", () => {
  const unposted: ExistingStarboardMessage = {
    starboardMessageId: null,
    score: 0,
    suppressed: false,
  };
  const posted: ExistingStarboardMessage = {
    starboardMessageId: "post",
    score: 5,
    suppressed: false,
  };

  test("posts a new message that crosses the threshold", () => {
    expect(
      decideAction({
        score: 5,
        threshold: 5,
        vetoed: false,
        existing: undefined,
      }),
    ).toBe("post");
  });

  test("does nothing for a new message below the threshold", () => {
    expect(
      decideAction({
        score: 4,
        threshold: 5,
        vetoed: false,
        existing: undefined,
      }),
    ).toBe("nothing");
  });

  test("does not post a vetoed message however popular", () => {
    expect(
      decideAction({
        score: 50,
        threshold: 5,
        vetoed: true,
        existing: undefined,
      }),
    ).toBe("nothing");
  });

  test("heals a claimed-but-unposted row", () => {
    expect(
      decideAction({
        score: 5,
        threshold: 5,
        vetoed: false,
        existing: unposted,
      }),
    ).toBe("post");
  });

  test("leaves an existing post alone when the score has not moved", () => {
    expect(
      decideAction({ score: 5, threshold: 5, vetoed: false, existing: posted }),
    ).toBe("nothing");
  });

  test("edits an existing post when the score moves", () => {
    expect(
      decideAction({ score: 6, threshold: 5, vetoed: false, existing: posted }),
    ).toBe("edit");
  });

  test("deletes an existing post that drops below the threshold", () => {
    expect(
      decideAction({ score: 4, threshold: 5, vetoed: false, existing: posted }),
    ).toBe("delete");
  });

  test("deletes an existing post that gets vetoed", () => {
    expect(
      decideAction({ score: 9, threshold: 5, vetoed: true, existing: posted }),
    ).toBe("delete");
  });

  // Covers both a post a human deleted and one the cutover backfill adopted
  // from the previous starboard bot
  test.each([
    ["below threshold", 0, false],
    ["above threshold", 50, false],
    ["above threshold and vetoed", 50, true],
  ])("never revives a suppressed message (%s)", (_label, score, vetoed) => {
    expect(
      decideAction({
        score: score as number,
        threshold: 5,
        vetoed: vetoed as boolean,
        existing: { starboardMessageId: null, score: 0, suppressed: true },
      }),
    ).toBe("nothing");
  });
});

describe("truncate", () => {
  test.each([
    ["leaves short text alone", "hello", 10, "hello"],
    ["ellipsises long text within the limit", "hello world", 8, "hello w…"],
  ])("%s", (_label, text, max, expected) => {
    expect(truncate(text as string, max as number)).toBe(expected);
  });
});

const attachment = (
  overrides: Partial<StarboardAttachment> = {},
): StarboardAttachment => ({
  name: "cat.png",
  url: "https://cdn.discordapp.com/cat.png",
  size: 1024,
  contentType: "image/png",
  ...overrides,
});

const plainSource = (
  overrides: Partial<StarboardSource> = {},
): StarboardSource => ({
  url: "https://discord.com/channels/1/2/3",
  authorName: "Dician #992702",
  authorAvatarUrl: AVATAR,
  content: "Bravo to the dev team for this update",
  createdAt: new Date("2026-08-27T15:22:00Z"),
  attachments: [],
  embedImageUrl: null,
  stickerName: null,
  stickerUrl: null,
  replyPreview: null,
  forwarded: false,
  ...overrides,
});

describe("hasRenderableContent", () => {
  test("accepts plain text", () => {
    expect(hasRenderableContent(plainSource())).toBe(true);
  });

  test("accepts an image with no text", () => {
    expect(
      hasRenderableContent(
        plainSource({ content: "", attachments: [attachment()] }),
      ),
    ).toBe(true);
  });

  test("rejects a message with nothing to show", () => {
    expect(hasRenderableContent(plainSource({ content: "" }))).toBe(false);
  });
});

describe("describeStarboardPost", () => {
  const options = { emoji: "<:plusone:1>", score: 22 };

  test("leads with the count and a bare message link", () => {
    const render = describeStarboardPost(plainSource(), options);
    expect(render.content).toBe(
      "<:plusone:1> **22** | https://discord.com/channels/1/2/3",
    );
  });

  test("renders the author and timestamp for the embed", () => {
    const render = describeStarboardPost(plainSource(), options);
    expect(render.author).toEqual({
      name: "Dician #992702",
      iconURL: AVATAR,
    });
    expect(render.timestamp).toEqual(new Date("2026-08-27T15:22:00Z"));
    expect(render.description).toBe("Bravo to the dev team for this update");
    expect(render.fields).toEqual([]);
  });

  test("uses a lone image attachment as the embed image and re-uploads it", () => {
    const file = attachment();
    const render = describeStarboardPost(
      plainSource({ content: "", attachments: [file] }),
      options,
    );
    expect(render.imageUrl).toBe(file.url);
    expect(render.reuploadName).toBe(file.name);
    expect(render.fields).toEqual([]);
  });

  test("links rather than re-uploads an oversized image", () => {
    const file = attachment({ size: MAX_REUPLOAD_SIZE + 1 });
    const render = describeStarboardPost(
      plainSource({ attachments: [file] }),
      options,
    );
    expect(render.imageUrl).toBe(file.url);
    expect(render.reuploadName).toBeNull();
  });

  test("lists attachments beyond the first in a field", () => {
    const render = describeStarboardPost(
      plainSource({
        attachments: [
          attachment(),
          attachment({
            name: "dog.png",
            url: "https://cdn.discordapp.com/dog.png",
          }),
          attachment({ name: "notes.txt", contentType: "text/plain" }),
        ],
      }),
      options,
    );
    expect(render.imageUrl).toBe("https://cdn.discordapp.com/cat.png");
    expect(render.fields).toEqual([
      {
        name: "Attachments",
        value:
          "[dog.png](https://cdn.discordapp.com/dog.png)\n" +
          "[notes.txt](https://cdn.discordapp.com/cat.png)",
      },
    ]);
  });

  test("falls back to a link preview image when there is no attachment", () => {
    const render = describeStarboardPost(
      plainSource({ embedImageUrl: "https://example.com/preview.png" }),
      options,
    );
    expect(render.imageUrl).toBe("https://example.com/preview.png");
    expect(render.reuploadName).toBeNull();
  });

  test("prefers a real attachment over a link preview image", () => {
    const render = describeStarboardPost(
      plainSource({
        attachments: [attachment()],
        embedImageUrl: "https://example.com/preview.png",
      }),
      options,
    );
    expect(render.imageUrl).toBe("https://cdn.discordapp.com/cat.png");
  });

  test("names a sticker and shows it when there is no other image", () => {
    const render = describeStarboardPost(
      plainSource({
        content: "",
        stickerName: "Wave",
        stickerUrl: "https://cdn.discordapp.com/stickers/1.png",
      }),
      options,
    );
    expect(render.description).toBe("*Sticker: Wave*");
    expect(render.imageUrl).toBe("https://cdn.discordapp.com/stickers/1.png");
  });

  test("prefixes a reply with a truncated single-line preview", () => {
    const render = describeStarboardPost(
      plainSource({
        replyPreview: {
          authorName: "someone",
          content: `${"a".repeat(200)}\nsecond line`,
          url: "https://discord.com/channels/1/2/0",
        },
      }),
      options,
    );
    const [first] = render.description.split("\n");
    expect(first).toMatch(
      /^> \[replying to someone\]\(https:\/\/discord\.com\/channels\/1\/2\/0\): a+…$/,
    );
    expect(first.length).toBeLessThan(180);
  });

  test("marks a forward and reads its content from the snapshot", () => {
    const render = describeStarboardPost(
      plainSource({ forwarded: true, content: "the forwarded text" }),
      options,
    );
    expect(render.description).toBe("*Forwarded:*\nthe forwarded text");
  });

  test("truncates very long content", () => {
    const render = describeStarboardPost(
      plainSource({ content: "a".repeat(5000) }),
      options,
    );
    expect(render.description).toHaveLength(4000);
    expect(render.description.endsWith("…")).toBe(true);
  });
});
