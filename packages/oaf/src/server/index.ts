import express, { type Express } from "express";
import type { ViteDevServer } from "vite";

import { config } from "../config.js";
import { createCalendarApp } from "./apps/calendar/app.js";
import { createOafApp } from "./apps/oaf/app.js";
import { createTulipsApp } from "./apps/tulips/app.js";

const isDev = process.env.NODE_ENV !== "production";

async function createViteDevServer(configFile: string): Promise<ViteDevServer> {
  const vite = await import("vite");
  return await vite.createServer({
    configFile,
    server: { middlewareMode: true },
    appType: "custom",
  });
}

function lazyApp(
  configFile: string,
  factory: (vite: ViteDevServer | null) => Express,
): Express {
  if (!isDev) return factory(null);

  let inner: Promise<Express> | null = null;
  const wrapper = express();
  wrapper.use(async (req, res, next) => {
    inner ??= (async () => {
      try {
        console.log(
          `Lazily starting Vite dev server with config ${configFile}`,
        );
        const server = await createViteDevServer(configFile);
        return factory(server);
      } catch (e) {
        inner = null;
        throw e;
      }
    })();
    await (
      await inner
    )(req, res, next);
  });
  return wrapper;
}

const oafApp = lazyApp("vite.oaf.config.ts", createOafApp);
const calendarApp = lazyApp("vite.calendar.config.ts", createCalendarApp);
const tulipsApp = lazyApp("vite.tulips.config.ts", createTulipsApp);

const app = express();

app.set("trust proxy", true);

app.use((req, res, next) => {
  const subdomain = req.hostname.split(".")[0];
  switch (subdomain) {
    case "tulips":
      return tulipsApp(req, res, next);
    case "calendar":
      return calendarApp(req, res, next);
    default:
      return oafApp(req, res, next);
  }
});

export const startApiServer = () =>
  app.listen(config.PORT, () =>
    console.log(`Server listening on ${config.PORT}`),
  );
