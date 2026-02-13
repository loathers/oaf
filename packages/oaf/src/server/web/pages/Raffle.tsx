import { useEffect, useState } from "react";

type Winner = {
  tickets: number;
  place: number;
  player: {
    playerName: string;
    playerId: number;
    discordId: string | null;
  };
};

type Raffle = {
  gameday: number;
  firstPrize: number;
  secondPrize: number;
  winners: Winner[];
};

function formatWinners(winners: Winner[]) {
  return winners.map((w) => (
    <div key={w.player.playerId}>
      {w.player.playerName} (#{w.player.playerId})
      {w.player.discordId && " (verified)"}, {w.tickets} tickets
    </div>
  ));
}

export default function Raffle() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/admin/raffle");
        const data = (await r.json()) as { raffles: Raffle[] };
        setRaffles(data.raffles);
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
          <th>Gameday</th>
          <th>First Prize</th>
          <th>Winner</th>
          <th>Second Prize</th>
          <th>Winners</th>
        </tr>
      </thead>
      <tbody>
        {raffles.map((r) => (
          <tr key={r.gameday}>
            <td>{r.gameday}</td>
            <td>{r.firstPrize}</td>
            <td>{formatWinners(r.winners.filter((w) => w.place === 1))}</td>
            <td>{r.secondPrize}</td>
            <td>{formatWinners(r.winners.filter((w) => w.place === 2))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
