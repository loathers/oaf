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
import { LoathingDate } from "../../clients/LoathingDate.js";
import { discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";

export const CONSENSUS_THRESHOLD = 11;

export const KNOWN_KEYS = ["snootee", "microbrewery", "jickjar", "votemonster"] as const;

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

  const gameday = LoathingDate.fromRealDate(new Date());

  await upsertPlayerInfo(playerId, playerName);
  await upsertDailySubmission(key, value, playerId, gameday);

  // Reactively clear old submissions from previous days
  await clearDailySubmissions(gameday);

  const consensus = await getDailyConsensusForKey(key, gameday);
  if (!consensus || consensus.count < CONSENSUS_THRESHOLD) return;

  const existing = await getDaily(key, gameday);
  await upsertDaily(key, gameday, consensus.value);

  const justFormed = !existing || existing.value !== consensus.value;

  if (justFormed) {
    const dissenters = await getDissentersForKey(key, gameday, consensus.value);
    const dissenterSuffix =
      dissenters.length > 0
        ? ` Dissenters:\n${dissenters.map(formatDissenter).join("\n")}`
        : "";
    await discordClient.alert(
      `Consensus reached for **${key}** = \`${consensus.value}\` (${consensus.count} votes).${dissenterSuffix}`,
    );
  } else if (value !== consensus.value) {
    const player = await kolClient.players.fetch(playerId);
    const playerDisplay = player?.name ?? playerName;
    await discordClient.alert(
      `Disagreeing submission for **${key}**: ${playerDisplay} (#${playerId}) submitted \`${value}\` (consensus is \`${consensus.value}\`)`,
    );
  }
}

export function init() {
  kolClient.on("whisper", (whisper) => {
    void handleSubmission(whisper.who.id, whisper.who.name, whisper.msg);
  });

  kolClient.on("rollover", () => {
    const gameday = LoathingDate.fromRealDate(new Date());
    void clearDailySubmissions(gameday);
  });
}
