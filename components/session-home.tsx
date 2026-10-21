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
const preview = createGame(["You", "Your friends"]);
export function SessionBrand() {
  return (
    <Link className="wordmark" href="/" aria-label="Manypoly home">
      <span className="brand-mark">
        m<span>✦</span>
      </span>
      manypoly<span className="brand-dot">.</span>
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
        e instanceof Error ? e.message : "Could not create the session.",
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
      if (!id)
        throw new Error("Enter the 12-character session code.");
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
        <span className="header-edition">
          YOUR PEOPLE. YOUR CITIES. YOUR RULES.
        </span>
        <span className="local-badge">
          <i /> UP TO 6 PLAYERS
        </span>
      </header>
      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">
              <span /> A FAMILIAR WORLD. A SHARED ADVENTURE.
            </div>
            <h1>
              One link. Your whole table<span>.</span>
            </h1>
            <p>
              Create a session, invite your friends, and make the Arab world
              your own.
            </p>
          </div>
          <div className="intro-note">
            <span lang="ar" dir="rtl">
              رابط واحد يجمعنا
            </span>
            <p>Your cities. Your rules.</p>
          </div>
        </section>
        <div className="game-layout session-home-layout">
          <section className="main-panel">
            <div className="panel-toolbar">
              <span className="eyebrow">
                22 CITIES · 32 ACTION CARDS · DIRHAMS
              </span>
            </div>
            <GameBoard game={preview} started={false} onSpace={setSelected} />
            <div className="board-caption">
              <span>
                <Globe2 size={14} /> Play together on separate devices.
              </span>
              <Link href="/local">
                Play on one device <ArrowUpRight size={14} />
              </Link>
            </div>
          </section>
          <aside className="sidebar">
            <Card className="card-panel create-session-panel">
              <div className="section-kicker">
                <span>MAKE ROOM FOR YOUR PEOPLE</span>
                <Users size={17} />
              </div>
              <h2>Start a new story.</h2>
              <p>
                No account, email, or password.
                <br />A username is all you need.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void create();
                }}
              >
                <Label className="field-label">
                  Your username · اسم المستخدم
                  <Input
                    name="username"
                    autoComplete="nickname"
                    minLength={2}
                    maxLength={18}
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Amine / أمين"
                  />
                </Label>
                <Button
                  variant="default"
                  className="primary-button"
                  disabled={busy}
                >
                  {busy ? "Creating your table…" : "Create a session"}
                  <ArrowRight size={17} />
                </Button>
              </form>
              <div className="session-home-divider">
                <span>HAVE AN INVITATION?</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  join();
                }}
              >
                <Label className="field-label">
                  Session code
                  <Input
                    value={link}
                    required
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="e.g. aB3dE5fG7hJ9"
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
                  <Link2 size={15} /> Join a session
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
                <b>A table that plays your way.</b>
                <p>
                  Choose auctions, rent in jail, mortgages, taxes, and more
                  before the first roll.
                </p>
              </div>
            </div>
          </aside>
        </div>
        <footer>
          <span>MADE FOR THE WAY WE COME TOGETHER.</span>
          <div>
            <span>✦</span>
            <b>Play a little. Dream a little bigger.</b>
          </div>
          <span>اللعب يجمعنا</span>
        </footer>
      </main>
      {selected && (
        <Modal title="Explore the board" onClose={() => setSelected(null)}>
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
