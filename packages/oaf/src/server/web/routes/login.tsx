import { redirect } from "@remix-run/server-runtime";

import { authenticator } from "../auth.server.js";
import { commitSession, getSession } from "../session.server.js";

export async function loader({ request }) {
  try {
    const user = await authenticator.authenticate("token", request);
    const session = await getSession(request.headers.get("cookie"));
    session.set("user", user);
    return redirect("/admin", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  } catch {
    return redirect("/");
  }
}
