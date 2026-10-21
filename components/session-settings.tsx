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
  description: string;
}[] = [
  {
    key: "auctions",
    label: "المزاد العلني",
    description: "العقارات غير المشتراة تذهب لأعلى مزايد.",
  },
  {
    key: "rentInJail",
    label: "قبض الإيجار في السجن",
    description: "المالك المسجون يواصل قبض الإيجار من الزوار.",
  },
  {
    key: "mortgages",
    label: "الرهن العقاري",
    description: "اجمع المال برهن العقارات غير المبنية.",
  },
  {
    key: "trading",
    label: "التبادل بين اللاعبين",
    description: "تبادل العقارات المؤهلة والدراهم.",
  },
  {
    key: "buildings",
    label: "بناء المنازل والفنادق",
    description: "طوّر مجموعات الألوان الكاملة لرفع الإيجار.",
  },
  {
    key: "taxes",
    label: "الضرائب",
    description: "ادفع ضريبة الدخل وضريبة الرفاهية عند التوقف عليهما.",
  },
  {
    key: "freeParkingPot",
    label: "تجميع الضرائب في الاستراحة",
    description: "تتجمع الضرائب المدفوعة ويربحها أول من يتوقف على الاستراحة.",
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
          عدد اللاعبين
          <NativeSelect
            value={maxPlayers}
            onChange={(e) => onChange(settings, Number(e.target.value))}
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <NativeSelectOption key={n} value={n} disabled={n < minPlayers}>
                {n} لاعبين
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Label>
        <Label className="field-label">
          رصيد البداية
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
          مكافأة البداية
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
          الخروج من السجن
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
        <b>{money(settings.startingCash)}</b> للبداية <span>·</span>{" "}
        <b>{money(settings.startSalary)}</b> عند المرور بالبداية <span>·</span>{" "}
        <b>{money(settings.jailBail)}</b> للخروج من السجن
      </div>
      {RULE_OPTIONS.map((r) => (
        <span key={r.key} className={settings[r.key] ? "enabled" : "disabled"}>
          {settings[r.key] ? "✓" : "–"} {r.label}
        </span>
      ))}
    </div>
  );
}
