import { userMention } from "discord.js";

import {
  clearDailySubmissions,
  getDaily,
  getDailyConsensusForKey,
  getDissentersForKey,
  upsertDaily,
  upsertDailySubmission,
  upsertPlayerInfo,
} from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";

const CONSENSUS_THRESHOLD = 11;

export const KNOWN_KEYS = ["snootee", "microbrewery", "jickjar", "votemonster"] as const;

const cache = new Map<string, { value: string; count: number }>();

export function parseSubmission(msg: string) {
  const cleaned = msg.replaceAll("\u200B", "");
  const colonIndex = cleaned.indexOf(":");
  if (colonIndex < 1) return null;
  const key = cleaned.slice(0, colonIndex).trim().toLowerCase();
  const value = cleaned.slice(colonIndex + 1).trim();
  if (!key || !value) return null;
  if (!KNOWN_KEYS.includes(key as (typeof KNOWN_KEYS)[number])) return null;
  return { key, value };
}

export function getConsensusValue(key: string): string | undefined {
  const entry = cache.get(key);
  if (entry && entry.count >= CONSENSUS_THRESHOLD) return entry.value;
  return undefined;
}

export function getConsensusValues(): ReadonlyMap<string, string> {
  const result = new Map<string, string>();
  for (const [key, entry] of cache) {
    if (entry.count >= CONSENSUS_THRESHOLD) {
      result.set(key, entry.value);
    }
  }
  return result;
}

function formatDissenter(d: {
  playerName: string;
  discordId: string | null;
  value: string;
}) {
  const mention = d.discordId ? ` (${userMention(d.discordId)})` : "";
  return `- ${d.playerName}${mention}: ${d.value}`;
}

async function handleSubmission(
  playerId: number,
  playerName: string,
  msg: string,
) {
  const parsed = parseSubmission(msg);
  if (!parsed) return;

  const { key, value } = parsed;

  await upsertPlayerInfo(playerId, playerName);
  await upsertDailySubmission(key, value, playerId);

  const previousEntry = cache.get(key);
  const previouslyHadConsensus =
    previousEntry && previousEntry.count >= CONSENSUS_THRESHOLD;
  const previousConsensusValue = previousEntry?.value;

  const consensus = await getDailyConsensusForKey(key);
  if (!consensus) return;

  cache.set(key, { value: consensus.value, count: consensus.count });

  if (consensus.count >= CONSENSUS_THRESHOLD) {
    const status = await kolClient.fetchStatus();
    const gameday = status ? Number(status.daynumber) : 0;
    await upsertDaily(key, gameday, consensus.value);

    const justFormed =
      !previouslyHadConsensus || previousConsensusValue !== consensus.value;

    if (justFormed) {
      const dissenters = await getDissentersForKey(key, consensus.value);
      if (dissenters.length > 0) {
        const lines = dissenters.map(formatDissenter);
        await discordClient.alert(
          `Consensus reached for **${key}** = \`${consensus.value}\` (${consensus.count} votes). Dissenters:\n${lines.join("\n")}`,
        );
      }
    } else if (value !== consensus.value) {
      const player = await kolClient.players.fetch(playerId);
      const playerDisplay = player?.name ?? playerName;
      await discordClient.alert(
        `Disagreeing submission for **${key}**: ${playerDisplay} (#${playerId}) submitted \`${value}\` (consensus is \`${consensus.value}\`)`,
      );
    }
  }
}

export async function init() {
  const rows = await getAllDailyConsensus();
  for (const row of rows) {
    cache.set(row.key, { value: row.value, count: Number(row.count) });
  }

  kolClient.on("whisper", (whisper) => {
    void handleSubmission(whisper.who.id, whisper.who.name, whisper.msg);
  });

  kolClient.on("rollover", () => {
    void (async () => {
      await clearDailySubmissions();
      cache.clear();
    })();
  });
}
