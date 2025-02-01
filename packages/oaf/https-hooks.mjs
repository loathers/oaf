// @ts-check
/* global fetch, console */
import { get } from "node:https";

const cache = new Map();

/** @type import("node:module").LoadHook */
export async function load(url, context, nextLoad) {
  // Load modules from skypack
  // @TODO Load from ?meta, read the version and load from cache if we already know it
  if (url.startsWith("https://cdn.skypack.dev/")) {
    if (!url.startsWith("https://cdn.skypack.dev/-/")) {
      console.log(url);
      const metaRequest = await fetch(url + "?meta");
      const meta = await metaRequest.json();
      console.log(meta.version);
    }

    return new Promise((resolve, reject) => {
      get(url, (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          resolve({
            // This example assumes all network-provided JavaScript is ES module
            // code.
            format: "module",
            shortCircuit: true,
            source: data,
          }),
        );
      }).on("error", (err) => reject(err));
    });
  }

  // Let Node.js handle all other URLs.
  return nextLoad(url);
}
