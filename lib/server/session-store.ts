import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomBytes, randomInt, createHash } from "node:crypto";
import { BOARD } from "../board";
import {
  createGame,
  gameReducer,
  type Action,
  type Game,
  type Trade,
} from "../game";
import {
  DEFAULT_SETTINGS,
  validSettings,
  type GameSettings,
} from "../settings";
import type { SessionView } from "../session-types";

type Member = { id: string; name: string; tokenHash: string };
type StoredSession = {
  id: string;
  revision: number;
  createdAt: number;
  updatedAt: number;
  maxPlayers: number;
  settings: GameSettings;
  hostId: string;
  members: Member[];
  game: Game | null;
};
export class SessionError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "SessionError";
  }
}
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const secret = () => randomBytes(32).toString("base64url");
const shortId = () => randomBytes(9).toString("base64url");
function username(value: unknown): string {
  if (typeof value !== "string") throw new SessionError("Enter a username.");
  const name = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (
    name.length < 2 ||
    name.length > 18 ||
    !/^[\p{L}\p{M}\p{N} ._-]+$/u.test(name)
  )
    throw new SessionError(
      "Use 2–18 letters, numbers, spaces, dots, hyphens, or underscores.",
    );
  return name;
}
function validId(id: string) {
  if (!/^[A-Za-z0-9_-]{12}$/.test(id))
    throw new SessionError("Session not found.", 404);
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new SessionError("Invalid request.");
  return value as Record<string, unknown>;
}
function integer(value: unknown, min: number, max: number): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < min ||
    Number(value) > max
  )
    throw new SessionError("Invalid number.");
  return Number(value);
}
function parseAction(
  input: unknown,
  actor: number,
  dice: () => number,
  now: number,
): Action {
  const a = object(input);
  switch (a.type) {
    // Auction timing always comes from the server clock, never the client.
    case "auction":
    case "auction-close":
      return { type: a.type, at: now };
    case "bid":
      return a.raise !== undefined
        ? {
            type: "bid",
            player: actor,
            raise: integer(a.raise, 1, 1_000_000),
            at: now,
          }
        : {
            type: "bid",
            player: actor,
            amount: integer(a.amount, 1, 1_000_000_000),
            at: now,
          };
    case "roll":
      return {
        type: "roll",
        dice: [dice(), dice()],
        utilityDice: [dice(), dice()],
      };
    case "buy":
    case "end":
    case "bail":
    case "escape":
    case "bankrupt":
    case "settle":
    case "dismiss-card":
    case "trade-accept":
    case "trade-reject":
    case "trade-defer":
    case "trade-review":
      return { type: a.type };
    case "build":
    case "sell":
    case "mortgage":
      return { type: a.type, space: integer(a.space, 0, 39) };
    case "trade": {
      const t = object(a.trade);
      const ids = (v: unknown) => {
        if (!Array.isArray(v) || v.length > 28)
          throw new SessionError("Invalid properties.");
        return v.map((id) => {
          const n = integer(id, 0, 39);
          if (
            !BOARD[n].price ||
            !["city", "rail", "utility"].includes(BOARD[n].type)
          )
            throw new SessionError("Invalid title deed.");
          return n;
        });
      };
      const trade: Trade = {
        from: actor,
        to: integer(t.to, 0, 5),
        give: ids(t.give),
        take: ids(t.take),
        cashGive: integer(t.cashGive, 0, 1_000_000_000),
        cashTake: integer(t.cashTake, 0, 1_000_000_000),
      };
      if (
        !trade.give.length &&
        !trade.take.length &&
        !trade.cashGive &&
        !trade.cashTake
      )
        throw new SessionError("Offer cash or a property.");
      return { type: "trade", trade };
    }
    default:
      throw new SessionError("Unknown game action.");
  }
}
export function actingPlayer(game: Game) {
  return game.debt?.from ?? game.current;
}
/** Live-auction actions any seated player may send at any moment. */
function openToAll(action: Record<string, unknown>) {
  return action.type === "bid" || action.type === "auction-close";
}
export class SessionStore {
  private db: DatabaseSync;
  constructor(
    path: string | DatabaseSync,
    private dice: () => number = () => randomInt(1, 7),
    private clock: () => number = Date.now,
  ) {
    if (typeof path !== "string") {
      this.db = path;
      return;
    }
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL)",
    );
  }
  close() {
    this.db.close();
  }
  get connection() {
    return this.db;
  }
  private read(id: string): StoredSession {
    validId(id);
    const row = this.db
      .prepare("SELECT data FROM sessions WHERE id=?")
      .get(id) as { data: string } | undefined;
    if (!row)
      throw new SessionError(
        "This session does not exist. Check the link or create a new one.",
        404,
      );
    return JSON.parse(row.data);
  }
  private member(s: StoredSession, token?: string) {
    return token
      ? s.members.find((m) => m.tokenHash === hash(token))
      : undefined;
  }
  private view(s: StoredSession, token?: string): SessionView {
    const m = this.member(s, token);
    return {
      id: s.id,
      revision: s.revision,
      serverNow: this.clock(),
      maxPlayers: s.maxPlayers,
      settings: s.settings,
      members: s.members.map((m) => ({
        id: m.id,
        name: m.name,
        host: m.id === s.hostId,
      })),
      viewer: m
        ? { id: m.id, index: s.members.indexOf(m), host: m.id === s.hostId }
        : null,
      game: s.game ? { ...s.game, chance: [], community: [] } : null,
    };
  }
  get(id: string, token?: string) {
    const s = this.read(id);
    if (s.game?.auction && this.clock() >= (s.game.auction.endsAt ?? 0))
      return this.closeAuction(id, token);
    return this.view(s, token);
  }
  /** Brings the hammer down on an expired auction the next time anyone looks. */
  private closeAuction(id: string, token?: string) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const s = this.read(id);
      if (!s.game) return this.commitUnchanged(s, token).session;
      const next = gameReducer(s.game, {
        type: "auction-close",
        at: this.clock(),
      });
      if (next === s.game) return this.commitUnchanged(s, token).session;
      s.game = next;
      s.revision++;
      s.updatedAt = Date.now();
      this.db
        .prepare("UPDATE sessions SET data=?,updated_at=? WHERE id=?")
        .run(JSON.stringify(s), s.updatedAt, id);
      this.db.exec("COMMIT");
      return this.view(s, token);
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  create(name: unknown) {
    const token = secret(),
      member: Member = {
        id: shortId(),
        name: username(name),
        tokenHash: hash(token),
      };
    const s: StoredSession = {
      id: shortId(),
      revision: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      maxPlayers: 6,
      settings: { ...DEFAULT_SETTINGS },
      hostId: member.id,
      members: [member],
      game: null,
    };
    this.db
      .prepare("INSERT INTO sessions (id,data,updated_at) VALUES (?,?,?)")
      .run(s.id, JSON.stringify(s), s.updatedAt);
    return { session: this.view(s, token), token };
  }
  command(
    id: string,
    token: string | undefined,
    input: unknown,
  ): { session: SessionView | null; token?: string; left?: boolean } {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const s = this.read(id),
        body = object(input);
      let identity = token;
      const m = this.member(s, token);
      if (body.type === "join") {
        if (!m) {
          if (s.game)
            throw new SessionError(
              "This game has already started. Ask the host to start a new game.",
              409,
            );
          if (s.members.length >= s.maxPlayers)
            throw new SessionError("This session is full.", 409);
          const name = username(body.username);
          if (
            s.members.some(
              (m) => m.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
            )
          )
            throw new SessionError(
              "That username is already at the table. Choose another one.",
              409,
            );
          identity = secret();
          s.members.push({ id: shortId(), name, tokenHash: hash(identity) });
        } else {
          return this.commitUnchanged(s, token);
        }
      } else {
        if (!m)
          throw new SessionError(
            "Join this session before making a move.",
            401,
          );
        // Bids race each other on purpose; the reducer only accepts a higher
        // bid, so they skip the stale-revision check.
        const live =
          body.type === "action" &&
          openToAll(object(body.action)) &&
          !!s.game?.auction;
        if (
          !live &&
          (!Number.isSafeInteger(body.revision) || body.revision !== s.revision)
        )
          throw new SessionError(
            "The table changed. Your game has been refreshed; try again.",
            409,
          );
        const host = () => {
          if (m.id !== s.hostId)
            throw new SessionError("Only the host can do that.", 403);
        };
        switch (body.type) {
          case "settings":
            host();
            if (s.game)
              throw new SessionError(
                "Rules are locked after the game starts.",
                409,
              );
            if (!validSettings(body.settings))
              throw new SessionError("Invalid game settings.");
            s.maxPlayers = integer(body.maxPlayers, 2, 6);
            if (s.members.length > s.maxPlayers)
              throw new SessionError(
                "The player limit cannot be lower than the number already joined.",
              );
            s.settings = { ...body.settings };
            break;
          case "start":
            host();
            if (s.game)
              throw new SessionError("The game has already started.", 409);
            if (s.members.length < 2)
              throw new SessionError(
                "At least two players must join before starting.",
              );
            s.game = createGame(
              s.members.map((m) => m.name),
              s.settings,
            );
            break;
          case "reset":
            host();
            if (!s.game) throw new SessionError("The game has not started.");
            s.game = null;
            break;
          case "kick":
            host();
            if (s.game)
              throw new SessionError(
                "Players cannot be removed during a game.",
                409,
              );
            if (
              typeof body.memberId !== "string" ||
              body.memberId === m.id ||
              !s.members.some((p) => p.id === body.memberId)
            )
              throw new SessionError("Choose another player to remove.");
            s.members = s.members.filter((p) => p.id !== body.memberId);
            break;
          case "leave":
            if (s.game)
              throw new SessionError(
                "You can reconnect using this browser. Players cannot leave a running game.",
                409,
              );
            s.members = s.members.filter((p) => p.id !== m.id);
            if (!s.members.length) {
              this.db.prepare("DELETE FROM sessions WHERE id=?").run(id);
              this.db.exec("COMMIT");
              return { session: null, left: true };
            }
            if (m.id === s.hostId) s.hostId = s.members[0].id;
            identity = undefined;
            break;
          case "action": {
            if (!s.game)
              throw new SessionError(
                "Wait for the host to start the game.",
                409,
              );
            const actor = s.members.indexOf(m),
              a = object(body.action);
            if (
              a.type === "trade-accept" ||
              a.type === "trade-defer" ||
              a.type === "trade-review"
            ) {
              if (s.game.trade?.to !== actor)
                throw new SessionError(
                  "Only the recipient can answer this trade.",
                  403,
                );
            } else if (a.type === "trade-reject") {
              if (
                !s.game.trade ||
                ![s.game.trade.from, s.game.trade.to].includes(actor)
              )
                throw new SessionError(
                  "Only the two traders can decline this offer.",
                  403,
                );
            } else if (!openToAll(a) && actingPlayer(s.game) !== actor)
              throw new SessionError("It is not your move.", 403);
            const action = parseAction(
              body.action,
              actor,
              this.dice,
              this.clock(),
            );
            const next = gameReducer(s.game, action);
            if (next === s.game)
              throw new SessionError(
                "That action is not available right now.",
                409,
              );
            s.game = next;
            break;
          }
          default:
            throw new SessionError("Unknown session action.");
        }
      }
      s.revision++;
      s.updatedAt = Date.now();
      this.db
        .prepare("UPDATE sessions SET data=?,updated_at=? WHERE id=?")
        .run(JSON.stringify(s), s.updatedAt, id);
      this.db.exec("COMMIT");
      return {
        session: this.view(s, identity),
        token: identity !== token ? identity : undefined,
        left: body.type === "leave",
      };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  private commitUnchanged(s: StoredSession, token?: string) {
    this.db.exec("COMMIT");
    return { session: this.view(s, token) };
  }
}
// One connection per server process; SQLite transactions also protect multiple workers.
const globalStore = globalThis as unknown as {
  manypolyDatabase?: DatabaseSync;
};
let activeStore: SessionStore | undefined;
export function sessionStore() {
  if (activeStore) return activeStore;
  activeStore = new SessionStore(
    globalStore.manypolyDatabase ??
      resolve(process.env.MANYPOLY_DATA_DIR ?? ".data", "sessions.sqlite"),
  );
  // Keep the database connection across HMR, but load fresh rules and error classes.
  globalStore.manypolyDatabase = activeStore.connection;
  return activeStore;
}
