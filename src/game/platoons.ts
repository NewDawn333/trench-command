import type { Platoon, PlatoonState, Side } from "../types";
import { CONFIG } from "../types";
import { frontTrenchY, spreadXInSector, stagingY } from "./battlefield";

let nextId = 1;

export function opponentTrenchY(side: Side): number {
  return frontTrenchY(side === "player" ? "enemy" : "player");
}

/** Unit has crossed into the opponent's front trench line. */
export function isInvader(p: Platoon): boolean {
  return p.state === "enemy_trench" && Math.abs(p.y - opponentTrenchY(p.side)) < 30;
}

export function isOnOwnFrontLine(p: Platoon): boolean {
  return p.state === "front" || (p.state === "enemy_trench" && !isInvader(p));
}

export function createPlatoon(side: Side, sector: number, state: PlatoonState): Platoon {
  const sx = spreadXInSector(sector, Math.floor(Math.random() * 3), 3);
  const y =
    state === "front"
      ? frontTrenchY(side)
      : state === "staging"
        ? stagingY(side)
        : state === "enemy_trench"
          ? opponentTrenchY(side)
          : stagingY(side);

  return {
    id: `${side}-${nextId++}`,
    side,
    sector,
    strength: CONFIG.platoonSize,
    maxStrength: CONFIG.platoonSize,
    state,
    x: sx,
    y,
    targetX: sx,
    targetY: y,
    morale: 85 + Math.random() * 15,
    timeOnFront: 0,
    assaultId: null,
  };
}

export function createPlatoons(side: Side): Platoon[] {
  const platoons: Platoon[] = [];

  if (side === "player") {
    for (let i = 0; i < CONFIG.sectorCount; i++) {
      platoons.push(createPlatoon("player", i, "front"));
    }
    return platoons;
  }

  for (let i = 0; i < CONFIG.platoonsPerSide; i++) {
    const sector = i % CONFIG.sectorCount;
    const state: PlatoonState = i < CONFIG.sectorCount ? "front" : "reserve";
    const p = createPlatoon("enemy", sector, state === "front" ? "front" : "reserve");
    if (state === "reserve") {
      p.y = stagingY("enemy");
      p.targetY = p.y;
    }
    platoons.push(p);
  }
  return platoons;
}

export function callUpPlatoon(platoons: Platoon[], sector: number): Platoon {
  const p = createPlatoon("player", sector, "staging");
  platoons.push(p);
  return p;
}

export function platoonLabel(p: Platoon): string {
  return `${Math.ceil(p.strength)}`;
}

export function isCombatReady(p: Platoon): boolean {
  return p.strength > 0 && p.state !== "routing" && p.state !== "reserve";
}

export function movePlatoonToStaging(p: Platoon): void {
  if (p.state === "crossing" || p.state === "enemy_trench" || p.state === "routing") return;
  p.state = "staging";
  p.targetY = stagingY(p.side);
}

export function movePlatoonToFront(p: Platoon, _slot: number, _total: number): void {
  if (p.state === "crossing" || p.state === "routing") return;
  if (p.state === "enemy_trench" && isInvader(p)) return;
  p.state = "front";
  p.targetY = frontTrenchY(p.side);
  p.timeOnFront = 0;
}

export function movePlatoonLaterally(p: Platoon, sector: number, _slot: number, _total: number): void {
  if (p.state !== "front" && p.state !== "enemy_trench") return;
  p.sector = sector;
  if (p.state === "front") {
    p.targetY = frontTrenchY(p.side);
  } else {
    p.targetY = opponentTrenchY(p.side);
  }
}

export function isReliefCrossing(p: Platoon): boolean {
  return p.state === "crossing" && Math.abs(p.targetY - frontTrenchY(p.side)) < 12;
}

export function beginCrossing(p: Platoon, assaultId: string): void {
  p.state = "crossing";
  p.assaultId = assaultId;
  p.targetY = opponentTrenchY(p.side);
}

export function beginReliefCrossing(p: Platoon, assaultId: string): void {
  p.state = "crossing";
  p.assaultId = assaultId;
  p.targetY = frontTrenchY(p.side);
}

export function platoonsInSector(platoons: Platoon[], side: Side, sector: number, states?: Platoon["state"][]): Platoon[] {
  return platoons.filter(
    (p) =>
      p.side === side &&
      p.sector === sector &&
      p.strength > 0 &&
      p.state !== "routing" &&
      (!states || states.includes(p.state)),
  );
}

export function platoonsNearSector(
  platoons: Platoon[],
  side: Side,
  sector: number,
  states?: Platoon["state"][],
): Platoon[] {
  return platoons.filter(
    (p) =>
      p.side === side &&
      Math.abs(p.sector - sector) <= 1 &&
      p.strength > 0 &&
      p.state !== "routing" &&
      (!states || states.includes(p.state)),
  );
}

export function totalStrength(platoons: Platoon[]): number {
  return platoons.reduce((s, p) => s + p.strength, 0);
}
