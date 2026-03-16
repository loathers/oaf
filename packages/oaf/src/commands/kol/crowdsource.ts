import { userMention } from "discord.js";

import { LoathingDate } from "../../clients/LoathingDate.js";
import {
  clearDailySubmissions,
  deleteDaily,
  getDaily,
  getDissentersForKey,
  getSubmissionSummaryForKey,
  upsertDaily,
  upsertDailySubmission,
  upsertPlayerInfo,
} from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import {
  CONSENSUS_THRESHOLD,
  DAILY_GLOBALS,
  updateGlobalsMessage,
} from "../misc/_globals.js";

const CROWDSOURCED_KEY_SET: Set<string> = new Set(
  DAILY_GLOBALS.filter((k) => k.crowdsourced).map((k) => k.key),
);

export function parseSubmission(msg: string) {
  const cleaned = msg.replaceAll("\u200B", "").replaceAll("&#8203;", "");
  const colonIndex = cleaned.indexOf(":");
  if (colonIndex < 1) return null;
  const key = cleaned.slice(0, colonIndex).trim().toLowerCase();
  const value = cleaned.slice(colonIndex + 1).trim();
  if (!key || !value) return null;
  if (!CROWDSOURCED_KEY_SET.has(key)) return null;
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

  const summary = await getSubmissionSummaryForKey(key, gameday);
  if (!summary) return;

  if (summary.topCount >= CONSENSUS_THRESHOLD) {
    const existing = await getDaily(key, gameday);
    await upsertDaily(key, gameday, summary.value, true);

    const justFormed =
      !existing || existing.value !== summary.value || !existing.thresholdReached;

    if (justFormed) {
      const dissenters = await getDissentersForKey(
        key,
        gameday,
        summary.value,
      );
      const dissenterSuffix =
        dissenters.length > 0
          ? ` Dissenters:\n${dissenters.map(formatDissenter).join("\n")}`
          : "";
      await discordClient.alert(
        `Consensus reached for **${key}** = \`${summary.value}\` (${summary.topCount} votes).${dissenterSuffix}`,
      );
      await updateGlobalsMessage();
    } else if (value !== summary.value) {
      const player = await kolClient.players.fetch(playerId);
      const playerDisplay = player?.name ?? playerName;
      await discordClient.alert(
        `Disagreeing submission for **${key}**: ${playerDisplay} (#${playerId}) submitted \`${value}\` (consensus is \`${summary.value}\`)`,
      );
    }
  } else if (summary.topCount === summary.totalCount) {
    // Sub-threshold but unanimous: store as preliminary value
    const existing = await getDaily(key, gameday);
    await upsertDaily(key, gameday, summary.value, false);
    if (!existing || existing.value !== summary.value) {
      await updateGlobalsMessage();
    }
  } else {
    // Sub-threshold with dissent: remove any preliminary value
    await deleteDaily(key, gameday);
    await updateGlobalsMessage();
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
