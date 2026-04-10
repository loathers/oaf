import { type Server, createServer } from "node:http";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { Client } from "../Client.js";
import { RolloverError } from "../errors.js";
import { loadFixture } from "../testUtils.js";

class TestClient extends Client {
  protected override get baseURL() {
    return `http://127.0.0.1:${port}`;
  }

  protected override get pollInterval() {
    return 50;
  }

  protected override get rolloverCheckInterval() {
    return 100;
  }
}

let server: Server;
let port: number;
let state: "normal" | "rollover" = "normal";

function startServer(): Promise<void> {
  return new Promise((resolve) => {
    server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://127.0.0.1`);
      const path = url.pathname.replace(/^\//, "");

      if (state === "rollover") {
        if (path === "login.php") {
          res.writeHead(200, { "content-type": "text/html" });
          loadFixture(__dirname, "login_maintenance.html").then((html) =>
            res.end(html),
          );
          return;
        }
        if (path === "api.php") {
          // TODO: verify this is what KoL actually returns during rollover
          res.writeHead(200, { "content-type": "application/json" });
          res.end("{}");
          return;
        }
        if (path === "newchatmessages.php") {
          // TODO: verify this is what KoL actually returns during rollover
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
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      port = typeof addr === "object" && addr ? addr.port : 0;
      resolve();
    });
  });
}

let client: TestClient;

beforeAll(async () => {
  await startServer();
});

afterAll(() => {
  server?.close();
});

beforeEach(() => {
  state = "normal";
  client = new TestClient("testuser", "testpass");
});

afterEach(() => {
  client.stopChatBot();
});

describe("rollover integration", () => {
  it("login succeeds in normal state", async () => {
    expect(await client.login()).toBe(true);
    expect(client.isRollover()).toBe(false);
  });

  it("login fails and detects rollover from maintenance page", async () => {
    state = "rollover";

    expect(await client.login()).toBe(false);
    expect(client.isRollover()).toBe(true);
  });

  it("kmail.fetch throws when API returns non-array during rollover", async () => {
    await client.login();
    state = "rollover";

    await expect(client.kmail.fetch()).rejects.toBeInstanceOf(RolloverError);
  });

  it("detects rollover and recovers via chat loop", async () => {
    let rolloverEmitted = false;
    client.on("rollover", () => {
      rolloverEmitted = true;
    });

    await client.startChatBot();

    // Enter rollover — the loop will hit errors and call #checkForRollover
    state = "rollover";
    await expect.poll(() => client.isRollover()).toBe(true);

    // End rollover — the scheduled recheck will detect recovery and emit
    state = "normal";
    await expect.poll(() => rolloverEmitted).toBe(true);
    expect(client.isRollover()).toBe(false);
  });
});
