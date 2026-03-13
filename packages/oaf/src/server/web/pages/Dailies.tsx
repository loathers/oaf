import { useEffect, useState } from "react";

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
  const [keys, setKeys] = useState<string[]>([]);
  const [consensus, setConsensus] = useState<Consensus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/admin/dailies");
        const data = (await r.json()) as {
          keys: string[];
          consensus: Consensus[];
        };
        setKeys(data.keys);
        setConsensus(data.consensus);
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
            <th>Consensus Value</th>
            <th className="numeric">Votes</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const c = consensus.find((c) => c.key === key);
            return (
              <tr
                key={key}
                onClick={() => void loadDetail(key)}
                style={{ cursor: "pointer" }}
              >
                <td>
                  <strong>{key}</strong>
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
