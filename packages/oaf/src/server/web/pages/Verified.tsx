import { useEffect, useState } from "react";

import { DiscordUser } from "../components/DiscordUser.js";

type Player = {
  playerId: number;
  playerName: string;
  discordId: string | null;
};

export default function Verified() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/admin/verified");
        const data = (await r.json()) as { players: Player[] };
        setPlayers(data.players);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Player</th>
          <th>Discord User</th>
        </tr>
      </thead>
      <tbody>
        {players.map((p) => (
          <tr key={p.playerId}>
            <td>
              {p.playerName} (#{p.playerId})
            </td>
            <td>{p.discordId && <DiscordUser id={p.discordId} />}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
