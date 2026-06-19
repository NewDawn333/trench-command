import type { FixedEmplacement, Platoon, Side } from "../types";
import { CONFIG } from "../types";
import { frontTrenchY, sectorFromX, sectorWidth, sectorX, stagingY } from "./battlefield";
import { opponentTrenchY } from "./platoons";

export const PLATOON_SLOT_W = 34;
export const EMP_SLOT_W = 26;

/** World X for a slot in a sector row (side-by-side, centered). */
export function slotXInSector(sector: number, index: number, total: number, slotW: number): number {
  const sw = sectorWidth();
  const x0 = sectorX(sector);
  const used = total * slotW;
  const start = x0 + (sw - used) / 2 + slotW / 2;
  return start + index * slotW;
}

export function effectiveSector(p: Platoon): number {
  return sectorFromX(p.x);
}

type PlatoonRow = "front" | "staging" | "invader" | "crossing";

function platoonRow(p: Platoon): PlatoonRow | null {
  if (p.state === "crossing") return "crossing";
  if (p.state === "front") return "front";
  if (p.state === "staging") return "staging";
  if (p.state === "enemy_trench") return "invader";
  return null;
}

function rowY(p: Platoon, row: PlatoonRow): number {
  switch (row) {
    case "front":
      return frontTrenchY(p.side);
    case "staging":
      return stagingY(p.side);
    case "invader":
      return opponentTrenchY(p.side);
    case "crossing":
      return p.y;
  }
}

function layoutRow(platoons: Platoon[], side: Side, sector: number, row: PlatoonRow): void {
  const group = platoons
    .filter((p) => p.side === side && p.sector === sector && platoonRow(p) === row && p.strength > 0 && p.state !== "routing")
    .sort((a, b) => a.id.localeCompare(b.id));

  group.forEach((p, i) => {
    const x = slotXInSector(sector, i, group.length, PLATOON_SLOT_W);
    p.targetX = x;
    if (row !== "crossing") {
      p.targetY = rowY(p, row);
    }
  });
}

/** Assign side-by-side slot targets within each sector row (movement animates to targets). */
export function layoutAllPlatoons(platoons: Platoon[]): void {
  for (let s = 0; s < CONFIG.sectorCount; s++) {
    for (const side of ["player", "enemy"] as Side[]) {
      for (const row of ["front", "staging", "invader", "crossing"] as PlatoonRow[]) {
        layoutRow(platoons, side, s, row);
      }
    }
  }
}

/** Spread emplacements side-by-side within each sector trench line. */
export function layoutEmplacements(emplacements: FixedEmplacement[]): void {
  for (let s = 0; s < CONFIG.sectorCount; s++) {
    for (const side of ["player", "enemy"] as Side[]) {
      const group = emplacements
        .filter((e) => e.side === side && e.sector === s)
        .sort((a, b) => a.id.localeCompare(b.id));
      group.forEach((e, i) => {
        e.x = slotXInSector(s, i, group.length, EMP_SLOT_W);
      });
    }
  }
}

/** Lateral rifle range along trench (same scale as NML rifle depth). */
export function lateralTrenchRange(): number {
  return sectorWidth() / 5;
}

export function inLateralTrenchRange(ax: number, bx: number): boolean {
  return Math.abs(ax - bx) <= lateralTrenchRange();
}

export function adjacentSectorsByX(ax: number, bx: number): boolean {
  return Math.abs(sectorFromX(ax) - sectorFromX(bx)) <= 1;
}
