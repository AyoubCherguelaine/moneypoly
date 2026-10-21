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
            // Only server errors are worded for players; network ones come from the browser.
            e instanceof Error && e.name === "Error"
              ? e.message
              : "انقطع الاتصال. جارٍ إعادة الاتصال…",
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
          e instanceof Error && e.name === "Error"
            ? e.message
            : "تعذّر تحديث الجلسة. حاول مرة أخرى.",
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
      setError("انسخ رمز الجلسة من الحقل أعلاه.");
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
            أعد محاولة الاتصال
          </Button>
        </div>
      )}
      {error && (
        <div className="session-error" role="alert">
          {error}
          <Button
            variant="ghost"
            className="h-auto p-0"
            aria-label="إخفاء الخطأ"
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
                  <i /> الجلسة <b>{id}</b>
                  <span>
                    {" "}
                    · تلعب باسم{" "}
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
                    {copied ? "تم النسخ" : "انسخ الرمز"}
                  </Button>
                  {session.viewer.host && (
                    <Button
                      variant="ghost"
                      className="h-auto p-0"
                      disabled={busy}
                      onClick={() => setConfirmReset(true)}
                    >
                      <Settings2 size={13} /> أعِد الجميع إلى الردهة
                    </Button>
                  )}
                  <Link href="/">الرئيسية</Link>
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
            title="إعادة الجميع إلى الردهة؟"
            onClose={() => setConfirmReset(false)}
          >
            <p className="modal-copy">
              سينهي هذا اللعبة الحالية لجميع اللاعبين. تبقى مقاعدكم محجوزة،
              ويمكن للمضيف تغيير القواعد قبل البدء من جديد.
            </p>
            <div className="modal-actions">
              <Button
                variant="outline"
                className="secondary-button"
                onClick={() => setConfirmReset(false)}
              >
                تابع اللعب
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
                العودة إلى الردهة
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
        <span className="header-edition">صحبة طيبة. ومنافسة ودّية.</span>
        <span className="local-badge">
          <i /> ردهة الجلسة
        </span>
      </header>
      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">
              <span /> طاولتك بانتظارك
            </div>
            <h1>
              مكان يتسع للجميع<span>.</span>
            </h1>
            <p>
              {session?.viewer?.host
                ? "ادعُ أصدقاءك واختر قواعدك قبل الرمية الأولى."
                : "انضم باسم مستخدم. سيبدأ المضيف اللعبة حين يجهز الجميع."}
            </p>
          </div>
          <div className="intro-note">
            <span lang="ar" dir="rtl">
              أهلاً بيك في الجلسة
            </span>
            <p>
              الجلسة <span>{id}</span>
            </p>
          </div>
        </section>
        {messages}
        {!session ? (
          <Card className="card-panel session-loading">
            <Users size={30} />
            <h2>
              {connectionError ? "لنبحث عن طاولتك." : "جارٍ تجهيز طاولتك…"}
            </h2>
            <Link href="/">
              العودة إلى Moneypoly <ArrowRight size={14} />
            </Link>
          </Card>
        ) : (
          <div className="session-lobby-grid">
            <div className="session-lobby-left">
              <Card className="card-panel invitation-panel">
                <div className="section-kicker">
                  <span>الدعوة</span>
                  <Link2 size={17} />
                </div>
                <h2>الأشياء الجميلة أجمل حين نتشاركها.</h2>
                <p>
                  أرسل هذا الرمز إلى أصدقائك. يُدخله كل واحد في الصفحة الرئيسية
                  وينضم من متصفحه.
                </p>
                <div className="invite-link">
                  <Input
                    className="invite-code"
                    aria-label="رمز الجلسة"

                    readOnly
                    value={id}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    variant="outline"
                    className="secondary-button"
                    onClick={() => void copy()}
                    aria-label="انسخ رمز الجلسة"
                  >
                    {copied ? <Check size={17} /> : <Copy size={17} />}
                  </Button>
                </div>
                {copied && (
                  <p className="copied-note" role="status">
                    تم نسخ الرمز.
                  </p>
                )}
                <p className="network-note">
                  يجب أن يكون الأصدقاء على شبكة الواي فاي نفسها. أبقِ خادم
                  اللعبة يعمل أثناء اللعب.
                </p>
              </Card>
              <Card className="card-panel lobby-roster">
                <div className="section-kicker">
                  <span>حول الطاولة</span>
                  <span>
                    {session.members.length} / {session.maxPlayers} لاعبين
                  </span>
                </div>
                {session.members.map((m, i) => (
                  <div className="lobby-member" key={m.id}>
                    <Token id={i} />
                    <div>
                      <b>
                        {m.name}
                        {m.id === session.viewer?.id && <small>أنت</small>}
                      </b>
                      <span>
                        {m.host ? "المضيف · يختار القواعد" : "جاهز للعب"}
                      </span>
                    </div>
                    {m.host ? (
                      <Crown size={17} />
                    ) : session.viewer?.host && !session.game ? (
                      <Button
                        variant="ghost"
                        className="icon-button h-auto"
                        disabled={busy}
                        aria-label={`أزِل ${m.name}`}
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
                        <span>＋</span> مقعد شاغر لصديق
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
                    <LogOut size={13} /> غادر الجلسة
                    {session.viewer.host && session.members.length > 1
                      ? " · تنتقل الاستضافة إلى اللاعب التالي"
                      : ""}
                  </Button>
                )}
              </Card>
              {!session.viewer && (
                <Card className="card-panel join-session-panel">
                  <div className="section-kicker">
                    <span>خذ مقعدك</span>
                    <Users size={17} />
                  </div>
                  <h2>
                    {session.game
                      ? "هذه الحكاية بدأت بالفعل."
                      : session.members.length >= session.maxPlayers
                        ? "الطاولة ممتلئة، حالياً."
                        : "يكفي أن تحضر اسمك."}
                  </h2>
                  {session.game ? (
                    <p>
                      تُغلق اللعبة بعد الرمية الأولى. اطلب من المضيف العودة إلى
                      الردهة لبدء لعبة جديدة. وإن كنت قد انضممت سابقاً، فاستخدم
                      المتصفح نفسه للعودة إلى مقعدك.
                    </p>
                  ) : session.members.length >= session.maxPlayers ? (
                    <p>اطلب من المضيف رفع عدد اللاعبين أو إتاحة مقعد.</p>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void send({ type: "join", username });
                      }}
                    >
                      <Label className="field-label">
                        اسم المستخدم
                        <Input
                          minLength={2}
                          maxLength={18}
                          autoComplete="nickname"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="مثلاً: ياسمين"
                        />
                      </Label>
                      <Button
                        variant="default"
                        className="primary-button"
                        disabled={busy}
                      >
                        {busy ? "جارٍ حجز مقعدك…" : "انضم إلى الجلسة"}
                        <ArrowRight size={17} />
                      </Button>
                      <p className="network-note">
                        يُحفظ مقعدك في هذا المتصفح. دون كلمة مرور أو حساب.
                      </p>
                    </form>
                  )}
                </Card>
              )}
            </div>
            <Card className="card-panel room-rules">
              <div className="section-kicker">
                <span>طاولتك. قواعدك.</span>
                <Settings2 size={17} />
              </div>
              <h2>
                {session.game ? "قواعد هذه اللعبة." : "قبل الرمية الأولى."}
              </h2>
              <p>
                {session.viewer?.host && !session.game
                  ? "تُحفظ التغييرات للجميع، وتُقفل القواعد عند البدء."
                  : "يختار المضيف هذه الإعدادات، والجميع يلعب بالقواعد نفسها."}
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
                    ابدأ اللعبة · {session.members.length}{" "}
                    {session.members.length === 1 ? "لاعب" : "لاعبين"}
                    <ArrowRight size={17} />
                  </Button>
                  <p className="network-note">
                    {session.members.length < 2
                      ? "ادعُ صديقاً واحداً على الأقل للبدء."
                      : "سيدخل كل المنضمين اللعبة معاً."}
                  </p>
                </>
              ) : session.viewer && !session.game ? (
                <div className="waiting-host">
                  <span className="live-dot" /> في انتظار أن يبدأ المضيف…
                </div>
              ) : (
                <RulesSummary settings={session.settings} />
              )}
            </Card>
          </div>
        )}
        <footer>
          <span>تُحفظ جلستك على الخادم.</span>
          <div>
            <span>✦</span>
            <b>أفضل نقلة أن تجمع أحبابك.</b>
          </div>
          <Link href="/local">
            وضع الجهاز الواحد <ArrowRight size={12} />
          </Link>
        </footer>
      </main>
    </div>
  );
}
