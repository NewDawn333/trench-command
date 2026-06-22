import type { Sector, Side } from "../types";
import { CONFIG, LAYOUT } from "../types";
import {
  emplacementLineYForSector,
  nmlBounds,
  platoonLineY,
  trenchLineY,
} from "../mission/MissionLayout";

export type SectorStripAction = { type: "callup"; sector: number } | { type: "mg"; sector: number };

export function sectorX(index: number): number {
  return (index / CONFIG.sectorCount) * CONFIG.mapWidth;
}

export function sectorWidth(): number {
  return CONFIG.mapWidth / CONFIG.sectorCount;
}

export function sectorCenterX(index: number): number {
  return sectorX(index) + sectorWidth() / 2;
}

export function clampSector(index: number): number {
  return Math.max(0, Math.min(CONFIG.sectorCount - 1, index));
}

export function sectorFromX(x: number): number {
  return clampSector(Math.floor((x / CONFIG.mapWidth) * CONFIG.sectorCount));
}

function stripInnerRect(sector: number): { x: number; w: number } {
  return { x: sectorX(sector) + 4, w: sectorWidth() - 8 };
}

export function callUpButtonRect(sector: number): { x: number; y: number; w: number; h: number } {
  const inner = stripInnerRect(sector);
  return { x: inner.x, y: LAYOUT.callUpY, w: inner.w, h: LAYOUT.callUpRowH };
}

export function mgButtonRect(sector: number): { x: number; y: number; w: number; h: number } {
  const inner = stripInnerRect(sector);
  return { x: inner.x, y: LAYOUT.callUpY + LAYOUT.callUpRowH, w: inner.w, h: LAYOUT.mgButtonRowH };
}

export function sectorStripAction(x: number, y: number): SectorStripAction | null {
  if (y < LAYOUT.callUpY || y > LAYOUT.callUpY + LAYOUT.callUpRowH + LAYOUT.mgButtonRowH) return null;
  const sector = sectorFromX(x);
  if (y < LAYOUT.callUpY + LAYOUT.callUpRowH) return { type: "callup", sector };
  return { type: "mg", sector };
}

/** @deprecated use sectorStripAction */
export function callUpSectorFromPoint(x: number, y: number): number | null {
  const action = sectorStripAction(x, y);
  return action?.type === "callup" ? action.sector : null;
}

export function isOnSectorStrip(y: number): boolean {
  return y >= LAYOUT.callUpY && y <= LAYOUT.callUpY + LAYOUT.callUpRowH + LAYOUT.mgButtonRowH;
}

export function isInNml(y: number): boolean {
  const { top, bottom } = nmlBounds();
  return y >= top && y <= bottom;
}

/** Wide tap bands for touch-friendly movement (player trench, staging, enemy trench). */
export type MoveTapZone = "player_trench" | "player_staging" | "enemy_trench" | "none";

export function moveTapZoneAt(x: number, y: number): MoveTapZone {
  const sector = sectorFromX(x);
  const playerY = trenchLineY("player", sector);
  const enemyY = trenchLineY("enemy", sector);
  if (y >= playerY - 40 && y <= playerY + 40) return "player_trench";
  if (y >= LAYOUT.playerStagingY - 48 && y <= LAYOUT.playerStagingY + 52) return "player_staging";
  if (y >= enemyY - 40 && y <= enemyY + 40) return "enemy_trench";
  return "none";
}

export function createSectors(): Sector[] {
  const w = sectorWidth();
  return Array.from({ length: CONFIG.sectorCount }, (_, i) => ({
    index: i,
    x: i * w,
    width: w,
    controller: "enemy" as const,
    captureProgress: 0,
    momentumGranted: false,
  }));
}

export function stagingY(side: Side): number {
  return side === "player" ? LAYOUT.playerStagingY : LAYOUT.enemyReserveY + 30;
}

export function frontTrenchY(side: Side, sector = 3): number {
  return trenchLineY(side, sector);
}

/** Troop line — slightly back from the parapet (easier to tap vs MGs). */
export function platoonFrontY(side: Side, sector = 3): number {
  return platoonLineY(side, sector);
}

/** MG line — slightly forward toward no man's land. */
export function emplacementLineY(side: Side, sector = 3): number {
  return emplacementLineYForSector(side, sector);
}

export function enemyTrenchY(sector = 3): number {
  return trenchLineY("enemy", sector);
}

export function randomInSector(index: number, margin = 0.15): number {
  const x0 = sectorX(index) + sectorWidth() * margin;
  const x1 = sectorX(index) + sectorWidth() * (1 - margin);
  return x0 + Math.random() * (x1 - x0);
}

export function spreadXInSector(index: number, slot: number, total: number): number {
  const margin = 0.12;
  const x0 = sectorX(index) + sectorWidth() * margin;
  const x1 = sectorX(index) + sectorWidth() * (1 - margin);
  const t = total <= 1 ? 0.5 : slot / (total - 1);
  return x0 + t * (x1 - x0);
}
