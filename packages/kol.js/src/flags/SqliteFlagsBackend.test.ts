import { describe, expect, test } from "vitest";
import { SqliteFlagsBackend } from "./SqliteFlagsBackend.js";
import type { FlagsSnapshot } from "./Flags.js";

function makeSnapshot(username: string, overrides: Partial<FlagsSnapshot> = {}): FlagsSnapshot {
  return {
    username,
    daynumber: 10,
    ascensions: 5,
    daily: {},
    ascension: {},
    permanent: {},
    ...overrides,
  };
}

describe("SqliteFlagsBackend", () => {
  test("returns null for unknown username", () => {
    const backend = new SqliteFlagsBackend(":memory:");
    expect(backend.load("nobody")).toBeNull();
  });

  test("round-trips a full snapshot", () => {
    const backend = new SqliteFlagsBackend(":memory:");
    const snapshot = makeSnapshot("alice", {
      daynumber: 42,
      ascensions: 7,
      daily: { "storagePulled:1": true, count: 3 },
      ascension: { flag: "hello" },
      permanent: { pref: null },
    });
    backend.save(snapshot);
    expect(backend.load("alice")).toStrictEqual(snapshot);
  });

  test("two usernames in the same db are independent", () => {
    const backend = new SqliteFlagsBackend(":memory:");
    backend.save(makeSnapshot("alice", { daily: { a: true } }));
    backend.save(makeSnapshot("bob", { daily: { b: false } }));

    expect(backend.load("alice")?.daily).toStrictEqual({ a: true });
    expect(backend.load("bob")?.daily).toStrictEqual({ b: false });
  });

  test("save overwrites previous data for the same user", () => {
    const backend = new SqliteFlagsBackend(":memory:");
    backend.save(makeSnapshot("alice", { daily: { old: true } }));
    backend.save(makeSnapshot("alice", { daily: { new: 42 } }));
    expect(backend.load("alice")?.daily).toStrictEqual({ new: 42 });
  });

  test("stores all value types correctly", () => {
    const backend = new SqliteFlagsBackend(":memory:");
    backend.save(
      makeSnapshot("alice", {
        daily: { bool: true, num: 99, str: "hello", nil: null },
      }),
    );
    const loaded = backend.load("alice");
    expect(loaded?.daily).toStrictEqual({ bool: true, num: 99, str: "hello", nil: null });
  });

  test("flags appear in the correct type buckets", () => {
    const backend = new SqliteFlagsBackend(":memory:");
    backend.save(
      makeSnapshot("alice", {
        daily: { d: 1 },
        ascension: { a: 2 },
        permanent: { p: 3 },
      }),
    );
    const loaded = backend.load("alice")!;
    expect(loaded.daily).toStrictEqual({ d: 1 });
    expect(loaded.ascension).toStrictEqual({ a: 2 });
    expect(loaded.permanent).toStrictEqual({ p: 3 });
  });
});
