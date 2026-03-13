import { useEffect, useState } from "react";

type DailyEntry = {
  key: string;
  displayName: string;
  crowdsourced: boolean;
  value: string | null;
};

type Consensus = {
  key: string;
  value: string;
  count: number;
};

type Submission = {
  playerId: number;
  playerName: string;
  value: string;
  submittedAt: string;
};

export default function Dailies() {
  const [dailies, setDailies] = useState<DailyEntry[]>([]);
  const [consensus, setConsensus] = useState<Consensus[]>([]);
  const [threshold, setThreshold] = useState(11);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/admin/dailies");
        const data = (await r.json()) as {
          threshold: number;
          consensus: Consensus[];
          dailies: DailyEntry[];
        };
        setThreshold(data.threshold);
        setConsensus(data.consensus);
        setDailies(data.dailies);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadDetail = async (key: string) => {
    if (selectedKey === key) {
      setSelectedKey(null);
      return;
    }
    setSelectedKey(key);
    setDetailLoading(true);
    try {
      const r = await fetch(`/api/admin/dailies/${key}`);
      const data = (await r.json()) as { submissions: Submission[] };
      setSubmissions(data.submissions);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  const grouped = submissions.reduce<Record<string, Submission[]>>(
    (acc, s) => {
      (acc[s.value] ??= []).push(s);
      return acc;
    },
    {},
  );

  return (
    <div>
      <h2>Dailies</h2>
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
            <th className="numeric">Votes</th>
          </tr>
        </thead>
        <tbody>
          {[...dailies]
            .sort((a, b) => {
              if (a.crowdsourced !== b.crowdsourced) return a.crowdsourced ? -1 : 1;
              const aReached = consensus.some((c) => c.key === a.key && c.count >= threshold);
              const bReached = consensus.some((c) => c.key === b.key && c.count >= threshold);
              if (aReached !== bReached) return aReached ? -1 : 1;
              return 0;
            })
            .map((entry) => {
            if (!entry.crowdsourced) {
              return (
                <tr
                  key={entry.key}
                  style={{ background: entry.value ? "#c6f6d5" : undefined }}
                >
                  <td>
                    <strong>{entry.displayName}</strong>
                  </td>
                  <td>{entry.value ? <code>{entry.value}</code> : <em>Pending</em>}</td>
                  <td className="numeric">{"\u{1F451}"}</td>
                </tr>
              );
            }

            const c = consensus.find((c) => c.key === entry.key);
            const reached = c !== undefined && c.count >= threshold;
            return (
              <tr
                key={entry.key}
                onClick={() => void loadDetail(entry.key)}
                style={{
                  cursor: "pointer",
                  background: reached ? "#c6f6d5" : undefined,
                }}
              >
                <td>
                  <strong>{entry.displayName}</strong>
                </td>
                <td>{c ? <code>{c.value}</code> : <em>No submissions</em>}</td>
                <td className="numeric">{c?.count ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedKey && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>
            Submissions for <code>{selectedKey}</code>
          </h3>
          {detailLoading ? (
            <p>Loading...</p>
          ) : submissions.length === 0 ? (
            <p>No submissions yet.</p>
          ) : (
            Object.entries(grouped)
              .sort(([, a], [, b]) => b.length - a.length)
              .map(([value, subs]) => (
                <div key={value} style={{ marginTop: "1rem" }}>
                  <h4>
                    <code>{value}</code>{" "}
                    <span style={{ color: "#718096", fontWeight: "normal" }}>
                      ({subs.length} vote{subs.length !== 1 ? "s" : ""})
                    </span>
                  </h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Submitted At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subs.map((s) => (
                        <tr key={s.playerId}>
                          <td>
                            {s.playerName} (#{s.playerId})
                          </td>
                          <td>
                            {new Date(s.submittedAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}
