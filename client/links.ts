import type { RedirectPayloadInput } from "@/lib/links.ts";
import { call } from "@/client/api.ts";

export async function createLink(payload: RedirectPayloadInput) {
  const { body } = await call<{ slug: string }>({
    method: "POST",
    pathname: "/api/links",
    body: payload,
  });
  console.log(body, "response");
  return body.slug;
}
