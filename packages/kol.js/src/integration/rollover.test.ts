import {
  type IncomingMessage,
  type Server,
  type ServerResponse,
  createServer,
} from "node:http";
import { describe, it, onTestFinished } from "vitest";

import { Client } from "../Client.js";
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
    return 50;
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
    this.server.closeAllConnections();
    this.server.close();
  }

  private handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", `http://127.0.0.1`);
    const path = url.pathname.replace(/^\//, "");

    if (this.rollover) {
      return void this.handleRollover(path, res);
    }

    void this.handleNormal(path, url, res);
  }

  private async handleRollover(path: string, res: ServerResponse) {
    if (path === "maint.php") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(await loadFixture(__dirname, "maint.html"));
      return;
    }

    // All endpoints redirect to maint.php during rollover (confirmed via logs)
    res.writeHead(302, { location: "/maint.php" });
    res.end();
  }

  private async handleNormal(path: string, url: URL, res: ServerResponse) {
    switch (path) {
      case "maint.php":
        res.writeHead(302, { location: "/login.php" });
        res.end();
        return;
      case "login.php":
        res.writeHead(200, { "content-type": "text/html" });
        res.end(await loadFixture(__dirname, "login.html"));
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

  it("login fails and detects rollover from maintenance page", async ({
    expect,
  }) => {
    const client = await createTestClient();
    client.simulateRollover(true);

    expect(await client.login()).toBe(false);
    expect(client.isRollover()).toBe(true);
  });

  it("kmail.fetch blocks during rollover and resumes after recovery", async ({
    expect,
  }) => {
    const client = await createTestClient();
    await client.login();
    client.simulateRollover(true);

    setTimeout(() => client.simulateRollover(false), 200);
    const kmails = await client.kmail.fetch();

    expect(kmails).toEqual([]);
    expect(client.isRollover()).toBe(false);
  });

  it("chat.fetch blocks during rollover and resumes after recovery", async ({
    expect,
  }) => {
    const client = await createTestClient();
    await client.login();
    client.simulateRollover(true);

    let rolloverEmitted = false;
    client.on("rollover", () => {
      rolloverEmitted = true;
    });

    setTimeout(() => client.simulateRollover(false), 200);
    const messages = await client.chat.fetch();

    expect(messages).toEqual([]);
    expect(rolloverEmitted).toBe(true);
    expect(client.isRollover()).toBe(false);
  });
});
