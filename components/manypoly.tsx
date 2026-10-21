"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
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
const preview = createGame(["Amine", "Yasmin", "Omar", "Lina"]);
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
  const [names, setNames] = useState(["Amine", "Yasmin", "Omar", "Lina"]),
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
        <Link className="wordmark" href="/" aria-label="Manypoly home">
          <span className="brand-mark">
            m<span>✦</span>
          </span>
          manypoly<span className="brand-dot">.</span>
        </Link>
        <TabsList variant="line" className="tabs" aria-label="Game views">
          {(
            [
              ["board", "Board", MapPin],
              ["portfolio", "Properties", House],
              ["cards", "Cards", BookOpen],
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
              ? `${g.players.find((player) => !player.bankrupt)?.name} wins`
              : g.trade && !g.trade.deferred
                ? `Trade waiting for ${g.players[g.trade.to].name}`
                : canAct
                  ? "Your move"
                  : `Waiting for ${g.players[actor].name}`}
          </span>
        ) : (
          <span className="app-status">
            {game
              ? `Round ${Math.ceil(g.turn / g.players.length)}`
              : "Let’s play"}
          </span>
        )}
        {sessionBar}
        <div className="header-actions">
          <span
            className="save-state"
            title={
              remote
                ? "Shared game · saved on the server"
                : saveError
                  ? "Local saving unavailable — keep this tab open"
                  : "Your game saves automatically on this device"
            }
          >
            <ShieldCheck size={15} />
            {remote ? "SHARED" : "LOCAL"}
          </span>
          {game && !remote && (
            <Button
              variant="ghost"
              className="icon-button h-auto"
              onClick={() => setReset(true)}
              aria-label="New game"
              title="New game"
            >
              <RotateCcw size={17} />
            </Button>
          )}
          <Button
            variant="ghost"
            className="icon-button h-auto"
            onClick={() => setSound(!sound)}
            aria-label={sound ? "Mute sound" : "Enable sound"}
          >
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </Button>
          <Button
            variant="ghost"
            className="icon-button help-button h-auto"
            onClick={() => setRules(true)}
            aria-label="How to play"
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
                      />
                    )
                  }
                />
              ) : tab === "portfolio" ? (
                <div className="content-view">
                  <div className="view-heading">
                    <span className="eyebrow">YOUR LITTLE EMPIRE</span>
                    <h2>Every great journey starts with a city.</h2>
                    <p>
                      Select a title deed to see rent, build, or manage a
                      mortgage.
                    </p>
                  </div>
                  {g.players.map((player) => (
                    <div className="portfolio-player" key={player.id}>
                      <div className="portfolio-heading">
                        <Token id={player.id} />
                        <h3>{player.name}</h3>
                        <span>{money(netWorth(g, player.id))} net worth</span>
                      </div>
                      <div className="property-grid">
                        {Object.entries(g.deeds)
                          .filter(([, d]) => d.owner === player.id)
                          .map(([id, d]) => (
                            <button
                              className="property-tile"
                              key={id}
                              style={
                                {
                                  "--group": BOARD[+id].group
                                    ? GROUPS[BOARD[+id].group!].color
                                    : "#648e80",
                                } as CSSProperties
                              }
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
                              <b>{BOARD[+id].name}</b>
                              <small>
                                {d.mortgaged
                                  ? "Mortgaged"
                                  : d.houses === 5
                                    ? "Hotel"
                                    : d.houses
                                      ? `${d.houses} houses`
                                      : money(BOARD[+id].price!)}
                              </small>
                            </button>
                          ))}
                      </div>
                      {!Object.values(g.deeds).some(
                        (d) => d.owner === player.id,
                      ) && (
                        <p className="empty-copy">
                          A world of possibilities. No properties yet.
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
                  <span>GATHER YOUR PEOPLE</span>
                  <Users size={17} />
                </div>
                <h2>
                  A table for <em>{names.length}.</em>
                </h2>
                <p>
                  Pick your names, choose your seats.
                  <br />
                  The first adventure is on us.
                </p>
                <div className="player-count" aria-label="Number of players">
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
                              [
                                "Amine",
                                "Yasmin",
                                "Omar",
                                "Lina",
                                "Salma",
                                "Ali",
                              ][i],
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
                        aria-label={`Player ${i + 1} name`}
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
                  {loaded ? "Let’s play" : "Getting the table ready…"}
                  <ArrowRight size={18} />
                </Button>
                <div className="lobby-footnote">
                  <Coins size={14} /> 1,500 dirhams each. A world to explore.
                </div>
              </Card>
            ) : (
              <>
                <fieldset
                  className="turn-panel card-panel turn-fieldset"
                  disabled={locked}
                  aria-label="Current turn controls"
                >
                  <div className="section-kicker">
                    <span>
                      {g.phase === "over"
                        ? "THE WORLD IS YOURS"
                        : g.debt
                          ? "A LITTLE HELP FROM YOUR ASSETS"
                          : `TURN ${g.turn} · ${g.phase === "auction" ? "AUCTION TIME" : "MAKE YOUR MOVE"}`}
                    </span>
                    {g.phase === "over" ? (
                      <Trophy size={17} />
                    ) : (
                      <span className="live-dot" />
                    )}
                  </div>
                  {g.phase === "over" ? (
                    <>
                      <h2>{g.players.find((p) => !p.bankrupt)?.name} wins!</h2>
                      <p>A journey well played. Ready for another?</p>
                      {!remote && (
                        <Button
                          variant="default"
                          className="primary-button"
                          onClick={() => setReset(true)}
                        >
                          Play again <RotateCcw size={17} />
                        </Button>
                      )}
                      {remote && (
                        <p>
                          The host can return everyone to the lobby for another
                          game.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="current-player">
                        <Token id={g.debt ? debtor.id : p.id} />
                        <div>
                          <h2>
                            {g.debt ? debtor.name : p.name}
                            <span>’s turn</span>
                          </h2>
                          <p>
                            {g.debt
                              ? "Time to settle up"
                              : p.jailed
                                ? "In jail · " + p.jailTurns + " / 3 attempts"
                                : BOARD[p.position].name +
                                  " · " +
                                  BOARD[p.position].arabic}
                          </p>
                        </div>
                      </div>
                      {g.debt ? (
                        <div className="debt-box">
                          <h3>{money(g.debt.amount)} due</h3>
                          <p>
                            {g.debt.reason}. You have {money(debtor.money)}.
                            Manage your properties below or offer a trade.
                          </p>
                          <Button
                            variant="default"
                            className="primary-button"
                            disabled={
                              debtor.money < g.debt.amount || tradeOpen(g)
                            }
                            onClick={() => dispatch({ type: "settle" })}
                          >
                            Settle debt <Wallet size={17} />
                          </Button>
                          <Button
                            variant="ghost"
                            className="text-button danger h-auto"
                            disabled={tradeOpen(g)}
                            onClick={() => dispatch({ type: "bankrupt" })}
                          >
                            Declare bankruptcy
                          </Button>
                        </div>
                      ) : g.phase === "auction" ? (
                        <p className="stage-pointer">
                          <MapPin size={14} /> Auction for{" "}
                          <b>{BOARD[g.auction!.space].name}</b> is on the board.
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
                                ? "A little luck goes a long way…"
                                : g.phase === "roll"
                                  ? "A new possibility with every roll."
                                  : g.extraRoll
                                    ? "Doubles! Another roll is yours."
                                    : `${g.dice[0] + g.dice[1]} spaces. One step closer.`}
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
                                {rolling ? "Rolling…" : "Roll the dice"}
                                <span>↵</span>
                              </Button>
                              {p.jailed && (
                                <div className="jail-actions">
                                  <Button
                                    variant="outline"
                                    className="secondary-button"
                                    disabled={
                                      rolling ||
                                      p.money < settings.jailBail ||
                                      tradeOpen(g)
                                    }
                                    onClick={() => dispatch({ type: "bail" })}
                                  >
                                    Pay {settings.jailBail} DH
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="secondary-button"
                                    disabled={
                                      rolling ||
                                      !p.escape.length ||
                                      tradeOpen(g)
                                    }
                                    onClick={() => dispatch({ type: "escape" })}
                                  >
                                    Use free card ({p.escape.length})
                                  </Button>
                                </div>
                              )}
                            </>
                          ) : g.phase === "buy" ? (
                            <p className="stage-pointer">
                              <MapPin size={14} /> Decide on the board:{" "}
                              <b>{BOARD[p.position].name}</b> is for sale.
                            </p>
                          ) : (
                            <Button
                              variant="default"
                              className="primary-button"
                              disabled={tradeOpen(g)}
                              onClick={() => dispatch({ type: "end" })}
                            >
                              {g.extraRoll
                                ? "Take your extra roll"
                                : "End turn"}
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
                    <span>AROUND THE TABLE</span>
                    <span>
                      {g.players.filter((p) => !p.bankrupt).length} PLAYERS
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
                            <span className="your-turn">PLAYING</span>
                          )}
                        </b>
                        <small>
                          {player.bankrupt
                            ? "Bankrupt"
                            : `${Object.values(g.deeds).filter((d) => d.owner === player.id).length} properties${player.escape.length ? " · ♧ " + player.escape.length : ""}`}
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
                    Make a trade
                    <ArrowUpRight size={15} />
                  </Button>
                </Card>
                {!!owned.length && (
                  <Card className="assets-panel card-panel">
                    <div className="section-kicker">
                      <span>
                        {remote
                          ? "YOUR PROPERTIES"
                          : g.debt
                            ? debtor.name.toUpperCase() + "’S ASSETS"
                            : "YOUR PROPERTIES"}
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
                          <i
                            style={{
                              background: s.group
                                ? GROUPS[s.group].color
                                : "#7b9d8e",
                            }}
                          />
                          <span>{s.name}</span>
                          <small>
                            {g.deeds[s.id].mortgaged
                              ? "Mortgaged"
                              : g.deeds[s.id].houses === 5
                                ? "Hotel"
                                : g.deeds[s.id].houses
                                  ? `${g.deeds[s.id].houses} ⌂`
                                  : "Title deed"}
                          </small>
                          <ChevronRight size={13} />
                        </Button>
                      ))}
                    </div>
                  </Card>
                )}
                {settings.freeParkingPot && (
                  <Card className="card-panel parking-pot">
                    <span className="eyebrow">
                      FREE PARKING POT · الاستراحة
                    </span>
                    <strong>{money(g.parkingPot ?? 0)}</strong>
                    <p>Collected taxes go to the next player landing here.</p>
                  </Card>
                )}
                <section className="activity-panel">
                  <div className="section-kicker">
                    <span>THE STORY SO FAR</span>
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
                  <b>The best kind of screen time.</b>
                  <p>
                    One device. Your favorite people.
                    <br />A friendly rivalry or two.
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
              ? "Title deed"
              : "Around the board"
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
        <Modal title="A seat at the table" onClose={() => setRules(false)} wide>
          <RulesSummary settings={settings} />
          <Rules settings={settings} />
        </Modal>
      )}
      {reset && (
        <Modal title="A new adventure?" onClose={() => setReset(false)}>
          <p className="modal-copy">
            This will replace your saved game on this device. Everyone starts
            again with 1,500 dirhams.
          </p>
          <div className="modal-actions">
            <Button
              variant="outline"
              className="secondary-button"
              onClick={() => setReset(false)}
            >
              Keep playing
            </Button>
            <Button
              variant="default"
              className="primary-button"
              onClick={newGame}
            >
              New game <ArrowRight size={16} />
            </Button>
          </div>
        </Modal>
      )}
      {trading && (
        <Modal
          title="A good deal goes both ways"
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
