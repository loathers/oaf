import { useEffect, useState } from "react";

import { DynamicDiscordMessage } from "../components/DiscordMessage.js";
import { DiscordUser } from "../components/DiscordUser.js";

type Tag = {
  tag: string;
  guildId: string;
  channelId: string;
  messageId: string;
  createdAt: string;
  createdBy: string;
};

export default function Tags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/tags")
      .then((r) => r.json() as Promise<{ tags: Tag[] }>)
      .then((data) => setTags(data.tags))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Tag</th>
          <th>Content</th>
          <th>At</th>
          <th>By</th>
        </tr>
      </thead>
      <tbody>
        {tags.map((t) => (
          <tr key={t.tag}>
            <td>
              <code>{t.tag}</code>
            </td>
            <td>
              <DynamicDiscordMessage
                guildId={t.guildId}
                channelId={t.channelId}
                messageId={t.messageId}
              />
            </td>
            <td>{new Date(t.createdAt).toLocaleString()}</td>
            <td>
              <DiscordUser id={t.createdBy} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
