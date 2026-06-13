import { LoathingDate } from "kol.js";
import { MrStore, MrStoreUrgency } from "kol.js/domains/MrStore";

import {
  clearMrStoreItemRemovedFromStore,
  getMrStoreItemsInStore,
  setMrStoreItemRemovedFromStore,
  upsertMrStoreItemByName,
} from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import { determineIotmMonth } from "../../server/apps/oaf/routes/subs.js";

const IOTM_CATEGORY_PATTERN = /^.+'s Item-of-the-Month$/;
const IOTY_CATEGORY_PATTERN = /^.+'s Item-of-the-Year$/;

function deriveCategory(category: string): "iotm" | "ioty" | "other" {
  if (IOTM_CATEGORY_PATTERN.test(category)) return "iotm";
  if (IOTY_CATEGORY_PATTERN.test(category)) return "ioty";
  return "other";
}

function getMonthForCategory(category: "iotm" | "ioty" | "other"): Date | null {
  if (category === "iotm") return determineIotmMonth();
  if (category === "ioty")
    return new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  return null;
}

const mrStore = new MrStore(kolClient);

export async function checkStore() {
  let items;
  try {
    items = await mrStore.getCurrentItems();
  } catch (error) {
    void discordClient.alert(
      "checkStore failed to fetch Mr. Store",
      undefined,
      error instanceof Error ? error : undefined,
    );
    return;
  }

  try {
    // An empty fetch is treated as untrustworthy (the API returns {} during
    // rollover) - skip rather than mark every tracked item as removed.
    if (items.length === 0) {
      void discordClient.alert(
        "checkStore: store fetch was empty - skipping (possible rollover quirk)",
      );
      return;
    }

    const now = LoathingDate.getRollover();

    const currentNames = new Set<string>();

    for (const item of items) {
      currentNames.add(item.name);

      // Isolate each item so one failure can't abort the whole run (and,
      // crucially, can't skip the removal-detection loop below).
      try {
        const category = deriveCategory(item.category);
        const subscriberItem = category === "iotm";

        // iotms belong to a month; ioty items are always January; permanent
        // ("other") items have no meaningful month.
        const month = getMonthForCategory(category);

        await upsertMrStoreItemByName({
          itemName: item.name,
          itemDescid: item.descid,
          itemImage: item.image,
          category,
          month,
          mraCost: item.cost,
          currency: item.currency,
          subscriberItem,
          addedToStore: now,
        });

        // Always clear first so stale predictions are removed, then re-predict if still leaving today
        await clearMrStoreItemRemovedFromStore(item.name);
        if (item.urgency === MrStoreUrgency.Today) {
          void discordClient.alert(
            `checkStore: predicting removal of "${item.name}" at next rollover`,
          );
          await setMrStoreItemRemovedFromStore(
            item.name,
            LoathingDate.getNextRollover(),
          );
        }
      } catch (error) {
        void discordClient.alert(
          `checkStore: failed to process "${item.name}"`,
          undefined,
          error instanceof Error ? error : undefined,
        );
      }
    }

    // Mark any previously-tracked items no longer in the store as removed
    const inStore = await getMrStoreItemsInStore();
    for (const storeItem of inStore) {
      if (storeItem.itemName && !currentNames.has(storeItem.itemName)) {
        void discordClient.alert(
          `checkStore: marking "${storeItem.itemName}" as removed from store`,
        );
        await setMrStoreItemRemovedFromStore(storeItem.itemName, now);
      }
    }
  } catch (error) {
    void discordClient.alert(
      "checkStore failed unexpectedly",
      undefined,
      error instanceof Error ? error : undefined,
    );
  }
}

export function init() {
  kolClient.on("rollover", () => void checkStore());
}
