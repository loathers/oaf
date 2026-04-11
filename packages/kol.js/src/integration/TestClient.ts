import { randomBytes } from "node:crypto";
import {
  type IncomingMessage,
  type Server,
  type ServerResponse,
  createServer,
} from "node:http";
import type { TestContext } from "vitest";

import { Client } from "../Client.js";
import { loadFixture } from "../testUtils.js";

type Account = { username: string; password: string; id: number };
type Session = { playerId: number; pwd: string };

function collectBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
  });
}

export class TestClient extends Client {
  private server: Server;
  private port = 0;
  private rollover = false;
  private accounts: Account[] = [
    { username: "testuser", password: "testpass", id: 1 },
  ];
  private sessions = new Map<string, Session>();

  protected override get baseURL() {
    return `http://127.0.0.1:${this.port}`;
  }

  protected override get pollInterval() {
    return 50;
  }

  protected override get rolloverCheckInterval() {
    return 50;
  }

  constructor(username = "testuser", password = "testpass") {
    super(username, password);
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

  addPlayer(username: string, password: string, id?: number): Account {
    id ??= this.accounts.length + 1;
    const player = { username, password, id };
    this.accounts.push(player);
    return player;
  }

  simulateRollover(rollover: boolean) {
    this.rollover = rollover;
  }

  override dispose() {
    super.dispose();
    this.server.closeAllConnections();
    this.server.close();
  }

  private getSessionFromCookie(req: IncomingMessage): Session | undefined {
    const cookies = req.headers.cookie ?? "";
    const match = cookies.match(/PHPSESSID=([^;]+)/);
    if (!match) return undefined;
    return this.sessions.get(match[1]);
  }

  private async handleRollover(path: string, res: ServerResponse) {
    if (path === "maint.php") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(await loadFixture(__dirname, "maint.html"));
      return;
    }

    res.writeHead(302, { location: "/maint.php" });
    res.end();
  }

  private handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", `http://127.0.0.1`);
    const path = url.pathname.replace(/^\//, "");

    if (this.rollover) {
      return void this.handleRollover(path, res);
    }

    switch (path) {
      case "login.php": {
        if (req.method === "POST") {
          void collectBody(req).then((body) => {
            const params = new URLSearchParams(body);
            const username = params.get("loginname");
            const password = params.get("password");
            const player = this.accounts.find(
              (p) => p.username === username && p.password === password,
            );

            if (!player) {
              res.writeHead(200, { "content-type": "text/html" });
              res.end("<html>Bad password.</html>");
              return;
            }

            const sessionId = randomBytes(16).toString("hex");
            const pwd = randomBytes(8).toString("hex");
            this.sessions.set(sessionId, { playerId: player.id, pwd });

            res.writeHead(200, {
              "content-type": "text/html",
              "set-cookie": `PHPSESSID=${sessionId}; Path=/`,
            });
            res.end("<html>Logged in.</html>");
          });
          return;
        }

        res.writeHead(200, { "content-type": "text/html" });
        void loadFixture(__dirname, "login.html").then((html) => res.end(html));
        return;
      }
      case "maint.php":
        res.writeHead(302, { location: "/login.php" });
        res.end();
        return;
      case "logout.php": {
        const cookies = req.headers.cookie ?? "";
        const match = cookies.match(/PHPSESSID=([^;]+)/);
        if (match) this.sessions.delete(match[1]);
        res.writeHead(302, { location: "/login.php" });
        res.end();
        return;
      }
      default:
        break;
    }

    // All remaining endpoints require auth
    const session = this.getSessionFromCookie(req);
    if (!session) {
      res.writeHead(302, { location: "/login.php" });
      res.end();
      return;
    }

    switch (path) {
      case "api.php": {
        const what = url.searchParams.get("what");
        if (what === "status") {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ pwd: session.pwd }));
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

export async function createTestClient(
  ctx: TestContext,
  username?: string,
  password?: string,
) {
  const client = new TestClient(username, password);
  await client.start();
  ctx.onTestFinished(() => client.dispose());
  return client;
}
