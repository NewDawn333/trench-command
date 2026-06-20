import type { ArtilleryBattery, AssaultOrder, Platoon, Sector } from "../types";
import { CONFIG } from "../types";
import { sectorFromX, sectorWidth, sectorX } from "./battlefield";
import {
  EFFECTIVENESS_ASSAULT_GAIN,
  EFFECTIVENESS_BARRAGE_DRAIN_RATE,
  EFFECTIVENESS_CALLUP_START,
  EFFECTIVENESS_HEADCOUNT_DRAIN_RATE,
  EFFECTIVENESS_IDLE_DRAIN_RATE,
  EFFECTIVENESS_IDLE_FRONT_SEC,
  EFFECTIVENESS_INVADER_FLOOR,
  EFFECTIVENESS_NEIGHBOR_GAIN,
  EFFECTIVENESS_REPULSED_GAIN,
  EFFECTIVENESS_STAGING_RECOVERY_RATE,
  EFFECTIVENESS_STAGING_SETTLE_SEC,
  EFFECTIVENESS_STRENGTH_THRESHOLD,
  EFFECTIVENESS_SURGE_DECAY_RATE,
} from "./ResourceConfig";
import { isInvader, platoonsInSector } from "./platoons";

/** Fire rate & movement multiplier from effectiveness (0–150). */
export function effectivenessMult(effectiveness: number): number {
  if (effectiveness >= 100) return 1 + (Math.min(effectiveness, 150) - 100) / 100;
  if (effectiveness >= 50) return 1;
  return 0.1 + (effectiveness / 50) * 0.9;
}

export function platoonCombatMult(p: Platoon): number {
  if (p.side !== "player") return 1;
  return effectivenessMult(p.effectiveness);
}

export function platoonMoveMult(p: Platoon): number {
  if (p.side !== "player") return 1;
  return effectivenessMult(p.effectiveness);
}

function invaderDecayImmune(p: Platoon): boolean {
  return p.side === "player" && isInvader(p);
}

/** Apply a delta; decay respects the invader effectiveness floor. */
export function changeEffectiveness(p: Platoon, delta: number, opts: { decay?: boolean; allowSurge?: boolean } = {}): void {
  if (p.side !== "player") return;

  if (delta > 0) {
    if (opts.allowSurge && p.effectiveness >= 100) {
      p.effectiveness = Math.min(150, p.effectiveness + delta);
    } else {
      p.effectiveness = Math.min(100, p.effectiveness + delta);
    }
  } else if (delta < 0) {
    let next = p.effectiveness + delta;
    if (opts.decay !== false && invaderDecayImmune(p)) {
      next = Math.max(EFFECTIVENESS_INVADER_FLOOR, next);
    }
    p.effectiveness = Math.max(0, next);
  }

  if (p.effectiveness <= 0 && p.strength > 0) {
    p.state = "routing";
  }
}

export function effectivenessLossFromDamage(p: Platoon, dmg: number, scale: number): void {
  if (p.side !== "player" || dmg <= 0) return;
  changeEffectiveness(p, -dmg * scale, { decay: true });
}

export function sectorsUnderBarrage(batteries: ArtilleryBattery[]): Set<number> {
  const sectors = new Set<number>();
  const sw = sectorWidth();

  for (const b of batteries) {
    if (b.state !== "firing" || !b.targetZone) continue;
    const z = b.targetZone;
    for (let s = 0; s < CONFIG.sectorCount; s++) {
      const sx = sectorX(s);
      if (sx + sw > z.x && sx < z.x + z.w) sectors.add(s);
    }
    sectors.add(sectorFromX(z.x + z.w / 2));
  }
  return sectors;
}

export function tickPlayerEffectiveness(
  platoons: Platoon[],
  dt: number,
  barrageSectors: Set<number>,
): void {
  for (const p of platoons) {
    if (p.side !== "player" || p.strength <= 0 || p.state === "routing" || p.state === "reserve") continue;

    if (p.effectiveness > 100) {
      changeEffectiveness(p, -EFFECTIVENESS_SURGE_DECAY_RATE * dt, { decay: false });
    }

    if (p.state === "staging") {
      p.stagingTimer += dt;
      if (p.stagingTimer >= EFFECTIVENESS_STAGING_SETTLE_SEC && p.effectiveness < 100) {
        changeEffectiveness(p, EFFECTIVENESS_STAGING_RECOVERY_RATE * dt, {});
      }
      if (barrageSectors.has(p.sector)) {
        changeEffectiveness(p, -EFFECTIVENESS_BARRAGE_DRAIN_RATE * dt, { decay: true });
      }
      continue;
    }

    if (invaderDecayImmune(p)) {
      if (p.strength / p.maxStrength < EFFECTIVENESS_STRENGTH_THRESHOLD) {
        changeEffectiveness(p, -EFFECTIVENESS_HEADCOUNT_DRAIN_RATE * dt, { decay: true });
      }
      continue;
    }

    if (p.state === "front" && p.timeOnFront > EFFECTIVENESS_IDLE_FRONT_SEC) {
      changeEffectiveness(p, -EFFECTIVENESS_IDLE_DRAIN_RATE * dt, { decay: true });
    }

    if (p.state === "front" && barrageSectors.has(p.sector)) {
      changeEffectiveness(p, -EFFECTIVENESS_BARRAGE_DRAIN_RATE * dt, { decay: true });
    }

    if (p.strength / p.maxStrength < EFFECTIVENESS_STRENGTH_THRESHOLD) {
      changeEffectiveness(p, -EFFECTIVENESS_HEADCOUNT_DRAIN_RATE * dt, { decay: true });
    }
  }
}

export function applySectorMomentumGains(platoons: Platoon[], sectors: Sector[]): void {
  for (const s of sectors) {
    if (s.controller !== "player") {
      s.momentumGranted = false;
      continue;
    }
    if (s.captureProgress < 50 || s.momentumGranted) continue;

    s.momentumGranted = true;

    for (const p of platoons) {
      if (p.side !== "player" || p.strength <= 0) continue;

      if (isInvader(p) && p.sector === s.index) {
        changeEffectiveness(p, EFFECTIVENESS_ASSAULT_GAIN, { allowSurge: true });
      } else if (
        (p.state === "front" || p.state === "staging") &&
        Math.abs(p.sector - s.index) === 1
      ) {
        changeEffectiveness(p, EFFECTIVENESS_NEIGHBOR_GAIN, {});
      }
    }
  }
}

export function processRepulsedEnemyAssault(platoons: Platoon[], sector: number): void {
  const enemyStillThere = platoons.some(
    (p) => p.side === "enemy" && p.sector === sector && isInvader(p) && p.strength > 0,
  );
  if (enemyStillThere) return;

  for (const p of platoonsInSector(platoons, "player", sector, ["front"])) {
    changeEffectiveness(p, EFFECTIVENESS_REPULSED_GAIN, {});
  }
}

export function trackAssaultEffectivenessEvents(
  platoons: Platoon[],
  assaults: AssaultOrder[],
  prevActive: Map<string, boolean>,
): void {
  for (const a of assaults) {
    const wasActive = prevActive.get(a.id) ?? false;
    if (wasActive && !a.active && a.side === "enemy" && a.kind === "assault") {
      processRepulsedEnemyAssault(platoons, a.sector);
    }
  }
}

export function snapshotAssaultActive(assaults: AssaultOrder[]): Map<string, boolean> {
  return new Map(assaults.map((a) => [a.id, a.active]));
}

export function initialEffectiveness(side: Platoon["side"], state: Platoon["state"]): number {
  if (side === "player" && state === "staging") return EFFECTIVENESS_CALLUP_START;
  return 85 + Math.random() * 15;
}
