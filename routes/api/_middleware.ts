import { FreshContext } from "$fresh/server.ts";
import {
  getSessionDetails,
  StateWithCookies,
  type StateWithNewSession,
  StateWithSession,
} from "../../auth.ts";

export async function handler(
  request: Request,
  context: FreshContext<
    StateWithNewSession & StateWithCookies & StateWithSession
  >,
) {
  const sessionDetails = await getSessionDetails(request, context);

  if (!sessionDetails) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  context.state.session = sessionDetails;

  const response = await context.next();

  response.headers.set("X-Session-Expiration", sessionDetails.exp.toString());

  return response;
}
