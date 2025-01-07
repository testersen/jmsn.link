import type { Handlers } from "$fresh/server.ts";

export const handler: Handlers<unknown> = {
  GET() {
    return new Response(null, { status: 204 });
  },
};
