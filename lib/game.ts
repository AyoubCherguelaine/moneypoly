import {
  ALL_CARDS,
  BOARD,
  CHANCE,
  COMMUNITY,
  money,
  type Card,
  type Space,
} from "./board";
import { DEFAULT_SETTINGS, type GameSettings } from "./settings";
export type Player = {
  id: number;
  name: string;
  money: number;
  position: number;
  jailed: boolean;
  jailTurns: number;
  bankrupt: boolean;
  escape: string[];
};
export type Deed = { owner: number; houses: number; mortgaged: boolean };
type Payment = {
  from: number;
  to: number | null;
  amount: number;
  reason: string;
  pot?: boolean;
};
export type Auction = {
  space: number;
  bid: number;
  leader: number | null;
  /** Server/device time (ms) when the hammer falls unless someone bids. */
  endsAt: number;
};
/** Time everyone gets to place the first bid. */
export const AUCTION_OPEN_MS = 8000;
/** Every bid restarts the countdown with this much time. */
export const AUCTION_BID_MS = 5000;
export type Trade = {
  from: number;
  to: number;
  give: number[];
  take: number[];
  cashGive: number;
  cashTake: number;
  /** The recipient saved the offer for later; play continues meanwhile. */
  deferred?: boolean;
};
export type Game = {
  version: 1;
  settings?: GameSettings;
  parkingPot?: number;
  players: Player[];
  current: number;
  turn: number;
  phase: "roll" | "manage" | "buy" | "auction" | "over";
  dice: [number, number];
  utilityDice?: [number, number];
  doubles: number;
  extraRoll: boolean;
  deeds: Record<number, Deed>;
  chance: string[];
  community: string[];
  card: Card | null;
  logs: { id: number; text: string }[];
  serial: number;
  payments: Payment[];
  debt: Payment | null;
  auction: Auction | null;
  trade: Trade | null;
};
export type Action =
  | { type: "roll"; dice: [number, number]; utilityDice?: [number, number] }
  | {
      type:
        | "buy"
        | "end"
        | "bail"
        | "escape"
        | "bankrupt"
        | "settle"
        | "dismiss-card"
        | "trade-accept"
        | "trade-reject"
        | "trade-defer"
        | "trade-review";
    }
  | { type: "auction"; at: number }
  | {
      type: "bid";
      player: number;
      at: number;
      /** Absolute bid, or `raise`: that much over the price when it arrives. */
      amount?: number;
      raise?: number;
    }
  | { type: "auction-close"; at: number }
  | { type: "build" | "sell" | "mortgage"; space: number }
  | { type: "trade"; trade: Trade };
export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function createGame(
  names: string[],
  settings: GameSettings = DEFAULT_SETTINGS,
): Game {
  if (names.length < 2 || names.length > 6)
    throw new Error("Choose 2–6 players.");
  return {
    version: 1,
    settings: { ...settings },
    parkingPot: 0,
    players: names.map((name, id) => ({
      id,
      name: name.trim() || `Player ${id + 1}`,
      money: settings.startingCash,
      position: 0,
      jailed: false,
      jailTurns: 0,
      bankrupt: false,
      escape: [],
    })),
    current: 0,
    turn: 1,
    phase: "roll",
    dice: [1, 1],
    doubles: 0,
    extraRoll: false,
    deeds: {},
    chance: shuffle(CHANCE.map((c) => c.id)),
    community: shuffle(COMMUNITY.map((c) => c.id)),
    card: null,
    logs: [
      {
        id: 0,
        text: `Welcome to Manypoly. Your journey starts with ${settings.startingCash.toLocaleString("en-US")} DH each.`,
      },
    ],
    serial: 1,
    payments: [],
    debt: null,
    auction: null,
    trade: null,
  };
}
function log(g: Game, text: string) {
  g.logs.unshift({ id: g.serial++, text });
  g.logs = g.logs.slice(0, 60);
}
export function groupSpaces(space: Space) {
  return BOARD.filter((s) => s.type === "city" && s.group === space.group);
}
export function ownsGroup(g: Game, owner: number, space: Space) {
  return (
    space.type === "city" &&
    groupSpaces(space).every((s) => g.deeds[s.id]?.owner === owner)
  );
}
export function rent(
  g: Game,
  space: Space,
  roll: number,
  special = false,
): number {
  const d = g.deeds[space.id];
  if (!d || d.mortgaged) return 0;
  if (!(g.settings ?? DEFAULT_SETTINGS).rentInJail && g.players[d.owner].jailed)
    return 0;
  if (space.type === "rail") {
    const n = BOARD.filter(
      (s) => s.type === "rail" && g.deeds[s.id]?.owner === d.owner,
    ).length;
    return 25 * 2 ** (n - 1) * (special ? 2 : 1);
  }
  if (space.type === "utility") {
    const n = BOARD.filter(
      (s) => s.type === "utility" && g.deeds[s.id]?.owner === d.owner,
    ).length;
    return roll * (special || n === 2 ? 10 : 4);
  }
  if (space.type === "city")
    return d.houses
      ? space.rents![d.houses]
      : space.rents![0] * (ownsGroup(g, d.owner, space) ? 2 : 1);
  return 0;
}
function processPayments(g: Game) {
  while (g.payments.length) {
    const p = g.payments.shift()!;
    if (g.players[p.from].bankrupt) continue;
    if (g.players[p.from].money < p.amount) {
      g.debt = p;
      log(
        g,
        `${g.players[p.from].name} needs ${p.amount} DH for ${p.reason}. Sell buildings, mortgage, or trade to raise funds.`,
      );
      return;
    }
    g.players[p.from].money -= p.amount;
    if (p.to !== null) g.players[p.to].money += p.amount;
    if (p.pot) g.parkingPot = (g.parkingPot ?? 0) + p.amount;
    log(
      g,
      `${g.players[p.from].name} paid ${p.amount} DH ${p.to === null ? "to the bank" : `to ${g.players[p.to].name}`} · ${p.reason}.`,
    );
  }
  g.debt = null;
}
function charge(
  g: Game,
  from: number,
  to: number | null,
  amount: number,
  reason: string,
  pot = false,
) {
  if (amount > 0) {
    g.payments.push({ from, to, amount, reason, pot });
    processPayments(g);
  }
}
function jail(g: Game) {
  const p = g.players[g.current];
  p.position = 10;
  p.jailed = true;
  p.jailTurns = 0;
  g.extraRoll = false;
  g.doubles = 0;
  log(g, `${p.name} went to jail.`);
}
function move(
  g: Game,
  target: number,
  collect = true,
  special = false,
  utilityDice?: number,
) {
  const p = g.players[g.current];
  if (collect && target < p.position) {
    const salary = (g.settings ?? DEFAULT_SETTINGS).startSalary;
    p.money += salary;
    log(g, `${p.name} passed Start and collected ${salary} DH.`);
  }
  p.position = target;
  land(g, special, utilityDice);
}
function draw(g: Game, deck: "chance" | "community") {
  const id = g[deck].shift()!;
  const c = ALL_CARDS.find((c) => c.id === id)!;
  g.card = ["move", "jail"].includes(c.effect)
    ? {
        ...c,
        text: c.text.replaceAll(
          "200 dirhams",
          `${(g.settings ?? DEFAULT_SETTINGS).startSalary} dirhams`,
        ),
        arabicText: c.arabicText.replaceAll(
          "200 درهم",
          `${money((g.settings ?? DEFAULT_SETTINGS).startSalary)}`,
        ),
      }
    : c;
  if (c.effect !== "escape") g[deck].push(id);
  const p = g.players[g.current];
  log(g, `${p.name} drew “${c.title}”.`);
  switch (c.effect) {
    case "money":
      if (c.amount! > 0) {
        p.money += c.amount!;
      } else charge(g, p.id, null, -c.amount!, c.title);
      break;
    case "move":
      move(g, c.target!);
      break;
    case "jail":
      jail(g);
      break;
    case "escape":
      p.escape.push(c.id);
      break;
    case "back":
      move(g, (p.position - c.amount! + 40) % 40, false);
      break;
    case "rail": {
      const n = [5, 15, 25, 35].find((i) => i > p.position) ?? 5;
      move(g, n, true, true);
      break;
    }
    case "utility": {
      const n = [12, 28].find((i) => i > p.position) ?? 12;
      const utilityDice = g.utilityDice ?? g.dice;
      const r = utilityDice[0] + utilityDice[1];
      log(g, `Utility card dice: ${r}.`);
      move(g, n, true, true, r);
      break;
    }
    case "repairs": {
      const ds = Object.values(g.deeds).filter((d) => d.owner === p.id);
      charge(
        g,
        p.id,
        null,
        ds.reduce(
          (sum, d) => sum + (d.houses === 5 ? c.hotel! : d.houses * c.amount!),
          0,
        ),
        c.title,
      );
      break;
    }
    case "each": {
      for (const other of g.players.filter(
        (o) => o.id !== p.id && !o.bankrupt,
      )) {
        g.payments.push(
          c.amount! > 0
            ? { from: other.id, to: p.id, amount: c.amount!, reason: c.title }
            : { from: p.id, to: other.id, amount: -c.amount!, reason: c.title },
        );
      }
      processPayments(g);
      break;
    }
  }
}
function land(g: Game, special = false, utilityDice?: number) {
  const p = g.players[g.current],
    s = BOARD[p.position];
  log(g, `${p.name} arrived in ${s.name}.`);
  if (s.type === "go-jail") {
    jail(g);
    return;
  }
  if (s.type === "chance" || s.type === "community") {
    draw(g, s.type);
    return;
  }
  if (s.type === "tax") {
    const settings = g.settings ?? DEFAULT_SETTINGS;
    if (settings.taxes)
      charge(g, p.id, null, s.price!, s.name, settings.freeParkingPot);
    else log(g, `${s.name} is disabled for this game.`);
    return;
  }
  if (s.type === "parking" && (g.settings ?? DEFAULT_SETTINGS).freeParkingPot) {
    const pot = g.parkingPot ?? 0;
    p.money += pot;
    g.parkingPot = 0;
    log(g, `${p.name} collected ${pot} DH from Free Parking.`);
    return;
  }
  if (s.price && ["city", "rail", "utility"].includes(s.type)) {
    const d = g.deeds[s.id];
    if (!d) {
      g.phase = "buy";
      return;
    }
    if (d.owner !== p.id)
      charge(
        g,
        p.id,
        d.owner,
        rent(g, s, utilityDice ?? g.dice[0] + g.dice[1], special),
        `rent in ${s.name}`,
      );
  }
}
export function die() {
  return Math.floor(Math.random() * 6) + 1;
}
export function buildingStock(g: Game) {
  const ds = Object.values(g.deeds);
  return {
    houses: 32 - ds.reduce((n, d) => n + (d.houses < 5 ? d.houses : 0), 0),
    hotels: 12 - ds.filter((d) => d.houses === 5).length,
  };
}
export function buildError(g: Game, id: number): string | null {
  if (!(g.settings ?? DEFAULT_SETTINGS).buildings)
    return "Building is disabled for this game.";
  const s = BOARD[id],
    d = g.deeds[id],
    p = g.players[g.current];
  if (!d || d.owner !== p.id || s.type !== "city")
    return "Choose one of your cities.";
  if (g.debt || (g.phase !== "manage" && g.phase !== "roll") || tradeOpen(g))
    return "Finish the current action first.";
  if (!ownsGroup(g, p.id, s)) return "Own every city in this color to build.";
  const group = groupSpaces(s);
  if (group.some((s) => g.deeds[s.id].mortgaged))
    return "Unmortgage the entire color group first.";
  if (d.houses === 5) return "This city already has a hotel.";
  if (group.some((s) => (g.deeds[s.id]?.houses ?? 0) < d.houses))
    return "Build evenly across the color group.";
  if (p.money < s.build!) return "Not enough dirhams.";
  const stock = buildingStock(g);
  if (d.houses === 4 ? stock.hotels < 1 : stock.houses < 1)
    return "The bank has no buildings of this type left.";
  return null;
}
function sellError(g: Game, id: number, owner: number) {
  const d = g.deeds[id],
    s = BOARD[id];
  if (!d || d.owner !== owner || !d.houses) return true;
  if (groupSpaces(s).some((s) => g.deeds[s.id].houses > d.houses)) return true;
  return d.houses === 5 && buildingStock(g).houses < 4;
}
function next(g: Game) {
  do {
    g.current = (g.current + 1) % g.players.length;
  } while (g.players[g.current].bankrupt);
  g.turn++;
  g.phase = "roll";
  g.doubles = 0;
  g.extraRoll = false;
  g.card = null;
  log(g, `${g.players[g.current].name}’s turn.`);
}
function finishAuction(g: Game) {
  const a = g.auction!;
  if (a.leader !== null) {
    g.players[a.leader].money -= a.bid;
    g.deeds[a.space] = { owner: a.leader, houses: 0, mortgaged: false };
    log(
      g,
      `${g.players[a.leader].name} won ${BOARD[a.space].name} for ${a.bid} DH.`,
    );
  } else log(g, `${BOARD[a.space].name} stayed with the bank.`);
  g.auction = null;
  g.phase = "manage";
}
/** A trade offer is on the table and everyone waits for an answer. */
export function tradeOpen(g: Game) {
  return !!g.trade && !g.trade.deferred;
}
export function tradeValid(g: Game, t: Trade) {
  if (
    t.from === t.to ||
    g.players[t.from]?.bankrupt ||
    g.players[t.to]?.bankrupt ||
    !g.players[t.from] ||
    !g.players[t.to]
  )
    return false;
  if (
    !Number.isInteger(t.cashGive) ||
    !Number.isInteger(t.cashTake) ||
    t.cashGive < 0 ||
    t.cashTake < 0 ||
    g.players[t.from].money < t.cashGive ||
    g.players[t.to].money < t.cashTake
  )
    return false;
  if (new Set([...t.give, ...t.take]).size !== t.give.length + t.take.length)
    return false;
  return [
    [t.give, t.from],
    [t.take, t.to],
  ].every(([ids, owner]) =>
    (ids as number[]).every(
      (id) =>
        g.deeds[id]?.owner === owner &&
        !g.deeds[id].mortgaged &&
        (!BOARD[id].group ||
          groupSpaces(BOARD[id]).every((s) => !g.deeds[s.id]?.houses)),
    ),
  );
}
export function gameReducer(state: Game, action: Action): Game {
  if (state.phase === "over") return state;
  const g = structuredClone(state);
  const p = g.players[g.current];
  if (
    tradeOpen(g) &&
    !["trade-accept", "trade-reject", "trade-defer"].includes(action.type)
  )
    return state;
  if (
    g.debt &&
    ![
      "sell",
      "mortgage",
      "trade",
      "trade-accept",
      "trade-reject",
      "settle",
      "bankrupt",
      "dismiss-card",
    ].includes(action.type)
  )
    return state;
  switch (action.type) {
    case "roll": {
      if (
        g.phase !== "roll" ||
        [...action.dice, ...(action.utilityDice ?? [])].some(
          (n) => !Number.isInteger(n) || n < 1 || n > 6,
        )
      )
        return state;
      g.dice = action.dice;
      g.utilityDice = action.utilityDice ?? action.dice;
      g.card = null;
      g.phase = "manage";
      const [a, b] = action.dice;
      let extra = a === b;
      log(g, `${p.name} rolled ${a} + ${b}${extra ? " · doubles!" : ""}.`);
      if (p.jailed) {
        p.jailTurns++;
        if (extra) {
          p.jailed = false;
          p.jailTurns = 0;
          extra = false;
          log(g, `${p.name} rolled doubles and left jail.`);
        } else if (p.jailTurns >= 3) {
          p.jailed = false;
          p.jailTurns = 0;
          charge(
            g,
            p.id,
            null,
            (g.settings ?? DEFAULT_SETTINGS).jailBail,
            "mandatory jail release",
          );
        } else {
          g.extraRoll = false;
          return g;
        }
      }
      g.doubles = extra ? g.doubles + 1 : 0;
      g.extraRoll = extra;
      if (g.doubles === 3) {
        jail(g);
        return g;
      }
      // A forced third-turn bail can create debt; movement still resolves once that debt is paid.
      if (g.debt) {
        g.phase = "manage";
        g.payments = [];
        log(
          g,
          `After settling bail, move ${a + b} spaces using the “Settle debt” action.`,
        );
        return g;
      }
      move(g, (p.position + a + b) % 40);
      break;
    }
    case "buy": {
      const s = BOARD[p.position];
      if (g.phase !== "buy" || !s.price || p.money < s.price) return state;
      p.money -= s.price;
      g.deeds[s.id] = { owner: p.id, houses: 0, mortgaged: false };
      g.phase = "manage";
      log(g, `${p.name} bought ${s.name} for ${s.price} DH.`);
      break;
    }
    case "auction":
      if (g.phase !== "buy") return state;
      if (!(g.settings ?? DEFAULT_SETTINGS).auctions) {
        log(
          g,
          `${BOARD[p.position].name} stayed with the bank. Auctions are disabled.`,
        );
        g.phase = "manage";
        break;
      }
      g.phase = "auction";
      g.auction = {
        space: p.position,
        bid: 0,
        leader: null,
        endsAt: action.at + AUCTION_OPEN_MS,
      };
      log(g, `${BOARD[p.position].name} is up for auction.`);
      break;
    case "bid": {
      // Live auction: anyone may outbid at any moment until the countdown ends.
      const a = g.auction,
        bidder = g.players[action.player];
      if (!a) return state;
      // A raise means near-simultaneous clicks stack instead of colliding.
      const amount =
        action.raise !== undefined ? a.bid + action.raise : action.amount;
      if (
        !bidder ||
        bidder.bankrupt ||
        action.player === a.leader ||
        action.at >= a.endsAt ||
        amount === undefined ||
        !Number.isInteger(amount) ||
        amount <= a.bid ||
        amount > bidder.money
      )
        return state;
      a.bid = amount;
      a.leader = action.player;
      a.endsAt = action.at + AUCTION_BID_MS;
      log(g, `${bidder.name} bid ${a.bid} DH.`);
      break;
    }
    case "auction-close":
      if (!g.auction || action.at < (g.auction.endsAt ?? 0)) return state;
      finishAuction(g);
      break;
    case "end":
      if (g.phase !== "manage" || g.debt) return state;
      if (g.extraRoll && !p.jailed) {
        g.phase = "roll";
        g.extraRoll = false;
        g.card = null;
      } else next(g);
      break;
    case "bail":
      if (
        g.phase !== "roll" ||
        !p.jailed ||
        p.money < (g.settings ?? DEFAULT_SETTINGS).jailBail
      )
        return state;
      p.money -= (g.settings ?? DEFAULT_SETTINGS).jailBail;
      p.jailed = false;
      p.jailTurns = 0;
      log(
        g,
        `${p.name} paid ${(g.settings ?? DEFAULT_SETTINGS).jailBail} DH to leave jail.`,
      );
      break;
    case "escape":
      if (g.phase !== "roll" || !p.jailed || !p.escape.length) return state;
      {
        const id = p.escape.shift()!;
        g[id.startsWith("c") ? "chance" : "community"].push(id);
        p.jailed = false;
        p.jailTurns = 0;
        log(g, `${p.name} used a Get out of jail free card.`);
      }
      break;
    case "build":
      if (buildError(g, action.space)) return state;
      g.deeds[action.space].houses++;
      p.money -= BOARD[action.space].build!;
      log(g, `${p.name} developed ${BOARD[action.space].name}.`);
      break;
    case "sell": {
      const owner = g.debt?.from ?? g.current;
      if (sellError(g, action.space, owner) || g.phase === "auction")
        return state;
      g.deeds[action.space].houses--;
      g.players[owner].money += BOARD[action.space].build! / 2;
      log(
        g,
        `${g.players[owner].name} sold a building in ${BOARD[action.space].name}.`,
      );
      break;
    }
    case "mortgage": {
      if (!(g.settings ?? DEFAULT_SETTINGS).mortgages) return state;
      const owner = g.debt?.from ?? g.current,
        d = g.deeds[action.space],
        s = BOARD[action.space];
      if (!d || d.owner !== owner || g.phase === "auction") return state;
      if (s.group && groupSpaces(s).some((s) => g.deeds[s.id]?.houses))
        return state;
      const value = s.price! / 2;
      if (d.mortgaged) {
        const cost = Math.ceil(value * 1.1);
        if (g.players[owner].money < cost || g.debt) return state;
        g.players[owner].money -= cost;
        d.mortgaged = false;
      } else {
        g.players[owner].money += value;
        d.mortgaged = true;
      }
      log(
        g,
        `${g.players[owner].name} ${d.mortgaged ? "mortgaged" : "unmortgaged"} ${s.name}.`,
      );
      break;
    }
    case "settle": {
      const debt = g.debt;
      if (!debt || g.players[debt.from].money < debt.amount) return state;
      g.debt = null;
      g.payments.unshift(debt);
      processPayments(g);
      if (debt.reason === "mandatory jail release" && !g.debt)
        move(g, (p.position + g.dice[0] + g.dice[1]) % 40);
      break;
    }
    case "bankrupt": {
      const d = g.debt;
      if (!d) return state;
      const loser = g.players[d.from];
      loser.bankrupt = true;
      loser.jailed = false;
      const creditor = d.to === null ? null : g.players[d.to];
      if (creditor) creditor.money += loser.money;
      if (d.pot) g.parkingPot = (g.parkingPot ?? 0) + loser.money;
      loser.money = 0;
      for (const [id, deed] of Object.entries(g.deeds)) {
        if (deed.owner !== loser.id) continue;
        if (creditor) {
          creditor.money +=
            deed.houses === 5
              ? BOARD[+id].build! * 2.5
              : (deed.houses * (BOARD[+id].build ?? 0)) / 2;
          deed.owner = creditor.id;
          deed.houses = 0;
        } else delete g.deeds[+id];
      }
      for (const id of loser.escape) {
        if (creditor) creditor.escape.push(id);
        else g[id.startsWith("c") ? "chance" : "community"].push(id);
      }
      loser.escape = [];
      log(
        g,
        `${loser.name} declared bankruptcy${creditor ? ` to ${creditor.name}` : " to the bank"}.`,
      );
      g.debt = null;
      g.payments = g.payments.filter((payment) => payment.from !== loser.id);
      processPayments(g);
      if (g.players.filter((p) => !p.bankrupt).length === 1) {
        g.phase = "over";
        g.debt = null;
        g.payments = [];
        log(g, `${g.players.find((p) => !p.bankrupt)!.name} wins Manypoly!`);
      } else if (loser.id === g.current) next(g);
      break;
    }
    case "dismiss-card":
      g.card = null;
      break;
    case "trade":
      if (!(g.settings ?? DEFAULT_SETTINGS).trading) return state;
      if (
        g.trade ||
        !["roll", "manage", "buy"].includes(g.phase) ||
        !tradeValid(g, action.trade) ||
        action.trade.from !== (g.debt?.from ?? g.current)
      )
        return state;
      g.trade = { ...action.trade, deferred: false };
      break;
    case "trade-defer":
      if (!g.trade || g.trade.deferred) return state;
      g.trade.deferred = true;
      log(
        g,
        `${g.players[g.trade.to].name} saved ${g.players[g.trade.from].name}’s offer for later.`,
      );
      break;
    case "trade-review":
      // Reopening pauses the table again, so only between other actions.
      if (!g.trade?.deferred || g.auction || g.phase === "auction")
        return state;
      g.trade.deferred = false;
      break;
    case "trade-accept": {
      const t = g.trade;
      if (!t || t.deferred || g.auction || !tradeValid(g, t)) return state;
      g.players[t.from].money += t.cashTake - t.cashGive;
      g.players[t.to].money += t.cashGive - t.cashTake;
      for (const id of t.give) g.deeds[id].owner = t.to;
      for (const id of t.take) g.deeds[id].owner = t.from;
      log(
        g,
        `${g.players[t.from].name} and ${g.players[t.to].name} completed a trade.`,
      );
      g.trade = null;
      break;
    }
    case "trade-reject":
      g.trade = null;
      break;
  }
  return g;
}
export function netWorth(g: Game, id: number) {
  return (
    g.players[id].money +
    Object.entries(g.deeds).reduce(
      (n, [sid, d]) =>
        n +
        (d.owner === id
          ? BOARD[+sid].price! * (d.mortgaged ? 0.5 : 1) +
            (BOARD[+sid].build ?? 0) * d.houses
          : 0),
      0,
    )
  );
}
