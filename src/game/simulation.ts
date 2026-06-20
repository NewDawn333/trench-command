import type { AssaultOrder, FixedEmplacement, Platoon, Sector, Side } from "../types";
import { CONFIG, DEV_MODE, LAYOUT, PLATOON_MOVE_SPEED } from "../types";
import type { AIProfile } from "../app/Difficulty";
import { PLAYER_ASSAULT_MIN_STRENGTH } from "./ResourceConfig";
import { platoonFrontY } from "./battlefield";
import {
  beginCrossing,
  beginReliefCrossing,
  isInvader,
  isReliefCrossing,
  movePlatoonLaterally,
  movePlatoonToFront,
  movePlatoonToStaging,
  opponentTrenchY,
  platoonsInSector,
  totalStrength,
} from "./platoons";
import { defaultArtyZoneFromPoint, orderBatteryFire } from "./combat";
import { destroyEmplacementsInSector } from "./emplacements";
import { layoutAllPlatoons } from "./layout";
import type { ArtilleryBattery } from "../types";
import { pickEnemyArtyZone, pickMassSector, sectorHasEnemyPillbox } from "./aiTargeting";
import { applySectorMomentumGains, platoonMoveMult } from "./effectiveness";

let assaultCounter = 1;

export interface AIState {
  massingSector: number | null;
  massTimer: number;
  assaultCooldown: number;
  artyCooldown: number;
  invaderSpreadTimer: number;
  profile: AIProfile;
}

export function createAIState(profile: AIProfile): AIState {
  return {
    massingSector: null,
    massTimer: profile.massingDurationMin + Math.random() * (profile.massingDurationMax - profile.massingDurationMin),
    assaultCooldown: profile.assaultCooldownMin * 0.35,
    artyCooldown: profile.artyCooldownMin * 0.5,
    invaderSpreadTimer: profile.invaderSpreadMin,
    profile,
  };
}

export function moveStagingToFront(platoons: Platoon[], sector: number, side: Side = "player"): number {
  const staging = platoonsInSector(platoons, side, sector, ["staging"]);
  staging.forEach((p, i) => movePlatoonToFront(p, i, staging.length));
  return staging.length;
}

export function assaultMinStrength(side: Side): number {
  if (DEV_MODE) return 1;
  return side === "player" ? PLAYER_ASSAULT_MIN_STRENGTH : CONFIG.platoonSize * 2.5;
}

export function canLaunchAssault(platoons: Platoon[], side: Side, sector: number): boolean {
  const front = platoonsInSector(platoons, side, sector, ["front"]).filter((p) => p.strength > p.maxStrength * 0.35);
  const inEnemyTrench = platoonsInSector(platoons, side, sector, ["enemy_trench"]).filter(isInvader);
  if (front.length === 0 && inEnemyTrench.length === 0) return false;
  if (front.length === 0) return inEnemyTrench.length > 0;
  return totalStrength(front) >= assaultMinStrength(side);
}

export function launchAssault(
  platoons: Platoon[],
  side: Side,
  sector: number,
  assaults: AssaultOrder[],
): AssaultOrder | null {
  const front = platoonsInSector(platoons, side, sector, ["front"]).filter((p) => p.strength > p.maxStrength * 0.35);
  const inEnemyTrench = platoonsInSector(platoons, side, sector, ["enemy_trench"]).filter(isInvader);

  if (!canLaunchAssault(platoons, side, sector)) return null;

  const id = `assault-${assaultCounter++}`;
  const order: AssaultOrder = { id, side, sector, active: true, kind: "assault" };
  assaults.push(order);

  front.forEach((p) => {
    p.sector = sector;
    beginCrossing(p, id);
  });

  inEnemyTrench.forEach((p) => {
    p.assaultId = id;
  });

  return order;
}

function homeTrenchOccupied(platoons: Platoon[], side: Side, sector: number): boolean {
  const invaderSide: Side = side === "player" ? "enemy" : "player";
  return platoons.some(
    (p) => p.side === invaderSide && p.sector === sector && isInvader(p) && p.strength > 0,
  );
}

/** Staging troops rush back across NML when their home trench is occupied. */
export function tickHomeTrenchRelief(platoons: Platoon[], assaults: AssaultOrder[]): void {
  for (let s = 0; s < CONFIG.sectorCount; s++) {
    for (const side of ["player", "enemy"] as Side[]) {
      if (!homeTrenchOccupied(platoons, side, s)) continue;

      const staging = platoonsInSector(platoons, side, s, ["staging"]);
      if (staging.length === 0) continue;

      let order = assaults.find((a) => a.side === side && a.sector === s && a.kind === "relief" && a.active);
      if (!order) {
        const id = `relief-${assaultCounter++}`;
        order = { id, side, sector: s, active: true, kind: "relief" };
        assaults.push(order);
      }

      for (const p of staging) {
        beginReliefCrossing(p, order.id);
      }
    }
  }
}

export function launchLateralTrenchAssault(
  platoons: Platoon[],
  side: Side,
  fromSector: number,
  toSector: number,
  assaults: AssaultOrder[],
): boolean {
  const invaders = platoonsInSector(platoons, side, fromSector, ["enemy_trench"]).filter(isInvader);
  if (invaders.length === 0) return false;

  const id = `assault-${assaultCounter++}`;
  assaults.push({ id, side, sector: toSector, active: true, kind: "assault" });

  invaders.forEach((p, i) => {
    movePlatoonLaterally(p, toSector, i, invaders.length);
    p.assaultId = id;
  });
  return true;
}

export function tickAI(
  platoons: Platoon[],
  assaults: AssaultOrder[],
  batteries: ArtilleryBattery[],
  sectors: Sector[],
  emplacements: FixedEmplacement[],
  ai: AIState,
  dt: number,
): void {
  const profile = ai.profile;
  ai.massTimer -= dt;
  ai.assaultCooldown -= dt;
  ai.artyCooldown -= dt;

  if (ai.massingSector === null || ai.massTimer <= 0) {
    ai.massingSector = pickMassSector(platoons, sectors, emplacements, profile.pillboxAssaultPenalty);
    ai.massTimer =
      profile.massingDurationMin +
      Math.random() * (profile.massingDurationMax - profile.massingDurationMin);
  }

  const sector = ai.massingSector;
  if (sector !== null) {
    const reserves = platoons.filter((p) => p.side === "enemy" && p.state === "reserve" && p.strength > 0);
    if (reserves.length > 0 && Math.random() < dt * profile.reserveCallRate) {
      const p = reserves[0];
      p.sector = sector;
      movePlatoonToStaging(p);
    }

    // Build front-line mass during staging — assault threshold counts front troops only.
    if (Math.random() < dt * profile.aggression * 0.55) {
      moveStagingToFront(platoons, sector, "enemy");
    }
  }

  if (ai.artyCooldown <= 0) {
    const idle = batteries.find((b) => b.side === "enemy" && b.state === "idle" && b.ammo > 5);
    if (idle) {
      const zone = pickEnemyArtyZone(platoons, sectors, emplacements);
      if (zone) {
        orderBatteryFire(idle, zone);
        ai.artyCooldown =
          profile.artyCooldownMin +
          Math.random() * (profile.artyCooldownMax - profile.artyCooldownMin);
      } else {
        const playerStaging = platoons.filter((p) => p.side === "player" && p.state === "staging" && p.strength > 0);
        if (playerStaging.length >= 1) {
          const target = playerStaging[Math.floor(Math.random() * playerStaging.length)];
          orderBatteryFire(idle, defaultArtyZoneFromPoint(target.x, target.y));
          ai.artyCooldown =
            profile.artyCooldownMin +
            Math.random() * (profile.artyCooldownMax - profile.artyCooldownMin);
        }
      }
    }
  }

  if (ai.assaultCooldown <= 0 && sector !== null) {
    moveStagingToFront(platoons, sector, "enemy");
    const frontStr = totalStrength(platoonsInSector(platoons, "enemy", sector, ["front"]));
    let threshold = DEV_MODE ? CONFIG.platoonSize : CONFIG.platoonSize * 1.75;
    threshold *= profile.assaultThresholdMult;
    if (sectorHasEnemyPillbox(emplacements, sector)) threshold *= profile.pillboxAssaultPenalty;

    if (frontStr >= threshold) {
      launchAssault(platoons, "enemy", sector, assaults);
      ai.assaultCooldown =
        profile.assaultCooldownMin +
        Math.random() * (profile.assaultCooldownMax - profile.assaultCooldownMin);
      ai.massingSector = null;
    }
  }

  for (const s of sectors) {
    if (s.controller === "player") {
      const enemies = platoonsInSector(platoons, "enemy", s.index, ["staging", "front", "reserve"]);
      if (enemies.length > 0 && ai.assaultCooldown <= 5 && Math.random() < dt * profile.counterAttackRate) {
        moveStagingToFront(platoons, s.index, "enemy");
        launchAssault(platoons, "enemy", s.index, assaults);
        ai.assaultCooldown = profile.assaultCooldownMin * 0.85;
      }
    }
  }

  tickAIInvaderSpread(platoons, ai, dt);
}

function platoonAtTarget(p: Platoon, threshold = 3): boolean {
  return Math.hypot(p.targetX - p.x, p.targetY - p.y) <= threshold;
}

/** Enemy invaders in player trench spread laterally to overrun adjacent sectors. */
function tickAIInvaderSpread(platoons: Platoon[], ai: AIState, dt: number): void {
  const profile = ai.profile;
  ai.invaderSpreadTimer -= dt;
  if (ai.invaderSpreadTimer > 0) return;

  const beachheads = new Set<number>();
  for (const p of platoons) {
    if (p.side === "enemy" && isInvader(p) && p.strength > 0) beachheads.add(p.sector);
  }
  if (beachheads.size === 0) return;

  ai.invaderSpreadTimer =
    profile.invaderSpreadMin + Math.random() * (profile.invaderSpreadMax - profile.invaderSpreadMin);

  for (const fromSector of beachheads) {
    const invaders = platoonsInSector(platoons, "enemy", fromSector, ["enemy_trench"])
      .filter((p) => isInvader(p) && p.strength > 0 && platoonAtTarget(p));
    if (invaders.length === 0) continue;

    const toSector = pickInvaderSpreadTarget(platoons, fromSector);
    if (toSector === null || toSector === fromSector) continue;

    const count = Math.max(1, Math.ceil(invaders.length * profile.invaderSpreadFraction));
    const movers = invaders.slice(0, count);
    movers.forEach((p, i) => movePlatoonLaterally(p, toSector, i, movers.length));
  }
}

function pickInvaderSpreadTarget(platoons: Platoon[], fromSector: number): number | null {
  let best: number | null = null;
  let bestScore = -1;

  for (const adj of [fromSector - 1, fromSector + 1]) {
    if (adj < 0 || adj >= CONFIG.sectorCount) continue;

    const playerFront = totalStrength(platoonsInSector(platoons, "player", adj, ["front"]));
    const playerStaging = totalStrength(platoonsInSector(platoons, "player", adj, ["staging"]));
    const enemyThere = platoonsInSector(platoons, "enemy", adj, ["enemy_trench"]).filter(isInvader).length;

    if (enemyThere >= 3) continue;

    const score = playerFront + playerStaging * 0.6 + (enemyThere === 0 ? 40 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = adj;
    }
  }

  return best;
}

export function tickPlatoonMovement(platoons: Platoon[], dt: number, sectors: Sector[]): void {
  layoutAllPlatoons(platoons);

  for (const p of platoons) {
    if (p.strength <= 0) continue;

    if (p.state === "front") {
      p.timeOnFront += dt;
    }

    if (p.state === "crossing" && isHeldInNmlFight(p, platoons)) continue;

    const dx = p.targetX - p.x;
    const dy = p.targetY - p.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 2) {
      const step = Math.min(dist, PLATOON_MOVE_SPEED * dt * platoonMoveMult(p));
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
    } else if (p.state === "crossing") {
      if (isReliefCrossing(p)) {
        p.state = "front";
        p.y = platoonFrontY(p.side);
        p.targetY = p.y;
        p.assaultId = null;
      } else {
        p.state = "enemy_trench";
        p.y = opponentTrenchY(p.side);
        p.targetY = p.y;
      }
      p.x = p.targetX;
    } else {
      p.x = p.targetX;
      p.y = p.targetY;
    }
  }

  updateSectorControl(platoons, sectors);
}

function isHeldInNmlFight(p: Platoon, platoons: Platoon[]): boolean {
  if (p.state !== "crossing" || p.strength <= 0) return false;
  return platoons.some(
    (e) =>
      e.side !== p.side &&
      e.state === "crossing" &&
      e.strength > 0 &&
      Math.abs(p.y - e.y) < 32 &&
      Math.abs(p.x - e.x) < 48,
  );
}

function updateSectorControl(platoons: Platoon[], sectors: Sector[]): void {
  for (const s of sectors) {
    const playerStr = platoonsInSector(platoons, "player", s.index, ["enemy_trench"])
      .filter(isInvader)
      .reduce((a, p) => a + p.strength, 0);
    const enemyInPlayerTrench = platoonsInSector(platoons, "enemy", s.index, ["enemy_trench"])
      .filter(isInvader)
      .reduce((a, p) => a + p.strength, 0);
    const enemyStr =
      platoonsInSector(platoons, "enemy", s.index, ["front"]).reduce((a, p) => a + p.strength, 0) +
      enemyInPlayerTrench;

    if (playerStr <= 0 && enemyStr > 0 && enemyInPlayerTrench === 0) {
      s.controller = "enemy";
      s.captureProgress = 0;
    } else if (playerStr > enemyStr * 1.2) {
      s.controller = "player";
      s.captureProgress = Math.min(100, s.captureProgress + 0.5);
    } else if (playerStr > 0 && enemyStr > 0) {
      s.controller = "contested";
      s.captureProgress = Math.min(100, s.captureProgress + (playerStr / (playerStr + enemyStr)) * 0.3);
    } else if (enemyInPlayerTrench > 0) {
      s.controller = "contested";
    }
  }
  applySectorMomentumGains(platoons, sectors);
}

export function tickEmplacementCapture(emplacements: FixedEmplacement[], platoons: Platoon[]): void {
  for (let s = 0; s < CONFIG.sectorCount; s++) {
    const playerInEnemyTrench = platoons.some(
      (p) => p.side === "player" && p.sector === s && isInvader(p) && p.strength > 0,
    );
    if (playerInEnemyTrench) destroyEmplacementsInSector(emplacements, s, "enemy");

    const enemyInPlayerTrench = platoons.some(
      (p) => p.side === "enemy" && p.sector === s && isInvader(p) && p.strength > 0,
    );
    if (enemyInPlayerTrench) destroyEmplacementsInSector(emplacements, s, "player");
  }
}

export function moveSelectedLaterally(platoons: Platoon[], ids: string[], sector: number): void {
  const group = ids
    .map((id) => platoons.find((p) => p.id === id))
    .filter((p): p is Platoon => !!p && p.side === "player" && (p.state === "front" || p.state === "enemy_trench"));
  group.forEach((p, i) => movePlatoonLaterally(p, sector, i, group.length));
}

export function reinforceAssault(
  platoons: Platoon[],
  side: Side,
  sector: number,
  assaults: AssaultOrder[],
): number {
  const active = assaults.find((a) => a.side === side && a.sector === sector && a.active);
  if (!active) return 0;

  const reserves = platoons.filter(
    (p) => p.side === side && p.sector === sector && p.state === "front" && p.strength > 0,
  );
  if (reserves.length === 0) return 0;

  const toSend = DEV_MODE ? reserves : reserves.slice(0, 2);
  let sent = 0;
  for (const p of toSend) {
    beginCrossing(p, active.id);
    sent++;
  }
  return sent;
}

export function checkVictory(sectors: Sector[], platoons: Platoon[]): boolean {
  const allCaptured = sectors.every((s) => s.controller === "player" && s.captureProgress >= 50);
  const enemyRemaining = platoons.filter(
    (p) => p.side === "enemy" && p.strength > 0 && (p.state === "front" || (p.state === "enemy_trench" && isInvader(p))),
  );
  return allCaptured && enemyRemaining.length === 0;
}

/**
 * Defeat when the enemy holds every sector of the player's trench line —
 * mirror of victory (player must capture the full enemy line), not merely
 * an empty friendly trench during an all-out assault.
 */
export function checkDefeat(platoons: Platoon[], _sectors: Sector[]): boolean {
  if (DEV_MODE) return false;

  for (let i = 0; i < CONFIG.sectorCount; i++) {
    const playerHolds = platoons.some(
      (p) =>
        p.side === "player" &&
        p.sector === i &&
        p.strength > 0 &&
        (p.state === "front" || p.state === "staging"),
    );
    if (playerHolds) return false;

    const enemyOccupies = platoons.some(
      (p) => p.side === "enemy" && p.sector === i && isInvader(p) && p.strength > 0,
    );
    if (!enemyOccupies) return false;
  }
  return true;
}

export function tickReplacements(_platoons: Platoon[], _dt: number): number {
  return DEV_MODE ? Infinity : 0;
}

export function spawnEnemyReplacements(platoons: Platoon[], dt: number): void {
  for (const p of platoons) {
    if (p.side !== "enemy" || p.state !== "reserve") continue;
    if (p.strength >= p.maxStrength) continue;
    p.strength = Math.min(p.maxStrength, p.strength + CONFIG.replacementRate * dt * 45);
  }
}

export function isTrenchRow(y: number): boolean {
  return (
    (y >= LAYOUT.enemyTrenchY - 20 && y <= LAYOUT.enemyTrenchY + 30) ||
    (y >= LAYOUT.playerTrenchY - 20 && y <= LAYOUT.playerTrenchY + 30)
  );
}
