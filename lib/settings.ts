export type GameSettings = {
  auctions: boolean;
  taxes: boolean;
  freeParkingPot: boolean;
  rentInJail: boolean;
  mortgages: boolean;
  trading: boolean;
  buildings: boolean;
  startingCash: number;
  startSalary: number;
  jailBail: number;
};
export const DEFAULT_SETTINGS: GameSettings = {
  auctions: true,
  taxes: true,
  freeParkingPot: false,
  startingCash: 1500,
  startSalary: 200,
  rentInJail: true,
  mortgages: true,
  trading: true,
  buildings: true,
  jailBail: 50,
};
export const STARTING_CASH = [1000, 1500, 2000, 2500] as const;
export const START_SALARY = [100, 200, 400] as const;
export const JAIL_BAIL = [50, 100, 200] as const;
export function validSettings(value: unknown): value is GameSettings {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    [
      "auctions",
      "taxes",
      "freeParkingPot",
      "rentInJail",
      "mortgages",
      "trading",
      "buildings",
    ].every((key) => typeof s[key] === "boolean") &&
    STARTING_CASH.some((n) => n === s.startingCash) &&
    START_SALARY.some((n) => n === s.startSalary) &&
    JAIL_BAIL.some((n) => n === s.jailBail) &&
    (!s.freeParkingPot || s.taxes === true)
  );
}
