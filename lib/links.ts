import { encodeBase64Url } from "@std/encoding/base64url";
import db from "./db.ts";
import { z } from "zod";

await db.atomic()
  .check({ key: ["link_count"], versionstamp: null })
  .set(["link_count"], 0)
  .commit();

export const baseRedirectSchema = z.object({
  title: z.string(),
  description: z.string(),
  target: z.string().url(),
  maxAge: z.number().optional(),
});

export const createVanityRedirectSchema = baseRedirectSchema.extend({
  type: z.literal("vanity"),
  slug: z.string(),
});

export const createRandomRedirectSchema = baseRedirectSchema.extend({
  type: z.literal("random"),
});

export const createRedirectSchema = z.union([
  createVanityRedirectSchema,
  createRandomRedirectSchema,
]);

export type RedirectPayloadInput = z.infer<typeof createRedirectSchema>;
export type RedirectPayload = RedirectPayloadInput & {
  createdBy: string;
  createdAt: number;
};

let count = 0;

function getCount() {
  const n = count++;
  if (count === 65535) {
    count = 0;
  }
  return n;
}

function randomSlug(): string {
  const now = BigInt(Date.now());
  const count = getCount();
  return encodeBase64Url(
    new Uint8Array([
      Number((now >> 56n) & 0xffn),
      Number((now >> 40n) & 0xffn),
      Number((now >> 32n) & 0xffn),
      Number((now >> 24n) & 0xffn),
      Number((now >> 16n) & 0xffn),
      Number((now >> 8n) & 0xffn),
      Number(now & 0xffn),
      (count >> 8) & 0xff,
      count,
    ]),
  );
}

/**
 * @returns the slug
 */
export async function createRedirect(
  payload: RedirectPayloadInput,
  createdBy: string,
): Promise<string> {
  const slug = payload.type === "vanity" ? payload.slug : randomSlug();
  const key = ["link", slug];

  const result = await db.atomic()
    .check({ key, versionstamp: null })
    .mutate({
      type: "sum",
      key: ["link_count"],
      value: new Deno.KvU64(1n),
    })
    .set(
      key,
      {
        type: payload.type,
        title: payload.title,
        description: payload.description,
        slug,
        target: payload.target,
        maxAge: payload.maxAge,
        createdBy,
        createdAt: Date.now(),
      } satisfies RedirectPayload,
      { expireIn: payload.maxAge },
    )
    .commit();

  if (!result.ok) {
    throw new Error("Failed to create redirect");
  }

  return slug;
}

export async function getRedirect(
  slug: string,
): Promise<undefined | RedirectPayload> {
  const redirect = await db.get<RedirectPayload>(["link", slug]);

  if (!redirect || !redirect.value) {
    return undefined;
  }

  return redirect.value;
}

export async function deleteRedirect(slug: string): Promise<void> {
  await db.delete(["link", slug]);
}

export interface RedirectList {
  redirects: RedirectPayload[];
  cursor: string;
  count: number;
}

/**
 * @todo Implement where clause.
 */
export async function listRedirects(
  limit: number,
  cursor?: string,
): Promise<RedirectList> {
  const redirects: RedirectPayload[] = [];
  const entries = db.list<RedirectPayload>({
    prefix: ["link"],
  }, {
    cursor,
    limit,
  });
  for await (const redirect of entries) {
    redirects.push(redirect.value);
  }
  const count = await db.get<number>(["link_count"]);
  return {
    redirects,
    cursor: entries.cursor,
    count: count.value!,
  };
}
