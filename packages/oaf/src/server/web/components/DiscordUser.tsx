import { useEffect, useState } from "react";

type Props = {
  id: string;
};

export function DiscordUser({ id }: Props) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch(`/api/resources/user?id=${id}`);
        const data = (await r.json()) as { user: { name: string } | null };
        setName(data.user?.name ?? null);
      } catch {
        setName(null);
      }
    })();
  }, [id]);

  return <span>{name ?? id}</span>;
}
