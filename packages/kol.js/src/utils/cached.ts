export type CachedFn<T> = {
  (): Promise<T>;
  refresh(): Promise<T>;
  invalidate(): void;
};

export function cached<T>(cb: () => Promise<T>): CachedFn<T> {
  let value: T | undefined;
  let pending: Promise<T> | undefined;
  let gen = 0;

  function startFetch(currentGen: number): Promise<T> {
    pending = cb().then(
      (v) => {
        if (gen === currentGen) { value = v; pending = undefined; }
        return v;
      },
      (e) => {
        if (gen === currentGen) pending = undefined;
        throw e;
      },
    );
    return pending;
  }

  const fn = (): Promise<T> => {
    if (value !== undefined) return Promise.resolve(value);
    return pending ?? startFetch(gen);
  };
  fn.refresh = (): Promise<T> => { gen++; value = undefined; pending = undefined; return fn(); };
  fn.invalidate = (): void => { gen++; value = undefined; pending = undefined; };

  return fn;
}
