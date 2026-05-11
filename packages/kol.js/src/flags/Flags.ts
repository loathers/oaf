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

class FlagStore {
  #data = new Map<string, FlagValue>();
  #onChange?: () => void;

  constructor(onChange?: () => void) {
    this.#onChange = onChange;
  }

  get(name: string): FlagValue | undefined {
    return this.#data.get(name);
  }

  set(name: string, value: FlagValue): void {
    this.#data.set(name, value);
    this.#onChange?.();
  }

  delete(name: string): void {
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

export class Flags {
  daily: FlagStore;
  ascension: FlagStore;
  permanent: FlagStore;

  #username: string;
  #daynumber = 0;
  #ascensions = 0;
  #backend?: FlagsBackend;

  constructor(username: string, backend?: FlagsBackend) {
    this.#username = username;
    this.#backend = backend;
    this.daily = new FlagStore(() => this.#persist());
    this.ascension = new FlagStore(() => this.#persist());
    this.permanent = new FlagStore(() => this.#persist());
    const snapshot = backend?.load(username);
    if (snapshot) this.#restore(snapshot);
  }

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
