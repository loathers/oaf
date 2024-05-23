import { dedent } from "ts-dedent";

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

  getPhaseDescription(phase: number) {
    switch (phase) {
      case 0:
        return "new";
      case 1:
        return "waxing crescent";
      case 2:
        return "first quarter";
      case 3:
        return "waxing gibbous";
      case 4:
        return "full";
      case 5:
        return "waning gibbous";
      case 6:
        return "last quarter";
      case 7:
        return "waning crescent";
      default:
        return "missing";
    }
  }

  getRonaldPhase() {
    return this.getPhase() % 8;
  }

  getRonaldPhaseDescription() {
    return this.getPhaseDescription(this.getRonaldPhase());
  }

  getGrimacePhase() {
    return Math.floor(this.getPhase() / 2);
  }

  getGrimacePhaseDescription() {
    return this.getPhaseDescription(this.getGrimacePhase());
  }

  getHamburglarPhase() {
    const cycle = this.getDaysSinceEpoch() - LoathingDate.COLLISION;
    if (cycle < 0) return null;
    return (cycle * 2) % 11;
  }

  getHamburglarPhaseDescription() {
    switch (this.getHamburglarPhase()) {
      case 0:
        return "in front of Grimace's left side";
      case 1:
        return "in front of Grimace's right side";
      case 2:
        return "heading behind Grimace";
      case 3:
        return "hidden behind Grimace";
      case 4:
        return "appering from behind Grimace";
      case 5:
        return "disppering behind Ronald";
      case 6:
        return "hidden behind Ronald";
      case 7:
        return "returning from behind Ronald";
      case 8:
        return "in front of Ronald's left side";
      case 9:
        return "in front of Ronald's right side";
      case 10:
        return "front and center";
      default:
        return "in an unknown location";
    }
  }

  getHamburglarLight() {
    const g = this.getGrimacePhase();
    const r = this.getRonaldPhase();
    switch (this.getHamburglarPhase()) {
      case 0:
        return g > 0 && g < 5 ? -1 : 1;
      case 1:
        return g < 4 ? 1 : -1;
      case 2:
        return g > 3 ? 1 : 0;
      case 4:
        return g > 0 && g < 5 ? 1 : 0;
      case 5:
        return r > 3 ? 1 : 0;
      case 7:
        return r > 0 && r < 5 ? 1 : 0;
      case 8:
        return r > 0 && r < 5 ? -1 : 1;
      case 9:
        return r < 4 ? 1 : -1;
      case 10:
        return (r > 3 ? 1 : 0) + (g > 0 && g < 5 ? 1 : 0);
      default:
        return 0;
    }
  }

  getMoonDescription() {
    return `Ronald is ${this.getRonaldPhaseDescription()}, Grimace is ${this.getGrimacePhaseDescription()}, and Hamburglar is ${this.getHamburglarPhaseDescription()}`;
  }

  getMoonsAsSvg(font?: string) {
    const moonIcons = ["🌑", "🌘", "🌗", "🌖", "🌕", "🌔", "🌓", "🌒"];

    const hamburglarPositions = [
      73,
      87,
      100,
      null,
      60,
      40,
      null,
      0,
      13,
      27,
      50,
    ];
    const hamburglarPhase = this.getHamburglarPhase();
    const hamburglarX = hamburglarPhase
      ? hamburglarPositions[hamburglarPhase]
      : null;
    const hamburglarIcon = this.getHamburglarLight() > 0 ? "🌕" : "🌑";

    const fontFamily = font ? ` font-family="${font}"` : "";

    return dedent`
      <?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="110" height="40" style="dominant-baseline: hanging;">
        <text id="ronald" x="10" y="7" font-size="30"${fontFamily}>${
          moonIcons[this.getRonaldPhase()]
        }</text>
        <text id="grimace" x="70" y="7" font-size="30"${fontFamily}>${
          moonIcons[this.getGrimacePhase()]
        }</text>
        ${
          hamburglarX !== null &&
          `<text id="hamburglar" x="${hamburglarX}" y="16" font-size="10"${fontFamily}>${hamburglarIcon}</text>`
        }
      </svg>
    `;
  }

  toString() {
    return `${this.getMonthName()} ${this.getDate()} Year ${this.getYear()}`;
  }

  toShortString() {
    return `${this.getYear()}-${this.getMonthName().slice(
      0,
      3,
    )}-${this.getDate()}`.toUpperCase();
  }
}
