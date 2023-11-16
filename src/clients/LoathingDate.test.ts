import { dedent } from "ts-dedent";
import { describe, expect, test } from "vitest";

import { LoathingDate } from "./LoathingDate.js";

test("Out-of-bounds dates wrap around", () => {
  const d = new LoathingDate(69, 12, 1);
  expect(d.toString()).toBe("Jarlsuary 1 Year 70");
});

test("Format date", () => {
  const d = new LoathingDate(new Date(Date.UTC(2023, 10, 16, 12, 0, 0)));
  expect(d.toString()).toBe("Frankuary 2 Year 80");
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

describe("SVG", () => {
  test("One example of SVG", () => {
    const d = new LoathingDate(new Date(Date.UTC(2023, 10, 16, 12, 0, 0)));
    expect(d.getMoonsAsSvg()).toBe(dedent`
      <?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="110" height="30" style="dominant-baseline: hanging;">
        <text x="10" y="2" font-size="30">🌘</text>
        <text x="70" y="2" font-size="30">🌕</text>
        <text x="87" y="11" font-size="10">🌑</text>
      </svg>
    `);
  });

  test("Another example of SVG", () => {
    const d = new LoathingDate(new Date(Date.UTC(2023, 10, 15, 12, 0, 0)));
    expect(d.getMoonsAsSvg()).toBe(dedent`
      <?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="110" height="30" style="dominant-baseline: hanging;">
        <text x="10" y="2" font-size="30">🌑</text>
        <text x="70" y="2" font-size="30">🌕</text>
        <text x="50" y="11" font-size="10">🌕</text>
      </svg>
    `);
  });
});
