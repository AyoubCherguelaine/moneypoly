"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, type CSSProperties } from "react";
import { ArrowLeftRight, Check, Handshake } from "lucide-react";
import { BOARD, GROUPS, money } from "@/lib/board";
import { groupSpaces, type Game, type Trade } from "@/lib/game";
import { SpaceIcon } from "./game-board";
import { Token } from "./game-ui";

const CASH_STEPS = [50, 100, 200];

function tradable(g: Game, id: number) {
  const d = g.deeds[id];
  if (d.mortgaged) return "مرهونة";
  if (
    BOARD[id].group &&
    groupSpaces(BOARD[id]).some((s) => g.deeds[s.id]?.houses)
  )
    return "فيها مبانٍ";
  return null;
}

function DealSide({
  game: g,
  player,
  label,
  cash,
  setCash,
  selected,
  setSelected,
}: {
  game: Game;
  player: number;
  label: string;
  cash: string;
  setCash: (v: string) => void;
  selected: number[];
  setSelected: (v: number[]) => void;
}) {
  const p = g.players[player],
    deeds = Object.entries(g.deeds)
      .filter(([, d]) => d.owner === player)
      .map(([id]) => +id)
      .sort((a, b) => a - b),
    amount = Number(cash) || 0;
  return (
    <section className="deal-side">
      <header>
        <Token id={player} />
        <span>
          <small>{label}</small>
          <b>{p.name}</b>
        </span>
        <em>{money(p.money)}</em>
      </header>
      <label className="deal-cash">
        <span>الدراهم</span>
        <Input
          type="number"
          min="0"
          max={p.money}
          step="1"
          value={cash}
          onChange={(e) => setCash(e.target.value)}
          aria-label={`دراهم يعطيها ${p.name}`}
        />
      </label>
      <div className="deal-steps">
        {CASH_STEPS.map((n) => (
          <button
            type="button"
            key={n}
            disabled={amount + n > p.money}
            onClick={() => setCash(String(amount + n))}
          >
            +{n}
          </button>
        ))}
        <button type="button" disabled={!amount} onClick={() => setCash("0")}>
          مسح
        </button>
      </div>
      <div className="deal-deeds">
        {deeds.map((id) => {
          const s = BOARD[id],
            blocked = tradable(g, id),
            on = selected.includes(id);
          return (
            <button
              type="button"
              key={id}
              className={`deal-deed ${on ? "on" : ""}`}
              disabled={!!blocked}
              aria-pressed={on}
              title={blocked ?? `${s.name} · ${money(s.price!)}`}
              style={
                {
                  "--group": s.group ? GROUPS[s.group].color : "#698e80",
                } as CSSProperties
              }
              onClick={() =>
                setSelected(
                  on ? selected.filter((n) => n !== id) : [...selected, id],
                )
              }
            >
              {s.group ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={GROUPS[s.group].flag} alt="" />
              ) : (
                <i>
                  <SpaceIcon type={s.type} size={16} />
                </i>
              )}
              <b>{s.type === "city" ? s.name : s.arabic}</b>
              <small>{blocked ?? money(s.price!)}</small>
              {on && (
                <span className="deal-check">
                  <Check size={11} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
        {!deeds.length && <p>لا عقارات بعد.</p>}
      </div>
    </section>
  );
}

export function TradeForm({
  game: g,
  onOffer,
}: {
  game: Game;
  onOffer: (t: Trade) => void;
}) {
  const from = g.debt?.from ?? g.current,
    partners = g.players.filter((p) => p.id !== from && !p.bankrupt),
    [to, setTo] = useState(partners[0].id),
    [give, setGive] = useState<number[]>([]),
    [take, setTake] = useState<number[]>([]),
    [cashGive, setCashGive] = useState("0"),
    [cashTake, setCashTake] = useState("0");
  const valid =
    Number.isInteger(Number(cashGive)) &&
    Number.isInteger(Number(cashTake)) &&
    Number(cashGive) >= 0 &&
    Number(cashTake) >= 0 &&
    Number(cashGive) <= g.players[from].money &&
    Number(cashTake) <= g.players[to].money &&
    give.length + take.length + Number(cashGive) + Number(cashTake) > 0;
  const worth = (cash: string, ids: number[]) =>
      (Number(cash) || 0) + ids.reduce((t, id) => t + BOARD[id].price!, 0),
    out = worth(cashGive, give),
    back = worth(cashTake, take),
    total = out + back,
    lean = total ? (back - out) / total : 0;
  return (
    <form
      className="deal-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid)
          onOffer({
            from,
            to,
            give,
            take,
            cashGive: Number(cashGive),
            cashTake: Number(cashTake),
          });
      }}
    >
      <div className="deal-partners" role="radiogroup" aria-label="بادل مع">
        <span>بادل مع</span>
        {partners.map((p) => (
          <button
            type="button"
            role="radio"
            aria-checked={to === p.id}
            key={p.id}
            className={to === p.id ? "on" : ""}
            onClick={() => {
              setTo(p.id);
              setTake([]);
              setCashTake("0");
            }}
          >
            <Token id={p.id} />
            {p.name}
          </button>
        ))}
      </div>
      <div className="deal-grid">
        <DealSide
          game={g}
          player={from}
          label="تعطي"
          cash={cashGive}
          setCash={setCashGive}
          selected={give}
          setSelected={setGive}
        />
        <span className="deal-swap" aria-hidden="true">
          <ArrowLeftRight size={18} />
        </span>
        <DealSide
          game={g}
          player={to}
          label="تأخذ"
          cash={cashTake}
          setCash={setCashTake}
          selected={take}
          setSelected={setTake}
        />
      </div>
      <div className="deal-summary">
        <div>
          <span>تعطي ≈ {money(out)}</span>
          <b>
            {!total
              ? "اختر ما تريد مبادلته"
              : Math.abs(lean) < 0.12
                ? "تبدو عادلة"
                : lean > 0
                  ? `لصالح ${g.players[from].name}`
                  : `لصالح ${g.players[to].name}`}
          </b>
          <span>تأخذ ≈ {money(back)}</span>
        </div>
        <div className="deal-meter" aria-hidden="true">
          <i style={{ left: `${50 + lean * 50}%` }} />
        </div>
        <small>
          وفق الأسعار المعلنة. يمكن لـ{g.players[to].name} القبول أو الرفض أو
          التأجيل لوقت لاحق.
        </small>
      </div>
      <Button
        variant="default"
        type="submit"
        className="primary-button"
        disabled={!valid}
      >
        <Handshake size={17} /> أرسل العرض إلى {g.players[to].name}
      </Button>
    </form>
  );
}
