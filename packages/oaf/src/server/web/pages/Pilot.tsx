import { useEffect, useRef, useState } from "react";

type Channel = { name: string; id: string };
type Emoji = { name: string | null; id: string; url: string };

export default function Pilot() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [emoji, setEmoji] = useState<Emoji[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const messageInput = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/admin/pilot")
      .then((r) => r.json() as Promise<{ channels: Channel[]; emoji: Emoji[] }>)
      .then((data) => {
        setChannels(data.channels);
        setEmoji(data.emoji);
      });
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
    };

    try {
      const r = await fetch("/api/admin/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await r.json()) as { success: boolean };
      setResult(data.success);
      if (data.success && messageInput.current) {
        messageInput.current.value = "";
      }
    } catch {
      setResult(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="form-stack">
      {result !== null && (
        <div className={`alert ${result ? "alert-success" : "alert-error"}`}>
          {result ? "Message sent successfully" : "Something went wrong"}
        </div>
      )}
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
                      <img width="30" title={e.name ?? ""} src={e.url} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <button type="submit" disabled={submitting}>
          {submitting ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
