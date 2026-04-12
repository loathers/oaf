import express from "express";

import { config } from "../config.js";
import { createCalendarApp } from "./apps/calendar/app.js";
import { createOafApp } from "./apps/oaf/app.js";
import { createTulipsApp } from "./apps/tulips/app.js";

const oafViteDevServer =
  process.env.NODE_ENV === "production"
    ? null
    : await import("vite").then((vite) =>
        vite.createServer({
          configFile: "vite.oaf.config.ts",
          server: { middlewareMode: true },
          appType: "custom",
        }),
      );

const calendarViteDevServer =
  process.env.NODE_ENV === "production"
    ? null
    : await import("vite").then((vite) =>
        vite.createServer({
          configFile: "vite.calendar.config.ts",
          server: { middlewareMode: true },
          appType: "custom",
        }),
      );

const tulipsViteDevServer =
  process.env.NODE_ENV === "production"
    ? null
    : await import("vite").then((vite) =>
        vite.createServer({
          configFile: "vite.tulips.config.ts",
          server: { middlewareMode: true },
          appType: "custom",
        }),
      );

const oafApp = createOafApp(oafViteDevServer);
const calendarApp = createCalendarApp(calendarViteDevServer);
const tulipsApp = createTulipsApp(tulipsViteDevServer);

const app = express();

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
