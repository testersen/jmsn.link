import { extension } from "@std/media-types";
import { expires } from "./session.ts";

interface BaseCall {
  method: string;
  pathname: string;
  query?: Record<string, string>;
  headers?: Record<string, string> | Headers;
}

export interface BodilessCall extends BaseCall {
  method: "GET" | "HEAD";
}

export interface BodyfulCall extends BaseCall {
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body: Record<string, unknown>;
}

export type ApiCall = BodilessCall | BodyfulCall;

export class FetchError extends Error {
  constructor(
    message: string,
    cause?: Error,
  ) {
    super(message, { cause });
  }
}

FetchError.prototype.name = "FetchError";

export class ApiError extends Error {
  constructor(
    message: string,
    cause?: Error,
  ) {
    super(message, { cause });
  }
}

ApiError.prototype.name = "ApiError";

export interface CallResponse<T> {
  request: Request;
  response: Response;
  body: T;
  headers: Headers;
  status: number;
}

export async function call<T>(call: ApiCall): Promise<CallResponse<T>> {
  const url = new URL(call.pathname, location.origin);
  if (call.query) {
    Object.entries(call.query).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  const headers = new Headers(call.headers);
  const body = call.method === "GET" || call.method === "HEAD"
    ? null
    : JSON.stringify((call as BodyfulCall).body);
  const request = new Request(url, {
    method: call.method,
    headers,
    body,
    credentials: "include",
  });
  let response: Response;
  try {
    response = await fetch(request);
  } catch (error: unknown) {
    throw new FetchError(
      "Failed to fetch: " + (error as Error).message,
      error as Error,
    );
  }
  let responseBody: unknown = undefined;
  if (
    response.headers.has("content-type") &&
    extension(response.headers.get("content-type")!) === "json"
  ) {
    try {
      responseBody = await response.json();
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw new FetchError(
          "Failed to parse JSON response: " + (error as Error).message,
          error as Error,
        );
      }
    }
  }
  let errorMessage: string | undefined;
  if (
    responseBody && responseBody !== null && typeof responseBody === "object"
  ) {
    errorMessage = (responseBody as { error: string }).error;
  }
  if (!response.ok || errorMessage) {
    throw new ApiError(
      `API call failed with status ${response.status} ${response.statusText}${
        errorMessage ? ": " + errorMessage : ""
      }`,
    );
  }

  if (response.headers.has("X-Session-Expiration")) {
    expires.value = Number(response.headers.get("X-Session-Expiration"));
  }

  return {
    request,
    response,
    body: responseBody as T,
    headers: response.headers,
    status: response.status,
  } satisfies CallResponse<T>;
}
