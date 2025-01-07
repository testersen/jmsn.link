import type { FreshContext } from "$fresh/server.ts";
import { type Cookie, deleteCookie, getCookies, setCookie } from "@std/http";
import { timingSafeEqual } from "node:crypto";
import { decodeBase64Url, encodeBase64Url } from "@std/encoding/base64url";
import { ensureUserExists } from "./lib/users.ts";

const OAUTH2_CLIENT_ID = Deno.env.get("OAUTH2_CLIENT_ID")!;
const OAUTH2_CLIENT_SECRET = Deno.env.get("OAUTH2_CLIENT_SECRET")!;
const OAUTH2_AUTHORIZE_URL = Deno.env.get("OAUTH2_AUTHORIZE_URL")!;
const OAUTH2_TOKEN_URL = Deno.env.get("OAUTH2_TOKEN_URL")!;

// 10 minutes.
const SESSION_TIME = 1000 * 60 * 15;

{
  const missing = Object.entries({
    OAUTH2_CLIENT_ID,
    OAUTH2_CLIENT_SECRET,
    OAUTH2_AUTHORIZE_URL,
    OAUTH2_TOKEN_URL,
  }).filter(([_, value]) => !value?.trim?.()).map(([key]) => key).join(", ");
  if (missing) {
    throw new Error(`Missing environment variables: ${missing}`);
  }
}

const key = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(OAUTH2_CLIENT_SECRET),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"],
);

export interface Session {
  exp: number;

  sub: string;
  email: string;
  name: string;

  viewer: boolean;
  short_url: boolean;
  vanity_url: boolean;
  administrator: boolean;
}

export interface StateWithCleanup {
  _auth_cleanup?: (response: Response) => void;
}

export interface StateWithCookies {
  cookies: Record<string, string>;
}

export interface StateWithSession {
  session: Session;
}

export interface StateWithNewSession {
  newSessionCookie?: Cookie;
}

const e = new TextEncoder();
const d = new TextDecoder();

async function signSession(
  session: Session,
) {
  const salt: Uint8Array = crypto.getRandomValues(new Uint8Array(32));
  const body = e.encode(JSON.stringify(session));
  const saltAndBody = new Uint8Array(salt.length + body.length);
  saltAndBody.set(salt);
  saltAndBody.set(body, salt.length);
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "HMAC", hash: "SHA-256" },
      key,
      saltAndBody,
    ),
  );
  const signatureAndSaltAndBody = new Uint8Array(
    signature.byteLength + saltAndBody.byteLength,
  );
  signatureAndSaltAndBody.set(signature);
  signatureAndSaltAndBody.set(saltAndBody, signature.byteLength);

  return encodeBase64Url(signatureAndSaltAndBody);
}

async function verifySession(
  sessionStr: string,
  verifyTime = true,
): Promise<void | Session> {
  const signatureAndSaltAndBody = decodeBase64Url(sessionStr);
  const signature1 = signatureAndSaltAndBody.slice(0, 32);
  const saltAndBody = signatureAndSaltAndBody.slice(32);
  const signature2 = new Uint8Array(
    await crypto.subtle.sign(
      { name: "HMAC", hash: "SHA-256" },
      key,
      saltAndBody,
    ),
  );
  if (!timingSafeEqual(signature1, signature2)) {
    return;
  }
  const body: Session = JSON.parse(d.decode(saltAndBody.slice(32)));
  if (typeof body !== "object" || body === null) {
    return;
  }
  if (verifyTime && (body.exp < Date.now())) {
    console.log("Session expired", sessionStr);
    return;
  }
  return body;
}

export async function getSessionDetails(
  request: Request,
  context: FreshContext<
    StateWithCookies & StateWithNewSession & StateWithCleanup
  >,
): Promise<void | Session> {
  const cookies = getCookies(request.headers);
  context.state.cookies = cookies;
  if (cookies.session) {
    const session = await verifySession(cookies.session);

    if (typeof session !== "object" || session === null) {
      context.state._auth_cleanup = (response) =>
        deleteCookie(response.headers, "session");
      return;
    }

    session.exp = Date.now() + SESSION_TIME;

    context.state.newSessionCookie = {
      name: "session",
      value: await signSession(session),
      expires: session.exp,
      httpOnly: true,
      sameSite: "Strict",
    };

    return session;
  }
}

function refresh(url: URL) {
  return new Response(
    `<!DOCTYPE html><html><head><title>Refreshing...</title><meta http-equiv="refresh" content="0; url=${url.href}"/></head><body><p>Redirecting...</p></body></html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html",
      },
    },
  );
}

async function authorize(
  _: Request,
  context: FreshContext<StateWithCookies>,
): Promise<Response> {
  const url = new URL(OAUTH2_AUTHORIZE_URL);
  url.searchParams.set("client_id", OAUTH2_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", context.url.origin);
  url.searchParams.set("scope", "openid");
  url.searchParams.set("response_mode", "form_post");
  url.searchParams.set(
    "state",
    await signSession({ exp: Date.now() } as Session),
  );
  return refresh(url);
}

async function callback(
  request: Request,
  context: FreshContext<StateWithCookies>,
): Promise<Response> {
  const form = await request.formData();
  const code = form.get("code")?.toString()!;
  const state = form.get("state")?.toString()!;
  const error = form.get("error")?.toString()!;
  const error_description = form.get("error_description")?.toString()!;

  if (error || error_description) {
    throw new Deno.errors.Http(`Error: ${error} - ${error_description}`, {
      cause: "oauth2",
    });
  }

  if (!await verifySession(state, false)) {
    throw new Deno.errors.Http("Invalid state", { cause: "oauth2" });
  }

  const res = await fetch(OAUTH2_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: OAUTH2_CLIENT_ID,
      scope: "openid",
      code,
      redirect_uri: context.url.origin,
      grant_type: "authorization_code",
      client_secret: OAUTH2_CLIENT_SECRET,
    }),
  });

  const result = await res.json();

  if (result.error) {
    throw new Deno.errors.Http(
      `Error: ${result.error} (${
        result.error_codes?.join(",")
      }) - ${result.error_description}`,
      { cause: "oauth2" },
    );
  }

  const session: Session = {
    exp: Date.now() + SESSION_TIME,
  } as Session;

  {
    const firstDot = result.access_token.indexOf(".");
    const secondDot = result.access_token.indexOf(".", firstDot + 1);
    const payload = JSON.parse(
      d.decode(
        decodeBase64Url(result.access_token.slice(firstDot + 1, secondDot)),
      ),
    );
    session.email = payload.upn;
    session.name = payload.given_name;
  }

  {
    const firstDot = result.id_token.indexOf(".");
    const secondDot = result.id_token.indexOf(".", firstDot + 1);
    const payload = JSON.parse(
      d.decode(decodeBase64Url(result.id_token.slice(firstDot + 1, secondDot))),
    );
    session.sub = payload.sub;

    payload.roles?.forEach((role: string) => {
      switch (role?.trim()?.toLowerCase()) {
        case "viewer":
          session.viewer = true;
          break;
        case "short_url":
          session.viewer = true;
          session.short_url = true;
          break;
        case "vanity_url":
          session.viewer = true;
          session.vanity_url = true;
          break;
        case "administrator":
          session.viewer = true;
          session.short_url = true;
          session.vanity_url = true;
          session.administrator = true;
          break;
      }
    });
  }

  const response = refresh(new URL("/", context.url.origin));

  const sessionStr = await signSession(session);

  setCookie(response.headers, {
    name: "session",
    value: sessionStr,
    expires: session.exp,
    httpOnly: true,
    sameSite: "Strict",
  });

  await ensureUserExists(session);

  console.log("Created session", sessionStr);

  return response;
}

export async function ensureUserIsAuthenticated(
  request: Request,
  context: FreshContext<
    & Partial<StateWithCookies>
    & Partial<StateWithSession>
    & Partial<StateWithNewSession>
  >,
): Promise<void | Response> {
  const session = await getSessionDetails(
    request,
    context as FreshContext<StateWithCookies>,
  );

  if (session) {
    context.state.session = session;
    return;
  }

  console.debug("No session found, redirecting to auth");
  console.debug("Request URL", request.method, request.url);

  if (request.method === "GET") {
    return await authorize(request, context as FreshContext<StateWithCookies>);
  } else if (request.method === "POST") {
    return await callback(request, context as FreshContext<StateWithCookies>);
  }
}
