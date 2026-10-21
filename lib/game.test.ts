import { describe, it } from "node:test";
import { DEFAULT_SETTINGS } from "./settings";
import assert from "node:assert/strict";
import { ALL_CARDS, BOARD, CHANCE, COMMUNITY } from "./board";
import {
  AUCTION_BID_MS,
  AUCTION_OPEN_MS,
  buildingStock,
  createGame,
  gameReducer,
  rent,
  type Action,
  type Game,
} from "./game";
const fresh = () => createGame(["Amine", "Yasmin", "Omar"]);
const act = (g: Game, ...actions: Action[]) => actions.reduce(gameReducer, g);
const own = (g: Game, id: number, owner = 0, houses = 0, mortgaged = false) => {
  g.deeds[id] = { owner, houses, mortgaged };
};
function drawCard(id: string, pos?: number) {
  const g = fresh(),
    chance = id.startsWith("c");
  g.players[0].position = pos ?? (chance ? 1 : 10);
  const deck = chance ? "chance" : "community";
  g[deck] = [id, ...g[deck].filter((c) => c !== id)];
  return g;
}
describe("board and decks", () => {
  it("has 40 indexed spaces, 22 cities, 28 deeds, and 32 unique action cards", () => {
    assert.equal(BOARD.length, 40);
    BOARD.forEach((s, i) => assert.equal(s.id, i));
    assert.equal(BOARD.filter((s) => s.type === "city").length, 22);
    assert.equal(
      BOARD.filter((s) => ["city", "rail", "utility"].includes(s.type)).length,
      28,
    );
    assert.equal(CHANCE.length, 16);
    assert.equal(COMMUNITY.length, 16);
    assert.equal(new Set(ALL_CARDS.map((c) => c.id)).size, 32);
  });
  it("starts 2–6 players with 1,500 DH and rejects invalid player counts", () => {
    assert.equal(fresh().players[0].money, 1500);
    assert.throws(() => createGame(["A"]));
    assert.throws(() => createGame(Array(7).fill("A")));
  });
});
describe("movement, turns, and purchases", () => {
  it("does not mutate the previous state", () => {
    const g = fresh();
    const snapshot = JSON.stringify(g);
    gameReducer(g, { type: "roll", dice: [1, 2] });
    assert.equal(JSON.stringify(g), snapshot);
  });
  it("buys a city and advances to the next player", () => {
    const g = act(
      fresh(),
      { type: "roll", dice: [1, 2] },
      { type: "buy" },
      { type: "end" },
    );
    assert.equal(g.deeds[3].owner, 0);
    assert.equal(g.players[0].money, 1440);
    assert.equal(g.current, 1);
    assert.equal(g.phase, "roll");
  });
  it("pays 200 for crossing Start", () => {
    const g = fresh();
    g.players[0].position = 39;
    const n = act(g, { type: "roll", dice: [1, 3] });
    assert.equal(n.players[0].money, 1700);
    assert.equal(n.players[0].position, 3);
  });
  it("collects tax without a free parking jackpot", () => {
    const g = act(fresh(), { type: "roll", dice: [1, 3] });
    assert.equal(g.players[0].money, 1300);
  });
  it("blocks ending before buying or auctioning", () => {
    const g = act(fresh(), { type: "roll", dice: [1, 2] });
    assert.equal(gameReducer(g, { type: "end" }), g);
  });
  it("awards another roll for doubles", () => {
    const g = fresh();
    g.players[0].position = 18;
    const n = act(g, { type: "roll", dice: [1, 1] }, { type: "end" });
    assert.equal(n.current, 0);
    assert.equal(n.phase, "roll");
  });
  it("sends a player to jail on three consecutive doubles", () => {
    const g = fresh();
    g.doubles = 2;
    const n = act(g, { type: "roll", dice: [3, 3] });
    assert.equal(n.players[0].position, 10);
    assert.equal(n.players[0].jailed, true);
    assert.equal(n.extraRoll, false);
  });
  it("rejects invalid dice", () => {
    const g = fresh();
    assert.equal(gameReducer(g, { type: "roll", dice: [0, 7] }), g);
  });
});
describe("rent and mortgages", () => {
  it("charges rent to the correct owner and doubles base rent for a set", () => {
    const g = fresh();
    own(g, 1, 1);
    own(g, 3, 1);
    assert.equal(rent(g, BOARD[3], 3), 8);
    const n = act(g, { type: "roll", dice: [1, 2] });
    assert.equal(n.players[0].money, 1492);
    assert.equal(n.players[1].money, 1508);
  });
  it("scales rail and utility rent and ignores mortgaged deeds", () => {
    const g = fresh();
    own(g, 5);
    own(g, 15);
    assert.equal(rent(g, BOARD[5], 7), 50);
    assert.equal(rent(g, BOARD[5], 7, true), 100);
    own(g, 12);
    assert.equal(rent(g, BOARD[12], 7), 28);
    own(g, 28);
    assert.equal(rent(g, BOARD[12], 7), 70);
    g.deeds[12].mortgaged = true;
    assert.equal(rent(g, BOARD[12], 7), 0);
  });
  it("mortgages for half value and charges 10% to unmortgage", () => {
    const g = fresh();
    own(g, 3);
    const n = act(
      g,
      { type: "mortgage", space: 3 },
      { type: "mortgage", space: 3 },
    );
    assert.equal(n.players[0].money, 1497);
    assert.equal(n.deeds[3].mortgaged, false);
  });
  it("blocks mortgaging a developed color group", () => {
    const g = fresh();
    own(g, 1, 0, 1);
    own(g, 3);
    assert.equal(gameReducer(g, { type: "mortgage", space: 3 }), g);
  });
});
describe("buildings", () => {
  it("requires a full set and even building and selling", () => {
    const g = fresh();
    own(g, 1);
    assert.equal(gameReducer(g, { type: "build", space: 1 }), g);
    own(g, 3);
    const n = act(g, { type: "build", space: 1 });
    assert.equal(n.deeds[1].houses, 1);
    assert.equal(n.players[0].money, 1450);
    assert.equal(gameReducer(n, { type: "build", space: 1 }), n);
    const x = act(n, { type: "build", space: 3 }, { type: "build", space: 3 });
    assert.equal(gameReducer(x, { type: "sell", space: 1 }), x);
  });
  it("exchanges four houses for a hotel and sells back at half cost", () => {
    const g = fresh();
    own(g, 1, 0, 4);
    own(g, 3, 0, 4);
    const n = act(g, { type: "build", space: 1 });
    assert.equal(n.deeds[1].houses, 5);
    assert.equal(buildingStock(n).houses, 28);
    assert.equal(buildingStock(n).hotels, 11);
    const s = act(n, { type: "sell", space: 1 });
    assert.equal(s.deeds[1].houses, 4);
    assert.equal(s.players[0].money, 1475);
  });
  it("does not build when bank houses are exhausted", () => {
    const g = fresh();
    for (const s of BOARD.filter((s) => s.type === "city").slice(0, 8))
      own(g, s.id, 0, 4);
    own(g, 37);
    own(g, 39);
    assert.equal(buildingStock(g).houses, 0);
    assert.equal(gameReducer(g, { type: "build", space: 37 }), g);
  });
});
describe("jail", () => {
  it("only visits jail when a normal roll lands on it", () => {
    const g = fresh();
    g.players[0].position = 4;
    let n = act(g, { type: "roll", dice: [2, 4] });
    assert.equal(n.players[0].position, 10);
    assert.equal(n.players[0].jailed, false);
    // The other two players land on Income tax, which needs no decision.
    n = act(n, { type: "end" }, { type: "roll", dice: [1, 3] });
    n = act(n, { type: "end" }, { type: "roll", dice: [1, 3] });
    n = act(n, { type: "end" }, { type: "roll", dice: [1, 3] });
    assert.equal(n.players[0].position, 14);
    assert.equal(n.players[0].money, 1500);
  });
  it("jails a player who lands on Go to jail or rolls three doubles", () => {
    const g = fresh();
    g.players[0].position = 24;
    const n = act(g, { type: "roll", dice: [2, 4] });
    assert.equal(n.players[0].position, 10);
    assert.equal(n.players[0].jailed, true);
    const d = act(
      fresh(),
      { type: "roll", dice: [1, 1] },
      { type: "end" },
      { type: "roll", dice: [1, 1] },
      { type: "end" },
      { type: "roll", dice: [2, 2] },
    );
    assert.equal(d.players[0].position, 10);
    assert.equal(d.players[0].jailed, true);
  });
  it("leaves on doubles without an extra roll", () => {
    const g = fresh();
    g.players[0].jailed = true;
    g.players[0].position = 10;
    const n = act(g, { type: "roll", dice: [5, 5] });
    assert.equal(n.players[0].jailed, false);
    assert.equal(n.players[0].position, 20);
    assert.equal(n.extraRoll, false);
  });
  it("waits after unsuccessful first attempt and pays on third", () => {
    const g = fresh();
    g.players[0].jailed = true;
    g.players[0].position = 10;
    const n = act(g, { type: "roll", dice: [1, 3] });
    assert.equal(n.players[0].position, 10);
    assert.equal(n.players[0].jailed, true);
    g.players[0].jailTurns = 2;
    const x = act(g, { type: "roll", dice: [1, 3] });
    assert.equal(x.players[0].position, 14);
    assert.equal(x.players[0].money, 1450);
    assert.equal(x.players[0].jailed, false);
  });
  it("defers movement if mandatory bail creates debt, then moves once settled", () => {
    const g = fresh();
    g.players[0] = {
      ...g.players[0],
      jailed: true,
      jailTurns: 2,
      position: 10,
      money: 25,
    };
    own(g, 1);
    let n = act(g, { type: "roll", dice: [1, 3] });
    assert.equal(n.debt?.amount, 50);
    assert.equal(n.players[0].position, 10);
    n = act(n, { type: "mortgage", space: 1 }, { type: "settle" });
    assert.equal(n.players[0].money, 5);
    assert.equal(n.players[0].position, 14);
    assert.equal(n.phase, "buy");
  });
  it("returns a used escape card to its original deck", () => {
    const g = fresh();
    g.players[0].jailed = true;
    g.players[0].escape = ["c8"];
    g.chance = g.chance.filter((id) => id !== "c8");
    const n = act(g, { type: "escape" });
    assert.equal(n.players[0].jailed, false);
    assert.equal(n.chance.at(-1), "c8");
    assert.equal(n.players[0].escape.length, 0);
  });
});
describe("auctions", () => {
  const T = 1_000;
  const start = () =>
    act(fresh(), { type: "roll", dice: [1, 2] }, { type: "auction", at: T });
  it("takes live bids from anyone and sells when the clock runs out", () => {
    let g = start();
    assert.equal(g.auction?.endsAt, T + AUCTION_OPEN_MS);
    g = act(
      g,
      { type: "bid", player: 2, amount: 10, at: T + 100 },
      { type: "bid", player: 1, amount: 15, at: T + 200 },
    );
    assert.equal(g.auction?.leader, 1);
    assert.equal(g.auction?.endsAt, T + 200 + AUCTION_BID_MS);
    // Too early to close, and a late bid after the hammer is refused.
    assert.equal(gameReducer(g, { type: "auction-close", at: T + 300 }), g);
    const end = T + 200 + AUCTION_BID_MS;
    assert.equal(
      gameReducer(g, { type: "bid", player: 0, amount: 50, at: end }),
      g,
    );
    g = act(g, { type: "auction-close", at: end });
    assert.equal(g.deeds[3].owner, 1);
    assert.equal(g.players[1].money, 1485);
    assert.equal(g.phase, "manage");
  });
  it("leaves a deed at the bank if nobody bids in time", () => {
    const g = act(start(), { type: "auction-close", at: T + AUCTION_OPEN_MS });
    assert.equal(g.deeds[3], undefined);
    assert.equal(g.phase, "manage");
  });
  it("rejects unaffordable, lower and self-raising bids", () => {
    const g = act(start(), {
      type: "bid",
      player: 1,
      amount: 20,
      at: T + 1,
    });
    for (const bid of [
      { player: 0, amount: 1501 },
      { player: 0, amount: 20 },
      { player: 1, amount: 30 },
    ])
      assert.equal(gameReducer(g, { type: "bid", at: T + 2, ...bid }), g);
  });
});
describe("card effects", () => {
  it("executes every card without breaking state or deck conservation", () => {
    for (const c of ALL_CARDS) {
      const g = drawCard(c.id);
      const n = act(g, {
        type: "roll",
        dice: c.id.startsWith("c") ? [2, 4] : [3, 4],
      });
      assert.ok(
        n.logs.some((l) => l.text.includes(c.title)),
        c.id,
      );
      assert.equal(
        n.chance.length +
          n.community.length +
          n.players.reduce((v, p) => v + p.escape.length, 0),
        32,
        c.id,
      );
      assert.ok(
        n.players.every((p) => p.money >= 0),
        c.id,
      );
    }
  });
  it("advances to Start and collects 200", () => {
    const n = act(drawCard("c0"), { type: "roll", dice: [2, 4] });
    assert.equal(n.players[0].position, 0);
    assert.equal(n.players[0].money, 1700);
  });
  it("goes back three spaces and resolves the destination", () => {
    const g = drawCard("c9", 30);
    g.community = ["m7", ...g.community.filter((id) => id !== "m7")];
    const n = act(g, { type: "roll", dice: [2, 4] });
    assert.equal(n.players[0].position, 33);
    assert.ok(
      n.logs.some(
        (l) => l.text.includes("سحب بطاقة") && !l.text.includes("منعطف خاطئ"),
      ),
    );
  });
  it("charges double rent at the next railway", () => {
    const g = drawCard("c4");
    own(g, 15, 1);
    const n = act(g, { type: "roll", dice: [2, 4] });
    assert.equal(n.players[0].position, 15);
    assert.equal(n.players[0].money, 1450);
    assert.equal(n.players[1].money, 1550);
  });
  it("keeps escape cards out of the draw deck", () => {
    const n = act(drawCard("c8"), { type: "roll", dice: [2, 4] });
    assert.deepEqual(n.players[0].escape, ["c8"]);
    assert.equal(n.chance.length, 15);
    assert.ok(!n.chance.includes("c8"));
  });
  it("assesses repairs by houses and hotels", () => {
    const g = drawCard("c11");
    own(g, 1, 0, 2);
    own(g, 3, 0, 5);
    const n = act(g, { type: "roll", dice: [2, 4] });
    assert.equal(n.players[0].money, 1350);
  });
  it("collects birthday cash from all other players", () => {
    const n = act(drawCard("m8"), { type: "roll", dice: [3, 4] });
    assert.deepEqual(
      n.players.map((p) => p.money),
      [1520, 1490, 1490],
    );
  });
});
describe("debt, bankruptcy, trades, and saves", () => {
  it("does not credit unpaid rent, and allows liquidation then settlement", () => {
    const g = fresh();
    g.players[0].money = 1;
    own(g, 3, 1);
    own(g, 1);
    let n = act(g, { type: "roll", dice: [1, 2] });
    assert.equal(n.players[1].money, 1500);
    assert.equal(n.debt?.amount, 4);
    assert.equal(gameReducer(n, { type: "end" }), n);
    n = act(n, { type: "mortgage", space: 1 }, { type: "settle" });
    assert.equal(n.debt, null);
    assert.equal(n.players[0].money, 27);
    assert.equal(n.players[1].money, 1504);
  });
  it("transfers remaining cash and deeds to a creditor and skips bankrupt turns", () => {
    const g = fresh();
    g.players[0].money = 1;
    own(g, 3, 1);
    own(g, 1);
    const n = act(g, { type: "roll", dice: [1, 2] }, { type: "bankrupt" });
    assert.equal(n.players[0].bankrupt, true);
    assert.equal(n.deeds[1].owner, 1);
    assert.equal(n.players[1].money, 1501);
    assert.equal(n.current, 1);
  });
  it("returns properties on bank bankruptcy and declares the winner", () => {
    const g = createGame(["A", "B"]);
    g.players[0].money = 1;
    own(g, 1);
    const n = act(g, { type: "roll", dice: [1, 3] }, { type: "bankrupt" });
    assert.equal(n.phase, "over");
    assert.equal(n.deeds[1], undefined);
    assert.equal(n.players.filter((p) => !p.bankrupt)[0].name, "B");
  });
  it("queues multi-player payments across separate debts", () => {
    const g = drawCard("m8");
    g.players[1].money = 0;
    g.players[2].money = 0;
    own(g, 1, 1);
    own(g, 3, 2);
    let n = act(g, { type: "roll", dice: [3, 4] });
    assert.equal(n.debt?.from, 1);
    n = act(n, { type: "mortgage", space: 1 }, { type: "settle" });
    assert.equal(n.debt?.from, 2);
    n = act(n, { type: "mortgage", space: 3 }, { type: "settle" });
    assert.equal(n.debt, null);
    assert.equal(n.players[0].money, 1520);
  });
  it("requires trade acceptance and prevents other actions while pending", () => {
    const g = fresh();
    own(g, 1);
    own(g, 3, 1);
    let n = act(g, {
      type: "trade",
      trade: {
        from: 0,
        to: 1,
        give: [1],
        take: [3],
        cashGive: 100,
        cashTake: 50,
      },
    });
    assert.equal(n.deeds[1].owner, 0);
    assert.equal(gameReducer(n, { type: "roll", dice: [1, 2] }), n);
    n = act(n, { type: "trade-accept" });
    assert.equal(n.deeds[1].owner, 1);
    assert.equal(n.deeds[3].owner, 0);
    assert.deepEqual(
      n.players.map((p) => p.money),
      [1450, 1550, 1500],
    );
  });
  it("lets the recipient save an offer for later while play continues", () => {
    const g = fresh();
    own(g, 1);
    own(g, 3, 1);
    const offer: Action = {
      type: "trade",
      trade: { from: 0, to: 1, give: [1], take: [3], cashGive: 0, cashTake: 0 },
    };
    let n = act(g, offer, { type: "trade-defer" });
    assert.equal(n.trade?.deferred, true);
    assert.equal(gameReducer(n, { type: "trade-accept" }), n);
    assert.equal(gameReducer(n, offer), n, "one offer at a time");
    n = act(n, { type: "roll", dice: [2, 2] });
    assert.equal(n.players[0].position, 4);
    n = act(n, { type: "trade-review" });
    assert.equal(n.trade?.deferred, false);
    assert.equal(gameReducer(n, { type: "end" }), n, "reviewing pauses play");
    n = act(n, { type: "trade-accept" });
    assert.equal(n.trade, null);
    assert.equal(n.deeds[1].owner, 1);
    assert.equal(n.deeds[3].owner, 0);
  });
  it("cannot accept a saved offer that is no longer valid", () => {
    const g = fresh();
    own(g, 1);
    let n = act(
      g,
      {
        type: "trade",
        trade: {
          from: 0,
          to: 1,
          give: [1],
          take: [],
          cashGive: 0,
          cashTake: 0,
        },
      },
      { type: "trade-defer" },
    );
    n.deeds[1].mortgaged = true;
    n = act(n, { type: "trade-review" });
    assert.equal(gameReducer(n, { type: "trade-accept" }), n);
    assert.equal(act(n, { type: "trade-reject" }).trade, null);
  });
  it("rejects developed, mortgaged, duplicate and unaffordable trades", () => {
    const g = fresh();
    own(g, 1, 0, 1);
    own(g, 3);
    for (const trade of [
      { from: 0, to: 1, give: [1], take: [], cashGive: 0, cashTake: 0 },
      { from: 0, to: 1, give: [], take: [], cashGive: 2000, cashTake: 0 },
      { from: 0, to: 1, give: [3, 3], take: [], cashGive: 0, cashTake: 0 },
    ])
      assert.equal(gameReducer(g, { type: "trade", trade }), g);
  });
  it("resumes the same state after a JSON save round trip", () => {
    const g = act(fresh(), { type: "roll", dice: [1, 2] }, { type: "buy" });
    const saved = JSON.parse(JSON.stringify(g));
    assert.deepEqual(act(saved, { type: "end" }), act(g, { type: "end" }));
  });
});

describe("purchase funding and deterministic utility dice", () => {
  it("lets a player mortgage assets to fund a pending purchase", () => {
    const g = fresh();
    own(g, 39);
    g.players[0].money = 0;
    const n = act(
      g,
      { type: "roll", dice: [1, 2] },
      { type: "mortgage", space: 39 },
      { type: "buy" },
    );
    assert.equal(n.deeds[39].mortgaged, true);
    assert.equal(n.deeds[3].owner, 0);
    assert.equal(n.players[0].money, 140);
  });
  it("uses an independent supplied roll for a utility card and replays identically", () => {
    const g = drawCard("c6");
    own(g, 12, 1);
    const action: Action = { type: "roll", dice: [2, 4], utilityDice: [5, 6] };
    const n = gameReducer(g, action);
    assert.equal(n.players[0].position, 12);
    assert.equal(n.players[0].money, 1390);
    assert.equal(n.players[1].money, 1610);
    assert.deepEqual(n, gameReducer(g, action));
  });
});

describe("configurable house rules", () => {
  it("uses starting cash, salary and bail selected before the game", () => {
    const g = createGame(["A", "B"], {
      ...DEFAULT_SETTINGS,
      startingCash: 2500,
      startSalary: 400,
      jailBail: 100,
    });
    assert.equal(g.players[0].money, 2500);
    g.players[0].position = 39;
    const n = act(g, { type: "roll", dice: [1, 3] });
    assert.equal(n.players[0].money, 2900);
    g.players[0].jailed = true;
    const b = act(g, { type: "bail" });
    assert.equal(b.players[0].money, 2400);
  });
  it("allows hosts to disable rent collection while jailed", () => {
    const g = fresh();
    own(g, 3, 1);
    g.players[1].jailed = true;
    g.settings = { ...DEFAULT_SETTINGS, rentInJail: false };
    const n = act(g, { type: "roll", dice: [1, 2] });
    assert.equal(n.players[0].money, 1500);
    assert.equal(n.players[1].money, 1500);
    assert.equal(rent({ ...g, settings: DEFAULT_SETTINGS }, BOARD[3], 3), 4);
  });
  it("disables mortgages, auctions, trading and construction in the engine", () => {
    const g = fresh();
    g.settings = {
      ...DEFAULT_SETTINGS,
      mortgages: false,
      auctions: false,
      trading: false,
      buildings: false,
    };
    own(g, 1);
    own(g, 3);
    assert.equal(gameReducer(g, { type: "mortgage", space: 1 }), g);
    assert.equal(gameReducer(g, { type: "build", space: 1 }), g);
    assert.equal(
      gameReducer(g, {
        type: "trade",
        trade: {
          from: 0,
          to: 1,
          give: [1],
          take: [],
          cashGive: 0,
          cashTake: 0,
        },
      }),
      g,
    );
    g.players[0].position = 2;
    const n = act(
      g,
      { type: "roll", dice: [1, 3] },
      { type: "auction", at: 0 },
    );
    assert.equal(n.auction, null);
    assert.equal(n.phase, "manage");
    assert.equal(n.deeds[6], undefined);
  });
  it("can disable tax spaces while keeping card fees", () => {
    const g = fresh();
    g.settings = { ...DEFAULT_SETTINGS, taxes: false };
    const n = act(g, { type: "roll", dice: [1, 3] });
    assert.equal(n.players[0].money, 1500);
    const c = drawCard("c12");
    c.settings = g.settings;
    assert.equal(act(c, { type: "roll", dice: [2, 4] }).players[0].money, 1485);
  });
  it("collects paid taxes in Free Parking and awards the pot only on landing there", () => {
    const g = fresh();
    g.settings = { ...DEFAULT_SETTINGS, freeParkingPot: true };
    let n = act(g, { type: "roll", dice: [1, 3] });
    assert.equal(n.parkingPot, 200);
    assert.equal(n.players[0].money, 1300);
    n.phase = "roll";
    n.players[0].position = 16;
    n = act(n, { type: "roll", dice: [1, 3] });
    assert.equal(n.players[0].money, 1500);
    assert.equal(n.parkingPot, 0);
  });
  it("adds a tax debt to the pot only after it has been paid", () => {
    const g = fresh();
    g.settings = { ...DEFAULT_SETTINGS, freeParkingPot: true };
    g.players[0].money = 100;
    own(g, 39);
    let n = act(g, { type: "roll", dice: [1, 3] });
    assert.equal(n.parkingPot, 0);
    assert.equal(n.debt?.amount, 200);
    n = act(n, { type: "mortgage", space: 39 }, { type: "settle" });
    assert.equal(n.parkingPot, 200);
    assert.equal(n.debt, null);
  });
  it("transfers a bankrupt owner’s railway and utility without invalid cash values", () => {
    const g = fresh();
    g.players[0].money = 1;
    own(g, 3, 1);
    own(g, 5);
    own(g, 12);
    const n = act(g, { type: "roll", dice: [1, 2] }, { type: "bankrupt" });
    assert.equal(n.players[1].money, 1501);
    assert.equal(n.deeds[5].owner, 1);
    assert.equal(n.deeds[12].owner, 1);
  });
});
