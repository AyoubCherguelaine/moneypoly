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
        <p className="deed-ar" lang="ar">
          {s.arabic}
        </p>
        <h3>{s.name}</h3>
        <p>
          {s.type === "go"
            ? `Collect ${settings.startSalary} DH each time you pass or land on Start.`
            : s.type === "chance" || s.type === "community"
              ? "Draw the top card, follow its instructions, and return it to the bottom. Keep Get out of jail free cards until used."
              : s.type === "tax"
                ? settings.taxes
                  ? `Pay ${money(s.price!)} ${settings.freeParkingPot ? "into the Free Parking pot" : "to the bank"}.`
                  : "Taxes are disabled in this game."
                : s.type === "go-jail"
                  ? "Go directly to jail without passing Start."
                  : s.type === "jail"
                    ? `In jail? Roll doubles, pay ${settings.jailBail} DH before rolling, or use a free card. You must leave after three attempts. Rent in jail is ${settings.rentInJail ? "enabled" : "disabled"}.`
                    : settings.freeParkingPot
                      ? `Collect the Free Parking pot: ${money(g.parkingPot ?? 0)}.`
                      : "Take a breath. Free Parking has no fee or bonus."}
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
            <span>TITLE DEED · سند الملكية</span>
            <h3 lang="ar">{s.arabic}</h3>
            <h2>{s.name}</h2>
            {s.group && <small>{GROUPS[s.group].name}</small>}
          </div>
        </div>
        <div className="deed-price">
          <span>Purchase price</span>
          <b>{money(s.price!)}</b>
        </div>
        <div className="deed-info">
          <span>
            Mortgage value <b>{money(s.price! / 2)}</b>
          </span>
          {s.build && (
            <span>
              Each house / hotel <b>{money(s.build)}</b>
            </span>
          )}
          <span>
            {d
              ? `Owned by ${g.players[d.owner].name}`
              : "Available from the bank"}
            <b>
              {d?.mortgaged
                ? "Mortgaged"
                : d?.houses === 5
                  ? "Hotel"
                  : d?.houses
                    ? `${d.houses} houses`
                    : ""}
            </b>
          </span>
        </div>
        {d && (
          <p className="current-rent">
            Current rent{" "}
            <strong>{money(rent(g, s, g.dice[0] + g.dice[1]))}</strong>
          </p>
        )}
      </div>
      <div className="deed-col">
        {s.type === "city" ? (
          <div className="rent-table">
            {[
              "Base rent",
              "With 1 house",
              "With 2 houses",
              "With 3 houses",
              "With 4 houses",
              "With a hotel",
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
            <p>Base rent doubles when the full color set is owned.</p>
          </div>
        ) : s.type === "rail" ? (
          <div className="rent-table">
            {[1, 2, 3, 4].map((n) => (
              <div key={n}>
                <span>
                  With {n} railway{n > 1 ? "s" : ""}
                </span>
                <b>{money(25 * 2 ** (n - 1))}</b>
              </div>
            ))}
          </div>
        ) : (
          <div className="rent-table">
            <div>
              <span>One utility owned</span>
              <b>4 × dice total</b>
            </div>
            <div>
              <span>Both utilities owned</span>
              <b>10 × dice total</b>
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
                  {d.houses === 4 ? "Build hotel" : "Build a house"} ·{" "}
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
                  Sell one building · +{money(s.build! / 2)}
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
                ? `Unmortgage · ${money(Math.ceil(s.price! * 0.55))}`
                : `Mortgage · +${money(s.price! / 2)}`}
            </Button>
            {!settings.mortgages && (
              <small className="control-hint">
                Mortgages are disabled for this game.
              </small>
            )}
            <small className="control-hint">
              Bank stock: {stock.houses} houses · {stock.hotels} hotels
            </small>
          </div>
        )}
      </div>
    </div>
  );
}
