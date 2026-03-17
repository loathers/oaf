import { dedent } from "ts-dedent";
import { describe, expect, test } from "vitest";

import { LoathingDate } from "./LoathingDate.js";

describe("Constructor", () => {
  test("Out-of-bounds dates wrap around", () => {
    const d = new LoathingDate(69, 12, 1);
    expect(d.toString()).toBe("Jarlsuary 1 Year 70");
  });

  test("From real date", () => {
    const d = new LoathingDate(new Date(Date.UTC(2023, 10, 16, 12, 0, 0)));
    expect(d.toString()).toBe("Frankuary 2 Year 80");
  });

  test("March 17th 2026 is gameday 8436", () => {
    const d = new Date(Date.UTC(2026, 2, 17, 12, 0, 0));
    expect(LoathingDate.gameDayFromRealDate(d)).toBe(8436);
  });

  test("March 17th 2026 is Dougtember 6 Year 88", () => {
    const d = new LoathingDate(new Date(Date.UTC(2026, 2, 17, 12, 0, 0)));
    expect(d.toString()).toBe("Dougtember 6 Year 88");
  });

  test("Both constructors agree", () => {
    const realDate = new Date(Date.UTC(2023, 10, 16, 12, 0, 0));
    const fromReal = new LoathingDate(realDate);
    const fromGame = new LoathingDate(
      fromReal.getYear(),
      fromReal.getMonth(),
      fromReal.getDate(),
    );
    expect(fromGame.toString()).toBe(fromReal.toString());
    expect(fromGame.getHolidays()).toEqual(fromReal.getHolidays());
  });

  test("Game coords derive correct real-world holidays", () => {
    // April 7 Year 84 = Christmas Day 2024
    const d = new LoathingDate(84, 3, 7);
    expect(d.getHolidays()).toContain("Crimbo");
  });
});

describe("Ronald", () => {
  test("Correct phase", () => {
    const d = new LoathingDate(new Date(Date.UTC(2023, 10, 16, 12, 0, 0)));
    expect(d.getRonaldPhase()).toBe(1);
  });
});

describe("Grimace", () => {
  test("Correct phase", () => {
    const d = new LoathingDate(new Date(Date.UTC(2023, 10, 16, 12, 0, 0)));
    expect(d.getGrimacePhase()).toBe(4);
  });
});

describe("Hamburglar", () => {
  test("Before collision", () => {
    const d = new LoathingDate(new Date(Date.UTC(2006, 5, 2, 12, 0, 0)));
    expect(d.getHamburglarPhase()).toBe(null);
  });

  test("On collision", () => {
    const d = new LoathingDate(new Date(Date.UTC(2006, 5, 3, 12, 0, 0)));
    expect(d.getHamburglarPhase()).toBe(0);
  });
});

describe("Stat days", () => {
  test("Muscle day", () => {
    // Phase 8 = muscle day. Jarlsuary 1 Year 1 has phase (0*8 + 0) % 16 = 0 which is moxie.
    // We need phase 8. month=1, date=1: (1*8 + 0) % 16 = 8
    const d = new LoathingDate(1, 1, 1);
    expect(d.getStatDay()).toBe("Muscle Day");
  });

  test("Mysticality day", () => {
    // Phase 4: month=0, date=5: (0*8 + 4) % 16 = 4
    const d = new LoathingDate(1, 0, 5);
    expect(d.getStatDay()).toBe("Mysticality Day");
  });

  test("Moxie day", () => {
    // Phase 0: month=0, date=1: (0*8 + 0) % 16 = 0
    const d = new LoathingDate(1, 0, 1);
    expect(d.getStatDay()).toBe("Moxie Day");
  });

  test("Non-stat day", () => {
    // Phase 1: month=0, date=2: (0*8 + 1) % 16 = 1
    const d = new LoathingDate(1, 0, 2);
    expect(d.getStatDay()).toBe(null);
  });
});

describe("Holidays", () => {
  test("Festival of Jarlsberg on Jarlsuary 1", () => {
    const d = new LoathingDate(1, 0, 1);
    expect(d.getHolidays()).toContain("Festival of Jarlsberg");
  });

  test("Halloween on Porktober 8", () => {
    const d = new LoathingDate(1, 9, 8);
    expect(d.getHolidays()).toContain("Halloween");
  });

  test("No game holiday on Jarlsuary 2", () => {
    const d = new LoathingDate(1, 0, 2);
    expect(d.getHolidays().every((h) => h.endsWith("Day"))).toBe(true);
  });

  test("Includes stat day", () => {
    // Jarlsuary 1 is Moxie Day (phase 0) AND Festival of Jarlsberg
    const d = new LoathingDate(1, 0, 1);
    expect(d.getHolidays()).toEqual(["Festival of Jarlsberg", "Moxie Day"]);
  });

  test("No holidays on some days", () => {
    // Jarlsuary 2 has phase 1, not a stat day, and no game holiday
    const d = new LoathingDate(1, 0, 2);
    expect(d.getHolidays()).toEqual([]);
  });

  test("Real-world Christmas gives Crimbo", () => {
    const d = new LoathingDate(new Date(Date.UTC(2024, 11, 25, 12, 0, 0)));
    expect(d.getHolidays()).toContain("Crimbo");
  });

  test("Real-world July 4th gives Dependence Day", () => {
    const d = new LoathingDate(new Date(Date.UTC(2024, 6, 4, 12, 0, 0)));
    expect(d.getHolidays()).toContain("Dependence Day");
  });

  test("Real-world Easter gives Oyster Egg Day", () => {
    // Easter 2024 is March 31
    const d = new LoathingDate(new Date(Date.UTC(2024, 2, 31, 12, 0, 0)));
    expect(d.getHolidays()).toContain("Oyster Egg Day");
  });

  test("Real-world Thanksgiving gives Feast of Boris", () => {
    // Thanksgiving 2024 is November 28
    const d = new LoathingDate(new Date(Date.UTC(2024, 10, 28, 12, 0, 0)));
    expect(d.getHolidays()).toContain("Feast of Boris");
  });

  test("Game and real-world holiday don't duplicate", () => {
    // Jan 1 2024: real-world = Festival of Jarlsberg, check it's not listed twice
    const d = new LoathingDate(new Date(Date.UTC(2024, 0, 1, 12, 0, 0)));
    const count = d
      .getHolidays()
      .filter((h) => h === "Festival of Jarlsberg").length;
    expect(count).toBeLessThanOrEqual(1);
  });
});

describe("SVG", () => {
  test("One example of SVG", () => {
    const d = new LoathingDate(new Date(Date.UTC(2023, 10, 16, 12, 0, 0)));
    expect(d.getMoonsAsSvg()).toBe(dedent`
    <?xml version="1.0" encoding="UTF-8" standalone="no"?>
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="110" height="50" viewBox="0 0 110 50">
      <text id="ronald" x="10" y="35" font-size="30">🌘</text>
      <text id="grimace" x="70" y="35" font-size="30">🌕</text>
      <text id="hamburglar" x="87" y="35" font-size="10">🌑</text>
    </svg>
    `);
  });

  test("Another example of SVG", () => {
    const d = new LoathingDate(new Date(Date.UTC(2023, 10, 15, 12, 0, 0)));
    expect(d.getMoonsAsSvg("Noto Color Emoji")).toBe(dedent`
    <?xml version="1.0" encoding="UTF-8" standalone="no"?>
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="110" height="50" viewBox="0 0 110 50">
      <text id="ronald" x="10" y="35" font-size="30" font-family="Noto Color Emoji">🌑</text>
      <text id="grimace" x="70" y="35" font-size="30" font-family="Noto Color Emoji">🌕</text>
      <text id="hamburglar" x="50" y="35" font-size="10" font-family="Noto Color Emoji">🌕</text>
    </svg>
    `);
  });
});
