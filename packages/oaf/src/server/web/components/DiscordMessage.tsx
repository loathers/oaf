import { useEffect, useState } from "react";

const formatDate = (d: Date) => {
  const days = Math.ceil(
    ((new Date().getTime() - d.getTime()) / 1000) * 60 * 60 * 24,
  );
  return `${
    days === 0 ? "Today" : days === 1 ? "Yesterday" : d.toLocaleDateString()
  } ${d.toLocaleTimeString(undefined, { timeStyle: "short" })}`;
};

type MessageData = {
  authorAvatar: string;
  authorName: string;
  createdAt: string;
  content: string;
};

type Props = {
  message: MessageData | null;
};

export default function DiscordMessage({ message }: Props) {
  return (
    <div className="discord-message">
      {message ? (
        <img
          className="dm-avatar"
          src={message.authorAvatar}
          alt={message.authorName}
        />
      ) : (
        <div className="skeleton skeleton-circle" />
      )}
      <div className="dm-body">
        <div className="dm-header">
          {message ? (
            <span className="dm-author">{message.authorName}</span>
          ) : (
            <span className="skeleton skeleton-text" />
          )}
          {message ? (
            <span className="dm-date">
              {formatDate(new Date(message.createdAt))}
            </span>
          ) : (
            <span className="skeleton skeleton-text" style={{ width: 60 }} />
          )}
        </div>
        {message ? (
          <span className="dm-content">{message.content}</span>
        ) : (
          <span className="skeleton skeleton-text-wide" />
        )}
      </div>
    </div>
  );
}

type DynamicProps = {
  guildId: string;
  channelId: string;
  messageId: string;
};

export function DynamicDiscordMessage({
  guildId,
  channelId,
  messageId,
}: DynamicProps) {
  const [message, setMessage] = useState<MessageData | null>(null);

  useEffect(() => {
    fetch(
      `/api/resources/message?guildId=${guildId}&channelId=${channelId}&messageId=${messageId}`,
    )
      .then((r) => r.json() as Promise<{ message: MessageData | null }>)
      .then((data) => setMessage(data.message))
      .catch(() => {});
  }, [guildId, channelId, messageId]);

  return <DiscordMessage message={message} />;
}
