"use client";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  Coins,
  Flag,
  Landmark,
  Leaf,
  ShieldCheck,
  Sparkles,
  TrainFront,
  Users,
  Zap,
} from "lucide-react";
import { BOARD, COLORS, GROUPS, TOKENS, money, type Space } from "@/lib/board";
import { arrivedIn, type Game } from "@/lib/game";

function side(id: number) {
  if (id % 10 === 0) return "corner";
  if (id < 10) return "side-bottom";
  if (id < 20) return "side-left";
  if (id < 30) return "side-top";
  return "side-right";
}

const HOP_MS = 190;
const MAX_HOP = 12;
const HOP_PAUSE_MS = 650;

/* Board positions shown on screen trail the game state: pins walk one space
   at a time after a dice roll. When the square the dice landed on sent the
   player elsewhere (Go to jail, a card), the pin first walks to that square,
   pauses, then jumps to its final spot. */
function useShownPositions(game: Game, started: boolean) {
  const key = game.players.map((p) => p.position).join(",");
  const targets = useMemo(() => key.split(",").map(Number), [key]);
  const jailKey = game.players.map((p) => (p.jailed ? 1 : 0)).join("");
  const jailed = useMemo(() => [...jailKey].map((c) => c === "1"), [jailKey]);
  const [shown, setShown] = useState(targets);
  const [via, setVia] = useState<(number | null)[]>([]);
  const [seenKey, setSeenKey] = useState(key);
  // A game that was just started or restored appears in place, without walking.
  const [wasStarted, setWasStarted] = useState(started);
  if (wasStarted !== started) {
    setWasStarted(started);
    setShown(targets);
    setVia([]);
    setSeenKey(key);
  } else if (seenKey !== key) {
    setSeenKey(key);
    const recent = game.logs.slice(0, 10).map((l) => l.text);
    setVia(
      targets.map((to, i) => {
        if (i !== game.current || shown[i] === to) return null;
        const stop = (shown[i] + game.dice[0] + game.dice[1]) % 40;
        const landed = recent.includes(
          arrivedIn(game.players[i].name, BOARD[stop]),
        );
        return stop !== to && landed ? stop : null;
      }),
    );
  }
  const settled =
    shown.length === targets.length && shown.every((v, i) => v === targets[i]);
  useEffect(() => {
    if (settled) return;
    const timer = setTimeout(
      () => {
        // Reached the square the dice chose: drop the waypoint, which also
        // gives the pin a short pause before it continues.
        if (via.some((v, i) => v !== null && shown[i] === v)) {
          setVia((prev) => prev.map((v, i) => (shown[i] === v ? null : v)));
          return;
        }
        const reduce = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        setShown(
          targets.map((target, i) => {
            const from = shown[i] ?? target,
              to = via[i] ?? target;
            const ahead = (to - from + 40) % 40;
            // Being sent to jail is never a walk onto the jail square.
            const toJail = jailed[i] && (via[i] ?? null) === null && to === 10;
            if (ahead === 0 || reduce || toJail || ahead > MAX_HOP) return to;
            return (from + 1) % 40;
          }),
        );
      },
      via.some((v, i) => v !== null && shown[i] === v) ? HOP_PAUSE_MS : HOP_MS,
    );
    return () => clearTimeout(timer);
  }, [settled, shown, targets, via, jailed]);
  return { shown, settled };
}

function position(id: number): CSSProperties {
  if (id <= 10) return { gridRow: 11, gridColumn: 11 - id };
  if (id <= 20) return { gridRow: 21 - id, gridColumn: 1 };
  if (id <= 30) return { gridRow: 1, gridColumn: id - 19 };
  return { gridRow: id - 29, gridColumn: 11 };
}

export function SpaceIcon({
  type,
  size = 20,
}: {
  type: Space["type"];
  size?: number;
}) {
  const I =
    type === "rail"
      ? TrainFront
      : type === "utility"
        ? Zap
        : type === "chance"
          ? Sparkles
          : type === "community"
            ? Landmark
            : type === "tax"
              ? Coins
              : type === "parking"
                ? Leaf
                : type === "jail"
                  ? ShieldCheck
                  : type === "go-jail"
                    ? ArrowUpRight
                    : Flag;
  return <I size={size} strokeWidth={1.5} />;
}

function Skyline() {
  return (
    <svg
      className="skyline"
      viewBox="0 0 600 150"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M0 141H600M25 141V105H53V141M31 105V91H47V105M69 141V84H110V141M77 84V69H102V84M87 69V42M125 141V106H159V141M130 106Q143 79 155 106M169 141V66H182V141M171 66V48L176 33L181 48V66M194 141V102Q220 54 246 102V141M204 141V117H219V141M226 141V117H239V141M220 77V59M220 59Q207 54 220 47M256 141V46H272V141M255 46L264 25L273 46M264 25V12M284 141V92H324V141M289 92Q305 70 320 92M335 141V61H349V141M335 61L342 41L349 61M365 141V102H412V141M370 102Q389 66 407 102M389 77V59M424 141V80H450V141M429 80V65H445V80M464 141V102H500V141M473 102V88H491V102M517 141V59H530V141M517 59L524 40L531 59M547 141V112H578V141M552 112Q563 94 574 112"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M197 141V127Q211 110 224 127V141M377 141V120Q389 105 401 120V141"
        stroke="currentColor"
      />
      <path
        d="M96 29a10 10 0 1 0 11 16A12 12 0 0 1 96 29Z"
        fill="currentColor"
        opacity=".5"
      />
    </svg>
  );
}

export function GameBoard({
  game,
  onSpace,
  started,
  center,
}: {
  game: Game;
  onSpace: (s: Space) => void;
  started: boolean;
  /** Decision UI (offers, auctions, trades) shown over the board centre. */
  center?: ReactNode;
}) {
  const { shown, settled } = useShownPositions(game, started);
  return (
    <div className="board-frame">
      <div className="board" aria-label="لوحة لعبة Moneypoly">
        {BOARD.map((s) => {
          const d = game.deeds[s.id],
            people = game.players.filter(
              (p) => !p.bankrupt && (shown[p.id] ?? p.position) === s.id,
            );
          return (
            <button
              key={s.id}
              className={`space ${s.type} ${side(s.id)} ${d ? "is-owned" : ""} ${d?.mortgaged ? "is-mortgaged" : ""} ${started && shown[game.current] === s.id ? "current-space" : ""}`}
              style={
                {
                  ...position(s.id),
                  ...(d && { "--owner": COLORS[d.owner] }),
                } as CSSProperties
              }
              onClick={() => onSpace(s)}
              aria-label={`${s.name}${s.price ? `، ${money(s.price)}` : ""}${d ? `، يملكها ${game.players[d.owner].name}` : ""}`}
            >
              <span className="space-card">
                {s.group && (
                  <span className="card-head">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="head-flag"
                      src={GROUPS[s.group].flag}
                      alt={GROUPS[s.group].name}
                    />
                    <span className="house-row">
                      {d?.houses ? (
                        d.houses === 5 ? (
                          <span className="hotel" />
                        ) : (
                          Array.from({ length: d.houses }, (_, i) => (
                            <span className="house" key={i} />
                          ))
                        )
                      ) : null}
                    </span>
                  </span>
                )}
                {!s.group && (
                  <span className="space-icon">
                    <SpaceIcon type={s.type} />
                  </span>
                )}
                <span className="space-ar" lang="ar" dir="rtl">
                  {s.arabic}
                </span>
                {s.type === "city" && (
                  <span className="space-name">{s.name}</span>
                )}
                {s.price && s.type !== "tax" && (
                  <span className="space-price">
                    {s.price}
                    <small> درهم</small>
                  </span>
                )}
                {s.type === "tax" && (
                  <span className="space-price">
                    −{s.price}
                    <small> درهم</small>
                  </span>
                )}
                {s.type === "go" && (
                  <span className="go-arrow">
                    ← +{(game.settings ?? DEFAULT_SETTINGS).startSalary} درهم
                  </span>
                )}
                {d && (
                  <span
                    className="owner-line"
                    style={{ background: COLORS[d.owner] }}
                  />
                )}
              </span>
              {!!people.length && (
                <span className="tokens">
                  {people.map((p) => (
                    <span
                      key={p.id}
                      className={
                        started && p.id === game.current ? "is-turn" : ""
                      }
                      style={{ background: COLORS[p.id] }}
                      title={p.name}
                    >
                      {TOKENS[p.id]}
                    </span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
        <div className="board-center">
          <div className="center-top">
            <span>نسخة العالم العربي</span>
          </div>
          <div className="center-brand">
            <span className="tiny-stars">✦ &nbsp; ✧ &nbsp; ✦</span>
            <h2>
              Moneypoly<span>✦</span>
            </h2>
            <p>رحلة تستحق أن تُخاض.</p>
          </div>
          <Skyline />
          <div className="deck-row">
            <div className="deck-card chance-deck">
              <Sparkles size={25} />
              <div>
                <b>فرصة</b>
              </div>
              <span className="deck-number">16</span>
            </div>
            <span className="deck-divider">✦</span>
            <div className="deck-card community-deck">
              <Landmark size={25} />
              <div>
                <b>صندوق المجتمع</b>
              </div>
              <span className="deck-number">16</span>
            </div>
          </div>
          <div className="center-bottom">
            <span>
              <Users size={13} /> من 2 إلى 6 أصدقاء
            </span>
            <span>22 مدينة. احتمالات لا تنتهي.</span>
            <span>
              <Coins size={13} /> الدرهم
            </span>
          </div>
        </div>
        {center && settled && <div className="board-stage">{center}</div>}
      </div>
    </div>
  );
}
