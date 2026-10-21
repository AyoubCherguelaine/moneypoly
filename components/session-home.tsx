"use client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Link2,
  Users,
  SlidersHorizontal,
  Globe2,
  ArrowUpRight,
} from "lucide-react";
import { GameBoard } from "./game-board";
import { Modal } from "./game-ui";
import { PropertyDetail } from "./property-detail";
import { createGame } from "@/lib/game";
import type { Space } from "@/lib/board";
import type { SessionView } from "@/lib/session-types";
const preview = createGame(["أنت", "أصدقاؤك"]);
export function SessionBrand() {
  return (
    <Link className="wordmark" href="/" aria-label="الصفحة الرئيسية لMoneypoly">
      <span className="brand-mark">
        م<span>✦</span>
      </span>
      Moneypoly<span className="brand-dot">.</span>
    </Link>
  );
}
export default function SessionHome() {
  const router = useRouter(),
    [username, setUsername] = useState(""),
    [link, setLink] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<Space | null>(null);
  async function create() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/session/${(data as SessionView).id}`);
    } catch (e) {
      setError(
        // Only server errors are worded for players; network ones come from the browser.
        e instanceof Error && e.name === "Error"
          ? e.message
          : "تعذّر إنشاء الجلسة.",
      );
      setBusy(false);
    }
  }
  function join() {
    setError("");
    try {
      const input = link.trim();
      const id =
        input.match(/(?:^|\/)session\/([A-Za-z0-9_-]{12})(?:[/?#]|$)/)?.[1] ??
        (/^[A-Za-z0-9_-]{12}$/.test(input) ? input : null);
      if (!id) throw new Error("أدخل رمز الجلسة المكوّن من 12 حرفاً.");
      router.push(
        `/session/${id}${username.trim() ? `?username=${encodeURIComponent(username.trim())}` : ""}`,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="app-shell">
      <header className="site-header">
        <SessionBrand />
        <span className="header-edition">ناسك. مدنك. قواعدك.</span>
        <span className="local-badge">
          <i /> حتى 6 لاعبين
        </span>
      </header>
      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">
              <span /> عالم مألوف. مغامرة مشتركة.
            </div>
            <h1>
              رابط واحد يجمع طاولتك كلها<span>.</span>
            </h1>
            <p>أنشئ جلسة، وادعُ أصدقاءك، واجعل العالم العربي ملكك.</p>
          </div>
          <div className="intro-note">
            <span lang="ar" dir="rtl">
              رابط واحد يجمعنا
            </span>
            <p>مدنك. قواعدك.</p>
          </div>
        </section>
        <div className="game-layout session-home-layout">
          <section className="main-panel">
            <div className="panel-toolbar">
              <span className="eyebrow">22 مدينة · 32 بطاقة حدث · دراهم</span>
            </div>
            <GameBoard game={preview} started={false} onSpace={setSelected} />
            <div className="board-caption">
              <span>
                <Globe2 size={14} /> العبوا معاً كلٌّ من جهازه.
              </span>
              <Link href="/local">
                العب على جهاز واحد <ArrowUpRight size={14} />
              </Link>
            </div>
          </section>
          <aside className="sidebar">
            <Card className="card-panel create-session-panel">
              <div className="section-kicker">
                <span>أفسح المكان لأحبابك</span>
                <Users size={17} />
              </div>
              <h2>ابدأ حكاية جديدة.</h2>
              <p>
                دون حساب أو بريد إلكتروني أو كلمة مرور.
                <br />
                كل ما تحتاجه اسم مستخدم.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void create();
                }}
              >
                <Label className="field-label">
                  اسم المستخدم
                  <Input
                    name="username"
                    autoComplete="nickname"
                    minLength={2}
                    maxLength={18}
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثلاً: أمين"
                  />
                </Label>
                <Button
                  variant="default"
                  className="primary-button"
                  disabled={busy}
                >
                  {busy ? "جارٍ تجهيز طاولتك…" : "أنشئ جلسة"}
                  <ArrowRight size={17} />
                </Button>
              </form>
              <div className="session-home-divider">
                <span>لديك دعوة؟</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  join();
                }}
              >
                <Label className="field-label">
                  رمز الجلسة
                  <Input
                    value={link}
                    required
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="مثلاً: aB3dE5fG7hJ9"

                    maxLength={200}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </Label>
                <Button
                  variant="outline"
                  className="secondary-button"
                  disabled={busy}
                >
                  <Link2 size={15} /> انضم إلى جلسة
                </Button>
              </form>
              {error && (
                <p className="session-error" role="alert">
                  {error}
                </p>
              )}
            </Card>
            <div className="little-note">
              <SlidersHorizontal size={25} />
              <div>
                <b>طاولة تلعب على طريقتك.</b>
                <p>
                  اختر المزادات، والإيجار في السجن، والرهن، والضرائب وغيرها قبل
                  الرمية الأولى.
                </p>
              </div>
            </div>
          </aside>
        </div>
        <footer>
          <span>صُنعت لتجمعنا كما نحب.</span>
          <div>
            <span>✦</span>
            <b>العب قليلاً. واحلم أكبر قليلاً.</b>
          </div>
          <span>اللعب يجمعنا</span>
        </footer>
      </main>
      {selected && (
        <Modal title="استكشف اللوحة" onClose={() => setSelected(null)}>
          <PropertyDetail
            space={selected}
            game={preview}
            active={false}
            dispatch={() => {}}
          />
        </Modal>
      )}
    </div>
  );
}
