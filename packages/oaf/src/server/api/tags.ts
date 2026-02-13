import { Router } from "express";

import { getAllTags } from "../../clients/database.js";

export const tagsRouter = Router();

tagsRouter.get("/", async (_req, res) => {
  const tags = await getAllTags();
  res.json({ tags });
});
