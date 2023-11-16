export class LoathingDate {
  static EPOCH = new Date(Date.UTC(2003, 1, 1, 3, 30));
  static COLLISION = 1218;

  static getDaysSinceEpoch(year: number, month: number, date: number) {
    return (year - 1) * 96 + month * 8 + (date - 1);
  }

  #year: number;
  #month: number;
  #date: number;

  constructor(date: Date);
  constructor(year?: number, month?: number, date?: number);
  constructor(yearOrDate?: Date | number, month = 0, date = 0) {
    const daysSinceEpoch =
      yearOrDate instanceof Date || yearOrDate === undefined
        ? ((yearOrDate ?? new Date()).getTime() -
            LoathingDate.EPOCH.getTime()) /
          (1000 * 60 * 60 * 24)
        : LoathingDate.getDaysSinceEpoch(yearOrDate, month, date);

    this.#year = Math.floor(daysSinceEpoch / 96) + 1;
    this.#month = Math.floor((daysSinceEpoch % 96) / 8);
    this.#date = Math.floor(daysSinceEpoch % 8) + 1;
  }

  getYear() {
    return this.#year;
  }

  getMonth() {
    return this.#month;
  }

  getMonthName() {
    return [
      "Jarlsuary",
      "Frankuary",
      "Starch",
      "April",
      "Martinus",
      "Bill",
      "Bor",
      "Petember",
      "Carlvember",
      "Porktober",
      "Boozember",
      "Dougtember",
    ][this.#month % 12];
  }

  getDate() {
    return this.#date;
  }

  getDaysSinceEpoch() {
    return LoathingDate.getDaysSinceEpoch(
      this.getYear(),
      this.getMonth(),
      this.getDate(),
    );
  }

  getPhase() {
    return (this.getMonth() * 8 + (this.getDate() - 1)) % 16;
  }

  getRonaldPhase() {
    return this.getPhase() % 8;
  }

  getGrimacePhase() {
    return Math.floor(this.getPhase() / 2);
  }

  getHamburglarPhase() {
    const cycle = this.getDaysSinceEpoch() - LoathingDate.COLLISION;
    if (cycle < 0) return null;
    return (cycle * 2) % 11;
  }

  toString() {
    return `${this.getMonthName()} ${this.getDate()} Year ${this.getYear()}`;
  }
}
