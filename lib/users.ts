import db from "./db.ts";

import type { Session } from "../auth.ts";

export async function ensureUserExists(session: Session) {
  const key = ["user", session.sub];
  await db.set(key, {
    sub: session.sub,
    email: session.email,
    name: session.name,
    viewer: session.viewer,
    short_url: session.short_url,
    vanity_url: session.vanity_url,
    administrator: session.administrator,
  });
}
