import { beforeEach, describe, expect, test, vi } from "vitest";

import { DiscordClient } from "./discord.js";

describe("alerting", () => {
  const send = vi.fn();
  const client = new DiscordClient("client", "token", "alerts");

  beforeEach(async () => {
    vi.clearAllMocks();
    await client.initAlertsChannel({ send } as never);
  });

  test("sends the alert to the alerts channel", async () => {
    await client.alert("something went wrong");

    expect(send).toHaveBeenCalledOnce();
  });

  test("survives the alerts channel refusing the message", async () => {
    send.mockRejectedValue(new Error("Missing Access"));

    await expect(client.alert("something went wrong")).resolves.toBeUndefined();
  });

  test("survives the alerts channel refusing an alert queued before startup", async () => {
    const cold = new DiscordClient("client", "token", "alerts");
    await cold.alert("something went wrong before the channel resolved");
    send.mockRejectedValue(new Error("Missing Access"));

    await expect(
      cold.initAlertsChannel({ send } as never),
    ).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledOnce();
  });
});
