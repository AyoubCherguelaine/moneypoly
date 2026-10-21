import type { NextRequest } from "next/server";
import { sessionStore } from "@/lib/server/session-store";
import {
  cookieName,
  failure,
  sessionJson,
  readBody,
  setIdentity,
  tokenFor,
} from "@/lib/server/session-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    return sessionJson(sessionStore().get(id, tokenFor(request, id)), request);
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params,
      body = await readBody(request);
    const result = sessionStore().command(id, tokenFor(request, id), body),
      response = sessionJson(result.session, request);
    if (result.token) setIdentity(response, id, result.token, request);
    if (result.left) response.cookies.delete(cookieName(id));
    return response;
  } catch (error) {
    return failure(error);
  }
}
