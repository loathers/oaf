import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../config.js", () => ({
  config: {
    KOL_USER: "oaf",
    SALT: "test-salt",
    VERIFIED_ROLE_ID: "role-123",
    GUILD_ID: "guild-123",
  },
}));

const { checkPlayer, generatePlayer, intDiv, playerSecret } =
  await import("./claim.js");

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("intDiv", () => {
  test("divides evenly", () => {
    expect(intDiv(10, 5)).toEqual([2, 0]);
  });

  test("returns remainder", () => {
    expect(intDiv(7, 3)).toEqual([2, 1]);
  });

  test("handles dividend smaller than divisor", () => {
    expect(intDiv(3, 10)).toEqual([0, 3]);
  });

  test("handles zero dividend", () => {
    expect(intDiv(0, 5)).toEqual([0, 0]);
  });
});

describe("playerSecret", () => {
  test("pads short secrets to 16 characters", () => {
    const secret = playerSecret(1);
    expect(secret).toBe("test-salt-100000");
    expect(secret).toHaveLength(16);
  });

  test("includes player id in secret", () => {
    expect(playerSecret(42)).toContain("42");
    expect(playerSecret(1197090)).toContain("1197090");
  });
});

describe("generatePlayer / checkPlayer round-trip", () => {
  test("a generated token round-trips through verification", async () => {
    const playerId = 1197090;
    const hex = await generatePlayer(playerId);
    const [decodedId, valid] = await checkPlayer(hex);

    expect(decodedId).toBe(playerId);
    expect(valid).toBe(true);
  });

  test("works for small player ids", async () => {
    const playerId = 42;
    const hex = await generatePlayer(playerId);
    const [decodedId, valid] = await checkPlayer(hex);

    expect(decodedId).toBe(playerId);
    expect(valid).toBe(true);
  });

  test("works for player id 1", async () => {
    const playerId = 1;
    const hex = await generatePlayer(playerId);
    const [decodedId, valid] = await checkPlayer(hex);

    expect(decodedId).toBe(playerId);
    expect(valid).toBe(true);
  });

  test("works for large player ids", async () => {
    const playerId = 3_500_000;
    const hex = await generatePlayer(playerId);
    const [decodedId, valid] = await checkPlayer(hex);

    expect(decodedId).toBe(playerId);
    expect(valid).toBe(true);
  });

  test("different player ids produce different tokens", async () => {
    const hex1 = await generatePlayer(100);
    const hex2 = await generatePlayer(200);

    expect(hex1).not.toBe(hex2);
  });

  test("produces a hex string", async () => {
    const hex = await generatePlayer(1197090);
    expect(hex).toMatch(/^[0-9a-f]+$/);
  });
});

describe("token validation", () => {
  test("a tampered token fails verification", async () => {
    const hex = await generatePlayer(1197090);
    const lastChar = hex[hex.length - 1];
    const tampered =
      hex.slice(0, -1) +
      (lastChar === "0" ? "1" : String(Number(lastChar) - 1));
    const [, valid] = await checkPlayer(tampered);

    expect(valid).toBe(false);
  });

  test("a token within the tolerance window still validates", async () => {
    // Pin to a known period boundary so timing is deterministic
    vi.setSystemTime(0);
    const playerId = 1197090;
    const hex = await generatePlayer(playerId);

    // TOTP_PERIOD is 120s, epochTolerance is [120, 0] so one past period allowed.
    // At 130s we're in the next period but the previous period is tolerated.
    vi.advanceTimersByTime(130_000);

    const [decodedId, valid] = await checkPlayer(hex);

    expect(decodedId).toBe(playerId);
    expect(valid).toBe(true);
  });

  test("a token just beyond the tolerance window fails", async () => {
    vi.setSystemTime(0);
    const playerId = 1197090;
    const hex = await generatePlayer(playerId);

    // Token was for period 0 (0-120s). Tolerance allows one past period.
    // At 240s we're in period 2, looking back only covers period 1, not period 0.
    vi.advanceTimersByTime(240_000);

    const [decodedId, valid] = await checkPlayer(hex);

    expect(decodedId).toBe(playerId);
    expect(valid).toBe(false);
  });

  test("a completely bogus hex string fails", async () => {
    const [, valid] = await checkPlayer("deadbeef");
    expect(valid).toBe(false);
  });

  test("a token for one player does not validate as another", async () => {
    const hex = await generatePlayer(100);
    // Manually swap the player id portion by re-encoding with a different player
    const decoded = parseInt(hex, 16);
    const [, tokenPart] = intDiv(decoded, 1e6);
    const forged = Number(
      `200${tokenPart.toString().padStart(6, "0")}`,
    ).toString(16);
    const [decodedId, valid] = await checkPlayer(forged);

    expect(decodedId).toBe(200);
    expect(valid).toBe(false);
  });
});
