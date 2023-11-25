import { expect, test } from "vitest";

import { loadFixture } from "../../testUtils.js";
import { parseScores } from "./automatedfuture.js";

test("Can read scores", async () => {
  const page = await loadFixture(__dirname, "automated_future.html");

  const scores = parseScores(page);

  expect(scores).toHaveProperty("solenoids", 1001268);
  expect(scores).toHaveProperty("bearings", 1001028);
});

test("Returns null if scores cannot be read", () => {
  const scores = parseScores("");

  expect(scores).toBe(null);
});
