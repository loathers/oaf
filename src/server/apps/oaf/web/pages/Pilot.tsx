import { useEffect, useRef, useState } from "react";

type Channel = { name: string; id: string };
type Emoji = { name: string | null; id: string; url: string };
type Result = { success: boolean; warning?: string };

function describeResult(result: Result) {
  if (!result.success)
    return { style: "alert-error", text: "Something went wrong" };
  if (result.warning) return { style: "alert-warning", text: result.warning };
  return { style: "alert-success", text: "Message sent successfully" };
}

export default function Pilot() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [emoji, setEmoji] = useState<Emoji[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const messageInput = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/admin/pilot");
        const data = (await r.json()) as {
          channels: Channel[];
          emoji: Emoji[];
        };
        setChannels(data.channels.sort((a, b) => a.name.localeCompare(b.name)));
        setEmoji(data.emoji);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function addEmoji(e: Emoji) {
    const el = messageInput.current;
    if (!el) return;
    el.value += `${el.value.endsWith(" ") ? "" : " "}<:${e.name}:${e.id}>`;
    setShowEmoji(false);
  }

  async function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setSubmitting(true);
    setResult(null);

    const form = new FormData(ev.currentTarget);
    const body = {
      channelId: form.get("channelId") as string,
      content: form.get("content") as string,
      reply: form.get("reply") as string,
      moderatorNotice: form.has("moderatorNotice"),
    };

    try {
      const r = await fetch("/api/admin/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await r.json()) as Result;
      setResult(data);
      if (data.success && messageInput.current) {
        messageInput.current.value = "";
      }
    } catch {
      setResult({ success: false });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Loading...</p>;

  const alert = result && describeResult(result);

  return (
    <div className="form-stack">
      {alert && <div className={`alert ${alert.style}`}>{alert.text}</div>}
      <form className="form-stack" onSubmit={(e) => void handleSubmit(e)}>
        <div>
          <label htmlFor="channelId">Channel</label>
          <select name="channelId" id="channelId">
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="reply">Reply to (optional)</label>
          <input
            name="reply"
            id="reply"
            placeholder="Paste a message link here if you want the bot to send a reply. Ignores any specified channel."
          />
        </div>
        <div>
          <label htmlFor="content">Message</label>
          <div className="message-row">
            <textarea name="content" id="content" ref={messageInput} required />
            <div className="emoji-picker">
              <button
                className="emoji-btn"
                type="button"
                title="Emoji Picker"
                onClick={() => setShowEmoji(!showEmoji)}
              >
                🙂
              </button>
              {showEmoji && (
                <div className="emoji-grid">
                  {emoji.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => addEmoji(e)}
                    >
                      <img
                        width="30"
                        alt={e.name ?? ""}
                        title={e.name ?? ""}
                        src={e.url}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="checkbox-row">
          <input type="checkbox" name="moderatorNotice" id="moderatorNotice" />
          <label htmlFor="moderatorNotice">Moderator Notice</label>
        </div>
        <button type="submit" disabled={submitting}>
          {submitting ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
