import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Events,
  MessageFlags,
  userMention,
} from "discord.js";

import { LoathingDate } from "kol.js";
import {
  type SubmissionSummary,
  clearDailySubmissions,
  deleteDaily,
  getDaily,
  getDissentersForKey,
  getSubmissionSummaryForKey,
  isPlayerIgnoredForCrowdsourcing,
  setCrowdsourcingIgnored,
  upsertDaily,
  upsertDailySubmission,
  upsertPlayerInfo,
} from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import { config } from "../../config.js";
import {
  CONSENSUS_THRESHOLD,
  DAILY_GLOBALS,
  updateGlobalsMessage,
} from "../misc/_globals.js";

function isUnanimous(summary: SubmissionSummary) {
  return summary.topCount === summary.totalCount;
}

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

const IGNORE_BUTTON_PREFIX = "ignore-crowdsource:";

function ignoreButtonsFor(
  dissenters: { playerId: number; playerName: string }[],
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < dissenters.length; i += 5) {
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        dissenters.slice(i, i + 5).map((d) =>
          new ButtonBuilder()
            .setCustomId(`${IGNORE_BUTTON_PREFIX}${d.playerId}`)
            .setLabel(`Ignore ${d.playerName}`)
            .setStyle(ButtonStyle.Danger),
        ),
      ),
    );
  }
  return rows;
}

async function handleIgnoreButton(interaction: ButtonInteraction) {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      content: "This can only be done in a guild.",
    });
    return;
  }

  const roleToCompare = await interaction.guild.roles.fetch(
    config.EXTENDED_TEAM_ROLE_ID,
  );
  if (!roleToCompare) {
    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      content: "Could not find the required role.",
    });
    return;
  }

  const canAct = interaction.guild.roles.comparePositions(
    interaction.member.roles.highest,
    roleToCompare,
  );
  if (canAct < 0) {
    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      content: "Only moderators can ignore crowdsourcing players.",
    });
    return;
  }

  const playerId = parseInt(
    interaction.customId.slice(IGNORE_BUTTON_PREFIX.length),
    10,
  );
  await setCrowdsourcingIgnored(playerId, true);
  await interaction.update({ components: [] });
  await interaction.followUp({
    flags: [MessageFlags.Ephemeral],
    content: `Player #${playerId} will be ignored for crowdsourcing alerts.`,
  });
}

export async function handleSubmission(
  playerId: number,
  playerName: string,
  msg: string,
  time = new Date(),
) {
  const parsed = parseSubmission(msg);
  if (!parsed) return;

  const { key, value } = parsed;

  const gameday = LoathingDate.gameDayFromRealDate(time);

  await upsertPlayerInfo(playerId, playerName);
  await upsertDailySubmission(key, value, playerId, gameday);

  // Reactively clear old submissions from previous days
  await clearDailySubmissions(gameday);

  const summary = await getSubmissionSummaryForKey(key, gameday);
  if (!summary) return;

  if (summary.topCount >= CONSENSUS_THRESHOLD) {
    const existing = await getDaily(key, gameday);
    await upsertDaily(key, gameday, summary.value, true);

    // True if this is a new consensus, a changed value, or a sub-threshold
    // preliminary value that just crossed the threshold
    const justFormed =
      !existing || existing.value !== summary.value || !existing.thresholdReached;

    if (justFormed) {
      const dissenters = await getDissentersForKey(
        key,
        gameday,
        summary.value,
      );
      const activeDissenters = dissenters.filter(
        (d) => !d.crowdsourcingIgnored,
      );
      const dissenterSuffix =
        activeDissenters.length > 0
          ? ` Dissenters:\n${activeDissenters.map(formatDissenter).join("\n")}`
          : "";
      await discordClient.alert({
        content: `Consensus reached for **${key}** = \`${summary.value}\` (${summary.topCount} votes).${dissenterSuffix}`,
        components: ignoreButtonsFor(activeDissenters),
      });
      await updateGlobalsMessage();
    } else if (value !== summary.value) {
      if (await isPlayerIgnoredForCrowdsourcing(playerId)) return;
      const player = await kolClient.players.resolve(playerId);
      const playerDisplay = player?.name ?? playerName;
      await discordClient.alert(
        `Disagreeing submission for **${key}**: ${playerDisplay} (#${playerId}) submitted \`${value}\` (consensus is \`${summary.value}\`)`,
      );
    }
  } else if (isUnanimous(summary)) {
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
    void handleSubmission(whisper.who.id, whisper.who.name, whisper.msg, whisper.time);
  });

  kolClient.on("rollover", (time) => {
    const gameday = LoathingDate.gameDayFromRealDate(time);
    void clearDailySubmissions(gameday);
  });

  discordClient.on(Events.InteractionCreate, (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith(IGNORE_BUTTON_PREFIX)) return;
    void handleIgnoreButton(interaction);
  });
}
