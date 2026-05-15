import { Client } from "./src/index.js";

const client = new Client("devster5", "8&&0%ZIfF3Gi");
await client.login();

const proxy = client.createProxyServer();
await proxy.start(4000);
