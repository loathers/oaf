import {
  type IncomingMessage,
  type Server,
  type ServerResponse,
  createServer,
} from "node:http";
import { describe, it, onTestFinished } from "vitest";

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
      return this.handleRollover(path, res);
    }

    this.handleNormal(path, url, res);
  }

  private handleRollover(path: string, res: ServerResponse) {
    switch (path) {
      case "login.php":
        res.writeHead(200, { "content-type": "text/html" });
        loadFixture(__dirname, "login_maintenance.html").then((html) =>
          res.end(html),
        );
        return;
      case "api.php":
        // TODO: verify with real rollover response
        res.writeHead(200, { "content-type": "application/json" });
        res.end("{}");
        return;
      case "newchatmessages.php":
        // TODO: verify with real rollover response
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ last: "0", msgs: [] }));
        return;
      case "submitnewchat.php":
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ output: "", msgs: [] }));
        return;
      default:
        res.writeHead(302, { location: "/login.php" });
        res.end();
        return;
    }
  }

  private handleNormal(path: string, url: URL, res: ServerResponse) {
    switch (path) {
      case "login.php":
        res.writeHead(200, { "content-type": "text/html" });
        loadFixture(__dirname, "login_normal.html").then((html) =>
          res.end(html),
        );
        return;
      case "api.php": {
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
        break;
      }
      case "newchatmessages.php":
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ last: "1", msgs: [] }));
        return;
      case "submitnewchat.php":
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ output: "", msgs: [] }));
        return;
      default:
        res.writeHead(404);
        res.end();
        return;
    }
  }
}

async function createTestClient() {
  const client = new TestClient();
  await client.start();
  onTestFinished(() => client.dispose());
  return client;
}

describe.concurrent("rollover integration", () => {
  it("login succeeds in normal state", async ({ expect }) => {
    const client = await createTestClient();

    expect(await client.login()).toBe(true);
    expect(client.isRollover()).toBe(false);
  });

  it("login fails and detects rollover from maintenance page", async ({ expect }) => {
    const client = await createTestClient();
    client.simulateRollover(true);

    expect(await client.login()).toBe(false);
    expect(client.isRollover()).toBe(true);
  });

  it("kmail.fetch throws RolloverError when API returns non-array during rollover", async ({ expect }) => {
    const client = await createTestClient();
    await client.login();
    client.simulateRollover(true);

    await expect(client.kmail.fetch()).rejects.toBeInstanceOf(RolloverError);
  });

  it("detects rollover and emits event on recovery via chat loop", async ({ expect }) => {
    const client = await createTestClient();

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
