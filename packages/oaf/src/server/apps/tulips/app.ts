import express, { type Express } from "express";

export function createTulipsApp(): Express {
  const app = express();

  app.get("*path", (_req, res) => {
    res.send("tulips");
  });

  return app;
}
