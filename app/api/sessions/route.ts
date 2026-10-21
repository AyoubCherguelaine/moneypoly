import type { NextRequest } from "next/server";
import { sessionStore } from "@/lib/server/session-store";
import {
  failure,
  sessionJson,
  readBody,
  setIdentity,
} from "@/lib/server/session-http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const body = await readBody(request),
      result = sessionStore().create(body.username);
    const response = sessionJson(result.session, request, 201);
    setIdentity(response, result.session.id, result.token, request);
    return response;
  } catch (error) {
    return failure(error);
  }
}
