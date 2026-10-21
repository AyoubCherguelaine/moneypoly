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
        <span className="eyebrow">A LITTLE TWIST IN THE JOURNEY</span>
        <h2>Good fortune. Great stories.</h2>
        <p>32 action cards and 28 title deeds. Explore every possibility.</p>
      </div>
      <TabsList className="library-tabs" variant="line" aria-label="Card decks">
        {(["chance", "community", "deeds"] as const).map((d) => (
          <TabsTrigger
            value={d}
            className={deck === d ? "selected" : ""}
            key={d}
          >
            {d === "deeds"
              ? "Title deeds · 28"
              : `${d === "chance" ? "Chance" : "Community"} · 16`}
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
                <b>{s.name}</b>
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
                 <h3 lang="ar">{c.arabicTitle}</h3>
                 <p lang="ar">
                   {["move", "jail"].includes(c.effect)
                     ? c.arabicText.replaceAll(
                         "200 درهم",
                         `${money(settings.startSalary)}`,
                       )
                     : c.arabicText}
                 </p>
              </article>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
