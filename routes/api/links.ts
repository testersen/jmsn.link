import type { Handlers } from "$fresh/server.ts";
import type { StateWithSession } from "../../auth.ts";
import {
  createRedirect,
  createRedirectSchema,
  listRedirects,
} from "@/lib/links.ts";
import { json } from "@/lib/utils.ts";

export const handler: Handlers<unknown, StateWithSession> = {
  async GET() {
    const items = await listRedirects(100, undefined);
    return json(items);
  },

  async POST(request, ctx) {
    const s = ctx.state.session;
    try {
      const payload = await createRedirectSchema
        .safeParseAsync(await request.json());
      if (!payload.success) {
        return json(
          { error: "invalid payload", validation: payload.error },
          { status: 400 },
        );
      }
      if (payload.data.type === "vanity" && !s.vanity_url) {
        return json(
          { error: "vanity urls are not enabled for this account" },
          { status: 403 },
        );
      }
      if (payload.data.type === "random" && !s.short_url) {
        return json(
          { error: "random urls are not enabled for this account" },
          { status: 403 },
        );
      }
      const slug = await createRedirect(payload.data, s.sub);
      return json({ slug }, { status: 201 });
    } catch (error) {
      console.error(error);
      return json({ error: "something went wrong!" }, { status: 500 });
    }
  },
};
