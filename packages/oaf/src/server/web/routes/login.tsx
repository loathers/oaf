import { authenticator } from "../auth.server.js";

export async function loader({ request }) {
  await authenticator.authenticate("token", request, {
    successRedirect: "/admin",
    failureRedirect: "/",
  });
}
