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
  arrivedIn,
  groupSpaces,
  tradeOpen,
  tradeValid,
  wentToJail,
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
          {group ? group.name : s.type === "rail" ? "سكة حديد" : "شركة خدمات"}
        </span>
        <b lang="ar">{s.arabic}</b>
        {s.type === "city" && <strong>{s.name}</strong>}
      </div>
    </div>
  );
}

/** Who acts, and what everybody else should be told while they wait. */
function seat(g: Game, viewer: number | undefined, actor: number) {
  const name = g.players[actor].name;
  return {
    canAct: viewer === undefined || viewer === actor,
    waiting: `في انتظار ${name}…`,
    handOff: viewer === undefined ? `مرّر الجهاز إلى ${name}.` : null,
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
      aria-label="عرض شراء عقار"
    >
      <span className="stage-kicker">
        <House size={13} /> للبيع · {p.name} توقف هنا
      </span>
      <DeedFace space={s} />
      <div className="offer-facts">
        <div>
          <span>السعر</span>
          <b>{money(price)}</b>
        </div>
        <div>
          <span>{s.type === "city" ? "الإيجار الأساسي" : "الإيجار"}</span>
          <b>
            {s.type === "city"
              ? money(s.rents![0])
              : s.type === "rail"
                ? `${money(25)}+`
                : "4× النرد"}
          </b>
        </div>
        <div>
          <span>{s.type === "city" ? "مع فندق" : "قيمة الرهن"}</span>
          <b>{s.type === "city" ? money(s.rents![5]) : money(price / 2)}</b>
        </div>
      </div>
      <p className={`offer-note ${completes ? "highlight" : ""}`}>
        {completes
          ? `تكمل مجموعة ${GROUPS[s.group!].name} — يتضاعف الإيجار!`
          : `${p.name} يملك ${mine} من ${family.length}${Object.entries(others)
              .map(([name, n]) => ` · ${name} يملك ${n}`)
              .join("")}.`}
      </p>
      <div className="stage-wallet">
        <Token id={p.id} />
        <span>
          <b>{p.name}</b>
          <small>
            {money(p.money)}
            {!short && <> ← {money(p.money - price)} بعد الشراء</>}
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
            <House size={17} /> اشترِ مقابل {money(price)}
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
                <Gavel size={15} /> اعرضها في المزاد
              </>
            ) : (
              "اتركها للبنك"
            )}
          </Button>
          {short && (
            <small className="stage-hint">
              لا يكفي رصيدك — ينقصك {money(price - p.money)}.
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
      aria-label="المزاد"
    >
      <span className="stage-kicker">
        <Gavel size={13} /> مزاد مباشر · السعر الأصلي {money(s.price!)}
      </span>
      <DeedFace space={s} compact />
      <div className="auction-lead">
        {a.leader === null ? (
          <>
            <span>لا مزايدات بعد</span>
            <b>ابدأ من {money(RAISES[0])}</b>
          </>
        ) : (
          <>
            <span>
              <Crown size={13} /> {g.players[a.leader].name} في الصدارة
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
              ? "لا مزايدات — تبقى لدى البنك…"
              : `بيعت إلى ${g.players[a.leader].name}!`
            : `${Math.ceil(left / 1000)} ث — كل مزايدة تعيد ضبط العدّاد`}
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
                <small>{leading ? "في الصدارة" : money(pl.money)}</small>
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
                      aria-label={`${pl.name} يزايد بـ ${money(a.bid + n)}`}
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
          ? "الجميع يزايد في الوقت نفسه — اضغط على صفّك. أعلى مزايدة عند انتهاء العدّاد تفوز."
          : "اضغط للمزايدة. أعلى مزايدة عند انتهاء العدّاد تفوز."}
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
          <small>يعطي · بقيمة ≈ {money(value)}</small>
        </span>
      </div>
      <div className="trade-items">
        {cash > 0 && <span className="trade-cash">{money(cash)}</span>}
        {spaces.map((id) => (
          <DeedFace key={id} space={BOARD[id]} compact />
        ))}
        {!cash && !spaces.length && <span className="trade-empty">لا شيء</span>}
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
      aria-label="عرض تبادل"
    >
      <span className="stage-kicker">
        <Handshake size={13} /> عرض تبادل · {g.players[t.from].name} ←{" "}
        {g.players[t.to].name}
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
              تغيّرت الأوضاع منذ تقديم هذا العرض — يمكن رفضه فقط الآن.
            </small>
          )}
          <Button
            variant="default"
            className="primary-button"
            disabled={busy || !stillValid}
            onClick={() => dispatch({ type: "trade-accept" })}
          >
            <Check size={16} /> اقبل الصفقة
          </Button>
          <div className="raise-row">
            <Button
              variant="outline"
              className="secondary-button"
              disabled={busy}
              onClick={() => dispatch({ type: "trade-reject" })}
            >
              <X size={15} /> ارفض
            </Button>
            <Button
              variant="outline"
              className="secondary-button"
              disabled={busy || !stillValid}
              onClick={() => dispatch({ type: "trade-defer" })}
              title="احتفظ بالعرض وتابع اللعب"
            >
              <Clock size={15} /> لاحقاً
            </Button>
          </div>
        </div>
      ) : (
        <div className="stage-actions">
          <p className="stage-waiting">في انتظار ردّ {g.players[t.to].name}…</p>
          {isSender && (
            <Button
              variant="ghost"
              className="text-button h-auto"
              disabled={busy}
              onClick={() => dispatch({ type: "trade-reject" })}
            >
              اسحب العرض
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
      aria-label={chance ? "بطاقة فرصة" : "بطاقة صندوق المجتمع"}
    >
      <span className="stage-kicker">
        {chance ? <Sparkles size={13} /> : <Landmark size={13} />}
        {chance ? "فرصة" : "صندوق المجتمع"}
      </span>
      <h3 lang="ar">{c.title}</h3>
      <p lang="ar">{c.text}</p>
      <small className="stage-hint">
        <Check size={12} /> طُبّقت تلقائياً على {g.players[g.current].name}
      </small>
      {canAct && (
        <Button
          variant="default"
          className="primary-button"
          disabled={busy}
          onClick={() => dispatch({ type: "dismiss-card" })}
        >
          حسناً
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
    g.logs.slice(0, 4).some((l) => l.text === wentToJail(p.name))
  );
}

function JailStage({ game: g, viewer, busy, dispatch }: StageProps) {
  const p = g.players[g.current],
    settings = g.settings ?? DEFAULT_SETTINGS,
    { canAct, waiting } = seat(g, viewer, p.id);
  const reason = g.logs
    .slice(0, 4)
    .some((l) => l.text === arrivedIn(p.name, BOARD[30]))
    ? "توقفت على خانة «اذهب للسجن»."
    : g.logs.slice(0, 4).some((l) => l.text.includes("زوج"))
      ? "ثلاثة أزواج متتالية."
      : "أرسلتك بطاقة إلى هناك.";
  return (
    <div
      className="stage-panel jail-stage"
      role="dialog"
      aria-label="إلى السجن"
    >
      <span className="stage-kicker">
        <ShieldAlert size={13} /> اذهب للسجن
      </span>
      <h3>{p.name} في السجن</h3>
      <p>{reason} لا مكافأة بداية هذه المرة.</p>
      <p className="stage-hint">
        في الدور القادم: ارمِ زوجاً، أو ادفع {money(settings.jailBail)}، أو
        استخدم بطاقة مجانية. بعد 3 محاولات تدفع وتخرج.
      </p>
      {canAct ? (
        <Button
          variant="default"
          className="primary-button"
          disabled={busy}
          onClick={() => dispatch({ type: "end" })}
        >
          أنهِ الدور
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
          {g.players[t.from].name} ← {g.players[t.to].name}
        </b>
        <small>
          عرض مؤجّل لوقت لاحق
          {tradeValid(g, t) ? "" : " · لم يعد صالحاً"}
        </small>
      </span>
      {isRecipient ? (
        <Button
          variant="outline"
          className="secondary-button"
          disabled={busy || g.phase === "auction"}
          onClick={() => dispatch({ type: "trade-review" })}
        >
          مراجعة
        </Button>
      ) : isSender ? (
        <Button
          variant="ghost"
          className="text-button h-auto"
          disabled={busy}
          onClick={() => dispatch({ type: "trade-reject" })}
        >
          اسحب
        </Button>
      ) : null}
    </div>
  );
}
