"use client";
import { Button } from "@/components/ui/button";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { type CSSProperties } from "react";
import { House } from "lucide-react";
import { GROUPS, money, type Space } from "@/lib/board";
import {
  buildError,
  buildingStock,
  groupSpaces,
  rent,
  tradeOpen,
  type Action,
  type Game,
} from "@/lib/game";
import { SpaceIcon } from "./game-board";

export function PropertyDetail({
  space: s,
  game: g,
  active,
  dispatch,
}: {
  space: Space;
  game: Game;
  active: boolean;
  dispatch: (a: Action) => void;
}) {
  const settings = g.settings ?? DEFAULT_SETTINGS;
  const d = g.deeds[s.id],
    owner = g.debt?.from ?? g.current,
    isMine = d?.owner === owner,
    stock = buildingStock(g),
    error = buildError(g, s.id);
  if (!s.price || s.type === "tax")
    return (
      <div className="special-detail">
        <SpaceIcon type={s.type} size={42} />
        <h3 lang="ar">{s.arabic}</h3>
        <p>
          {s.type === "go"
            ? `احصل على ${money(settings.startSalary)} كلما مررت بالبداية أو توقفت عليها.`
            : s.type === "chance" || s.type === "community"
              ? "اسحب البطاقة العليا واتبع تعليماتها ثم أعدها إلى الأسفل. احتفظ ببطاقات الخروج من السجن مجاناً حتى تستخدمها."
              : s.type === "tax"
                ? settings.taxes
                  ? `ادفع ${money(s.price!)} ${settings.freeParkingPot ? "في صندوق الاستراحة" : "للبنك"}.`
                  : "الضرائب معطّلة في هذه اللعبة."
                : s.type === "go-jail"
                  ? "اذهب مباشرة إلى السجن دون المرور بالبداية."
                  : s.type === "jail"
                    ? `في السجن؟ ارمِ زوجاً، أو ادفع ${money(settings.jailBail)} قبل الرمي، أو استخدم بطاقة مجانية. يجب أن تخرج بعد ثلاث محاولات. قبض الإيجار في السجن ${settings.rentInJail ? "مفعّل" : "معطّل"}.`
                    : settings.freeParkingPot
                      ? `خذ ما في صندوق الاستراحة: ${money(g.parkingPot ?? 0)}.`
                      : "خذ نفساً. لا رسوم ولا جائزة في الاستراحة."}
        </p>
      </div>
    );
  return (
    <div className="deed-layout">
      <div className="deed-col">
        <div
          className="deed-banner"
          style={
            {
              "--group": s.group ? GROUPS[s.group].color : "#698e80",
            } as CSSProperties
          }
        >
          {s.group && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="deed-banner-flag"
              src={GROUPS[s.group].flag}
              alt={GROUPS[s.group].name}
            />
          )}
          <div className="deed-banner-body">
            <span>سند الملكية</span>
            <h3 lang="ar">{s.arabic}</h3>
            {s.type === "city" && <h2>{s.name}</h2>}
            {s.group && <small>{GROUPS[s.group].name}</small>}
          </div>
        </div>
        <div className="deed-price">
          <span>سعر الشراء</span>
          <b>{money(s.price!)}</b>
        </div>
        <div className="deed-info">
          <span>
            قيمة الرهن <b>{money(s.price! / 2)}</b>
          </span>
          {s.build && (
            <span>
              كل منزل / فندق <b>{money(s.build)}</b>
            </span>
          )}
          <span>
            {d ? `يملكها ${g.players[d.owner].name}` : "متاحة من البنك"}
            <b>
              {d?.mortgaged
                ? "مرهونة"
                : d?.houses === 5
                  ? "فندق"
                  : d?.houses
                    ? `${d.houses} منازل`
                    : ""}
            </b>
          </span>
        </div>
        {d && (
          <p className="current-rent">
            الإيجار الحالي{" "}
            <strong>{money(rent(g, s, g.dice[0] + g.dice[1]))}</strong>
          </p>
        )}
      </div>
      <div className="deed-col">
        {s.type === "city" ? (
          <div className="rent-table">
            {[
              "الإيجار الأساسي",
              "مع منزل واحد",
              "مع منزلين",
              "مع 3 منازل",
              "مع 4 منازل",
              "مع فندق",
            ].map((label, i) => (
              <div
                className={
                  d && !d.mortgaged && d.houses === i ? "rent-active" : ""
                }
                key={label}
              >
                <span>{label}</span>
                <b>{money(s.rents![i])}</b>
              </div>
            ))}
            <p>يتضاعف الإيجار الأساسي عند امتلاك كل مدن اللون.</p>
          </div>
        ) : s.type === "rail" ? (
          <div className="rent-table">
            {[1, 2, 3, 4].map((n) => (
              <div key={n}>
                <span>
                  {n === 1
                    ? "مع محطة واحدة"
                    : n === 2
                      ? "مع محطتين"
                      : `مع ${n} محطات`}
                </span>
                <b>{money(25 * 2 ** (n - 1))}</b>
              </div>
            ))}
          </div>
        ) : (
          <div className="rent-table">
            <div>
              <span>عند امتلاك شركة واحدة</span>
              <b>4 × مجموع النرد</b>
            </div>
            <div>
              <span>عند امتلاك الشركتين</span>
              <b>10 × مجموع النرد</b>
            </div>
          </div>
        )}
        {active && isMine && (
          <div className="deed-controls">
            {s.type === "city" && (
              <>
                <Button
                  variant="default"
                  className="primary-button"
                  disabled={!!error}
                  onClick={() => dispatch({ type: "build", space: s.id })}
                >
                  <House size={16} />
                  {d.houses === 4 ? "ابنِ فندقاً" : "ابنِ منزلاً"} ·{" "}
                  {money(s.build!)}
                </Button>
                {error && <p className="control-hint">{error}</p>}
                <Button
                  variant="outline"
                  className="secondary-button"
                  disabled={
                    !d.houses ||
                    groupSpaces(s).some(
                      (s) => g.deeds[s.id]?.houses > d.houses,
                    ) ||
                    (d.houses === 5 && stock.houses < 4) ||
                    tradeOpen(g) ||
                    !["roll", "manage", "buy"].includes(g.phase)
                  }
                  onClick={() => dispatch({ type: "sell", space: s.id })}
                >
                  بِع مبنى واحداً · +{money(s.build! / 2)}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              className="secondary-button"
              disabled={
                !settings.mortgages ||
                tradeOpen(g) ||
                !["roll", "manage", "buy"].includes(g.phase) ||
                !!(
                  s.group && groupSpaces(s).some((s) => g.deeds[s.id]?.houses)
                ) ||
                !!(
                  d.mortgaged &&
                  (g.debt ||
                    g.players[owner].money < Math.ceil(s.price! * 0.55))
                )
              }
              onClick={() => dispatch({ type: "mortgage", space: s.id })}
            >
              {d.mortgaged
                ? `فكّ الرهن · ${money(Math.ceil(s.price! * 0.55))}`
                : `ارهن · +${money(s.price! / 2)}`}
            </Button>
            {!settings.mortgages && (
              <small className="control-hint">الرهن معطّل في هذه اللعبة.</small>
            )}
            <small className="control-hint">
              مخزون البنك: {stock.houses} منزلاً · {stock.hotels} فندقاً
            </small>
          </div>
        )}
      </div>
    </div>
  );
}
