import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server";
import {
  checkOrigin,
  readBody,
  setIdentity,
  failure,
} from "./server/session-http";
import { SessionError } from "./server/session-store";
function request(host: string, origin: string, body = "{}") {
  return new NextRequest("http://0.0.0.0:3000/api/sessions", {
    method: "POST",
    headers: { host, origin, "content-type": "application/json" },
    body,
  });
}
describe("session HTTP boundary", () => {
  it("accepts localhost and LAN origins even when Next listens on 0.0.0.0", () => {
    assert.doesNotThrow(() =>
      checkOrigin(request("localhost:3000", "http://localhost:3000")),
    );
    assert.doesNotThrow(() =>
      checkOrigin(request("192.168.1.10:3000", "http://192.168.1.10:3000")),
    );
  });
  it("rejects foreign and malformed origins", () => {
    assert.throws(
      () => checkOrigin(request("localhost:3000", "https://foreign.example")),
      (e) => e instanceof SessionError && e.status === 403,
    );
    assert.throws(
      () => checkOrigin(request("localhost:3000", "null")),
      (e) => e instanceof SessionError && e.status === 403,
    );
  });
  it("rejects oversized and malformed bodies before session mutation", async () => {
    await assert.rejects(
      readBody(
        request("localhost:3000", "http://localhost:3000", "x".repeat(12_001)),
      ),
      (e) => e instanceof SessionError && e.status === 413,
    );
    await assert.rejects(
      readBody(request("localhost:3000", "http://localhost:3000", "not json")),
      (e) => e instanceof SessionError && e.status === 400,
    );
  });
  it("keeps identity cookies HttpOnly and uses Secure behind HTTPS", () => {
    const plain = NextResponse.json({ ok: true });
    setIdentity(
      plain,
      "abcdefghijkl",
      "test-token",
      request("localhost:3000", "http://localhost:3000"),
    );
    const cookie = plain.cookies.get("manypoly_abcdefghijkl")!;
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.secure, false);
    assert.equal(cookie.sameSite, "lax");
    const secureRequest = new NextRequest(
      "https://manypoly.example/api/sessions",
    );
    const secure = NextResponse.json({ ok: true });
    setIdentity(secure, "abcdefghijkl", "test-token", secureRequest);
    assert.equal(secure.cookies.get("manypoly_abcdefghijkl")?.secure, true);
  });
});

it("preserves expected error statuses across a development module reload", () => {
  const oldError = Object.assign(new Error("It is not your move."), {
    name: "SessionError",
    status: 403,
  });
  assert.equal(failure(oldError).status, 403);
});
