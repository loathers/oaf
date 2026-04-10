function wrap<This extends WeakKey, Args extends unknown[], Return>(
  fn: (this: This, ...args: Args) => Promise<Return>,
): (this: This, ...args: Args) => Promise<Return> {
  const pending = new WeakMap<This, Promise<Return>>();
  return async function (this: This, ...args: Args) {
    const existing = pending.get(this);
    if (existing) return existing;
    const promise = fn.call(this, ...args);
    pending.set(this, promise);
    try {
      return await promise;
    } finally {
      pending.delete(this);
    }
  };
}

/**
 * Standalone wrapper for deduplicating an async method by instance.
 *
 *   private doLogin = deduplicate(async () => { ... });
 */
export function deduplicate<This extends WeakKey, Return>(
  fn: (this: This) => Promise<Return>,
): (this: This) => Promise<Return> {
  return wrap(fn);
}

/**
 * TC39 decorator form — ready for when runtimes support stage 3 decorators.
 *
 *   @deduplicateDecorator()
 *   async login() { ... }
 */
export function deduplicateDecorator() {
  return function <This extends WeakKey, Args extends unknown[], Return>(
    target: (this: This, ...args: Args) => Promise<Return>,
    _context: ClassMethodDecoratorContext,
  ) {
    return wrap(target);
  };
}
