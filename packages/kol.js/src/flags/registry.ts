import type { FlagType, FlagValue } from "./Flags.js";

export type FlagDescriptor<S extends FlagType, K extends string, V extends FlagValue> = {
  readonly store: S;
  readonly key: K;
  readonly defaultValue: V;
};

function makeFlag<S extends FlagType>(store: S) {
  return function flag<V extends FlagValue, K extends string = string>(
    key: K,
    defaultValue: V,
  ): FlagDescriptor<S, K, V> {
    return { store, key, defaultValue };
  };
}

const daily = makeFlag("daily");
// @ts-ignore -- reserved for future flags
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ascension = makeFlag("ascension");
// @ts-ignore -- reserved for future flags
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const permanent = makeFlag("permanent");

type RegistryFromKeys<T extends Record<string, FlagDescriptor<FlagType, string, FlagValue>>> = {
  [K in keyof T as T[K]["key"]]: T[K]["defaultValue"];
};

export const DailyFlag = {
  /** Item IDs pulled from Hagnk's storage today. One pull per item allowed per day in ronin/hardcore. */
  storagePulls: daily<number[]>("storage.pulls", []),
  /** Map of skill ID → cast count for all skills cast today. */
  skillCasts: daily<Record<string, number>>("skills.casts", {}),
} as const;

export const AscensionFlag = {} as const;

export const PermanentFlag = {} as const;

export type DailyFlags = RegistryFromKeys<typeof DailyFlag>;
export type AscensionFlags = RegistryFromKeys<typeof AscensionFlag>;
export type PermanentFlags = RegistryFromKeys<typeof PermanentFlag>;
