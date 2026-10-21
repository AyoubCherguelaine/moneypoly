import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionStore, SessionError } from "./server/session-store";
import { DEFAULT_SETTINGS } from "./settings";
function table(dice = () => 1) {
  const clock = { now: 1_000_000 };
  const store = new SessionStore(":memory:", dice, () => clock.now);
  const a = store.create("أمين");
  const b = store.command(a.session.id, undefined, {
    type: "join",
    username: "Yasmin",
  });
  const get = (token = a.token) => store.get(a.session.id, token);
  const cmd = (
    token: string | undefined,
    type: string,
    extra: Record<string, unknown> = {},
  ) =>
    store.command(a.session.id, token, {
      type,
      revision: get().revision,
      ...extra,
    });
  return { store, a, b, get, cmd, clock };
}
function status(code: number) {
  return (e: unknown) => e instanceof SessionError && e.status === code;
}
describe("session lobby and identity", () => {
  it("creates an Arabic username host and reveals no identity secrets or deck order", () => {
    const t = table();
    const view = t.get();
    assert.equal(view.viewer?.host, true);
    assert.equal(view.members[0].name, "أمين");
    assert.ok(!JSON.stringify(view).includes("tokenHash"));
    assert.ok(!JSON.stringify(view).includes(t.a.token));
    t.cmd(t.a.token, "start");
    const game = t.get().game!;
    assert.deepEqual(game.chance, []);
    assert.deepEqual(game.community, []);
    t.store.close();
  });
  it("normalizes names and rejects blank, duplicate, malformed and overlong usernames", () => {
    const store = new SessionStore(":memory:");
    assert.throws(() => store.create(" "), status(400));
    assert.throws(() => store.create("<script>"), status(400));
    assert.throws(() => store.create("A".repeat(19)), status(400));
    const a = store.create("  Amine  ");
    assert.equal(a.session.members[0].name, "Amine");
    assert.throws(
      () =>
        store.command(a.session.id, undefined, {
          type: "join",
          username: "AMINE",
        }),
      status(409),
    );
    store.close();
  });
  it("supports six players and rejects a seventh", () => {
    const store = new SessionStore(":memory:");
    const a = store.create("Host");
    for (let i = 1; i < 6; i++)
      store.command(a.session.id, undefined, {
        type: "join",
        username: `Friend ${i}`,
      });
    assert.equal(store.get(a.session.id).members.length, 6);
    assert.throws(
      () =>
        store.command(a.session.id, undefined, {
          type: "join",
          username: "Seventh",
        }),
      status(409),
    );
    store.close();
  });
  it("cannot impersonate a player with a username or forged token", () => {
    const t = table();
    assert.equal(t.store.get(t.a.session.id, "أمين").viewer, null);
    assert.throws(() => t.cmd("forged", "start"), status(401));
    assert.equal(t.store.get(t.a.session.id, t.b.token).viewer?.index, 1);
    t.store.close();
  });
  it("restores an existing seat idempotently even after start", () => {
    const t = table();
    t.cmd(t.a.token, "start");
    const result = t.store.command(t.a.session.id, t.b.token, {
      type: "join",
      username: "Other",
    });
    assert.equal(result.session?.members.length, 2);
    assert.equal(result.session?.viewer?.index, 1);
    assert.throws(
      () =>
        t.store.command(t.a.session.id, undefined, {
          type: "join",
          username: "Late guest",
        }),
      status(409),
    );
    t.store.close();
  });
  it("enforces player limits, host-only rules, and at least two players", () => {
    const store = new SessionStore(":memory:");
    const a = store.create("Host");
    assert.throws(
      () =>
        store.command(a.session.id, a.token, { type: "start", revision: 0 }),
      status(400),
    );
    store.close();
    const t = table();
    assert.throws(
      () =>
        t.cmd(t.b.token, "settings", {
          settings: DEFAULT_SETTINGS,
          maxPlayers: 4,
        }),
      status(403),
    );
    t.cmd(t.a.token, "settings", { settings: DEFAULT_SETTINGS, maxPlayers: 2 });
    assert.throws(
      () =>
        t.store.command(t.a.session.id, undefined, {
          type: "join",
          username: "Too many",
        }),
      status(409),
    );
    assert.throws(
      () =>
        t.cmd(t.a.token, "settings", {
          settings: { ...DEFAULT_SETTINGS, taxes: false, freeParkingPot: true },
          maxPlayers: 2,
        }),
      status(400),
    );
    t.store.close();
  });
  it("locks the settings on start and unlocks on host reset without losing seats", () => {
    const t = table();
    t.cmd(t.a.token, "settings", {
      settings: {
        ...DEFAULT_SETTINGS,
        rentInJail: false,
        mortgages: false,
        auctions: false,
      },
      maxPlayers: 4,
    });
    t.cmd(t.a.token, "start");
    assert.equal(t.get().game?.settings?.rentInJail, false);
    assert.equal(t.get().game?.settings?.mortgages, false);
    assert.throws(
      () =>
        t.cmd(t.a.token, "settings", {
          settings: DEFAULT_SETTINGS,
          maxPlayers: 6,
        }),
      status(409),
    );
    assert.throws(() => t.cmd(t.b.token, "reset"), status(403));
    t.cmd(t.a.token, "reset");
    assert.equal(t.get().game, null);
    assert.equal(t.get().members.length, 2);
    t.cmd(t.a.token, "settings", { settings: DEFAULT_SETTINGS, maxPlayers: 6 });
    t.store.close();
  });
  it("transfers host on lobby departure and invalidates removed identities", () => {
    const t = table();
    const r = t.cmd(t.a.token, "leave");
    assert.equal(r.left, true);
    assert.equal(t.get(t.b.token!).viewer?.host, true);
    assert.equal(t.get(t.a.token).viewer, null);
    t.store.close();
    const other = table();
    other.cmd(other.a.token, "kick", { memberId: other.b.session!.viewer!.id });
    assert.equal(
      other.store.get(other.a.session.id, other.b.token).viewer,
      null,
    );
    assert.throws(() => other.cmd(other.b.token, "start"), status(401));
    other.store.close();
  });
  it("does not allow leaving or kicking during a running game", () => {
    const t = table();
    t.cmd(t.a.token, "start");
    assert.throws(() => t.cmd(t.b.token, "leave"), status(409));
    assert.throws(
      () => t.cmd(t.a.token, "kick", { memberId: t.b.session!.viewer!.id }),
      status(409),
    );
    t.store.close();
  });
  it("rejects malformed and nonexistent session IDs", () => {
    const store = new SessionStore(":memory:");
    assert.throws(() => store.get("../passwd"), status(404));
    assert.throws(() => store.get("abcdefghijkl"), status(404));
    store.close();
  });
});
describe("authoritative shared game", () => {
  it("allows only the active player and rolls dice on the server", () => {
    let i = 0;
    const t = table(() => (i++ % 2 === 0 ? 1 : 2));
    t.cmd(t.a.token, "start");
    assert.throws(
      () =>
        t.cmd(t.b.token, "action", { action: { type: "roll", dice: [6, 6] } }),
      status(403),
    );
    const result = t.cmd(t.a.token, "action", {
      action: { type: "roll", dice: [6, 6], money: 99999 },
    });
    assert.deepEqual(result.session?.game?.dice, [1, 2]);
    assert.equal(result.session?.game?.players[0].position, 3);
    assert.equal(result.session?.game?.players[0].money, 1500);
    assert.deepEqual(t.get(t.b.token!).game, result.session?.game);
    t.store.close();
  });
  it("rejects stale concurrent actions without double-charging", () => {
    let i = 0;
    const t = table(() => (i++ % 2 === 0 ? 1 : 2));
    t.cmd(t.a.token, "start");
    t.cmd(t.a.token, "action", { action: { type: "roll" } });
    const revision = t.get().revision;
    t.store.command(t.a.session.id, t.a.token, {
      type: "action",
      revision,
      action: { type: "buy" },
    });
    assert.throws(
      () =>
        t.store.command(t.a.session.id, t.a.token, {
          type: "action",
          revision,
          action: { type: "buy" },
        }),
      status(409),
    );
    assert.equal(t.get().game?.players[0].money, 1440);
    t.store.close();
  });
  it("enforces recipient-only trade acceptance and trader-only rejection", () => {
    let i = 0;
    const t = table(() => (i++ % 2 === 0 ? 1 : 2));
    const third = t.store.command(t.a.session.id, undefined, {
      type: "join",
      username: "Third",
    });
    t.cmd(t.a.token, "start");
    t.cmd(t.a.token, "action", {
      action: {
        type: "trade",
        trade: {
          from: 2,
          to: 1,
          give: [],
          take: [],
          cashGive: 100,
          cashTake: 0,
        },
      },
    });
    assert.equal(t.get().game?.trade?.from, 0);
    assert.throws(
      () => t.cmd(t.a.token, "action", { action: { type: "trade-accept" } }),
      status(403),
    );
    assert.throws(
      () => t.cmd(third.token, "action", { action: { type: "trade-reject" } }),
      status(403),
    );
    t.cmd(t.b.token, "action", { action: { type: "trade-accept" } });
    assert.equal(t.get().game?.players[0].money, 1400);
    assert.equal(t.get().game?.players[1].money, 1600);
    t.store.close();
  });
  it("runs live auctions on the server clock and lets anyone outbid at once", () => {
    let i = 0;
    const t = table(() => (i++ % 2 === 0 ? 1 : 2));
    t.cmd(t.a.token, "start");
    t.cmd(t.a.token, "action", { action: { type: "roll" } });
    t.cmd(t.a.token, "action", { action: { type: "auction" } });
    const stale = t.get().revision;
    t.cmd(t.b.token, "action", { action: { type: "bid", amount: 10 } });
    // A bid sent from a slightly old view still counts if it is higher.
    t.store.command(t.a.session.id, t.a.token, {
      type: "action",
      revision: stale,
      action: { type: "bid", amount: 15 },
    });
    assert.equal(t.get().game?.auction?.leader, 0);
    // Two "+10" clicks at the same moment stack rather than collide.
    t.store.command(t.a.session.id, t.b.token, {
      type: "action",
      revision: stale,
      action: { type: "bid", raise: 10 },
    });
    assert.equal(t.get().game?.auction?.bid, 25);
    assert.equal(t.get().game?.auction?.leader, 1);
    t.cmd(t.a.token, "action", { action: { type: "bid", raise: 10 } });
    assert.throws(
      () => t.cmd(t.b.token, "action", { action: { type: "bid", amount: 35 } }),
      status(409),
    );
    t.clock.now += 4_000;
    assert.equal(t.get().game?.phase, "auction");
    t.clock.now += 1_001;
    const after = t.get();
    assert.equal(after.game?.auction, null);
    assert.equal(after.game?.deeds[3].owner, 0);
    assert.equal(after.game?.players[0].money, 1465);
    t.store.close();
  });
  it("rejects invalid payloads without corrupting or advancing the session", () => {
    const t = table();
    t.cmd(t.a.token, "start");
    const before = t.get();
    for (const action of [
      null,
      { type: "build", space: -1 },
      { type: "build", space: 200 },
      { type: "bid", amount: "999" },
      { type: "trade", trade: {} },
      { type: "cheat" },
    ])
      assert.throws(() => t.cmd(t.a.token, "action", { action }), status(400));
    assert.deepEqual(t.get(), before);
    t.store.close();
  });
  it("persists across server restarts and independent SQLite connections", () => {
    const dir = mkdtempSync(join(tmpdir(), "manypoly-test-"));
    const path = join(dir, "sessions.sqlite");
    let store = new SessionStore(path);
    const a = store.create("Host");
    const b = store.command(a.session.id, undefined, {
      type: "join",
      username: "Guest",
    });
    store.command(a.session.id, a.token, { type: "start", revision: 1 });
    store.close();
    store = new SessionStore(path);
    assert.equal(store.get(a.session.id, b.token).viewer?.index, 1);
    assert.equal(store.get(a.session.id).game?.phase, "roll");
    const second = new SessionStore(path);
    const snapshot = second.get(a.session.id, a.token);
    store.command(a.session.id, a.token, {
      type: "action",
      action: { type: "roll" },
      revision: snapshot.revision,
    });
    assert.throws(
      () =>
        second.command(a.session.id, a.token, {
          type: "action",
          action: { type: "roll" },
          revision: snapshot.revision,
        }),
      status(409),
    );
    assert.equal(second.get(a.session.id).revision, snapshot.revision + 1);
    second.close();
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  it("keeps sessions separate", () => {
    const t = table();
    const other = t.store.create("Other host");
    assert.equal(t.store.get(other.session.id, t.a.token).viewer, null);
    assert.throws(
      () =>
        t.store.command(other.session.id, t.a.token, {
          type: "start",
          revision: 0,
        }),
      status(401),
    );
    t.store.close();
  });
});
