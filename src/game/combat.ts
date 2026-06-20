import type {
  ArtilleryBattery,
  CasualtyCause,
  CasualtyEvent,
  FixedEmplacement,
  Platoon,
  ShellImpact,
  Side,
  Tracer,
} from "../types";
import type { MissionStats } from "../app/MissionStats";
import { recordCasualtyDamage } from "../app/MissionStats";
import { FIRE_RANGE, LAYOUT } from "../types";
import { sectorCenterX, sectorFromX } from "./battlefield";
import { adjacentSectorsByX, effectiveSector } from "./layout";
import { isCombatReady, isInvader } from "./platoons";

/** Y band (inclusive) reachable by trench rifle fire from a side — NML only, no trench-to-trench. */
function trenchRifleYBand(side: Side): { min: number; max: number } {
  if (side === "player") {
    return { min: LAYOUT.nmlBottom - FIRE_RANGE.trenchRifle, max: LAYOUT.nmlBottom };
  }
  return { min: LAYOUT.nmlTop, max: LAYOUT.nmlTop + FIRE_RANGE.trenchRifle };
}

/** Y band reachable by MG / pillbox fire from a side — up to 2/3 into NML. */
function emplacementYBand(side: Side): { min: number; max: number } {
  if (side === "player") {
    return { min: LAYOUT.nmlBottom - FIRE_RANGE.emplacement, max: LAYOUT.nmlBottom };
  }
  return { min: LAYOUT.nmlTop, max: LAYOUT.nmlTop + FIRE_RANGE.emplacement };
}

function isInYBand(y: number, band: { min: number; max: number }): boolean {
  return y >= band.min && y <= band.max;
}

export interface CombatEvents {
  casualties: CasualtyEvent[];
  tracers: Tracer[];
  impacts: ShellImpact[];
}

export function createPlayerBatteries(): ArtilleryBattery[] {
  return [0, 1, 2].map((i) => ({
    id: `p-arty-${i}`,
    side: "player" as Side,
    ammo: 40,
    maxAmmo: 40,
    state: "idle",
    stateTimer: 0,
    targetZone: null,
    shellTimer: 0,
    aimDelay: 6 + i * 2,
    stopDelay: 4 + i,
  }));
}

export function createEnemyBatteries(): ArtilleryBattery[] {
  return [0, 1].map((i) => ({
    id: `e-arty-${i}`,
    side: "enemy" as Side,
    ammo: 35,
    maxAmmo: 35,
    state: "idle",
    stateTimer: 0,
    targetZone: null,
    shellTimer: 0,
    aimDelay: 8 + i * 3,
    stopDelay: 5,
  }));
}

function addCasualty(
  events: CombatEvents,
  x: number,
  y: number,
  cause: CasualtyCause,
  side: Side,
): void {
  events.casualties.push({ x, y, cause, side, timer: 1.2 });
}

function addTracer(events: CombatEvents, x1: number, y1: number, x2: number, y2: number, side: Side): void {
  events.tracers.push({ x1, y1, x2, y2, timer: 0.15, side });
}

function applyDamage(p: Platoon, amount: number, moraleHit: number, stats: MissionStats): void {
  recordCasualtyDamage(stats, p, amount);
  p.strength = Math.max(0, p.strength - amount);
  p.morale = Math.max(0, p.morale - moraleHit);
  if (p.strength <= 0 || p.morale < 15) {
    p.state = "routing";
  }
}

function targetsInArc(emp: FixedEmplacement, platoons: Platoon[]): Platoon[] {
  const cx = sectorCenterX(emp.sector);
  const yBand = emplacementYBand(emp.side);
  return platoons.filter((p) => {
    if (!isCombatReady(p) || p.side === emp.side) return false;
    if (p.state !== "crossing") return false;
    if (!isInYBand(p.y, yBand)) return false;
    const angle = Math.atan2(p.y - emp.y, p.x - cx) * (180 / Math.PI);
    const normalized = angle < 0 ? angle + 360 : angle;
    return normalized >= emp.arcStart && normalized <= emp.arcEnd;
  });
}

export function tickEmplacements(
  emplacements: FixedEmplacement[],
  platoons: Platoon[],
  dt: number,
  events: CombatEvents,
  stats: MissionStats,
): void {
  for (const emp of emplacements) {
    emp.fireCooldown = Math.max(0, emp.fireCooldown - dt);
    if (emp.fireCooldown > 0) continue;

    const targets = targetsInArc(emp, platoons);
    if (targets.length === 0) continue;

    targets.sort((a, b) => {
      const score = (p: Platoon) => (p.state === "crossing" ? 2 : 1) * p.strength;
      return score(b) - score(a);
    });
    const target = targets[0];
    const dps = emp.type === "pillbox" ? 14 : 22;
    const dmg = dps * dt * (0.8 + Math.random() * 0.4);
    applyDamage(target, dmg, dmg * 0.3, stats);
    addCasualty(events, target.x, target.y, "mg", target.side);
    addTracer(events, emp.x, emp.y, target.x, target.y, emp.side);
    emp.fireCooldown = emp.type === "pillbox" ? 0.08 : 0.05;
  }
}

interface TrenchMeleeContact {
  defenders: Platoon[];
  invaders: Platoon[];
  invadersInBay: Platoon[];
}

/** Active bayonet fight in a sector — invaders physically in bay or closing on it along the trench. */
function trenchMeleeContact(
  platoons: Platoon[],
  sector: number,
  invaderSide: Side,
): TrenchMeleeContact | null {
  const defenderSide: Side = invaderSide === "player" ? "enemy" : "player";

  const defenders = platoons.filter(
    (p) => p.side === defenderSide && p.sector === sector && p.state === "front" && isCombatReady(p),
  );
  if (defenders.length === 0) return null;

  const invaders = platoons.filter((p) => {
    if (p.side !== invaderSide || !isInvader(p) || !isCombatReady(p)) return false;
    const bay = effectiveSector(p);
    if (bay === sector) return true;
    if (Math.abs(bay - sector) !== 1) return false;
    return p.sector === sector || sectorFromX(p.targetX) === sector;
  });

  if (invaders.length === 0) return null;

  const invadersInBay = invaders.filter((p) => effectiveSector(p) === sector);
  return { defenders, invaders, invadersInBay };
}

export function sectorHasTrenchMelee(platoons: Platoon[], sector: number): boolean {
  return (
    trenchMeleeContact(platoons, sector, "player") !== null ||
    trenchMeleeContact(platoons, sector, "enemy") !== null
  );
}

/** True if this front-line platoon is in a sector with an active trench bayonet fight. */
function defenderEngagedInTrenchMelee(p: Platoon, platoons: Platoon[]): boolean {
  if (p.state !== "front" || !isCombatReady(p)) return false;
  return sectorHasTrenchMelee(platoons, p.sector);
}

export function tickTrenchFire(
  platoons: Platoon[],
  dt: number,
  events: CombatEvents,
  stats: MissionStats,
): void {
  const defenders = platoons.filter((p) => isCombatReady(p) && p.state === "front");

  for (const defender of defenders) {
    if (defenderEngagedInTrenchMelee(defender, platoons)) continue;

    const yBand = trenchRifleYBand(defender.side);
    const enemies = platoons.filter(
      (p) =>
        p.side !== defender.side &&
        isCombatReady(p) &&
        p.state === "crossing" &&
        adjacentSectorsByX(defender.x, p.x) &&
        isInYBand(p.y, yBand),
    );
    if (enemies.length === 0) continue;

    const target = enemies.reduce((best, p) => {
      const dist = Math.hypot(p.x - defender.x, p.y - defender.y);
      const bestDist = Math.hypot(best.x - defender.x, best.y - defender.y);
      return dist < bestDist ? p : best;
    });

    const rate = 4;
    const dmg = rate * dt * (defender.strength / defender.maxStrength);
    applyDamage(target, dmg, dmg * 0.15, stats);
    if (Math.random() < dt * 3) {
      addCasualty(events, target.x, target.y, "rifle", target.side);
      addTracer(events, defender.x, defender.y, target.x, target.y, defender.side);
    }
  }
}

export function tickTrenchMelee(platoons: Platoon[], dt: number, events: CombatEvents, stats: MissionStats): void {
  for (let s = 0; s < 8; s++) {
    resolveTrenchControlFight(platoons, dt, events, stats, s, "player");
    resolveTrenchControlFight(platoons, dt, events, stats, s, "enemy");
  }
}

const DEFENDER_APPROACH_ADVANTAGE = 1.1;

/**
 * Trench control at one sector — mutual attrition, one exchange per sector (no per-platoon stacking).
 * Same bay: even fight. Lateral approach (moving in, not yet arrived): defenders get up to 1.1× strength weight.
 */
function resolveTrenchControlFight(
  platoons: Platoon[],
  dt: number,
  events: CombatEvents,
  stats: MissionStats,
  sector: number,
  invaderSide: Side,
): void {
  const contact = trenchMeleeContact(platoons, sector, invaderSide);
  if (!contact) return;

  const { defenders, invaders, invadersInBay } = contact;
  const defenderMult = invadersInBay.length > 0 ? 1.0 : DEFENDER_APPROACH_ADVANTAGE;

  const iStr = invaders.reduce((a, p) => a + p.strength, 0);
  const dStr = defenders.reduce((a, p) => a + p.strength, 0) * defenderMult;
  const total = Math.max(iStr + dStr, 1);
  const baseDmg = 11 * dt;

  for (const p of invaders) {
    const dmg = (baseDmg * (dStr / total)) / invaders.length;
    applyDamage(p, dmg, dmg * 0.25, stats);
    if (Math.random() < dt * 3) addCasualty(events, p.x, p.y, "rifle", p.side);
  }
  for (const p of defenders) {
    const dmg = (baseDmg * (iStr / total)) / defenders.length;
    applyDamage(p, dmg, dmg * 0.25, stats);
    if (Math.random() < dt * 3) addCasualty(events, p.x, p.y, "rifle", p.side);
  }
  if (Math.random() < dt * 4 && invaders[0] && defenders[0]) {
    addTracer(events, invaders[0].x, invaders[0].y, defenders[0].x, defenders[0].y, invaderSide);
  }
}

/** Close-quarters firefight when opposing platoons meet in no man's land. */
export function tickNmlEncounters(platoons: Platoon[], dt: number, events: CombatEvents, stats: MissionStats): void {
  const crossing = platoons.filter((p) => p.state === "crossing" && isCombatReady(p));
  const paired = new Set<string>();

  for (const a of crossing) {
    for (const b of crossing) {
      if (a.side === b.side || a.id >= b.id) continue;
      const key = `${a.id}:${b.id}`;
      if (paired.has(key)) continue;
      if (Math.abs(a.y - b.y) > 32 || Math.abs(a.x - b.x) > 48) continue;
      paired.add(key);

      const aStr = a.strength;
      const bStr = b.strength;
      const aWins = aStr >= bStr * 0.95;

      const loser = aWins ? b : a;
      const winner = aWins ? a : b;
      const winMargin = Math.abs(aStr - bStr) / Math.max(aStr + bStr, 1);
      const loserDmg = (14 + winMargin * 30) * dt;
      const winnerDmg = (4 + winMargin * 8) * dt;

      applyDamage(loser, loserDmg, loserDmg * 0.5, stats);
      applyDamage(winner, winnerDmg, winnerDmg * 0.25, stats);

      if (Math.random() < dt * 5) {
        addCasualty(events, loser.x, loser.y, "rifle", loser.side);
        addTracer(events, winner.x, winner.y, loser.x, loser.y, winner.side);
      }
      if (Math.random() < dt * 3) {
        addCasualty(events, winner.x, winner.y, "rifle", winner.side);
        addTracer(events, loser.x, loser.y, winner.x, winner.y, loser.side);
      }
    }
  }
}

export function orderBatteryFire(
  battery: ArtilleryBattery,
  zone: { x: number; y: number; w: number; h: number },
): boolean {
  if (battery.ammo <= 0 || battery.state === "aiming" || battery.state === "firing") return false;
  battery.targetZone = zone;
  battery.state = "aiming";
  battery.stateTimer = battery.aimDelay;
  return true;
}

export function stopBattery(battery: ArtilleryBattery): void {
  if (battery.state === "idle" || battery.state === "stopping") return;
  battery.state = "stopping";
  battery.stateTimer = battery.stopDelay;
}

export function tickArtillery(
  batteries: ArtilleryBattery[],
  dt: number,
  events: CombatEvents,
  platoons: Platoon[],
  stats: MissionStats,
): void {
  for (const b of batteries) {
    if (b.state === "idle") continue;

    b.stateTimer -= dt;

    if (b.state === "aiming" && b.stateTimer <= 0) {
      b.state = "firing";
      b.shellTimer = 0;
    }

    if (b.state === "stopping" && b.stateTimer <= 0) {
      b.state = "idle";
      b.targetZone = null;
    }

    if (b.state !== "firing" || !b.targetZone) continue;

    b.shellTimer -= dt;
    if (b.shellTimer > 0) continue;
    b.shellTimer = 0.45 + Math.random() * 0.35;

    if (b.ammo <= 0) {
      stopBattery(b);
      continue;
    }
    b.ammo--;

    const zone = b.targetZone;
    const driftX = (Math.random() - 0.5) * zone.w * 0.35;
    const driftY = (Math.random() - 0.5) * zone.h * 0.35;
    const x = zone.x + Math.random() * zone.w + driftX;
    const y = zone.y + Math.random() * zone.h + driftY;

    events.impacts.push({ x, y, side: b.side, timer: 0.6, radius: 18 + Math.random() * 12 });

    for (const p of platoons) {
      if (!isCombatReady(p) || p.state === "reserve") continue;
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist > 35) continue;
      const falloff = 1 - dist / 35;
      const dmg = 12 * falloff * (p.state === "crossing" ? 1.4 : p.state === "staging" ? 1.1 : 0.35);
      const cause: CasualtyCause = p.side === b.side ? "friendly_arty" : "enemy_arty";
      applyDamage(p, dmg, dmg * 0.5, stats);
      if (Math.random() < falloff * 0.5) addCasualty(events, p.x, p.y, cause, p.side);
    }
  }
}

export function decayEffects(events: CombatEvents, dt: number): void {
  events.casualties = events.casualties.filter((c) => {
    c.timer -= dt;
    return c.timer > 0;
  });
  events.tracers = events.tracers.filter((t) => {
    t.timer -= dt;
    return t.timer > 0;
  });
  events.impacts = events.impacts.filter((i) => {
    i.timer -= dt;
    return i.timer > 0;
  });
}

export function nmlZoneRect(): { x: number; y: number; w: number; h: number } {
  return {
    x: 0,
    y: LAYOUT.nmlTop,
    w: 1200,
    h: LAYOUT.nmlBottom - LAYOUT.nmlTop,
  };
}

export function sectorZoneRect(sector: number, y: number, h: number, mapWidth: number, sectorCount: number): { x: number; y: number; w: number; h: number } {
  const w = mapWidth / sectorCount;
  return { x: sector * w, y, w, h };
}

export function artyZoneForSector(sector: number): { x: number; y: number; w: number; h: number } {
  const w = 1200 / 8;
  return {
    x: sector * w - w * 0.1,
    y: LAYOUT.nmlTop - 10,
    w: w * 1.2,
    h: LAYOUT.nmlBottom - LAYOUT.nmlTop + 40,
  };
}

export function defaultArtyZoneFromPoint(x: number, _y: number): { x: number; y: number; w: number; h: number } {
  return artyZoneForSector(sectorFromX(x));
}

export function nextAvailableBattery(batteries: ArtilleryBattery[]): ArtilleryBattery | null {
  return batteries.find((b) => b.ammo > 0 && b.state === "idle") ?? null;
}

export function activePlayerBatteryAt(batteries: ArtilleryBattery[], x: number, y: number): ArtilleryBattery | null {
  for (const b of batteries) {
    if (!b.targetZone || b.state === "idle") continue;
    const z = b.targetZone;
    if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return b;
  }
  return null;
}

export function activePlayerBatteryInSector(batteries: ArtilleryBattery[], sector: number): ArtilleryBattery | null {
  for (const b of batteries) {
    if (!b.targetZone || b.state === "idle") continue;
    if (sectorFromX(b.targetZone.x + b.targetZone.w / 2) === sector) return b;
  }
  return null;
}
