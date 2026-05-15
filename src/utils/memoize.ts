const taggedCaches: Map<
  string,
  Set<WeakRef<Map<unknown, unknown>>>
> = new Map();

function registerCache(cache: Map<unknown, unknown>, tags?: string[]) {
  if (!tags) return;
  for (const tag of tags) {
    let set = taggedCaches.get(tag);
    if (!set) {
      set = new Set();
      taggedCaches.set(tag, set);
    }
    set.add(new WeakRef(cache));
  }
}

export function clearMemoized(tags: string[]) {
  for (const tag of tags) {
    const set = taggedCaches.get(tag);
    if (!set) continue;
    for (const ref of set) {
      const cache = ref.deref();
      if (cache) cache.clear();
      else set.delete(ref);
    }
  }
}

function getOrCreate<This extends WeakKey, V>(
  instances: WeakMap<This, Map<string, V>>,
  self: This,
  tags?: string[],
) {
  let cache = instances.get(self);
  if (!cache) {
    cache = new Map();
    instances.set(self, cache);
    registerCache(cache, tags);
  }
  return cache;
}

export function memoize(options?: { tags?: string[] }) {
  function forGetter<This extends WeakKey, Return>(
    target: (this: This) => Return,
  ) {
    const instances = new WeakMap<This, Map<string, Return>>();
    return function (this: This) {
      const cache = getOrCreate(instances, this, options?.tags);
      if (cache.has("")) return cache.get("")!;
      const value = target.call(this);
      cache.set("", value);
      return value;
    };
  }

  function forMethod<This extends WeakKey, Args extends unknown[], Return>(
    target: (this: This, ...args: Args) => Return,
  ) {
    const instances = new WeakMap<This, Map<string, Return>>();
    return function (this: This, ...args: Args) {
      const cache = getOrCreate(instances, this, options?.tags);
      const key = JSON.stringify(args);
      if (cache.has(key)) return cache.get(key)!;
      const value = target.call(this, ...args);
      cache.set(key, value);
      return value;
    };
  }

  return function <This extends WeakKey, Value>(
    target: (this: This, ...args: never) => Value,
    context: ClassMethodDecoratorContext | ClassGetterDecoratorContext,
  ) {
    if (context.kind === "getter") return forGetter(target);
    return forMethod(target);
  };
}

export function memoizeExpiring(ms: number) {
  return function <This extends WeakKey, Args extends unknown[], Return>(
    target: (this: This, ...args: Args) => Return,
  ) {
    const instances = new WeakMap<
      This,
      Map<string, { value: Return; expires: number }>
    >();
    return function (this: This, ...args: Args) {
      const cache = getOrCreate(instances, this);
      const key = JSON.stringify(args);
      const cached = cache.get(key);
      if (cached && cached.expires > Date.now()) return cached.value;
      const value = target.call(this, ...args);
      cache.set(key, { value, expires: Date.now() + ms });
      return value;
    };
  };
}
