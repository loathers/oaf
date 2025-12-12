import { redirect } from "react-router";

import { destroySession, getSession } from "../session.server.js";
import { Route } from "./+types/logout.js";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("cookie"));
  return redirect("/", {
    headers: { "Set-Cookie": await destroySession(session) },
  });
}
