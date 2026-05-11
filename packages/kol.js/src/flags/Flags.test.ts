import { describe, expect, test, vi } from "vitest";
import { Flags, type FlagsBackend, type FlagsSnapshot } from "./Flags.js";

function makeSnapshot(overrides: Partial<FlagsSnapshot> = {}): FlagsSnapshot {
  return {
    username: "testuser",
    daynumber: 10,
    ascensions: 5,
    daily: {},
    ascension: {},
    permanent: {},
    ...overrides,
  };
}

function mockBackend(initial?: FlagsSnapshot): FlagsBackend {
  return {
    load: vi.fn().mockReturnValue(initial ?? null),
    save: vi.fn(),
  };
}

describe("sync", () => {
  test("clears daily flags when daynumber advances", () => {
    const flags = new Flags("user");
    flags.daily.set("foo", true);
    flags.sync(1, 0);
    expect(flags.daily.get("foo")).toBeUndefined();
  });

  test("preserves daily flags on the same day", () => {
    const flags = new Flags("user");
    flags.sync(5, 0);
    flags.daily.set("foo", true);
    flags.sync(5, 0);
    expect(flags.daily.get("foo")).toBe(true);
  });

  test("clears ascension flags when ascension count advances", () => {
    const flags = new Flags("user");
    flags.ascension.set("bar", 42);
    flags.sync(0, 1);
    expect(flags.ascension.get("bar")).toBeUndefined();
  });

  test("preserves ascension flags on the same ascension count", () => {
    const flags = new Flags("user");
    flags.sync(0, 3);
    flags.ascension.set("bar", 42);
    flags.sync(0, 3);
    expect(flags.ascension.get("bar")).toBe(42);
  });

  test("never clears permanent flags", () => {
    const flags = new Flags("user");
    flags.permanent.set("perm", "hello");
    flags.sync(999, 999);
    expect(flags.permanent.get("perm")).toBe("hello");
  });

  test("calls backend save after sync", () => {
    const backend = mockBackend();
    const flags = new Flags("user", backend);
    vi.mocked(backend.save).mockClear();
    flags.sync(1, 0);
    expect(backend.save).toHaveBeenCalledOnce();
  });
});

describe("export / import", () => {
  test("round-trips all three stores and watermarks", () => {
    const flags = new Flags("user");
    flags.sync(7, 3);
    flags.daily.set("d", true);
    flags.ascension.set("a", 99);
    flags.permanent.set("p", "hello");

    const snapshot = flags.export();
    const flags2 = new Flags("user");
    flags2.import(snapshot);

    expect(flags2.export()).toStrictEqual(snapshot);
  });

  test("import followed by sync with advanced day clears daily", () => {
    const flags = new Flags("user");
    flags.import(makeSnapshot({ daynumber: 5, daily: { foo: true } }));
    flags.sync(6, 5);
    expect(flags.daily.get("foo")).toBeUndefined();
  });

  test("import followed by sync on same day preserves daily", () => {
    const flags = new Flags("user");
    flags.import(makeSnapshot({ daynumber: 5, daily: { foo: true } }));
    flags.sync(5, 5);
    expect(flags.daily.get("foo")).toBe(true);
  });
});

describe("backend", () => {
  test("loads snapshot from backend on construction", () => {
    const backend = mockBackend(makeSnapshot({ permanent: { key: "val" } }));
    const flags = new Flags("user", backend);
    expect(backend.load).toHaveBeenCalledWith("user");
    expect(flags.permanent.get("key")).toBe("val");
  });

  test("no-ops when backend returns null", () => {
    const flags = new Flags("user", mockBackend());
    expect(flags.export().permanent).toStrictEqual({});
  });

  test("calls backend save when a flag is set", () => {
    const backend = mockBackend();
    const flags = new Flags("user", backend);
    vi.mocked(backend.save).mockClear();
    flags.daily.set("x", 1);
    expect(backend.save).toHaveBeenCalledOnce();
  });

  test("calls backend save when a flag is deleted", () => {
    const backend = mockBackend();
    const flags = new Flags("user", backend);
    flags.daily.set("x", 1);
    vi.mocked(backend.save).mockClear();
    flags.daily.delete("x");
    expect(backend.save).toHaveBeenCalledOnce();
  });
});

describe("two clients are independent", () => {
  test("flags set on one instance do not appear on another", () => {
    const a = new Flags("alice");
    const b = new Flags("bob");
    a.daily.set("shared", true);
    expect(b.daily.get("shared")).toBeUndefined();
  });
});
