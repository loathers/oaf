export default class SuffixArrayMatcher<T> {
  items: T[];
  itemToString: (item: T) => string;
  idToItem = new Map<number, T>();

  suffixes: { suffix: string; ids: number[] }[] = [];

  constructor(items: T[], itemToString: (item: T) => string) {
    this.items = items;
    this.itemToString = itemToString;

    const suffixMap: { [suffix: string]: number[] } = {};

    for (const item of this.items) {
      const id = this.idToItem.size;
      this.idToItem.set(id, item);

      const string = this.itemToString(item);
      for (const suffix of [...string].map((_, i) => string.slice(i))) {
        suffixMap[suffix] ||= [];
        suffixMap[suffix].push(id);
      }
    }

    this.suffixes = Object.entries(suffixMap)
      .map(([suffix, ids]) => ({
        suffix,
        ids,
      }))
      .sort((a, b) => (a.suffix < b.suffix ? -1 : 1));
  }

  match(query: string) {
    const matchIndex = query ? this.findIndex(query) : -1;
    if (matchIndex < 0) return [];
    return [
      ...new Set(
        [this.suffixes[matchIndex]]
          .concat(this.farmMatches(query, matchIndex))
          .reduce((acc, { ids }) => [...acc, ...ids], [] as number[])
      ),
    ].map((id) => this.idToItem.get(id)!);
  }

  private findIndex(query: string, start = 0, end = this.suffixes.length - 1): number {
    if (start > end) return -1;

    // Bitshift for a quick floored halve
    const midpoint = start + ((end - start) >> 1);

    const suffix = this.suffixes[midpoint].suffix;

    if (suffix.startsWith(query)) return midpoint;

    [start, end] = query < suffix ? [start, midpoint - 1] : [midpoint + 1, end];
    return this.findIndex(query, start, end);
  }

  /**
   * Walk up and down the array from our current match looking for more matches.
   * When we come across a non match stop.
   *
   * @param query
   * @param index
   * @returns
   */
  private farmMatches(query: string, index: number) {
    const matches = [];

    for (let i = index + 1; i < this.suffixes.length; i++) {
      const string = this.suffixes[i].suffix;
      if (!string.startsWith(query)) break;
      matches.push(this.suffixes[i]);
    }

    for (let i = index - 1; i >= 0; i--) {
      const string = this.suffixes[i].suffix;
      if (!string.startsWith(query)) break;
      matches.push(this.suffixes[i]);
    }

    return matches;
  }
}
