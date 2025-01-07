import { call } from "./api.ts";

export async function ping() {
  const { response } = await call({
    method: "GET",
    pathname: "/api/ping",
  });
  if (!response.ok) {
    throw new Error("Failed to ping");
  }
}
