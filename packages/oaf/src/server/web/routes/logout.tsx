import { redirect } from "react-router";

import { destroySession, getSession } from "../session.server";

export async function loader({ request }) {
  const session = await getSession(request.headers.get("cookie"));
  return redirect("/", {
    headers: { "Set-Cookie": await destroySession(session) },
  });
}
