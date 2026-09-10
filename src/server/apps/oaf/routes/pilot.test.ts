import { Colors } from "discord.js";
import { describe, expect, test } from "vitest";

import { buildPilotMessage } from "./pilot.js";

describe("buildPilotMessage", () => {
  test("Sends plain content as-is", () => {
    expect(buildPilotMessage("hello", false)).toEqual({ content: "hello" });
  });

  test("Wraps a moderator notice in an embed with no content", () => {
    const message = buildPilotMessage("behave yourselves", true);

    expect(message.content).toBeUndefined();
    expect(message.embeds?.[0]).toMatchObject({
      data: {
        title: "Moderator Notice",
        description: "behave yourselves",
        color: Colors.Green,
      },
    });
  });
});
