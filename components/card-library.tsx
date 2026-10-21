"use client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState, type CSSProperties } from "react";
import { Landmark, Sparkles } from "lucide-react";
import { DEFAULT_SETTINGS, type GameSettings } from "@/lib/settings";
import {
  BOARD,
  CHANCE,
  COMMUNITY,
  GROUPS,
  money,
  type Card,
  type Space,
} from "@/lib/board";

export function CardLibrary({
  onSpace,
  settings = DEFAULT_SETTINGS,
}: {
  onSpace: (s: Space) => void;
  settings?: GameSettings;
}) {
  const [deck, setDeck] = useState<"chance" | "community" | "deeds">("chance");
  return (
    <Tabs
      value={deck}
      onValueChange={(value) => setDeck(value as typeof deck)}
      className="content-view card-library"
    >
      <div className="view-heading">
        <span className="eyebrow">مفاجآت صغيرة على الطريق</span>
        <h2>حظ سعيد. حكايات رائعة.</h2>
        <p>32 بطاقة حدث و28 سند ملكية. اكتشف كل الاحتمالات.</p>
      </div>
      <TabsList
        className="library-tabs"
        variant="line"
        aria-label="مجموعات البطاقات"
      >
        {(["chance", "community", "deeds"] as const).map((d) => (
          <TabsTrigger
            value={d}
            className={deck === d ? "selected" : ""}
            key={d}
          >
            {d === "deeds"
              ? "سندات الملكية · 28"
              : `${d === "chance" ? "فرصة" : "صندوق المجتمع"} · 16`}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={deck} className="game-tab-content">
        {deck === "deeds" ? (
          <div className="property-grid library-deeds">
            {BOARD.filter((s) =>
              ["city", "rail", "utility"].includes(s.type),
            ).map((s) => (
              <button
                key={s.id}
                className="property-tile"
                style={
                  {
                    "--group": s.group ? GROUPS[s.group].color : "#698e80",
                  } as CSSProperties
                }
                onClick={() => onSpace(s)}
              >
                {s.group && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="tile-flag"
                    src={GROUPS[s.group].flag}
                    alt={GROUPS[s.group].name}
                  />
                )}
                <span lang="ar">{s.arabic}</span>
                {s.type === "city" && <b>{s.name}</b>}
                <small>{money(s.price!)}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="library-grid">
            {(deck === "chance" ? CHANCE : COMMUNITY).map((c: Card, i) => (
              <article className={`library-card ${deck}`} key={c.id}>
                <div>
                  {deck === "chance" ? (
                    <Sparkles size={22} />
                  ) : (
                    <Landmark size={22} />
                  )}
                  <span>{String(i + 1).padStart(2, "0")} / 16</span>
                </div>
                <h3 lang="ar">{c.title}</h3>
                <p lang="ar">
                  {["move", "jail"].includes(c.effect)
                    ? c.text.replaceAll("200 درهم", money(settings.startSalary))
                    : c.text}
                </p>
              </article>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
