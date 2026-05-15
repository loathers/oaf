import type { AscensionFlags, DailyFlags, FlagDescriptor, PermanentFlags } from "./registry.js";

export type FlagValue = boolean | number | string | null | FlagValue[] | { [key: string]: FlagValue };
export type FlagType = "daily" | "ascension" | "permanent";

export type FlagsSnapshot = {
  username: string;
  daynumber: number;
  ascensions: number;
  daily: Record<string, FlagValue>;
  ascension: Record<string, FlagValue>;
  permanent: Record<string, FlagValue>;
};

export interface FlagsBackend {
  load(username: string): FlagsSnapshot | null;
  save(snapshot: FlagsSnapshot): void;
}

class FlagStore<T extends Record<keyof T, FlagValue>> {
  #data = new Map<string, FlagValue>();
  #onChange?: () => void;

  constructor(onChange?: () => void) {
    this.#onChange = onChange;
  }

  get<K extends keyof T & string>(name: K): T[K] | undefined {
    return this.#data.get(name) as T[K] | undefined;
  }

  set<K extends keyof T & string>(name: K, value: T[K]): void {
    this.#data.set(name, value);
    this.#onChange?.();
  }

  delete<K extends keyof T & string>(name: K): void {
    this.#data.delete(name);
    this.#onChange?.();
  }

  clear(): void {
    this.#data.clear();
  }

  toObject(): Record<string, FlagValue> {
    return Object.fromEntries(this.#data);
  }

  fromObject(obj: Record<string, FlagValue>): void {
    this.#data = new Map(Object.entries(obj));
  }
}

export class Flags<
  D extends Record<keyof D, FlagValue> = DailyFlags,
  A extends Record<keyof A, FlagValue> = AscensionFlags,
  P extends Record<keyof P, FlagValue> = PermanentFlags,
> {
  daily: FlagStore<D>;
  ascension: FlagStore<A>;
  permanent: FlagStore<P>;

  #username: string;
  #daynumber = 0;
  #ascensions = 0;
  #backend?: FlagsBackend;

  constructor(username: string, backend?: FlagsBackend) {
    this.#username = username;
    this.#backend = backend;
    this.daily = new FlagStore<D>(() => this.#persist());
    this.ascension = new FlagStore<A>(() => this.#persist());
    this.permanent = new FlagStore<P>(() => this.#persist());
    const snapshot = backend?.load(username);
    if (snapshot) this.#restore(snapshot);
  }

  get daynumber(): number { return this.#daynumber; }

  sync(daynumber: number, ascensions: number): void {
    if (daynumber > this.#daynumber) {
      this.daily.clear();
      this.#daynumber = daynumber;
    }
    if (ascensions > this.#ascensions) {
      this.ascension.clear();
      this.#ascensions = ascensions;
    }
    this.#persist();
  }

  export(): FlagsSnapshot {
    return {
      username: this.#username,
      daynumber: this.#daynumber,
      ascensions: this.#ascensions,
      daily: this.daily.toObject(),
      ascension: this.ascension.toObject(),
      permanent: this.permanent.toObject(),
    };
  }

  import(snapshot: FlagsSnapshot): void {
    this.#restore(snapshot);
  }

  get<S extends FlagType, K extends string, V extends FlagValue>(
    { store, key, defaultValue }: FlagDescriptor<S, K, V>,
  ): V {
    const s = this[store] as FlagStore<Record<string, FlagValue>>;
    return (s.get(key) ?? defaultValue) as V;
  }

  set<S extends FlagType, K extends string, V extends FlagValue>(
    { store, key }: FlagDescriptor<S, K, V>,
    value: V,
  ): void {
    const s = this[store] as FlagStore<Record<string, FlagValue>>;
    s.set(key, value);
  }

  #restore(snapshot: FlagsSnapshot): void {
    this.#daynumber = snapshot.daynumber;
    this.#ascensions = snapshot.ascensions;
    this.daily.fromObject(snapshot.daily);
    this.ascension.fromObject(snapshot.ascension);
    this.permanent.fromObject(snapshot.permanent);
  }

  #persist(): void {
    this.#backend?.save(this.export());
  }
}
