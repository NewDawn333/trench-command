import type { GameState } from "../game/Game";
import type { Side } from "../types";
import type { MissionOutcome, MissionResult } from "../mission/MissionOutcome";
import { buildMissionOutcome } from "../mission/MissionOutcome";

export interface MissionBaseline {
  playerAmmo: number;
}

export interface CasualtySample {
  time: number;
  player: number;
  enemy: number;
}

export interface MissionStats {
  assaultsOrdered: number;
  /** Cumulative men lost (strength points), tracked at damage time. */
  playerCasualties: number;
  enemyCasualties: number;
  history: CasualtySample[];
  lastSampleTime: number;
}

/** @deprecated Use MissionOutcome */
export type MissionSummary = MissionOutcome;

const HISTORY_SAMPLE_SEC = 0.5;

export function createMissionStats(): MissionStats {
  return {
    assaultsOrdered: 0,
    playerCasualties: 0,
    enemyCasualties: 0,
    history: [{ time: 0, player: 0, enemy: 0 }],
    lastSampleTime: 0,
  };
}

/** Record actual strength loss when damage is applied (ignores call-ups / reinforcements). */
export function recordCasualtyDamage(stats: MissionStats, platoon: { side: Side; strength: number }, amount: number): void {
  if (amount <= 0 || platoon.strength <= 0) return;
  const loss = Math.min(amount, platoon.strength);
  if (platoon.side === "player") stats.playerCasualties += loss;
  else stats.enemyCasualties += loss;
}

export function sampleCasualtyHistory(stats: MissionStats, time: number): void {
  if (time - stats.lastSampleTime < HISTORY_SAMPLE_SEC) return;
  stats.lastSampleTime = time;
  stats.history.push({
    time,
    player: Math.round(stats.playerCasualties),
    enemy: Math.round(stats.enemyCasualties),
  });
}

export function captureBaseline(game: GameState): MissionBaseline {
  return {
    playerAmmo: game.playerBatteries.reduce((a, b) => a + b.ammo, 0),
  };
}

/** @deprecated Use buildMissionOutcome */
export function buildMissionSummary(
  game: GameState,
  baseline: MissionBaseline,
  outcome: MissionResult,
): MissionOutcome {
  return buildMissionOutcome(game, baseline, outcome, "skirmish");
}

export { buildMissionOutcome };
