import { useEffect, useState } from "react";

type Props = {
  id: string;
};

export function DiscordUser({ id }: Props) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/resources/user?id=${id}`)
      .then((r) => r.json() as Promise<{ user: { name: string } | null }>)
      .then((data) => setName(data.user?.name ?? null))
      .catch(() => {});
  }, [id]);

  return <span>{name ?? id}</span>;
}
