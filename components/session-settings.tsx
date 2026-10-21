"use client";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { money } from "@/lib/board";
import {
  JAIL_BAIL,
  STARTING_CASH,
  START_SALARY,
  type GameSettings,
} from "@/lib/settings";
export const RULE_OPTIONS: {
  key: keyof Pick<
    GameSettings,
    | "auctions"
    | "taxes"
    | "freeParkingPot"
    | "rentInJail"
    | "mortgages"
    | "trading"
    | "buildings"
  >;
  label: string;
  arabic: string;
  description: string;
}[] = [
  {
    key: "auctions",
    label: "Property auctions",
    arabic: "المزاد العلني",
    description: "Unbought properties go to the highest bidder.",
  },
  {
    key: "rentInJail",
    label: "Collect rent in jail",
    arabic: "قبض الإيجار في السجن",
    description: "A jailed owner still collects rent from visitors.",
  },
  {
    key: "mortgages",
    label: "Mortgages",
    arabic: "الرهن العقاري",
    description: "Raise cash by mortgaging undeveloped properties.",
  },
  {
    key: "trading",
    label: "Player trades",
    arabic: "التبادل بين اللاعبين",
    description: "Exchange eligible properties and dirhams.",
  },
  {
    key: "buildings",
    label: "Houses & hotels",
    arabic: "بناء المنازل والفنادق",
    description: "Develop complete color sets to increase rent.",
  },
  {
    key: "taxes",
    label: "Tax spaces",
    arabic: "الضرائب",
    description: "Pay income and luxury taxes when landing on them.",
  },
  {
    key: "freeParkingPot",
    label: "Taxes to Free Parking",
    arabic: "تجميع الضرائب في الاستراحة",
    description:
      "Tax payments form a pot won by the next player landing on Free Parking.",
  },
];
export function SessionSettings({
  settings,
  maxPlayers,
  onChange,
  disabled = false,
  minPlayers = 2,
}: {
  settings: GameSettings;
  maxPlayers: number;
  onChange: (s: GameSettings, max: number) => void;
  disabled?: boolean;
  minPlayers?: number;
}) {
  return (
    <fieldset className="settings-fieldset" disabled={disabled}>
      <div className="settings-numbers">
        <Label className="field-label">
          Player limit · عدد اللاعبين
          <NativeSelect
            value={maxPlayers}
            onChange={(e) => onChange(settings, Number(e.target.value))}
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <NativeSelectOption key={n} value={n} disabled={n < minPlayers}>
                {n} players
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Label>
        <Label className="field-label">
          Starting money · رصيد البداية
          <NativeSelect
            value={settings.startingCash}
            onChange={(e) =>
              onChange(
                { ...settings, startingCash: Number(e.target.value) },
                maxPlayers,
              )
            }
          >
            {STARTING_CASH.map((n) => (
              <NativeSelectOption key={n} value={n}>
                {money(n)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Label>
        <Label className="field-label">
          Pass Start · مكافأة البداية
          <NativeSelect
            value={settings.startSalary}
            onChange={(e) =>
              onChange(
                { ...settings, startSalary: Number(e.target.value) },
                maxPlayers,
              )
            }
          >
            {START_SALARY.map((n) => (
              <NativeSelectOption key={n} value={n}>
                {money(n)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Label>
        <Label className="field-label">
          Jail release · الخروج من السجن
          <NativeSelect
            value={settings.jailBail}
            onChange={(e) =>
              onChange(
                { ...settings, jailBail: Number(e.target.value) },
                maxPlayers,
              )
            }
          >
            {JAIL_BAIL.map((n) => (
              <NativeSelectOption key={n} value={n}>
                {money(n)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Label>
      </div>
      <div className="rule-toggles">
        {RULE_OPTIONS.map((rule) => (
          <Label className="rule-toggle" key={rule.key}>
            <span>
              <b>{rule.label}</b>
              <span lang="ar" dir="rtl">
                {rule.arabic}
              </span>
              <small>{rule.description}</small>
            </span>
            <Switch
              aria-label={rule.label}
              checked={settings[rule.key]}
              disabled={
                disabled || (rule.key === "freeParkingPot" && !settings.taxes)
              }
              onCheckedChange={(checked) =>
                onChange(
                  {
                    ...settings,
                    [rule.key]: checked,
                    ...(rule.key === "taxes" && !checked
                      ? { freeParkingPot: false }
                      : {}),
                  },
                  maxPlayers,
                )
              }
            />
          </Label>
        ))}
      </div>
    </fieldset>
  );
}
export function RulesSummary({ settings }: { settings: GameSettings }) {
  return (
    <div className="rules-summary">
      <div>
        <b>{money(settings.startingCash)}</b> to start <span>·</span>{" "}
        <b>{money(settings.startSalary)}</b> passing Start <span>·</span>{" "}
        <b>{money(settings.jailBail)}</b> jail release
      </div>
      {RULE_OPTIONS.map((r) => (
        <span key={r.key} className={settings[r.key] ? "enabled" : "disabled"}>
          {settings[r.key] ? "✓" : "–"} {r.label}
        </span>
      ))}
    </div>
  );
}
