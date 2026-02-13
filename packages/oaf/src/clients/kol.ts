import { Client, type MallPrice } from "kol.js";

import { config } from "../config.js";

export const kolClient = new Client(config.KOL_USER, config.KOL_PASS);

const mallPriceCache = new Map<number, { data: MallPrice; expires: number }>();

const MALL_PRICE_CACHE_MS = 60 * 60 * 1000; // 1 hour

export async function getMallPrice(itemId: number) {
  const cached = mallPriceCache.get(itemId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const data = await kolClient.getMallPrice(itemId);
  mallPriceCache.set(itemId, {
    data,
    expires: Date.now() + MALL_PRICE_CACHE_MS,
  });
  return data;
}
