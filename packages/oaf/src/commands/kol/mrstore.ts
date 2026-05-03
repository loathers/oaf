import { LoathingDate } from "kol.js";
import { MrStore, MrStoreUrgency } from "kol.js/domains/MrStore";

import {
  clearIotmRemovedFromStore,
  getIotmsInStore,
  setIotmRemovedFromStore,
  upsertIotmByName,
} from "../../clients/database.js";
import { kolClient } from "../../clients/kol.js";
import { determineIotmMonth } from "../../server/apps/oaf/routes/subs.js";

const IOTM_CATEGORY_PATTERN = /^.+'s Item-of-the-Month$/;

const mrStore = new MrStore(kolClient);

async function checkStore() {
  let items;
  try {
    items = await mrStore.getCurrentItems();
  } catch {
    return;
  }

  if (items.length === 0) return;

  const now = LoathingDate.getRollover();
  const month = determineIotmMonth();

  const currentNames = new Set<string>();

  for (const item of items) {
    currentNames.add(item.name);

    const subscriberItem = IOTM_CATEGORY_PATTERN.test(item.category);

    await upsertIotmByName({
      itemName: item.name,
      itemDescid: item.descid,
      itemImage: item.image,
      month,
      mraCost: item.cost,
      subscriberItem,
      addedToStore: now,
    });

    // Always clear first so stale predictions are removed, then re-predict if still leaving today
    await clearIotmRemovedFromStore(item.name);
    if (item.urgency === MrStoreUrgency.Today) {
      await setIotmRemovedFromStore(item.name, LoathingDate.getNextRollover());
    }
  }

  // Mark any previously-tracked items no longer in the store as removed
  const inStore = await getIotmsInStore();
  for (const iotm of inStore) {
    if (iotm.itemName && !currentNames.has(iotm.itemName)) {
      await setIotmRemovedFromStore(iotm.itemName, now);
    }
  }
}

export function init() {
  kolClient.on("rollover", () => void checkStore());
}
