import { DatabaseSync } from "node:sqlite";

import type { FlagsBackend, FlagsSnapshot, FlagType, FlagValue } from "./Flags.js";

export class SqliteFlagsBackend implements FlagsBackend {
  #db: DatabaseSync;

  constructor(path: string) {
    this.#db = new DatabaseSync(path);
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS flags (
        player TEXT NOT NULL,
        name   TEXT NOT NULL,
        type   TEXT NOT NULL CHECK(type IN ('daily', 'ascension', 'permanent')),
        value  TEXT NOT NULL,
        PRIMARY KEY (player, name)
      );
      CREATE TABLE IF NOT EXISTS flags_meta (
        player     TEXT PRIMARY KEY,
        day_number INTEGER NOT NULL DEFAULT 0,
        ascensions INTEGER NOT NULL DEFAULT 0
      );
    `);
  }

  load(username: string): FlagsSnapshot | null {
    const meta = this.#db
      .prepare("SELECT day_number, ascensions FROM flags_meta WHERE player = ?")
      .get(username) as { day_number: number; ascensions: number } | undefined;

    if (!meta) return null;

    const rows = this.#db
      .prepare("SELECT name, type, value FROM flags WHERE player = ?")
      .all(username) as { name: string; type: FlagType; value: string }[];

    const flags: Record<FlagType, Record<string, FlagValue>> = {
      daily: {},
      ascension: {},
      permanent: {},
    };

    for (const { name, type, value } of rows) {
      flags[type][name] = JSON.parse(value) as FlagValue;
    }

    return {
      username,
      daynumber: meta.day_number,
      ascensions: meta.ascensions,
      ...flags,
    };
  }

  save(snapshot: FlagsSnapshot): void {
    this.#db
      .prepare(
        "INSERT INTO flags_meta (player, day_number, ascensions) VALUES (?,?,?) " +
          "ON CONFLICT(player) DO UPDATE SET day_number=excluded.day_number, ascensions=excluded.ascensions",
      )
      .run(snapshot.username, snapshot.daynumber, snapshot.ascensions);

    this.#db.prepare("DELETE FROM flags WHERE player = ?").run(snapshot.username);

    const insert = this.#db.prepare(
      "INSERT INTO flags (player, name, type, value) VALUES (?,?,?,?)",
    );
    for (const [type, store] of [
      ["daily", snapshot.daily],
      ["ascension", snapshot.ascension],
      ["permanent", snapshot.permanent],
    ] as const) {
      for (const [name, value] of Object.entries(store)) {
        insert.run(snapshot.username, name, type, JSON.stringify(value));
      }
    }
  }
}
