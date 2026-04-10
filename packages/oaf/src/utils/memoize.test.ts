import { describe, expect, it, vi } from "vitest";

import { clearMemoized, memoize, memoizeExpiring } from "./memoize.js";

describe("memoize", () => {
  it("caches method results by arguments", () => {
    class Foo {
      calls = 0;

      @memoize()
      compute(x: number) {
        this.calls++;
        return x * 2;
      }
    }

    const foo = new Foo();
    expect(foo.compute(3)).toBe(6);
    expect(foo.compute(3)).toBe(6);
    expect(foo.compute(5)).toBe(10);
    expect(foo.calls).toBe(2);
  });

  it("caches getter results per instance", () => {
    let calls = 0;

    class Bar {
      @memoize()
      get value() {
        calls++;
        return 42;
      }
    }

    const bar = new Bar();
    expect(bar.value).toBe(42);
    expect(bar.value).toBe(42);
    expect(calls).toBe(1);

    // Different instance gets its own cache
    const bar2 = new Bar();
    expect(bar2.value).toBe(42);
    expect(calls).toBe(2);
  });

  it("clears tagged caches", () => {
    class Baz {
      calls = 0;

      @memoize({ tags: ["test"] })
      compute() {
        this.calls++;
        return "result";
      }
    }

    const baz = new Baz();
    expect(baz.compute()).toBe("result");
    expect(baz.calls).toBe(1);

    clearMemoized(["test"]);

    expect(baz.compute()).toBe("result");
    expect(baz.calls).toBe(2);
  });
});

describe("memoizeExpiring", () => {
  it("caches results until they expire", () => {
    vi.useFakeTimers();

    class Timed {
      calls = 0;

      @memoizeExpiring(1000)
      compute() {
        this.calls++;
        return "fresh";
      }
    }

    const t = new Timed();
    expect(t.compute()).toBe("fresh");
    expect(t.compute()).toBe("fresh");
    expect(t.calls).toBe(1);

    vi.advanceTimersByTime(1001);

    expect(t.compute()).toBe("fresh");
    expect(t.calls).toBe(2);

    vi.useRealTimers();
  });
});
