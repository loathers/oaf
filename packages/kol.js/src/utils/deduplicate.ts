export function deduplicate() {
  return function <This extends WeakKey, Args extends unknown[], Return>(
    target: (this: This, ...args: Args) => Promise<Return>,
    _context: ClassMethodDecoratorContext,
  ) {
    const pending = new WeakMap<This, Promise<Return>>();
    return async function (this: This, ...args: Args) {
      const self = this;
      const existing = pending.get(self);
      if (existing) return existing;
      const promise = target.call(this, ...args);
      pending.set(self, promise);
      try {
        return await promise;
      } finally {
        pending.delete(self);
      }
    };
  };
}
