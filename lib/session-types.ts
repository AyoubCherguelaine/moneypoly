import type { Game } from "./game";
import type { GameSettings } from "./settings";
export type SessionMember = { id: string; name: string; host: boolean };
export type SessionView = {
  invitationUrl?: string;
  id: string;
  revision: number;
  /** Server clock when this view was made, to line up auction countdowns. */
  serverNow: number;
  maxPlayers: number;
  settings: GameSettings;
  members: SessionMember[];
  game: Game | null;
  viewer: { id: string; index: number; host: boolean } | null;
};
export type SessionCommand =
  | { type: "join"; username: string }
  | {
      type: "settings";
      settings: GameSettings;
      maxPlayers: number;
      revision: number;
    }
  | { type: "start" | "reset" | "leave"; revision: number }
  | { type: "kick"; memberId: string; revision: number }
  | { type: "action"; action: unknown; revision: number };
