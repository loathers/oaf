import { LoathingDate } from "kol.js";
import { MrStore, MrStoreUrgency } from "kol.js/domains/MrStore";

import {
  clearIotmRemovedFromStore,
  getIotmsInStore,
  setIotmRemovedFromStore,
  upsertIotmByName,
} from "../../clients/database.js";
import { discordClient } from "../../clients/discord.js";
import { kolClient } from "../../clients/kol.js";
import { determineIotmMonth } from "../../server/apps/oaf/routes/subs.js";

const IOTM_CATEGORY_PATTERN = /^.+'s Item-of-the-Month$/;

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
    void discordClient.alert(
      `checkStore: fetched ${items.length} item(s) - ${items.map((i) => `${i.name} (urgency=${i.urgency})`).join(", ") || "none"}`,
    );

    // An empty fetch is treated as untrustworthy (the API returns {} during
    // rollover) - skip rather than mark every tracked item as removed.
    if (items.length === 0) {
      void discordClient.alert(
        "checkStore: store fetch was empty - skipping (possible rollover quirk)",
      );
      return;
    }

    const now = LoathingDate.getRollover();
    const month = determineIotmMonth();

    const currentNames = new Set<string>();

    for (const item of items) {
      // Mr. Store lists the current IotM alongside permanent stock (Mr. Accessories,
      // name-change form, etc.). Only the actual Item of the Month - whose category
      // is e.g. "June's Item-of-the-Month" - should be tracked.
      if (!IOTM_CATEGORY_PATTERN.test(item.category)) continue;

      currentNames.add(item.name);

      // Isolate each item so one failure can't abort the whole run (and,
      // crucially, can't skip the removal-detection loop below).
      try {
        await upsertIotmByName({
          itemName: item.name,
          itemDescid: item.descid,
          itemImage: item.image,
          month,
          mraCost: item.cost,
          subscriberItem: true,
          addedToStore: now,
        });

        // Always clear first so stale predictions are removed, then re-predict if still leaving today
        await clearIotmRemovedFromStore(item.name);
        if (item.urgency === MrStoreUrgency.Today) {
          void discordClient.alert(
            `checkStore: predicting removal of "${item.name}" at next rollover`,
          );
          await setIotmRemovedFromStore(
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

    // If a non-empty fetch yielded no IotM, KoL has likely changed the category
    // format. Treat it as untrustworthy (like an empty fetch) rather than running
    // removal-detection, which would wrongly mark the live IotM as removed.
    if (currentNames.size === 0) {
      void discordClient.alert(
        `checkStore: fetched ${items.length} item(s) but none matched the IotM category - store format may have changed; skipping`,
      );
      return;
    }

    // Mark any previously-tracked items no longer in the store as removed
    const inStore = await getIotmsInStore();
    for (const iotm of inStore) {
      if (iotm.itemName && !currentNames.has(iotm.itemName)) {
        void discordClient.alert(
          `checkStore: marking "${iotm.itemName}" as removed from store`,
        );
        await setIotmRemovedFromStore(iotm.itemName, now);
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
