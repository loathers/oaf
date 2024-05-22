import { Client } from "./Client.js";

const client = new Client("onweb", "beer146beef31");

const gausie = await client.players.fetch("gausie", true);

console.log(gausie);