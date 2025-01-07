import { FreshContext } from "$fresh/server.ts";
import { setCookie } from "@std/http/cookie";
import type { StateWithCleanup, StateWithNewSession } from "../auth.ts";

export async function handler(
  _req: Request,
  ctx: FreshContext<StateWithCleanup & StateWithNewSession>,
) {
  const response = await ctx.next();
  ctx?.state?._auth_cleanup?.(response);
  if (ctx?.state?.newSessionCookie) {
    setCookie(response.headers, ctx.state.newSessionCookie);
  }
  return response;
}
