import { useEffect, useState } from "react";

type DailyEntry = {
  key: string;
  displayName: string;
  crowdsourced: boolean;
  value: string | null;
  thresholdReached: boolean | null;
  submissionCount: number;
};

type Submission = {
  playerId: number;
  playerName: string;
  value: string;
  submittedAt: string;
  crowdsourcingIgnored: boolean;
};

export default function Dailies() {
  const [dailies, setDailies] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const ignore = async (playerId: number) => {
    await fetch(`/api/admin/dailies/ignore/${playerId}`, { method: "POST" });
    setSubmissions((prev) =>
      prev.map((s) =>
        s.playerId === playerId ? { ...s, crowdsourcingIgnored: true } : s,
      ),
    );
  };

  const unignore = async (playerId: number) => {
    await fetch(`/api/admin/dailies/ignore/${playerId}`, { method: "DELETE" });
    setSubmissions((prev) =>
      prev.map((s) =>
        s.playerId === playerId ? { ...s, crowdsourcingIgnored: false } : s,
      ),
    );
  };

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/admin/dailies");
        const data = (await r.json()) as {
          dailies: DailyEntry[];
        };
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

  const consensusValue = dailies.find((d) => d.key === selectedKey)?.value;

  const grouped = submissions.reduce<Record<string, Submission[]>>((acc, s) => {
    (acc[s.value] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div>
      <h2>Dailies</h2>
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {[...dailies]
            .sort((a, b) => {
              if (a.crowdsourced !== b.crowdsourced)
                return a.crowdsourced ? -1 : 1;
              const aReached = a.thresholdReached === true;
              const bReached = b.thresholdReached === true;
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
                    <td>
                      {entry.value ? (
                        <code>{entry.value}</code>
                      ) : (
                        <em>Pending</em>
                      )}
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={entry.key}
                  onClick={() => void loadDetail(entry.key)}
                  style={{
                    cursor: "pointer",
                    background:
                      entry.thresholdReached === true
                        ? "#c6f6d5"
                        : entry.thresholdReached === false
                          ? "#fefcbf"
                          : entry.submissionCount > 0
                            ? "#fed7d7"
                            : undefined,
                  }}
                >
                  <td>
                    <strong>{entry.displayName}</strong>
                  </td>
                  <td>
                    {entry.value ? (
                      <code>{entry.value}</code>
                    ) : entry.submissionCount > 0 ? (
                      <em>
                        Dissent ({entry.submissionCount} submission
                        {entry.submissionCount !== 1 ? "s" : ""})
                      </em>
                    ) : (
                      <em>No submissions</em>
                    )}
                  </td>
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
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {subs.map((s) => (
                        <tr
                          key={s.playerId}
                          style={
                            s.crowdsourcingIgnored
                              ? { opacity: 0.4 }
                              : undefined
                          }
                        >
                          <td>
                            {s.playerName} (#{s.playerId})
                          </td>
                          <td>
                            {new Date(s.submittedAt).toLocaleTimeString()}
                          </td>
                          <td>
                            {s.crowdsourcingIgnored ? (
                              <button
                                onClick={() => void unignore(s.playerId)}
                              >
                                Unignore
                              </button>
                            ) : (
                              consensusValue &&
                              value !== consensusValue && (
                                <button
                                  onClick={() => void ignore(s.playerId)}
                                >
                                  Ignore
                                </button>
                              )
                            )}
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
