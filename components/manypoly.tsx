"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Coins,
  Dices,
  Handshake,
  House,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Wallet,
  Waves,
} from "lucide-react";
import { BOARD, GROUPS, money, type Space } from "@/lib/board";
import {
  createGame,
  die,
  gameReducer,
  netWorth,
  tradeOpen,
  type Action,
  type Game,
} from "@/lib/game";
import { GameBoard } from "./game-board";
import { BoardStage, SavedOffer } from "./board-stage";
import { Dice, Modal, Token } from "./game-ui";
import { PropertyDetail } from "./property-detail";
import { CardLibrary } from "./card-library";
import { TradeForm } from "./trade-form";
import { Rules } from "./game-rules";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { RulesSummary } from "./session-settings";

const SAVE_KEY = "manypoly-save-v1";
const preview = createGame(["أمين", "ياسمين", "عمر", "لينا"]);
type Tab = "board" | "portfolio" | "cards";
type RemoteGame = {
  game: Game;
  viewer: number;
  busy: boolean;
  /** Server clock minus local clock, in ms. */
  clockOffset?: number;
  onAction: (action: Action) => void;
};
export default function Manypoly({
  remote,
  sessionBar,
}: { remote?: RemoteGame; sessionBar?: ReactNode } = {}) {
  const [localGame, setGame] = useState<Game | null>(null),
    [loaded, setLoaded] = useState(false),
    [tab, setTab] = useState<Tab>("board");
  const [names, setNames] = useState(["أمين", "ياسمين", "عمر", "لينا"]),
    [selected, setSelected] = useState<Space | null>(null),
    [rules, setRules] = useState(false),
    [reset, setReset] = useState(false),
    [trading, setTrading] = useState(false),
    [rolling, setRolling] = useState(false),
    [sound, setSound] = useState(false),
    [saveError, setSaveError] = useState(false);
  const game = remote?.game ?? localGame;
  const remoteMode = !!remote;
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (remoteMode) return;
    const timer = setTimeout(() => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (
            saved.version === 1 &&
            Array.isArray(saved.players) &&
            saved.players.length >= 2 &&
            saved.players.length <= 6 &&
            saved.players.every(
              (p: Record<string, unknown>, id: number) =>
                p.id === id &&
                typeof p.name === "string" &&
                typeof p.money === "number" &&
                Number.isInteger(p.position),
            ) &&
            saved.current >= 0 &&
            saved.current < saved.players.length &&
            saved.deeds &&
            Array.isArray(saved.chance) &&
            Array.isArray(saved.community) &&
            Array.isArray(saved.logs) &&
            ["roll", "buy", "manage", "auction", "over"].includes(saved.phase)
          )
            setGame(saved);
        }
      } catch {
        setSaveError(true);
      }
      setLoaded(true);
    }, 0);
    return () => {
      clearTimeout(timer);
      if (rollTimer.current) clearTimeout(rollTimer.current);
    };
  }, [remoteMode]);
  useEffect(() => {
    if (!remoteMode && loaded && game)
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(game));
      } catch {
        setTimeout(() => setSaveError(true), 0);
      }
  }, [game, loaded, remoteMode]);
  useEffect(
    () => () => {
      if (rollTimer.current) clearTimeout(rollTimer.current);
    },
    [],
  );
  const g = game ?? {
      ...preview,
      players: names.map((name, id) => ({ ...preview.players[0], name, id })),
    },
    p = g.players[g.current],
    debtor = g.debt ? g.players[g.debt.from] : p;
  const settings = g.settings ?? DEFAULT_SETTINGS;
  const actor = g.debt?.from ?? g.current;
  const canAct = !remote || remote.viewer === actor;
  const locked = !canAct || !!remote?.busy;
  // On a shared device this tab is the auctioneer and closes the bidding.
  // Auctions saved before the live clock existed close right away.
  const auctionEnd =
    remoteMode || !localGame?.auction ? null : (localGame.auction.endsAt ?? 0);
  useEffect(() => {
    if (auctionEnd === null) return;
    const timer = setTimeout(
      () =>
        setGame((prev) =>
          prev
            ? gameReducer(prev, { type: "auction-close", at: Date.now() })
            : prev,
        ),
      Math.max(0, auctionEnd - Date.now()) + 50,
    );
    return () => clearTimeout(timer);
  }, [auctionEnd]);
  function dispatch(action: Action) {
    if (remote) {
      remote.onAction(action);
      return;
    }
    setGame((prev) => (prev ? gameReducer(prev, action) : prev));
  }
  function roll() {
    if (!game || rolling || locked) return;
    setRolling(true);
    if (sound) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator(),
          gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(340, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
        osc.onended = () => void ctx.close();
      } catch {}
    }
    rollTimer.current = setTimeout(() => {
      dispatch({
        type: "roll",
        dice: [die(), die()],
        utilityDice: [die(), die()],
      });
      setRolling(false);
    }, 650);
  }
  function newGame() {
    if (rollTimer.current) clearTimeout(rollTimer.current);
    setRolling(false);
    if (remote) return;
    setGame(null);
    setReset(false);
    setTab("board");
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      setSaveError(true);
    }
  }
  const owned = Object.entries(g.deeds)
    .filter(([, d]) => d.owner === (remote?.viewer ?? debtor.id))
    .map(([id]) => BOARD[+id]);
  return (
    <Tabs
      className="app-shell app-mode"
      value={tab}
      onValueChange={(value) => setTab(value as Tab)}
    >
      <header className="site-header app-bar">
        <Link
          className="wordmark"
          href="/"
          aria-label="الصفحة الرئيسية لMoneypoly"
        >
          <span className="brand-mark">
            م<span>✦</span>
          </span>
          Moneypoly<span className="brand-dot">.</span>
        </Link>
        <TabsList variant="line" className="tabs" aria-label="أقسام اللعبة">
          {(
            [
              ["board", "اللوحة", MapPin],
              ["portfolio", "العقارات", House],
              ["cards", "البطاقات", BookOpen],
            ] as const
          ).map(([key, label, Icon]) => (
            <TabsTrigger
              value={key}
              key={key}
              className={tab === key ? "active" : ""}
            >
              <Icon size={15} />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {remote ? (
          <span
            className={`app-status ${canAct && g.phase !== "over" ? "your-move" : ""}`}
            role="status"
          >
            {g.phase === "over"
              ? `${g.players.find((player) => !player.bankrupt)?.name} يفوز`
              : g.trade && !g.trade.deferred
                ? `صفقة بانتظار ${g.players[g.trade.to].name}`
                : canAct
                  ? "دورك"
                  : `في انتظار ${g.players[actor].name}`}
          </span>
        ) : (
          <span className="app-status">
            {game
              ? `الجولة ${Math.ceil(g.turn / g.players.length)}`
              : "هيا نلعب"}
          </span>
        )}
        {sessionBar}
        <div className="header-actions">
          <span
            className="save-state"
            title={
              remote
                ? "لعبة مشتركة · محفوظة على الخادم"
                : saveError
                  ? "الحفظ المحلي غير متاح — أبقِ هذه الصفحة مفتوحة"
                  : "تُحفظ لعبتك تلقائياً على هذا الجهاز"
            }
          >
            <ShieldCheck size={15} />
            {remote ? "مشتركة" : "محلية"}
          </span>
          {game && !remote && (
            <Button
              variant="ghost"
              className="icon-button h-auto"
              onClick={() => setReset(true)}
              aria-label="لعبة جديدة"
              title="لعبة جديدة"
            >
              <RotateCcw size={17} />
            </Button>
          )}
          <Button
            variant="ghost"
            className="icon-button h-auto"
            onClick={() => setSound(!sound)}
            aria-label={sound ? "كتم الصوت" : "تشغيل الصوت"}
          >
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </Button>
          <Button
            variant="ghost"
            className="icon-button help-button h-auto"
            onClick={() => setRules(true)}
            aria-label="طريقة اللعب"
          >
            <CircleHelp size={18} />
          </Button>
        </div>
      </header>
      <main>
        <div className="game-layout">
          <div className="main-panel game-tabs">
            <TabsContent value={tab} className="game-tab-content">
              {tab === "board" ? (
                <GameBoard
                  game={g}
                  onSpace={setSelected}
                  started={!!game}
                  center={
                    game && (
                      <BoardStage
                        key={`${g.phase}-${g.trade ? "t" : ""}`}
                        game={g}
                        viewer={remote?.viewer}
                        busy={!!remote?.busy || rolling}
                        clockOffset={remote?.clockOffset ?? 0}
                        dispatch={dispatch}
                        onRoll={roll}
                      />
                    )
                  }
                />
              ) : tab === "portfolio" ? (
                <div className="content-view">
                  <div className="view-heading">
                    <span className="eyebrow">إمبراطوريتك الصغيرة</span>
                    <h2>كل رحلة عظيمة تبدأ بمدينة.</h2>
                    <p>اختر سند ملكية لعرض الإيجار أو البناء أو إدارة الرهن.</p>
                  </div>
                  {g.players.map((player) => (
                    <div className="portfolio-player" key={player.id}>
                      <div className="portfolio-heading">
                        <Token id={player.id} />
                        <h3>{player.name}</h3>
                        <span>صافي الثروة {money(netWorth(g, player.id))}</span>
                      </div>
                      <div className="property-grid">
                        {Object.entries(g.deeds)
                          .filter(([, d]) => d.owner === player.id)
                          .map(([id, d]) => (
                            <button
                              className="property-tile"
                              key={id}
                              onClick={() => setSelected(BOARD[+id])}
                            >
                              {BOARD[+id].group && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  className="tile-flag"
                                  src={GROUPS[BOARD[+id].group!].flag}
                                  alt={GROUPS[BOARD[+id].group!].name}
                                />
                              )}
                              <span lang="ar">{BOARD[+id].arabic}</span>
                              {BOARD[+id].type === "city" && (
                                <b>{BOARD[+id].name}</b>
                              )}
                              <small>
                                {d.mortgaged
                                  ? "مرهونة"
                                  : d.houses === 5
                                    ? "فندق"
                                    : d.houses
                                      ? `${d.houses} منازل`
                                      : money(BOARD[+id].price!)}
                              </small>
                            </button>
                          ))}
                      </div>
                      {!Object.values(g.deeds).some(
                        (d) => d.owner === player.id,
                      ) && (
                        <p className="empty-copy">
                          عالم من الاحتمالات. لا عقارات بعد.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <CardLibrary onSpace={setSelected} settings={settings} />
              )}
            </TabsContent>
          </div>
          <aside className="sidebar">
            {!game ? (
              <Card className="lobby card-panel">
                <div className="section-kicker">
                  <span>اجمع أحبابك</span>
                  <Users size={17} />
                </div>
                <h2>
                  طاولة لـ<em>{names.length}.</em>
                </h2>
                <p>
                  اختاروا أسماءكم ومقاعدكم.
                  <br />
                  المغامرة الأولى علينا.
                </p>
                <div className="player-count" aria-label="عدد اللاعبين">
                  {[2, 3, 4, 5, 6].map((n) => (
                    <Button
                      variant="ghost"
                      key={n}
                      aria-pressed={names.length === n}
                      className={names.length === n ? "selected" : ""}
                      onClick={() =>
                        setNames((prev) =>
                          Array.from(
                            { length: n },
                            (_, i) =>
                              prev[i] ??
                              ["أمين", "ياسمين", "عمر", "لينا", "سلمى", "علي"][
                                i
                              ],
                          ),
                        )
                      }
                    >
                      {n}
                    </Button>
                  ))}
                </div>
                <div className="name-fields">
                  {names.map((name, i) => (
                    <Label key={i}>
                      <Token id={i} />
                      <Input
                        aria-label={`اسم اللاعب ${i + 1}`}
                        maxLength={18}
                        value={name}
                        onChange={(e) =>
                          setNames((prev) =>
                            prev.map((v, j) => (j === i ? e.target.value : v)),
                          )
                        }
                      />
                      <span>{money(1500)}</span>
                    </Label>
                  ))}
                </div>
                <Button
                  variant="default"
                  className="primary-button start-button"
                  disabled={!loaded}
                  onClick={() => setGame(createGame(names))}
                >
                  {loaded ? "هيا نلعب" : "جارٍ تجهيز الطاولة…"}
                  <ArrowRight size={18} />
                </Button>
                <div className="lobby-footnote">
                  <Coins size={14} /> 1,500 درهم لكل لاعب. وعالم ينتظر
                  الاستكشاف.
                </div>
              </Card>
            ) : (
              <>
                <fieldset
                  className="turn-panel card-panel turn-fieldset"
                  disabled={locked}
                  aria-label="أدوات الدور الحالي"
                >
                  <div className="section-kicker">
                    <span>
                      {g.phase === "over"
                        ? "العالم ملكك"
                        : g.debt
                          ? "قليل من العون من أملاكك"
                          : `الدور ${g.turn} · ${g.phase === "auction" ? "وقت المزاد" : "حان دورك"}`}
                    </span>
                    {g.phase === "over" ? (
                      <Trophy size={17} />
                    ) : (
                      <span className="live-dot" />
                    )}
                  </div>
                  {g.phase === "over" ? (
                    <>
                      <h2>{g.players.find((p) => !p.bankrupt)?.name} يفوز!</h2>
                      <p>رحلة أُحسن لعبها. مستعد لأخرى؟</p>
                      {!remote && (
                        <Button
                          variant="default"
                          className="primary-button"
                          onClick={() => setReset(true)}
                        >
                          العب مجدداً <RotateCcw size={17} />
                        </Button>
                      )}
                      {remote && (
                        <p>
                          يمكن للمضيف إعادة الجميع إلى الردهة للعب مرة أخرى.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="current-player">
                        <Token id={g.debt ? debtor.id : p.id} />
                        <div>
                          <h2>
                            <span>دور </span>
                            {g.debt ? debtor.name : p.name}
                          </h2>
                          <p>
                            {g.debt
                              ? "حان وقت السداد"
                              : p.jailed
                                ? "في السجن · " + p.jailTurns + " / 3 محاولات"
                                : BOARD[p.position].arabic}
                          </p>
                        </div>
                      </div>
                      {g.debt ? (
                        <div className="debt-box">
                          <h3>مستحق: {money(g.debt.amount)}</h3>
                          <p>
                            {g.debt.reason}. لديك {money(debtor.money)}. أدِر
                            عقاراتك أدناه أو اعرض صفقة تبادل.
                          </p>
                          <Button
                            variant="default"
                            className="primary-button"
                            disabled={
                              debtor.money < g.debt.amount || tradeOpen(g)
                            }
                            onClick={() => dispatch({ type: "settle" })}
                          >
                            سداد الدين <Wallet size={17} />
                          </Button>
                          <Button
                            variant="ghost"
                            className="text-button danger h-auto"
                            disabled={tradeOpen(g)}
                            onClick={() => dispatch({ type: "bankrupt" })}
                          >
                            أعلن الإفلاس
                          </Button>
                        </div>
                      ) : g.phase === "auction" ? (
                        <p className="stage-pointer">
                          <MapPin size={14} /> مزاد{" "}
                          <b>{BOARD[g.auction!.space].name}</b> معروض على
                          اللوحة.
                        </p>
                      ) : (
                        <>
                          <div className="dice-area">
                            <div className="dice-pair">
                              <Dice value={g.dice[0]} rolling={rolling} />
                              <Dice value={g.dice[1]} rolling={rolling} />
                            </div>
                            <p>
                              {rolling
                                ? "قليل من الحظ يصنع الكثير…"
                                : g.phase === "roll"
                                  ? "احتمال جديد مع كل رمية."
                                  : g.extraRoll
                                    ? "زوج! لك رمية أخرى."
                                    : `${g.dice[0] + g.dice[1]} خانات. خطوة أقرب.`}
                            </p>
                          </div>
                          {g.phase === "roll" ? (
                            <>
                              <Button
                                variant="default"
                                className="primary-button"
                                onClick={roll}
                                disabled={rolling || tradeOpen(g)}
                              >
                                <Dices size={19} />
                                {rolling ? "جارٍ الرمي…" : "ارمِ النرد"}
                                <span>↵</span>
                              </Button>
                              {p.jailed && (
                                <p className="stage-pointer">
                                  <MapPin size={14} /> في السجن: اختر على اللوحة
                                  أن تدفع أو ترمي أو تستخدم بطاقة.
                                </p>
                              )}
                            </>
                          ) : g.phase === "buy" ? (
                            <p className="stage-pointer">
                              <MapPin size={14} /> قرّر على اللوحة:{" "}
                              <b>{BOARD[p.position].name}</b> معروضة للبيع.
                            </p>
                          ) : (
                            <Button
                              variant="default"
                              className="primary-button"
                              disabled={tradeOpen(g)}
                              onClick={() => dispatch({ type: "end" })}
                            >
                              {g.extraRoll ? "خذ رميتك الإضافية" : "أنهِ الدور"}
                              <ArrowRight size={18} />
                            </Button>
                          )}
                        </>
                      )}
                    </>
                  )}
                </fieldset>
                <Card className="players-panel card-panel">
                  <div className="section-kicker">
                    <span>حول الطاولة</span>
                    <span>
                      {g.players.filter((p) => !p.bankrupt).length} لاعبين
                    </span>
                  </div>
                  {g.players.map((player) => (
                    <div
                      key={player.id}
                      className={`player-row ${player.id === g.current ? "playing" : ""} ${player.bankrupt ? "bankrupt" : ""}`}
                    >
                      <Token id={player.id} />
                      <div>
                        <b>
                          {player.name}
                          {player.id === g.current && (
                            <span className="your-turn">يلعب الآن</span>
                          )}
                        </b>
                        <small>
                          {player.bankrupt
                            ? "مفلس"
                            : `${Object.values(g.deeds).filter((d) => d.owner === player.id).length} عقارات${player.escape.length ? " · ♧ " + player.escape.length : ""}`}
                        </small>
                      </div>
                      <strong>{money(player.money)}</strong>
                    </div>
                  ))}
                  <SavedOffer
                    game={g}
                    viewer={remote?.viewer}
                    busy={!!remote?.busy || rolling}
                    dispatch={dispatch}
                  />
                  <Button
                    variant="ghost"
                    className="trade-button h-auto"
                    disabled={
                      locked ||
                      !settings.trading ||
                      rolling ||
                      !!g.trade ||
                      !["roll", "manage", "buy"].includes(g.phase)
                    }
                    onClick={() => setTrading(true)}
                  >
                    <Handshake size={16} />
                    اعرض صفقة تبادل
                    <ArrowUpRight size={15} />
                  </Button>
                </Card>
                {!!owned.length && (
                  <Card className="assets-panel card-panel">
                    <div className="section-kicker">
                      <span>
                        {remote
                          ? "عقاراتك"
                          : g.debt
                            ? "أملاك " + debtor.name
                            : "عقاراتك"}
                      </span>
                      <House size={16} />
                    </div>
                    <div className="asset-list">
                      {owned.map((s) => (
                        <Button
                          variant="ghost"
                          className="h-auto p-0"
                          key={s.id}
                          onClick={() => setSelected(s)}
                        >
                          {s.group ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={GROUPS[s.group].flag} alt="" />
                          ) : (
                            <i />
                          )}
                          <span>{s.name}</span>
                          <small>
                            {g.deeds[s.id].mortgaged
                              ? "مرهونة"
                              : g.deeds[s.id].houses === 5
                                ? "فندق"
                                : g.deeds[s.id].houses
                                  ? `${g.deeds[s.id].houses} ⌂`
                                  : "سند ملكية"}
                          </small>
                          <ChevronRight size={13} />
                        </Button>
                      ))}
                    </div>
                  </Card>
                )}
                {settings.freeParkingPot && (
                  <Card className="card-panel parking-pot">
                    <span className="eyebrow">صندوق الاستراحة</span>
                    <strong>{money(g.parkingPot ?? 0)}</strong>
                    <p>الضرائب المجمّعة تذهب لأول لاعب يتوقف هنا.</p>
                  </Card>
                )}
                <section className="activity-panel">
                  <div className="section-kicker">
                    <span>الحكاية حتى الآن</span>
                    <Waves size={16} />
                  </div>
                  <div
                    className="activity-list"
                    aria-live="polite"
                    aria-relevant="additions"
                  >
                    {g.logs.slice(0, 8).map((entry, i) => (
                      <div key={entry.id}>
                        <i className={i === 0 ? "latest" : ""} />
                        <p>{entry.text}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
            {!game && (
              <div className="little-note">
                <span>✧</span>
                <div>
                  <b>أجمل وقت أمام الشاشة.</b>
                  <p>
                    جهاز واحد. وأحبّ الناس إليك.
                    <br />
                    ومنافسة ودّية أو اثنتان.
                  </p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
      {selected && (
        <Modal
          title={
            selected.price && selected.type !== "tax"
              ? "سند الملكية"
              : "جولة في اللوحة"
          }
          onClose={() => setSelected(null)}
          wide={!!selected.price && selected.type !== "tax"}
        >
          <PropertyDetail
            space={selected}
            game={g}
            active={!!game && !rolling && !locked}
            dispatch={dispatch}
          />
        </Modal>
      )}
      {rules && (
        <Modal title="مقعد على الطاولة" onClose={() => setRules(false)} wide>
          <RulesSummary settings={settings} />
          <Rules settings={settings} />
        </Modal>
      )}
      {reset && (
        <Modal title="مغامرة جديدة؟" onClose={() => setReset(false)}>
          <p className="modal-copy">
            ستحل هذه اللعبة محل لعبتك المحفوظة على هذا الجهاز. يبدأ الجميع من
            جديد بـ 1,500 درهم.
          </p>
          <div className="modal-actions">
            <Button
              variant="outline"
              className="secondary-button"
              onClick={() => setReset(false)}
            >
              تابع اللعب
            </Button>
            <Button
              variant="default"
              className="primary-button"
              onClick={newGame}
            >
              لعبة جديدة <ArrowRight size={16} />
            </Button>
          </div>
        </Modal>
      )}
      {trading && (
        <Modal
          title="الصفقة الجيدة ترضي الطرفين"
          onClose={() => setTrading(false)}
          wide
        >
          <TradeForm
            game={g}
            onOffer={(trade) => {
              dispatch({ type: "trade", trade });
              setTrading(false);
            }}
          />
        </Modal>
      )}
    </Tabs>
  );
}
