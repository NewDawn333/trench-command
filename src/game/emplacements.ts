import type { FixedEmplacement, Side } from "../types";
import { emplacementLineY } from "./battlefield";
import { layoutEmplacements } from "./layout";
import { MAX_MG_PER_SECTOR, MG_MOVE_COOLDOWN_SEC } from "./ResourceConfig";

let nextEmpId = 1;

export function createEmplacement(side: Side, sector: number, type: "mg" | "pillbox"): FixedEmplacement {
  const arcStart = side === "player" ? 250 : 70;
  const arcEnd = side === "player" ? 290 : 110;
  return {
    id: `${side}-emp-${nextEmpId++}`,
    side,
    sector,
    x: 0,
    y: emplacementLineY(side, sector),
    type,
    arcStart,
    arcEnd,
    fireCooldown: 0,
    moveCooldown: 0,
  };
}

export function countMgsInSector(emplacements: FixedEmplacement[], side: Side, sector: number): number {
  return emplacements.filter((e) => e.side === side && e.sector === sector && e.type === "mg").length;
}

export function canPlaceMgInSector(emplacements: FixedEmplacement[], side: Side, sector: number): boolean {
  return countMgsInSector(emplacements, side, sector) < MAX_MG_PER_SECTOR;
}

export function placeEmplacementInSector(
  emplacements: FixedEmplacement[],
  side: Side,
  sector: number,
  type: "mg" | "pillbox",
): FixedEmplacement | null {
  if (type === "mg") {
    if (!canPlaceMgInSector(emplacements, side, sector)) return null;
  } else if (emplacements.some((e) => e.side === side && e.sector === sector && e.type === "pillbox")) {
    return null;
  }

  const emp = createEmplacement(side, sector, type);
  emplacements.push(emp);
  layoutEmplacements(emplacements);
  return emp;
}

export function destroyEmplacementsInSector(
  emplacements: FixedEmplacement[],
  sector: number,
  side: Side,
): void {
  for (let i = emplacements.length - 1; i >= 0; i--) {
    const e = emplacements[i];
    if (e.sector === sector && e.side === side) emplacements.splice(i, 1);
  }
}

export function seedEnemyEmplacements(): FixedEmplacement[] {
  const out: FixedEmplacement[] = [];
  for (const s of [1, 3, 5, 7]) out.push(createEmplacement("enemy", s, "mg"));
  out.push(createEmplacement("enemy", 4, "pillbox"));
  layoutEmplacements(out);
  return out;
}

export function seedPlayerEmplacements(): FixedEmplacement[] {
  return [];
}

const MG_HIT_RADIUS = 22;
const MG_Y_BAND = 22;

export function playerMgAtPoint(emplacements: FixedEmplacement[], x: number, y: number): FixedEmplacement | null {
  const mgLine = emplacementLineY("player");
  if (Math.abs(y - mgLine) > MG_Y_BAND) return null;

  let best: FixedEmplacement | null = null;
  let bestDist = Infinity;
  for (const e of emplacements) {
    if (e.side !== "player" || e.type !== "mg") continue;
    const dist = Math.hypot(e.x - x, e.y - y);
    if (dist < MG_HIT_RADIUS && dist < bestDist) {
      best = e;
      bestDist = dist;
    }
  }
  return best;
}

export function movePlayerMgToSector(emplacements: FixedEmplacement[], mgId: string, sector: number): boolean {
  const emp = emplacements.find((e) => e.id === mgId);
  if (!emp || emp.side !== "player" || emp.type !== "mg") return false;
  if (emp.sector === sector) return false;
  if (emp.moveCooldown > 0) return false;
  if (!canPlaceMgInSector(emplacements, "player", sector)) return false;

  emp.sector = sector;
  emp.moveCooldown = MG_MOVE_COOLDOWN_SEC;
  layoutEmplacements(emplacements);
  return true;
}

export function tickEmplacementMoveCooldown(emplacements: FixedEmplacement[], dt: number): void {
  for (const e of emplacements) {
    if (e.moveCooldown > 0) e.moveCooldown = Math.max(0, e.moveCooldown - dt);
  }
}
