import type { GameState } from "../game/Game";
import type { AIDifficulty } from "../app/Difficulty";
import { sampleCasualtyHistory, type MissionBaseline } from "../app/MissionStats";
import { CONFIG } from "../types";

/** Tactical mission result — shared by skirmish and campaign company fights. */
export type MissionResult = "victory" | "defeat" | "retreat";

export type MissionMode = "skirmish" | "campaign";

export interface MissionOutcome {
  result: MissionResult;
  mode: MissionMode;
  /** Remaining rifle strength (campaign maps this to company strength). */
  companyStrengthAfter: number;
  /** Player platoons destroyed or routing. */
  platoonsLost: number;
  sectorsCaptured: number;
  durationSec: number;
  playerCasualties: number;
  enemyCasualties: number;
  shellsFired: number;
  assaultsOrdered: number;
  aiDifficulty: AIDifficulty;
}

function playerStrengthRemaining(game: GameState): number {
  return game.platoons
    .filter((p) => p.side === "player" && p.strength > 0)
    .reduce((a, p) => a + p.strength, 0);
}

function playerPlatoonsLost(game: GameState): number {
  return game.platoons.filter(
    (p) => p.side === "player" && (p.strength <= 0 || p.state === "routing"),
  ).length;
}

export function buildMissionOutcome(
  game: GameState,
  baseline: MissionBaseline,
  result: MissionResult,
  mode: MissionMode = "skirmish",
): MissionOutcome {
  const ammoNow = game.playerBatteries.reduce((a, b) => a + b.ammo, 0);
  sampleCasualtyHistory(game.stats, game.time);

  return {
    result,
    mode,
    companyStrengthAfter: Math.round(playerStrengthRemaining(game)),
    platoonsLost: playerPlatoonsLost(game),
    sectorsCaptured: game.sectors.filter((s) => s.controller === "player").length,
    durationSec: game.time,
    playerCasualties: Math.round(game.stats.playerCasualties),
    enemyCasualties: Math.round(game.stats.enemyCasualties),
    shellsFired: Math.max(0, baseline.playerAmmo - ammoNow),
    assaultsOrdered: game.stats.assaultsOrdered,
    aiDifficulty: game.aiDifficulty,
  };
}

/** Skirmish default — one company worth of riflemen at full strength. */
export function skirmishCompanyMaxStrength(): number {
  return CONFIG.sectorCount * CONFIG.platoonSize;
}
