import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock("../../config.js", () => ({
  config: {
    KOL_USER: "oaf",
    SALT: "test-salt",
  },
}));

const { checkPlayer, generatePlayer } = await import("./claim.js");

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("A generated token round-trips through verification", async () => {
  const playerId = 1197090;
  const hex = await generatePlayer(playerId);
  const [decodedId, valid] = await checkPlayer(hex);

  expect(decodedId).toBe(playerId);
  expect(valid).toBe(true);
});

test("Works for small player ids", async () => {
  const playerId = 42;
  const hex = await generatePlayer(playerId);
  const [decodedId, valid] = await checkPlayer(hex);

  expect(decodedId).toBe(playerId);
  expect(valid).toBe(true);
});

test("A tampered token fails verification", async () => {
  const hex = await generatePlayer(1197090);
  const lastChar = hex[hex.length - 1];
  const tampered =
    hex.slice(0, -1) + (lastChar === "0" ? "1" : String(Number(lastChar) - 1));
  const [, valid] = await checkPlayer(tampered);

  expect(valid).toBe(false);
});

test("An expired token fails verification", async () => {
  const playerId = 1197090;
  const hex = await generatePlayer(playerId);

  vi.advanceTimersByTime(300_000);

  const [decodedId, valid] = await checkPlayer(hex);

  expect(decodedId).toBe(playerId);
  expect(valid).toBe(false);
});
