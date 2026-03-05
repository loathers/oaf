import { dedent } from "ts-dedent";

const GAME_HOLIDAYS = new Map<`${number},${number}`, string>([
  ["0,1", "Festival of Jarlsberg"],
  ["1,4", "Valentine's Day"],
  ["2,3", "St. Sneaky Pete's Day"],
  ["3,2", "Oyster Egg Day"],
  ["4,2", "El Dia De Los Muertos Borrachos"],
  ["5,3", "Generic Summer Holiday"],
  ["6,4", "Dependence Day"],
  ["7,4", "Arrrbor Day"],
  ["8,6", "Labór Day"],
  ["9,8", "Halloween"],
  ["10,7", "Feast of Boris"],
  ["11,4", "Yuletide"],
]);

const MUSCLE_PHASES = new Set([8, 9]);
const MYSTICALITY_PHASES = new Set([4, 12]);
const MOXIE_PHASES = new Set([0, 15]);

function getEaster(year: number): [month: number, date: number] {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const date = ((h + l - 7 * m + 114) % 31) + 1;
  return [month, date];
}

function getThanksgiving(year: number): number {
  // 4th Thursday of November
  const nov1 = new Date(year, 10, 1).getDay();
  const firstThursday = ((4 - nov1 + 7) % 7) + 1;
  return firstThursday + 21;
}

function getRealWorldHoliday(realDate: Date): string | undefined {
  const year = realDate.getUTCFullYear();
  const [easterMonth, easterDate] = getEaster(year);
  const thanksgiving = getThanksgiving(year);

  const realHolidays = new Map([
    ["0,1", "Festival of Jarlsberg"],
    ["1,14", "Valentine's Day"],
    ["2,17", "St. Sneaky Pete's Day"],
    [`${easterMonth},${easterDate}`, "Oyster Egg Day"],
    ["6,4", "Dependence Day"],
    ["9,31", "Halloween"],
    [`10,${thanksgiving}`, "Feast of Boris"],
    ["11,25", "Crimbo"],
  ]);

  return realHolidays.get(`${realDate.getUTCMonth()},${realDate.getUTCDate()}`);
}

export class LoathingDate {
  static EPOCH = new Date(Date.UTC(2003, 1, 1, 3, 30));
  static COLLISION = 1218;

  static getDaysSinceEpoch(year: number, month: number, date: number) {
    return (year - 1) * 96 + month * 8 + (date - 1);
  }

  static fromRealDate(realDate: Date) {
    return Math.floor(
      (realDate.getTime() - LoathingDate.EPOCH.getTime()) /
      (1000 * 60 * 60 * 24)
    );
  }

  #year: number;
  #month: number;
  #date: number;
  #realDate: Date;

  constructor(date: Date);
  constructor(year?: number, month?: number, date?: number);
  constructor(yearOrDate: Date | number = new Date(), month = 0, date = 0) {
    const daysSinceEpoch =
      yearOrDate instanceof Date
        ? LoathingDate.fromRealDate(yearOrDate)
        : LoathingDate.getDaysSinceEpoch(yearOrDate, month, date);

    this.#realDate = new Date(
      LoathingDate.EPOCH.getTime() + daysSinceEpoch * 1000 * 60 * 60 * 24,
    );
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

  getLightFromPhase(phase: number) {
    return 4 - Math.abs(phase - 4);
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

  getStatDay() {
    const phase = this.getPhase();
    if (MUSCLE_PHASES.has(phase)) return "Muscle Day";
    if (MYSTICALITY_PHASES.has(phase)) return "Mysticality Day";
    if (MOXIE_PHASES.has(phase)) return "Moxie Day";
    return null;
  }

  getHolidays() {
    const holidays = new Set<string>();

    const gameHoliday = GAME_HOLIDAYS.get(`${this.#month},${this.#date}`);
    if (gameHoliday) holidays.add(gameHoliday);

    const realHoliday = getRealWorldHoliday(this.#realDate);
    if (realHoliday) holidays.add(realHoliday);

    // Combination holidays replace their components
    if (
      holidays.has("St. Sneaky Pete's Day") &&
      holidays.has("Feast of Boris")
    ) {
      holidays.delete("St. Sneaky Pete's Day");
      holidays.delete("Feast of Boris");
      holidays.add("Drunksgiving");
    }

    if (
      holidays.has("Feast of Boris") &&
      holidays.has("El Dia De Los Muertos Borrachos")
    ) {
      holidays.delete("Feast of Boris");
      holidays.delete("El Dia De Los Muertos Borrachos");
      holidays.add("El Dia De Los Muertos Borrachos y Agradecido");
    }

    const statDay = this.getStatDay();
    if (statDay) holidays.add(statDay);

    return [...holidays];
  }

  getMoonlight() {
    return (
      this.getLightFromPhase(this.getRonaldPhase()) +
      this.getLightFromPhase(this.getGrimacePhase()) +
      this.getHamburglarLight()
    );
  }

  getMoonDescription() {
    return `Ronald is ${this.getRonaldPhaseDescription()}, Grimace is ${this.getGrimacePhaseDescription()}, and Hamburglar is ${this.getHamburglarPhaseDescription()}. In total the moonlight is of strength ${this.getMoonlight()}.`;
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
