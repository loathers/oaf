import { createClient } from "data-of-loathing";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const client = createClient({
  strategy: "local",
  path: join(dirname(fileURLToPath(import.meta.url)), "dol.sqlite"),
});

export const testDb = client.load().then(() => client);
