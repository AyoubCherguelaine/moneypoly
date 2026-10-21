"use client";

import { DEFAULT_SETTINGS, type GameSettings } from "@/lib/settings";

export function Rules({
  settings = DEFAULT_SETTINGS,
}: {
  settings?: GameSettings;
}) {
  return (
    <div className="rules-content">
      <p className="rules-intro">
        Buy a city. Build a little. Dream bigger.
        <br />
        The last player standing wins.
      </p>
      {[
        [
          "01",
          "Make yourself at home",
          `Play with 2–6 people in a shared session or on one device. Everyone starts with ${settings.startingCash} DH. Take turns rolling two dice, moving clockwise, and following each space’s instructions. Collect ${settings.startSalary} DH when passing or landing on Start.`,
        ],
        [
          "02",
          "Build your little empire",
          `Buy an available property at its listed price. ${settings.auctions ? "Decline and it goes to a live auction: everyone bids at once, each bid restarts a 5-second clock, and the highest bid when it runs out wins." : "Auctions are off: declined properties stay with the bank."} Landing on someone else’s property means paying rent.`,
        ],
        [
          "03",
          "A full set opens doors",
          `Own all cities in a color to double their base rent. ${settings.buildings ? "Build evenly: up to 4 houses, then a hotel. A hotel replaces 4 houses. There are 32 houses and 12 hotels. Sell evenly at half cost." : "Houses and hotels are disabled."} Colors combine cities for game balance rather than geography.`,
        ],
        [
          "04",
          "Luck has a place at the table",
          "Chance and Community have 16 original cards each. Draws resolve automatically, including movement, payments, repairs, and jail. Used cards go to the bottom; keep free jail cards until needed. Rolling doubles earns another roll. Three consecutive doubles send you to jail.",
        ],
        [
          "05",
          "A brief change of scenery",
          `Leave jail by paying ${settings.jailBail} DH before rolling, using a free card, or rolling doubles. Doubles release you without an extra roll. After three failed attempts, pay ${settings.jailBail} DH and move with that roll. ${settings.rentInJail ? "Owners still collect rent in jail." : "Owners cannot collect rent while jailed."} ${settings.freeParkingPot ? "Paid taxes form a Free Parking pot, collected by the next visitor." : "Free Parking has no jackpot."} ${settings.taxes ? "Tax spaces collect the listed amount." : "Taxes are off. Card fees still apply."}`,
        ],
        [
          "06",
          "Everything is negotiable",
          `${settings.trading ? "Trade cash and eligible properties with another player. Both players must agree." : "Player trades are disabled."} Sell all buildings in a color before trading or mortgaging its cities. ${settings.mortgages ? "Mortgages return half the purchase price; repay it plus 10% to lift one. Mortgaged properties earn no rent." : "Mortgages are disabled."}`,
        ],
        [
          "07",
          "When the dirhams run low",
          "If you owe more than you have, sell buildings, mortgage properties, or trade, then settle the debt. If you cannot, declare bankruptcy. A player creditor receives your cash, properties, and free jail cards; buildings are liquidated at half cost. Bank debts return properties to the bank for future purchase. Inherited mortgages remain in place without an immediate transfer fee. The last solvent player wins.",
        ],
      ].map(([n, title, text]) => (
        <section key={n}>
          <span>{n}</span>
          <div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        </section>
      ))}
      <p className="rules-note">
        Manypoly is an independent, original property game inspired by the
        classic format. All amounts are fictional dirhams (DH). Shared games
        need a connection to the same Manypoly server. Your seat is remembered
        in this browser without an account. One-device games save locally.
      </p>
    </div>
  );
}
