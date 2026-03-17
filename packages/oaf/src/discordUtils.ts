import {
  APIEmbedField,
  hideLinkEmbed,
  hyperlink,
  inlineCode,
  userMention,
} from "discord.js";

export function columns<T extends { toString: () => string }>(
  data: T[],
  columns: number,
): APIEmbedField[] {
  return Array(columns)
    .fill(0)
    .map((_, i) => ({
      name: "\u200b",
      value:
        "\u200b" +
        data
          .slice(
            Math.ceil(i * (data.length / 3)),
            Math.ceil((i + 1) * (data.length / 3)),
          )
          .join("\n"),
      inline: true,
    }));
}

export function columnsByMaxLength<T extends { toString: () => string }>(
  data: T[],
  maxLength = 1024,
) {
  const columns = [];

  let column = "";
  for (const datum of data) {
    const str = datum.toString();
    if (column.length + str.length >= maxLength) {
      columns.push(column.slice(0, -1));
      column = "";
    }
    column += str + "\n";
  }

  if (column.length > 0) {
    columns.push(column);
  }

  return columns.map((col) => ({
    name: "\u200b",
    value: "\u200b" + col,
  }));
}

export function formatPlayer(
  player:
    | { name: string; id: number }
    | Partial<{
        playerName: string;
        playerId: number;
        discordId: string | null;
      }>
    | undefined,
  backupId?: number,
) {
  let playerName: string | undefined = undefined;
  let playerId: number | undefined = backupId;
  let discordId: string | undefined = undefined;

  if (player) {
    if ("name" in player) {
      playerName = player.name;
      playerId = player.id;
    } else {
      playerName = player.playerName;
      playerId = player.playerId;
      discordId = player.discordId ?? undefined;
    }
  }

  // Closure to wrap text in a hyperlink if we have a player id
  const maybeHyperlink = (text: string) => {
    if (!playerId) return text;
    return hyperlink(
      text,
      hideLinkEmbed(
        `https://www.kingdomofloathing.com/showplayer.php?who=${playerId}`,
      ),
    );
  };

  // Format the best player name we can
  const playerLink = maybeHyperlink(
    `${playerName ?? "Unknown Username"} (#${playerId ?? "???"})`,
  );

  // Add Discord mention if available
  return discordId ? `${playerLink} ${userMention(discordId)}` : playerLink;
}

export function inlineExpression(value: string) {
  if (value.startsWith("[") && value.endsWith("]"))
    return inlineCode(value.slice(1, -1));
  return value;
}
