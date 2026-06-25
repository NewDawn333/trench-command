import type { FixedEmplacement, Platoon, Sector } from "../types";
import { CONFIG } from "../types";
import { artyZoneForSector } from "./combat";
import { isInvader, platoonsInSector, totalStrength } from "./platoons";

/** Pick the sector where player staging / weak fronts offer the best arty target. */
export function pickEnemyArtyZone(
  platoons: Platoon[],
  sectors: Sector[],
  _emplacements: FixedEmplacement[],
): { x: number; y: number; w: number; h: number } | null {
  let bestSector = -1;
  let bestScore = 0;

  for (let s = 0; s < CONFIG.sectorCount; s++) {
    const staging = totalStrength(platoonsInSector(platoons, "player", s, ["staging"]));
    const front = totalStrength(platoonsInSector(platoons, "player", s, ["front"]));
    const weakFront = Math.max(0, CONFIG.platoonSize * 2 - front);
    const contested = sectors[s].controller === "contested" ? 25 : 0;
    const playerHeld = sectors[s].controller === "player" ? 15 : 0;
    const score = staging * 1.4 + weakFront * 0.9 + contested + playerHeld;

    if (score > bestScore) {
      bestScore = score;
      bestSector = s;
    }
  }

  if (bestSector < 0 || bestScore < CONFIG.platoonSize * 0.5) return null;
  return artyZoneForSector(bestSector);
}

export function sectorHasEnemyPillbox(emplacements: FixedEmplacement[], sector: number): boolean {
  return emplacements.some((e) => e.side === "enemy" && e.sector === sector && e.type === "pillbox");
}

export function pickMassSector(
  platoons: Platoon[],
  sectors: Sector[],
  emplacements: FixedEmplacement[],
  pillboxPenalty: number,
): number {
  let best = Math.floor(Math.random() * CONFIG.sectorCount);
  let bestScore = 0;
  for (let s = 0; s < CONFIG.sectorCount; s++) {
    const weak = platoonsInSector(platoons, "player", s, ["front"]).reduce((a, p) => a + p.strength, 0);
    const beachhead = platoonsInSector(platoons, "enemy", s, ["enemy_trench"]).filter(isInvader).length;
    let score =
      (120 - weak) +
      (sectors[s].controller === "player" ? 40 : 0) +
      (sectors[s].controller === "contested" ? 28 : 0) +
      beachhead * 35 +
      Math.random() * 20;
    if (sectorHasEnemyPillbox(emplacements, s)) score /= pillboxPenalty;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}
