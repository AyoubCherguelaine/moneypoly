import { NextResponse, type NextRequest } from "next/server";
import { SessionError } from "./session-store";
import { networkInterfaces } from "node:os";
import type { SessionView } from "../session-types";

export function sessionJson(
  session: SessionView | null,
  request: NextRequest,
  status = 200,
) {
  if (!session) return json(null, status);
  const url = new URL(request.url);
  if (request.headers.get("x-forwarded-proto") === "https")
    url.protocol = "https:";
  url.host = request.headers.get("host") ?? url.host;
  if (["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(url.hostname)) {
    const address = Object.entries(networkInterfaces())
      .filter(
        ([name]) => !/^(lo|docker|veth|virbr|br-|tun|tailscale)/.test(name),
      )
      .flatMap(([, addresses]) => addresses ?? [])
      .find(
        (a) =>
          a.family === "IPv4" &&
          !a.internal &&
          !a.address.startsWith("169.254."),
      )?.address;
    if (address) url.hostname = address;
  }
  const invitationUrl = new URL(
    `/session/${session.id}`,
    process.env.MANYPOLY_PUBLIC_URL || url.origin,
  ).toString();
  return json({ ...session, invitationUrl }, status);
}
export const cookieName = (id: string) => `manypoly_${id}`;
export function tokenFor(request: NextRequest, id: string) {
  return request.cookies.get(cookieName(id))?.value;
}
export function setIdentity(
  response: NextResponse,
  id: string,
  token: string,
  request: NextRequest,
) {
  response.cookies.set(cookieName(id), token, {
    httpOnly: true,
    sameSite: "lax",
    secure:
      request.nextUrl.protocol === "https:" ||
      request.headers.get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
export function checkOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) {
    // Next's listen address can be 0.0.0.0 while the browser uses localhost or a LAN IP.
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new SessionError("Invalid request origin.", 403);
    }
    if (
      originHost !== (request.headers.get("host") ?? new URL(request.url).host)
    )
      throw new SessionError("This request must come from the game page.", 403);
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 12_000) throw new SessionError("Request is too large.", 413);
}
export async function readBody(
  request: NextRequest,
): Promise<Record<string, unknown>> {
  checkOrigin(request);
  const text = await request.text();
  if (text.length > 12_000)
    throw new SessionError("Request is too large.", 413);
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error();
    return body;
  } catch {
    throw new SessionError("Invalid request.");
  }
}
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function failure(error: unknown) {
  if (
    error instanceof SessionError ||
    (error instanceof Error &&
      error.name === "SessionError" &&
      "status" in error &&
      typeof error.status === "number" &&
      [400, 401, 403, 404, 409, 413].includes(error.status))
  )
    return json({ error: error.message }, (error as SessionError).status);
  console.error("Session request failed", error);
  return json(
    { error: "The session could not be updated. Please try again." },
    500,
  );
}
