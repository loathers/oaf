import type { RequestHandler } from "express";
import fs from "node:fs";
import path from "node:path";
import type { ViteDevServer } from "vite";

export function spaFallback(
  viteDevServer: ViteDevServer | null,
  appName: string,
): RequestHandler {
  const devHtmlPath = `src/server/apps/${appName}/web/index.html`;
  const prodHtmlPath = `build/client/${appName}/index.html`;

  return async (req, res) => {
    if (viteDevServer) {
      const html = fs.readFileSync(path.resolve(devHtmlPath), "utf-8");
      const transformed = await viteDevServer.transformIndexHtml(req.url, html);
      res.set("Content-Type", "text/html").send(transformed);
    } else {
      res.sendFile(path.resolve(prodHtmlPath));
    }
  };
}
