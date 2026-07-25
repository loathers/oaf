import { Events, type MessageCreateOptions } from "discord.js";
import { LoathingDate } from "kol.js";
import {
  type JoustOdds,
  KNIGHTS,
  RenaissanceTimes,
} from "kol.js/domains/RenaissanceTimes";

import {
  getJoustState,
  getMrStoreItemByName,
  setJoustState,
} from "../../clients/database.js";
import { createEmbed, discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import { config } from "../../config.js";
import {
  TIME_TWITCHING_TOOLBELT,
  getTowerStatus,
} from "../../timeTwitchingTower.js";

const renaissanceTimes = new RenaissanceTimes(kolClient);

// Results older than this (e.g. history seen after downtime) are recorded but
// not announced.
const ANNOUNCE_WINDOW = 2 * 60 * 60 * 1000;

type CheckResult = "news" | "quiet" | "skip";

const HOUR = 60 * 60 * 1000;
const RETRY_DELAY = 60 * 1000;
const MAX_RETRIES = 15;

// Jousts turn over on the hour, so poll just after each hour and retry every
// minute until the expected update lands.
export function nextCheck(
  now: Date,
  result: CheckResult,
  retries: number,
): { delay: number; retries: number } {
  if (result === "quiet" && retries < MAX_RETRIES) {
    return { delay: RETRY_DELAY, retries: retries + 1 };
  }

  const nextHour = (Math.floor(now.getTime() / HOUR) + 1) * HOUR;
  return { delay: nextHour + RETRY_DELAY - now.getTime(), retries: 0 };
}

async function post(message: string | MessageCreateOptions) {
  if (!config.JOUST_CHANNEL_ID) return;
  const guild = await discordClient.guilds.fetch(config.GUILD_ID);
  const channel = guild?.channels.cache.get(config.JOUST_CHANNEL_ID);

  if (!channel?.isTextBased()) {
    await discordClient.alert(
      "Jousting: announcement channel not found or not text-based",
    );
    return;
  }

  await channel.send(message);
}

function oddsMessage(odds: JoustOdds): MessageCreateOptions {
  return {
    content:
      "⚔️ Odds are up at the Renaissance Times betting counter! The joust starts within the hour.",
    embeds: [
      createEmbed()
        .setTitle("⚔️ Joust Odds")
        .addFields(
          KNIGHTS.map((knight) => ({
            name: knight,
            value: `${odds[knight]}%`,
          })),
        ),
    ],
  };
}

export async function checkJoust(): Promise<CheckResult> {
  if (!config.JOUST_CHANNEL_ID) return "skip";
  if (kolClient.isRollover()) return "skip";

  const toolbelt = await getMrStoreItemByName(TIME_TWITCHING_TOOLBELT);
  const status = getTowerStatus(toolbelt, LoathingDate.getRollover());
  if (status !== "open" && status !== "opened") return "skip";

  const now = new Date();

  let counter: Awaited<ReturnType<typeof renaissanceTimes.getBettingCounter>>;
  let state: Awaited<ReturnType<typeof getJoustState>>;
  try {
    [counter, state] = await Promise.all([
      renaissanceTimes.getBettingCounter(now),
      getJoustState(),
    ]);
  } catch (error) {
    await discordClient.alert(
      "checkJoust: could not read the betting counter",
      undefined,
      error,
    );
    return "skip";
  }
  if (counter === null) return "skip";

  const newestJoust = counter.history[0]?.time.toISOString() ?? null;

  if (!state) {
    await setJoustState({
      lastSeenJoustTime: newestJoust,
      oddsAnnouncedFor: counter.odds ? newestJoust : null,
    });
    return "news";
  }

  let news = false;

  const lastSeen = state.lastSeenJoustTime
    ? new Date(state.lastSeenJoustTime).getTime()
    : 0;
  const newRounds = counter.history
    .filter((round) => round.time.getTime() > lastSeen)
    .toReversed();
  for (const round of newRounds) {
    news = true;
    if (now.getTime() - round.time.getTime() > ANNOUNCE_WINDOW) continue;
    await post(`🏆 ${round.winner} won the joust!`);
  }

  let oddsAnnouncedFor = state.oddsAnnouncedFor;
  if (counter.odds && oddsAnnouncedFor !== newestJoust) {
    await post(oddsMessage(counter.odds));
    oddsAnnouncedFor = newestJoust;
    news = true;
  }

  if (news) {
    await setJoustState({
      lastSeenJoustTime: newestJoust ?? state.lastSeenJoustTime,
      oddsAnnouncedFor,
    });
  }

  return news ? "news" : "quiet";
}

async function loop(retries: number) {
  let result: CheckResult = "skip";
  try {
    result = await checkJoust();
  } catch (error) {
    await discordClient.alert("checkJoust failed", undefined, error);
  }

  const next = nextCheck(new Date(), result, retries);
  setTimeout(() => void loop(next.retries), next.delay);
}

export function init() {
  if (!config.JOUST_CHANNEL_ID) return;
  discordClient.once(Events.ClientReady, () => void loop(0));
}
