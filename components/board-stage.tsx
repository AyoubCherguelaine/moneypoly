"use client";
import { Button } from "@/components/ui/button";
import { useEffect, useState, type CSSProperties } from "react";
import {
  ArrowLeftRight,
  Check,
  Crown,
  Gavel,
  Handshake,
  House,
  Landmark,
  Clock,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { BOARD, GROUPS, money, type Space } from "@/lib/board";
import {
  AUCTION_BID_MS,
  AUCTION_OPEN_MS,
  groupSpaces,
  tradeOpen,
  tradeValid,
  type Action,
  type Game,
} from "@/lib/game";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { SpaceIcon } from "./game-board";
import { Token } from "./game-ui";

type StageProps = {
  game: Game;
  /** Seat of the person looking at the screen; undefined for a shared device. */
  viewer?: number;
  busy: boolean;
  /** Server clock minus local clock (online games), in ms. */
  clockOffset?: number;
  dispatch: (a: Action) => void;
};

/** Picks what deserves the centre of the board right now, if anything. */
export function BoardStage(props: StageProps) {
  const g = props.game;
  if (g.phase === "over") return null;
  if (tradeOpen(g)) return <TradeStage {...props} />;
  if (g.phase === "auction" && g.auction) return <AuctionStage {...props} />;
  if (g.phase === "buy" && !g.debt) return <OfferStage {...props} />;
  if (g.card) return <CardStage {...props} />;
  if (justJailed(g)) return <JailStage {...props} />;
  return null;
}

function DeedFace({ space: s, compact }: { space: Space; compact?: boolean }) {
  const group = s.group ? GROUPS[s.group] : null;
  return (
    <div
      className={`stage-deed ${compact ? "compact" : ""}`}
      style={{ "--group": group?.color ?? "#698e80" } as CSSProperties}
    >
      {group ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="stage-deed-flag" src={group.flag} alt={group.name} />
      ) : (
        <span className="stage-deed-icon">
          <SpaceIcon type={s.type} size={compact ? 22 : 30} />
        </span>
      )}
      <div className="stage-deed-body">
        <span>
          {group ? group.name : s.type === "rail" ? "Railway" : "Utility"}
        </span>
        <b lang="ar">{s.arabic}</b>
        <strong>{s.name}</strong>
      </div>
    </div>
  );
}

/** Who acts, and what everybody else should be told while they wait. */
function seat(g: Game, viewer: number | undefined, actor: number) {
  const name = g.players[actor].name;
  return {
    canAct: viewer === undefined || viewer === actor,
    waiting: `Waiting for ${name}…`,
    handOff: viewer === undefined ? `Pass the device to ${name}.` : null,
  };
}

function OfferStage({
  game: g,
  viewer,
  busy,
  clockOffset,
  dispatch,
}: StageProps) {
  const p = g.players[g.current],
    s = BOARD[p.position],
    price = s.price!,
    settings = g.settings ?? DEFAULT_SETTINGS,
    { canAct, waiting } = seat(g, viewer, p.id),
    short = p.money < price;
  const family = s.group
    ? groupSpaces(s)
    : BOARD.filter((x) => x.type === s.type);
  const mine = family.filter((x) => g.deeds[x.id]?.owner === p.id).length;
  const others: Record<string, number> = {};
  for (const x of family) {
    const d = g.deeds[x.id];
    if (d && d.owner !== p.id) {
      const name = g.players[d.owner].name;
      others[name] = (others[name] ?? 0) + 1;
    }
  }
  const completes = s.group && mine + 1 === family.length;
  return (
    <div
      className="stage-panel offer-stage"
      role="dialog"
      aria-label="Property offer"
    >
      <span className="stage-kicker">
        <House size={13} /> FOR SALE · {p.name.toUpperCase()} LANDED HERE
      </span>
      <DeedFace space={s} />
      <div className="offer-facts">
        <div>
          <span>Price</span>
          <b>{money(price)}</b>
        </div>
        <div>
          <span>{s.type === "city" ? "Base rent" : "Rent"}</span>
          <b>
            {s.type === "city"
              ? money(s.rents![0])
              : s.type === "rail"
                ? `${money(25)}+`
                : "4× dice"}
          </b>
        </div>
        <div>
          <span>{s.type === "city" ? "With hotel" : "Mortgage"}</span>
          <b>{s.type === "city" ? money(s.rents![5]) : money(price / 2)}</b>
        </div>
      </div>
      <p className={`offer-note ${completes ? "highlight" : ""}`}>
        {completes
          ? `Completes the ${GROUPS[s.group!].name} set — rent doubles!`
          : `${p.name} owns ${mine} of ${family.length}${Object.entries(others)
              .map(([name, n]) => ` · ${name} owns ${n}`)
              .join("")}.`}
      </p>
      <div className="stage-wallet">
        <Token id={p.id} />
        <span>
          <b>{p.name}</b>
          <small>
            {money(p.money)}
            {!short && <> → {money(p.money - price)} after</>}
          </small>
        </span>
      </div>
      {canAct ? (
        <div className="stage-actions">
          <Button
            variant="default"
            className="primary-button"
            disabled={short || busy}
            onClick={() => dispatch({ type: "buy" })}
          >
            <House size={17} /> Buy for {money(price)}
          </Button>
          <Button
            variant="outline"
            className="secondary-button"
            disabled={busy}
            onClick={() =>
              dispatch({ type: "auction", at: clockNow(clockOffset) })
            }
          >
            {settings.auctions ? (
              <>
                <Gavel size={15} /> Send to auction
              </>
            ) : (
              "Leave with the bank"
            )}
          </Button>
          {short && (
            <small className="stage-hint">
              Not enough cash — {money(price - p.money)} short.
            </small>
          )}
        </div>
      ) : (
        <p className="stage-waiting">{waiting}</p>
      )}
    </div>
  );
}

const RAISES = [1, 10, 50, 100];
/** Current time on the clock the game runs on (the server's, online). */
const clockNow = (offset = 0) => Date.now() + offset;

/** Milliseconds left on the auction clock, refreshed several times a second. */
function useCountdown(endsAt: number, offset: number) {
  const [now, setNow] = useState(() => clockNow(offset));
  useEffect(() => {
    const timer = setInterval(() => setNow(clockNow(offset)), 100);
    return () => clearInterval(timer);
  }, [offset]);
  return Math.max(0, endsAt - now);
}

function AuctionStage({
  game: g,
  viewer,
  busy,
  clockOffset = 0,
  dispatch,
}: StageProps) {
  const a = g.auction!,
    s = BOARD[a.space],
    left = useCountdown(a.endsAt, clockOffset),
    span = a.leader === null ? AUCTION_OPEN_MS : AUCTION_BID_MS,
    closing = left === 0,
    bidders = g.players.filter(
      (pl) => !pl.bankrupt && (viewer === undefined || pl.id === viewer),
    ),
    others = g.players.filter((pl) => !pl.bankrupt);
  function bid(player: number, raise: number) {
    dispatch({ type: "bid", player, raise, at: clockNow(clockOffset) });
  }
  return (
    <div
      className="stage-panel auction-stage"
      role="dialog"
      aria-label="Auction"
    >
      <span className="stage-kicker">
        <Gavel size={13} /> LIVE AUCTION · LIST PRICE {money(s.price!)}
      </span>
      <DeedFace space={s} compact />
      <div className="auction-lead">
        {a.leader === null ? (
          <>
            <span>No bids yet</span>
            <b>Start at {money(RAISES[0])}</b>
          </>
        ) : (
          <>
            <span>
              <Crown size={13} /> {g.players[a.leader].name} leads
            </span>
            <b key={a.bid}>{money(a.bid)}</b>
          </>
        )}
      </div>
      <div
        className={`auction-clock ${left < 2000 ? "urgent" : ""}`}
        role="timer"
        aria-live="off"
      >
        <i style={{ width: `${Math.min(100, (left / span) * 100)}%` }} />
        <span>
          {closing
            ? a.leader === null
              ? "No bids — staying with the bank…"
              : `Sold to ${g.players[a.leader].name}!`
            : `${Math.ceil(left / 1000)}s — every bid resets the clock`}
        </span>
      </div>
      <ul className="auction-bidders">
        {(viewer === undefined ? bidders : others).map((pl) => {
          const leading = pl.id === a.leader,
            mine = viewer === undefined || pl.id === viewer;
          return (
            <li key={pl.id} className={leading ? "leader" : ""}>
              <Token id={pl.id} />
              <span>
                <b>{pl.name}</b>
                <small>{leading ? "Leading" : money(pl.money)}</small>
              </span>
              {mine && (
                <div className="auction-raises">
                  {RAISES.map((n) => (
                    <Button
                      key={n}
                      variant={n === RAISES[0] ? "default" : "outline"}
                      className={
                        n === RAISES[0] ? "primary-button" : "secondary-button"
                      }
                      disabled={
                        busy || closing || leading || a.bid + n > pl.money
                      }
                      onClick={() => bid(pl.id, n)}
                      aria-label={`${pl.name} bids ${money(a.bid + n)}`}
                    >
                      +{n}
                    </Button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <small className="stage-hint">
        {viewer === undefined
          ? "Everyone bids at once — tap your row. Highest bid when the clock hits zero wins."
          : "Tap to outbid. Highest bid when the clock hits zero wins."}
      </small>
    </div>
  );
}

function TradeSide({
  game: g,
  player,
  cash,
  spaces,
}: {
  game: Game;
  player: number;
  cash: number;
  spaces: number[];
}) {
  const value = cash + spaces.reduce((t, id) => t + BOARD[id].price!, 0);
  return (
    <div className="trade-side">
      <div className="trade-side-head">
        <Token id={player} />
        <span>
          <b>{g.players[player].name}</b>
          <small>gives · worth ≈ {money(value)}</small>
        </span>
      </div>
      <div className="trade-items">
        {cash > 0 && <span className="trade-cash">{money(cash)}</span>}
        {spaces.map((id) => (
          <DeedFace key={id} space={BOARD[id]} compact />
        ))}
        {!cash && !spaces.length && (
          <span className="trade-empty">Nothing</span>
        )}
      </div>
    </div>
  );
}

function TradeStage({ game: g, viewer, busy, dispatch }: StageProps) {
  const t = g.trade!,
    { canAct, handOff } = seat(g, viewer, t.to),
    isSender = viewer === t.from,
    stillValid = tradeValid(g, t);
  return (
    <div
      className="stage-panel trade-stage"
      role="dialog"
      aria-label="Trade offer"
    >
      <span className="stage-kicker">
        <Handshake size={13} /> TRADE OFFER ·{" "}
        {g.players[t.from].name.toUpperCase()} →{" "}
        {g.players[t.to].name.toUpperCase()}
      </span>
      <div className="trade-columns">
        <TradeSide game={g} player={t.from} cash={t.cashGive} spaces={t.give} />
        <span className="trade-swap">
          <ArrowLeftRight size={18} />
        </span>
        <TradeSide game={g} player={t.to} cash={t.cashTake} spaces={t.take} />
      </div>
      {canAct ? (
        <div className="stage-actions">
          {handOff && <small className="stage-hint">{handOff}</small>}
          {!stillValid && (
            <small className="stage-hint stage-warning">
              Things changed since this offer was made — it can only be declined
              now.
            </small>
          )}
          <Button
            variant="default"
            className="primary-button"
            disabled={busy || !stillValid}
            onClick={() => dispatch({ type: "trade-accept" })}
          >
            <Check size={16} /> Accept deal
          </Button>
          <div className="raise-row">
            <Button
              variant="outline"
              className="secondary-button"
              disabled={busy}
              onClick={() => dispatch({ type: "trade-reject" })}
            >
              <X size={15} /> Decline
            </Button>
            <Button
              variant="outline"
              className="secondary-button"
              disabled={busy || !stillValid}
              onClick={() => dispatch({ type: "trade-defer" })}
              title="Keep the offer and carry on playing"
            >
              <Clock size={15} /> Later
            </Button>
          </div>
        </div>
      ) : (
        <div className="stage-actions">
          <p className="stage-waiting">
            Waiting for {g.players[t.to].name} to respond…
          </p>
          {isSender && (
            <Button
              variant="ghost"
              className="text-button h-auto"
              disabled={busy}
              onClick={() => dispatch({ type: "trade-reject" })}
            >
              Withdraw offer
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function CardStage({ game: g, viewer, busy, dispatch }: StageProps) {
  const c = g.card!,
    chance = c.id.startsWith("c"),
    { canAct } = seat(g, viewer, g.current);
  return (
    <div
      className={`stage-panel card-stage ${chance ? "chance" : "community"}`}
      role="dialog"
      aria-label={chance ? "Chance card" : "Community card"}
    >
      <span className="stage-kicker">
        {chance ? <Sparkles size={13} /> : <Landmark size={13} />}
        {chance ? "CHANCE · فرصة" : "COMMUNITY · صندوق المجتمع"}
      </span>
      <h3 lang="ar">{c.arabicTitle}</h3>
      <p lang="ar">{c.arabicText}</p>
      <small className="stage-hint">
        <Check size={12} /> Applied automatically for{" "}
        {g.players[g.current].name}
      </small>
      {canAct && (
        <Button
          variant="default"
          className="primary-button"
          disabled={busy}
          onClick={() => dispatch({ type: "dismiss-card" })}
        >
          Got it
        </Button>
      )}
    </div>
  );
}

/** The current player was sent to jail by this turn's roll or card. */
function justJailed(g: Game) {
  const p = g.players[g.current];
  return (
    p.jailed &&
    p.jailTurns === 0 &&
    g.phase === "manage" &&
    g.logs.slice(0, 4).some((l) => l.text === `${p.name} went to jail.`)
  );
}

function JailStage({ game: g, viewer, busy, dispatch }: StageProps) {
  const p = g.players[g.current],
    settings = g.settings ?? DEFAULT_SETTINGS,
    { canAct, waiting } = seat(g, viewer, p.id);
  const reason = g.logs
    .slice(0, 4)
    .some((l) => l.text.endsWith("arrived in Go to jail."))
    ? "Landed on Go to jail."
    : g.logs.slice(0, 4).some((l) => l.text.includes("doubles"))
      ? "Three doubles in a row."
      : "A card sent you there.";
  return (
    <div
      className="stage-panel jail-stage"
      role="dialog"
      aria-label="Sent to jail"
    >
      <span className="stage-kicker">
        <ShieldAlert size={13} /> GO TO JAIL · اذهب للسجن
      </span>
      <h3>{p.name} is in jail</h3>
      <p>{reason} No Start salary this time.</p>
      <p className="stage-hint">
        Next turn: roll doubles, pay {money(settings.jailBail)}, or use a free
        card. After 3 tries you pay and leave.
      </p>
      {canAct ? (
        <Button
          variant="default"
          className="primary-button"
          disabled={busy}
          onClick={() => dispatch({ type: "end" })}
        >
          End turn
        </Button>
      ) : (
        <p className="stage-waiting">{waiting}</p>
      )}
    </div>
  );
}

/** A saved offer, shown in the sidebar so it can be reopened. */
export function SavedOffer({ game: g, viewer, busy, dispatch }: StageProps) {
  const t = g.trade;
  if (!t?.deferred) return null;
  const isRecipient = viewer === undefined || viewer === t.to,
    isSender = viewer === t.from;
  return (
    <div className="saved-offer">
      <Clock size={15} />
      <span>
        <b>
          {g.players[t.from].name} → {g.players[t.to].name}
        </b>
        <small>
          Offer saved for later
          {tradeValid(g, t) ? "" : " · no longer valid"}
        </small>
      </span>
      {isRecipient ? (
        <Button
          variant="outline"
          className="secondary-button"
          disabled={busy || g.phase === "auction"}
          onClick={() => dispatch({ type: "trade-review" })}
        >
          Review
        </Button>
      ) : isSender ? (
        <Button
          variant="ghost"
          className="text-button h-auto"
          disabled={busy}
          onClick={() => dispatch({ type: "trade-reject" })}
        >
          Withdraw
        </Button>
      ) : null}
    </div>
  );
}
