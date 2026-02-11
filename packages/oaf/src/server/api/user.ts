import { Router } from "express";

import { discordClient } from "../../clients/discord.js";

export const userRouter = Router();

userRouter.get("/", async (req, res) => {
  const id = req.query.id as string | undefined;

  if (!id) {
    res.json({ user: null });
    return;
  }

  try {
    const user = await discordClient.users.fetch(id);

    res.json({
      user: { name: user.username, avatar: user.displayAvatarURL() },
    });
  } catch {
    res.json({ user: null });
  }
});
