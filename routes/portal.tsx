import type { Handlers, PageProps, RouteConfig } from "$fresh/server.ts";
import {
  ensureUserIsAuthenticated,
  type Session,
  type StateWithSession,
} from "../auth.ts";
import PortalIsland from "@/islands/PortalIsland.tsx";

export const config: RouteConfig = {
  routeOverride: "/",
};

export const handler: Handlers<PageData, StateWithSession> = {
  async GET(req, ctx) {
    const authenticationResponse = await ensureUserIsAuthenticated(req, ctx);
    if (authenticationResponse) return authenticationResponse;
    return ctx.render({
      session: ctx.state.session,
    });
  },
  async POST(req, ctx) {
    const authenticationResponse = await ensureUserIsAuthenticated(req, ctx);
    if (authenticationResponse) return authenticationResponse;
    // we don't want to display anything on post.
    return Response.redirect("/");
  },
};

interface PageData {
  session: Session;
}

export default function Home(props: PageProps<PageData>) {
  return <PortalIsland {...props.data} />;
}
