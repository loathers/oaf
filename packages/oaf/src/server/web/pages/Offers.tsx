import { useEffect, useState } from "react";

type Offer = {
  itemId: number;
  itemName: string;
  price: number;
  buyer: {
    playerId: number;
    playerName: string;
  };
};

export default function Offers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/admin/offers");
        const data = (await r.json()) as { offers: Offer[] };
        setOffers(data.offers);
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
          <th>Buyer</th>
          <th>Item</th>
          <th className="numeric">Price</th>
        </tr>
      </thead>
      <tbody>
        {offers.map((o) => (
          <tr key={`${o.buyer.playerId}-${o.itemId}`}>
            <td>
              {o.buyer.playerName} (#{o.buyer.playerId})
            </td>
            <td title={o.itemId.toString()}>{o.itemName}</td>
            <td className="numeric">{o.price.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
