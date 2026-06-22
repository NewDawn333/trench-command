import type { Platoon } from "../types";
import { isInvader } from "../game/platoons";

/** True once any player platoon has entered the enemy trench line. */
export function hasPlayerReachedEnemyTrench(platoons: Platoon[]): boolean {
  return platoons.some((p) => p.side === "player" && p.strength > 0 && isInvader(p));
}

export type RetreatKind = "early" | "late";

export function retreatKind(platoons: Platoon[]): RetreatKind {
  return hasPlayerReachedEnemyTrench(platoons) ? "late" : "early";
}
