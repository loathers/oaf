import { Router } from "express";

import { prisma } from "../../clients/database.js";

export const tagsRouter = Router();

tagsRouter.get("/", async (_req, res) => {
  const tags = await prisma.tag.findMany({});
  res.json({ tags });
});
