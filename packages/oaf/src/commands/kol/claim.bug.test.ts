import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../config.js", () => ({
  config: {
    KOL_USER: "oaf",
    SALT: "test-salt",
    VERIFIED_ROLE_ID: "role-123",
    GUILD_ID: "guild-123",
  },
}));

const { checkPlayer } = await import("./claim.js");

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkPlayer - input validation", () => {
  test("invalid hex string with special characters returns invalid", async () => {
    const [playerId, valid] = await checkPlayer("not-a-valid-hex-string!");
    expect(valid).toBe(false);
    expect(playerId).toBe(0);
  });

  test("empty string returns invalid", async () => {
    const [playerId, valid] = await checkPlayer("");
    expect(valid).toBe(false);
    expect(playerId).toBe(0);
  });

  test("hex string with invalid characters returns invalid", async () => {
    const [playerId, valid] = await checkPlayer("ghijklmnop");
    expect(valid).toBe(false);
    expect(playerId).toBe(0);
  });

  test("string with only punctuation returns invalid", async () => {
    const [playerId, valid] = await checkPlayer("!@#$%^&*()");
    expect(valid).toBe(false);
    expect(playerId).toBe(0);
  });

  test("hex string with spaces returns invalid", async () => {
    const [playerId, valid] = await checkPlayer("dead beef cafe");
    expect(valid).toBe(false);
    expect(playerId).toBe(0);
  });

  test("zero value returns invalid", async () => {
    const [playerId, valid] = await checkPlayer("0");
    expect(valid).toBe(false);
    expect(playerId).toBe(0);
  });

  test("valid hex but incorrect token returns invalid", async () => {
    const [playerId, valid] = await checkPlayer("deadbeef");
    expect(valid).toBe(false);
    expect(playerId).toBeGreaterThanOrEqual(0);
  });
});
