import type { FixedEmplacement, Side } from "../types";
import { LAYOUT } from "../types";
import { sectorCenterX } from "./battlefield";
import { layoutEmplacements } from "./layout";

let nextEmpId = 1;

export function createEmplacement(side: Side, sector: number, type: "mg" | "pillbox"): FixedEmplacement {
  const y = side === "player" ? LAYOUT.playerTrenchY - 8 : LAYOUT.enemyTrenchY + 8;
  const arcStart = side === "player" ? 250 : 70;
  const arcEnd = side === "player" ? 290 : 110;
  return {
    id: `${side}-emp-${nextEmpId++}`,
    side,
    sector,
    x: sectorCenterX(sector),
    y,
    type,
    arcStart,
    arcEnd,
    fireCooldown: 0,
  };
}

export function placeEmplacementInSector(
  emplacements: FixedEmplacement[],
  side: Side,
  sector: number,
  type: "mg" | "pillbox",
): FixedEmplacement | null {
  if (emplacements.some((e) => e.side === side && e.sector === sector && e.type === type)) {
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
