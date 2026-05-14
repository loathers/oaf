import { describe, expect, test, vi } from "vitest";
import { cached } from "./cached.js";

describe("cached", () => {
  test("returns value from callback on first call", async () => {
    const cb = vi.fn().mockResolvedValue(42);
    const fn = cached(cb);
    expect(await fn()).toBe(42);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("returns cached value without re-calling callback", async () => {
    const cb = vi.fn().mockResolvedValue(42);
    const fn = cached(cb);
    await fn();
    await fn();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("concurrent calls share one in-flight fetch", async () => {
    const cb = vi.fn().mockResolvedValue(42);
    const fn = cached(cb);
    const [a, b, c] = await Promise.all([fn(), fn(), fn()]);
    expect(a).toBe(42);
    expect(b).toBe(42);
    expect(c).toBe(42);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("refresh re-fetches and returns new value", async () => {
    const cb = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    const fn = cached(cb);
    expect(await fn()).toBe(1);
    expect(await fn.refresh()).toBe(2);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  test("invalidate clears cache so next call re-fetches", async () => {
    const cb = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    const fn = cached(cb);
    expect(await fn()).toBe(1);
    fn.invalidate();
    expect(await fn()).toBe(2);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  test("does not cache errors — next call retries", async () => {
    const cb = vi.fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce(99);
    const fn = cached(cb);
    await expect(fn()).rejects.toThrow("fail");
    expect(await fn()).toBe(99);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  test("invalidate mid-flight discards stale result", async () => {
    let resolveFirst!: (v: number) => void;
    const first = new Promise<number>((r) => { resolveFirst = r; });
    const cb = vi.fn().mockReturnValueOnce(first).mockResolvedValueOnce(2);
    const fn = cached(cb);

    const pendingFirst = fn();
    fn.invalidate();
    const second = await fn();
    resolveFirst(1);

    expect(second).toBe(2);
    expect(await pendingFirst).toBe(1);
    // value should be 2 (second fetch), not overwritten by the stale first fetch
    expect(await fn()).toBe(2);
    expect(cb).toHaveBeenCalledTimes(2);
  });
});
