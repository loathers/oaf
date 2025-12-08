import jwt from "jsonwebtoken";
import { redirect } from "react-router";
import { Authenticator } from "remix-auth";
import { Strategy } from "remix-auth/strategy";

import { config } from "../../config.js";
import { commitSession, getSession } from "./session.server.js";

export type User = {
  id: string;
  name: string;
  avatar: string;
};

export const authenticator = new Authenticator<User>();

class TokenStrategy<User> extends Strategy<User, { token: string }> {
  name = "token";

  async authenticate(request: Request) {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) throw new Error("No token supplied");

    try {
      return await this.verify({ token });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      throw new Error("Invalid token supplied");
    }
  }
}

authenticator.use(
  new TokenStrategy<User>(async ({ token }) => {
    const { data } = jwt.verify(token, config.SALT) as { data: User };
    return data;
  }),
  "token",
);

export async function authenticate(request: Request) {
  const session = await getSession(request.headers.get("cookie"));
  const user = session.get("user") as User;
  if (user) return user;
  throw redirect("/", {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}
