import { SessionStorage } from "@remix-run/server-runtime";
import jwt from "jsonwebtoken";
import { AuthenticateOptions, Authenticator, Strategy } from "remix-auth";

import { config } from "../../config.js";
import { sessionStorage } from "./session.server.js";

export type User = {
  id: string;
  name: string;
  avatar: string;
};

export const authenticator = new Authenticator<User>(sessionStorage);

class TokenStrategy<User> extends Strategy<User, { token: string }> {
  name = "token";

  async authenticate(
    request: Request,
    sessionStorage: SessionStorage,
    options: AuthenticateOptions,
  ) {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token)
      return this.failure(
        "No token supplied",
        request,
        sessionStorage,
        options,
      );

    try {
      const user = await this.verify({ token });
      return this.success(user, request, sessionStorage, options);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      return this.failure(
        "Invalid token supplied",
        request,
        sessionStorage,
        options,
        error,
      );
    }
  }
}

authenticator.use(
  new TokenStrategy(async ({ token }) => {
    const { data } = jwt.verify(token, config.SALT) as { data: User };
    return data;
  }),
  "token",
);
