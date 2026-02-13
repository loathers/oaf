import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { config } from "../../config.js";

export type User = {
  id: string;
  name: string;
  avatar: string;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

function getUserFromCookie(req: Request): User | null {
  const token = req.cookies?._session as string | undefined;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.SALT) as { user: User };
    return payload.user;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getUserFromCookie(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.user = user;
  next();
}

export function loginHandler(req: Request, res: Response) {
  const token = req.query.token;
  if (!token || typeof token !== "string") {
    res.redirect("/");
    return;
  }

  try {
    const { data } = jwt.verify(token, config.SALT) as { data: User };
    const sessionToken = jwt.sign({ user: data }, config.SALT);
    res.cookie("_session", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
    res.redirect("/admin");
  } catch {
    res.redirect("/");
  }
}

export function logoutHandler(_req: Request, res: Response) {
  res.clearCookie("_session", { path: "/" });
  res.redirect("/");
}

export const authRouter = Router();

authRouter.get("/me", (req: Request, res: Response) => {
  const user = getUserFromCookie(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({ user });
});
