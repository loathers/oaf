import { authenticator } from "../auth.server.js";

export async function loader({ request }) {
  await authenticator.logout(request, { redirectTo: "/" });
}
