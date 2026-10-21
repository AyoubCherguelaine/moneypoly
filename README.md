# Manypoly

A Next.js property trading game for 2–6 friends. Play together through a session URL, each on their own device, or use the original one-device mode. The 40-space board features 22 Arabic cities, bilingual city names, and fictional dirhams (DH).

## Run locally

Requires **Node.js 22.13+** and npm. Shared sessions use Node’s built-in SQLite module.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Enter a username and select **Create a session**. Share the invitation link, let friends join with their usernames, choose the rules, and start with 2–6 players. No accounts, emails, or passwords are required.

For separate devices, everyone must reach the same server. On the same Wi-Fi, invitation links automatically use an available LAN address when the host opens localhost. You can also open the computer’s network URL shown by your network settings (for example `http://192.168.1.10:3000`). Keep the Next.js server running. Different devices should use the invitation link; localhost on a phone refers to the phone itself.

The host can change these settings before starting:

| Rule | Default |
| --- | --- |
| Player limit | 6 (choose 2–6) |
| Property auctions | Enabled |
| Collect rent while jailed | Enabled |
| Mortgages | Enabled |
| Player trades | Enabled |
| Houses and hotels | Enabled |
| Income and luxury tax spaces | Enabled |
| Taxes collected in a Free Parking pot | Disabled |
| Starting balance | 1,500 DH (1,000 / 1,500 / 2,000 / 2,500) |
| Salary for passing Start | 200 DH (100 / 200 / 400) |
| Jail release payment | 50 DH (50 / 100 / 200) |

Settings lock when the host starts the game. They affect the server’s rules engine, not just the display. Disabled tax spaces do not disable fees on action cards. The Free Parking option collects actual tax payments and awards the pot on landing there. After starting, the host can confirm returning **everyone** to the lobby to change the rules or begin again with the same seats.

## Sessions and reconnection

- `/` creates a room or opens an invitation link/code.
- `/session/<code>` shows the lobby or the shared game. An optional `?username=...` prefills the join form; a username in a URL alone never grants a player’s existing seat.
- A private HttpOnly cookie remembers each player’s seat in that browser for 30 days. Refreshing reconnects; duplicate usernames are rejected. Use another browser/profile or a separate device for another player.
- Players may leave the lobby; the next player becomes host if the host leaves. The host may remove guests before starting.
- A running game reserves its seats. Reconnect using the same browser. Clearing cookies or switching devices does not reclaim a seat just by typing its username. There is no account recovery or automatic turn timer.
- All moves, random dice rolls, permissions, and settings are validated by the server. Players cannot act for one another, accept their own trade offers, or supply their own dice.
- Clients refresh shared state approximately every 1.1 seconds, show connection errors, and reconnect automatically. Session revisions reject stale or simultaneous moves.
- Sessions persist in `.data/sessions.sqlite`, including games, auctions, trades, debts, and lobby settings. SQLite transactions protect updates across connections. Browser storage still holds only one-device saves.

The `/local` page preserves the original pass-and-play mode with automatic browser saves.

## Production and data storage

```bash
npm test         # Game, configurable rules, sessions, HTTP boundary, persistence
npm run lint     # ESLint
npm run build    # Production build and TypeScript checks
npm start        # Serve the production build
```

Run a Node.js server with a writable, persistent data directory. Keep the whole `.data` directory when restarting or moving the server. This version uses a shared local SQLite file, so separate deployment instances need access to the same database; it is intended for a single persistent server rather than ephemeral serverless instances.

Optional environment variables:

```bash
MANYPOLY_DATA_DIR=/path/to/persistent/data
MANYPOLY_PUBLIC_URL=https://your-game.example
```

`MANYPOLY_PUBLIC_URL` sets the base URL for invitations, useful behind a reverse proxy. In production, serve over HTTPS; cookies use the Secure flag when the request is HTTPS or the proxy sets `x-forwarded-proto: https`.

## Game content

All 18 requested cities are included, plus Beirut, Baghdad, Muscat, and Doha to complete 22 city properties. There are 28 interactive title deeds (22 cities, four railways, and two utilities), 16 original Chance cards, and 16 original Community cards. Every card effect is implemented. Kept jail cards leave their draw deck until used.

The engine includes buying, auctions, rent, color sets, even development, finite bank stock, mortgages, accepted trades, doubles, jail, debt liquidation, bankruptcy, and a last-player-standing winner. The interface includes property portfolios, a complete card library, rules matching the active settings, and optional dice sound.

Colors group cities for game balance rather than geography. Buildings liquidate at half cost on bankruptcy; a player creditor receives the proceeds, cash, deeds, and kept jail cards. Inherited mortgages remain without an immediate transfer fee. Bank bankruptcy returns deeds for future landing purchases. Mortgaged or developed properties cannot be traded.

There are no AI opponents. The interface and card instructions use English with Arabic board names and bilingual rule settings. Fonts have system fallbacks when Google Fonts is unavailable.

## Source map

- `app/`: routes, metadata, icon, and responsive styles.
- `app/api/sessions/`: create, read, join, configure, start, and play session endpoints.
- `components/session-*.tsx`: shared session home, lobby, connection lifecycle, and settings.
- `components/manypoly.tsx`: shared/local game controller and turn controls.
- `components/`: board, cards, deeds, trades, shared controls, and active rules.
- `lib/board.ts`: all cities, prices, rents, and cards.
- `lib/settings.ts`: supported rules and validation.
- `lib/game.ts`: serializable state and deterministic rules reducer.
- `lib/server/`: persistent SQLite session store, identity, action authorization, and HTTP handling.
- `lib/*.test.ts`: game, house rules, sessions, HTTP checks, concurrency, and persistence tests.

Manypoly is an independent game with original names and card copy inspired by the classic property trading format.
