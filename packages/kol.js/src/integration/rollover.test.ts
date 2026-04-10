import {
  type IncomingMessage,
  type Server,
  type ServerResponse,
  createServer,
} from "node:http";
import { afterEach, describe, expect, it } from "vitest";

import { Client } from "../Client.js";
import { RolloverError } from "../errors.js";
import { loadFixture } from "../testUtils.js";

class TestClient extends Client {
  private server: Server;
  private port = 0;
  private rollover = false;

  protected override get baseURL() {
    return `http://127.0.0.1:${this.port}`;
  }

  protected override get pollInterval() {
    return 50;
  }

  protected override get rolloverCheckInterval() {
    return 100;
  }

  constructor() {
    super("testuser", "testpass");
    this.server = createServer((req, res) => this.handle(req, res));
  }

  async start() {
    return new Promise<void>((resolve) => {
      this.server.listen(0, "127.0.0.1", () => {
        const addr = this.server.address();
        this.port = typeof addr === "object" && addr ? addr.port : 0;
        resolve();
      });
    });
  }

  simulateRollover(rollover: boolean) {
    this.rollover = rollover;
  }

  dispose() {
    this.stopChatBot();
    this.server.close();
  }

  private handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", `http://127.0.0.1`);
    const path = url.pathname.replace(/^\//, "");

    if (this.rollover) {
      if (path === "login.php") {
        res.writeHead(200, { "content-type": "text/html" });
        loadFixture(__dirname, "login_maintenance.html").then((html) =>
          res.end(html),
        );
        return;
      }
      if (path === "api.php") {
        // TODO: verify with real rollover response
        res.writeHead(200, { "content-type": "application/json" });
        res.end("{}");
        return;
      }
      if (path === "newchatmessages.php") {
        // TODO: verify with real rollover response
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ last: "0", msgs: [] }));
        return;
      }
      if (path === "submitnewchat.php") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ output: "", msgs: [] }));
        return;
      }
      res.writeHead(302, { location: "/login.php" });
      res.end();
      return;
    }

    // Normal operation
    if (path === "login.php") {
      res.writeHead(200, { "content-type": "text/html" });
      loadFixture(__dirname, "login_normal.html").then((html) =>
        res.end(html),
      );
      return;
    }
    if (path === "api.php") {
      const what = url.searchParams.get("what");
      if (what === "status") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ pwd: "abc123" }));
        return;
      }
      if (what === "kmail") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end("[]");
        return;
      }
    }
    if (path === "newchatmessages.php") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ last: "1", msgs: [] }));
      return;
    }
    if (path === "submitnewchat.php") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ output: "", msgs: [] }));
      return;
    }

    res.writeHead(404);
    res.end();
  }
}

let client: TestClient;

afterEach(() => {
  client?.dispose();
});

describe("rollover integration", () => {
  it("login succeeds in normal state", async () => {
    client = new TestClient();
    await client.start();

    expect(await client.login()).toBe(true);
    expect(client.isRollover()).toBe(false);
  });

  it("login fails and detects rollover from maintenance page", async () => {
    client = new TestClient();
    await client.start();
    client.simulateRollover(true);

    expect(await client.login()).toBe(false);
    expect(client.isRollover()).toBe(true);
  });

  it("kmail.fetch throws RolloverError when API returns non-array during rollover", async () => {
    client = new TestClient();
    await client.start();
    await client.login();

    client.simulateRollover(true);

    await expect(client.kmail.fetch()).rejects.toBeInstanceOf(RolloverError);
  });

  it("detects rollover and emits event on recovery via chat loop", async () => {
    client = new TestClient();
    await client.start();

    let rolloverEmitted = false;
    client.on("rollover", () => {
      rolloverEmitted = true;
    });

    await client.startChatBot();

    client.simulateRollover(true);
    await expect.poll(() => client.isRollover()).toBe(true);

    client.simulateRollover(false);
    await expect.poll(() => rolloverEmitted).toBe(true);
    expect(client.isRollover()).toBe(false);
  });
});
