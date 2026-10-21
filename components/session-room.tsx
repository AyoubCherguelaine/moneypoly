"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Crown,
  Link2,
  LogOut,
  Settings2,
  Users,
  X,
} from "lucide-react";
import type { SessionView } from "@/lib/session-types";
import type { Action } from "@/lib/game";
import type { GameSettings } from "@/lib/settings";
import Manypoly from "./manypoly";
import { SessionBrand } from "./session-home";
import { SessionSettings, RulesSummary } from "./session-settings";
import { Modal, Token } from "./game-ui";

export default function SessionRoom({
  id,
  suggestedName = "",
}: {
  id: string;
  suggestedName?: string;
}) {
  const router = useRouter();
  const [session, setSession] = useState<SessionView | null>(null),
    [username, setUsername] = useState(suggestedName),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [connectionError, setConnectionError] = useState(""),
    [copied, setCopied] = useState(false),
    [confirmReset, setConfirmReset] = useState(false);
  const [draftRules, setDraftRules] = useState<{
    settings: GameSettings;
    maxPlayers: number;
  } | null>(null);
  // Server clock minus ours, so auction countdowns match for everyone.
  const [clockOffset, setClockOffset] = useState(0);
  const latest = useRef<SessionView | null>(null),
    sending = useRef(false),
    mounted = useRef(true);
  const apply = useCallback((next: SessionView) => {
    if (!mounted.current) return;
    if (
      latest.current?.id !== next.id ||
      latest.current.revision <= next.revision
    ) {
      latest.current = next;
      setSession(next);
      if (Number.isFinite(next.serverNow))
        setClockOffset(next.serverNow - Date.now());
    }
  }, []);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch(`/api/sessions/${id}`, {
          cache: "no-store",
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
            : AbortSignal.timeout(8000),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        apply(data);
        if (mounted.current) setConnectionError("");
      } catch (e) {
        if ((e as Error).name !== "AbortError" && mounted.current)
          setConnectionError(
            e instanceof Error ? e.message : "Connection lost. Reconnecting…",
          );
      }
    },
    [id, apply],
  );
  useEffect(() => {
    mounted.current = true;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    async function poll() {
      controller = new AbortController();
      await refresh(controller.signal);
      // Live auctions need quicker updates so every bid shows up promptly.
      if (!stopped)
        timer = setTimeout(poll, latest.current?.game?.auction ? 350 : 1100);
    }
    timer = setTimeout(() => {
      void poll();
    }, 0);
    return () => {
      mounted.current = false;
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
    };
  }, [id, refresh]);
  async function send(command: Record<string, unknown>) {
    if (sending.current) return false;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...command,
          revision: latest.current?.revision,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        await refresh();
        throw new Error(data.error);
      }
      if (data) apply(data);
      else router.push("/");
      return true;
    } catch (e) {
      // A bid that lost a race or missed the hammer is normal, not an error.
      const bid =
        command.type === "action" &&
        (command.action as { type?: string } | undefined)?.type === "bid";
      if (mounted.current && !bid)
        setError(
          e instanceof Error
            ? e.message
            : "Could not update the session. Try again.",
        );
      return false;
    } finally {
      sending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Copy the session code from the field above.");
    }
  }
  const messages = (
    <>
      {connectionError && (
        <div className="session-alert" role="status">
          {connectionError}{" "}
          <Button
            variant="ghost"
            className="h-auto p-0"
            onClick={() => void refresh()}
          >
            Retry connection
          </Button>
        </div>
      )}
      {error && (
        <div className="session-error" role="alert">
          {error}
          <Button
            variant="ghost"
            className="h-auto p-0"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X size={15} />
          </Button>
        </div>
      )}
    </>
  );
  if (session?.game && session.viewer)
    return (
      <>
        <Manypoly
          sessionBar={
            <>
              <div className="session-game-bar">
                <span>
                  <i /> SESSION <b>{id}</b>
                  <span>
                    {" "}
                    · Playing as{" "}
                    <strong>
                      {session.members[session.viewer.index].name}
                    </strong>
                  </span>
                </span>
                <div>
                  <Button
                    variant="ghost"
                    className="h-auto p-0"
                    onClick={() => void copy()}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}{" "}
                    {copied ? "Copied" : "Copy code"}
                  </Button>
                  {session.viewer.host && (
                    <Button
                      variant="ghost"
                      className="h-auto p-0"
                      disabled={busy}
                      onClick={() => setConfirmReset(true)}
                    >
                      <Settings2 size={13} /> Return everyone to lobby
                    </Button>
                  )}
                  <Link href="/">Home</Link>
                </div>
              </div>
              <div className="session-notices">{messages}</div>
            </>
          }
          remote={{
            game: session.game,
            viewer: session.viewer.index,
            busy: busy || !!connectionError,
            clockOffset,
            onAction: (action: Action) => void send({ type: "action", action }),
          }}
        />
        {confirmReset && (
          <Modal
            title="Bring everyone back to the lobby?"
            onClose={() => setConfirmReset(false)}
          >
            <p className="modal-copy">
              This ends the current game for every player. Your seats stay
              reserved, and the host can change the rules before starting again.
            </p>
            <div className="modal-actions">
              <Button
                variant="outline"
                className="secondary-button"
                onClick={() => setConfirmReset(false)}
              >
                Keep playing
              </Button>
              <Button
                variant="default"
                className="primary-button"
                disabled={busy}
                onClick={() =>
                  void send({ type: "reset" }).then((ok) => {
                    if (ok) setConfirmReset(false);
                  })
                }
              >
                Back to lobby
              </Button>
            </div>
          </Modal>
        )}
      </>
    );
  return (
    <div className="app-shell">
      <header className="site-header">
        <SessionBrand />
        <span className="header-edition">
          GOOD COMPANY. A LITTLE FRIENDLY RIVALRY.
        </span>
        <span className="local-badge">
          <i /> SESSION LOBBY
        </span>
      </header>
      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">
              <span /> YOUR TABLE IS WAITING
            </div>
            <h1>
              A place for everyone<span>.</span>
            </h1>
            <p>
              {session?.viewer?.host
                ? "Invite your friends and choose your rules before the first roll."
                : "Join with a username. The host will start when everyone is ready."}
            </p>
          </div>
          <div className="intro-note">
            <span lang="ar" dir="rtl">
              أهلاً بيك في الجلسة
            </span>
            <p>Session {id}</p>
          </div>
        </section>
        {messages}
        {!session ? (
          <Card className="card-panel session-loading">
            <Users size={30} />
            <h2>
              {connectionError
                ? "Let’s find your table."
                : "Getting your table ready…"}
            </h2>
            <Link href="/">
              Back to Manypoly <ArrowRight size={14} />
            </Link>
          </Card>
        ) : (
          <div className="session-lobby-grid">
            <div className="session-lobby-left">
              <Card className="card-panel invitation-panel">
                <div className="section-kicker">
                  <span>THE INVITATION</span>
                  <Link2 size={17} />
                </div>
                <h2>Good things are better shared.</h2>
                <p>
                  Send this code to your friends. Each person enters it on the
                  home page and joins from their own browser.
                </p>
                <div className="invite-link">
                  <Input
                    className="invite-code"
                    aria-label="Session code"
                    readOnly
                    value={id}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    variant="outline"
                    className="secondary-button"
                    onClick={() => void copy()}
                    aria-label="Copy session code"
                  >
                    {copied ? <Check size={17} /> : <Copy size={17} />}
                  </Button>
                </div>
                {copied && (
                  <p className="copied-note" role="status">
                    Code copied.
                  </p>
                )}
                <p className="network-note">
                  Friends need to be on the same Wi-Fi. Keep the game server
                  running while you play.
                </p>
              </Card>
              <Card className="card-panel lobby-roster">
                <div className="section-kicker">
                  <span>AROUND THE TABLE</span>
                  <span>
                    {session.members.length} / {session.maxPlayers} PLAYERS
                  </span>
                </div>
                {session.members.map((m, i) => (
                  <div className="lobby-member" key={m.id}>
                    <Token id={i} />
                    <div>
                      <b>
                        {m.name}
                        {m.id === session.viewer?.id && <small>YOU</small>}
                      </b>
                      <span>
                        {m.host ? "Host · chooses the rules" : "Ready to play"}
                      </span>
                    </div>
                    {m.host ? (
                      <Crown size={17} />
                    ) : session.viewer?.host && !session.game ? (
                      <Button
                        variant="ghost"
                        className="icon-button h-auto"
                        disabled={busy}
                        aria-label={`Remove ${m.name}`}
                        onClick={() =>
                          void send({ type: "kick", memberId: m.id })
                        }
                      >
                        <X size={15} />
                      </Button>
                    ) : (
                      <Check size={16} />
                    )}
                  </div>
                ))}
                {!session.game &&
                  Array.from(
                    { length: session.maxPlayers - session.members.length },
                    (_, i) => (
                      <div className="empty-seat" key={i}>
                        <span>＋</span> An open seat for a friend
                      </div>
                    ),
                  )}
                {session.viewer && !session.game && (
                  <Button
                    variant="ghost"
                    className="text-button h-auto"
                    disabled={busy}
                    onClick={() => void send({ type: "leave" })}
                  >
                    <LogOut size={13} /> Leave session
                    {session.viewer.host && session.members.length > 1
                      ? " · pass host to the next player"
                      : ""}
                  </Button>
                )}
              </Card>
              {!session.viewer && (
                <Card className="card-panel join-session-panel">
                  <div className="section-kicker">
                    <span>TAKE YOUR SEAT</span>
                    <Users size={17} />
                  </div>
                  <h2>
                    {session.game
                      ? "This story has already begun."
                      : session.members.length >= session.maxPlayers
                        ? "A full table, for now."
                        : "Just bring a name."}
                  </h2>
                  {session.game ? (
                    <p>
                      Games lock after the first roll. Ask the host to return to
                      the lobby for a new game. If you already joined, use the
                      same browser to reconnect to your seat.
                    </p>
                  ) : session.members.length >= session.maxPlayers ? (
                    <p>
                      Ask the host to raise the player limit or make a seat
                      available.
                    </p>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void send({ type: "join", username });
                      }}
                    >
                      <Label className="field-label">
                        Your username · اسم المستخدم
                        <Input
                          minLength={2}
                          maxLength={18}
                          autoComplete="nickname"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="e.g. Yasmin / ياسمين"
                        />
                      </Label>
                      <Button
                        variant="default"
                        className="primary-button"
                        disabled={busy}
                      >
                        {busy ? "Taking your seat…" : "Join the session"}
                        <ArrowRight size={17} />
                      </Button>
                      <p className="network-note">
                        Your seat is remembered in this browser. No password or
                        account.
                      </p>
                    </form>
                  )}
                </Card>
              )}
            </div>
            <Card className="card-panel room-rules">
              <div className="section-kicker">
                <span>YOUR TABLE. YOUR RULES.</span>
                <Settings2 size={17} />
              </div>
              <h2>
                {session.game
                  ? "The rules for this game."
                  : "Before the first roll."}
              </h2>
              <p>
                {session.viewer?.host && !session.game
                  ? "Changes save for everyone. Rules lock when you start."
                  : "The host chooses these settings. Everyone plays by the same rules."}
              </p>
              <SessionSettings
                settings={draftRules?.settings ?? session.settings}
                maxPlayers={draftRules?.maxPlayers ?? session.maxPlayers}
                minPlayers={Math.max(2, session.members.length)}
                disabled={
                  !session.viewer?.host ||
                  busy ||
                  !!session.game ||
                  !!connectionError
                }
                onChange={(settings, maxPlayers) => {
                  setDraftRules({ settings, maxPlayers });
                  void send({ type: "settings", settings, maxPlayers }).finally(
                    () => setDraftRules(null),
                  );
                }}
              />
              {session.viewer?.host && !session.game ? (
                <>
                  <Button
                    variant="default"
                    className="primary-button"
                    disabled={
                      busy || !!connectionError || session.members.length < 2
                    }
                    onClick={() => void send({ type: "start" })}
                  >
                    Start game · {session.members.length}{" "}
                    {session.members.length === 1 ? "player" : "players"}
                    <ArrowRight size={17} />
                  </Button>
                  <p className="network-note">
                    {session.members.length < 2
                      ? "Invite at least one friend to begin."
                      : "Everyone joined will enter the game together."}
                  </p>
                </>
              ) : session.viewer && !session.game ? (
                <div className="waiting-host">
                  <span className="live-dot" /> Waiting for the host to start…
                </div>
              ) : (
                <RulesSummary settings={session.settings} />
              )}
            </Card>
          </div>
        )}
        <footer>
          <span>YOUR SESSION SAVES ON THE SERVER.</span>
          <div>
            <span>✦</span>
            <b>The best move is bringing your people.</b>
          </div>
          <Link href="/local">
            One-device mode <ArrowRight size={12} />
          </Link>
        </footer>
      </main>
    </div>
  );
}
