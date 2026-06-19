import type {
  ArtilleryBattery,
  AssaultOrder,
  CasualtyEvent,
  FixedEmplacement,
  InteractionMode,
  Platoon,
  Sector,
  ShellImpact,
  SoundCue,
  Tracer,
} from "../types";
import {
  createEnemyBatteries,
  createPlayerBatteries,
  decayEffects,
  activePlayerBatteryAt,
  activePlayerBatteryInSector,
  artyZoneForSector,
  nextAvailableBattery,
  orderBatteryFire,
  stopBattery,
  tickArtillery,
  tickEmplacements,
  tickNmlEncounters,
  tickTrenchFire,
  tickTrenchMelee,
  type CombatEvents,
} from "./combat";
import { placeEmplacementInSector, seedEnemyEmplacements, seedPlayerEmplacements } from "./emplacements";
import {
  callUpPlatoon,
  createPlatoons,
  isInvader,
  movePlatoonToFront,
  movePlatoonToStaging,
  platoonsInSector,
  totalStrength,
} from "./platoons";
import { layoutAllPlatoons } from "./layout";
import {
  checkDefeat,
  checkVictory,
  createAIState,
  launchAssault,
  launchLateralTrenchAssault,
  moveSelectedLaterally,
  moveStagingToFront,
  reinforceAssault,
  spawnEnemyReplacements,
  tickAI,
  tickEmplacementCapture,
  tickHomeTrenchRelief,
  tickPlatoonMovement,
  tickReplacements,
  type AIState,
} from "./simulation";
import { CONFIG, DEV_MODE } from "../types";
import { queueSound } from "../audio/AudioDirector";
import { createSectors, sectorFromX, type MoveTapZone } from "./battlefield";

export type GamePhase = "playing" | "victory" | "defeat";

export interface GameState {
  platoons: Platoon[];
  sectors: Sector[];
  emplacements: FixedEmplacement[];
  playerBatteries: ArtilleryBattery[];
  enemyBatteries: ArtilleryBattery[];
  assaults: AssaultOrder[];
  events: CombatEvents;
  ai: AIState;
  paused: boolean;
  phase: GamePhase;
  selectedPlatoons: string[];
  selectedSector: number | null;
  mode: InteractionMode;
  replacementPool: number;
  artyPreview: { x: number; y: number; w: number; h: number } | null;
  time: number;
  soundCues: SoundCue[];
}

export function createGame(): GameState {
  const platoons = [...createPlatoons("player"), ...createPlatoons("enemy")];
  layoutAllPlatoons(platoons);
  return {
    platoons,
    sectors: createSectors(),
    emplacements: [...seedPlayerEmplacements(), ...seedEnemyEmplacements()],
    playerBatteries: createPlayerBatteries(),
    enemyBatteries: createEnemyBatteries(),
    assaults: [],
    events: { casualties: [], tracers: [], impacts: [] },
    ai: createAIState(),
    paused: false,
    phase: "playing",
    selectedPlatoons: [],
    selectedSector: null,
    mode: "select",
    replacementPool: 0,
    artyPreview: null,
    time: 0,
    soundCues: [],
  };
}

export function togglePause(game: GameState): void {
  if (game.phase !== "playing") return;
  game.paused = !game.paused;
}

export function setMode(game: GameState, mode: InteractionMode): void {
  game.mode = mode;
  game.artyPreview = null;
}

export function returnToSelectMode(game: GameState): void {
  setMode(game, "select");
}

export function selectPlatoonSingle(game: GameState, platoonId: string): void {
  game.selectedPlatoons = [platoonId];
  const p = game.platoons.find((x) => x.id === platoonId);
  if (p) game.selectedSector = p.sector;
}

export function selectPlatoonGroup(game: GameState, platoonId: string): void {
  const p = game.platoons.find((x) => x.id === platoonId);
  if (!p || p.side !== "player" || p.strength <= 0) return;

  if (p.state === "front") {
    game.selectedPlatoons = game.platoons
      .filter((q) => q.side === "player" && q.sector === p.sector && q.state === "front" && q.strength > 0)
      .map((q) => q.id);
  } else if (p.state === "enemy_trench" && isInvader(p)) {
    game.selectedPlatoons = game.platoons
      .filter(
        (q) =>
          q.side === "player" &&
          q.sector === p.sector &&
          q.state === "enemy_trench" &&
          isInvader(q) &&
          q.strength > 0,
      )
      .map((q) => q.id);
  } else {
    selectPlatoonSingle(game, platoonId);
    return;
  }
  game.selectedSector = p.sector;
}

export function clearSelection(game: GameState): void {
  game.selectedPlatoons = [];
}

export function applySelectedMove(game: GameState, sector: number, zone: MoveTapZone): void {
  if (zone === "none" || game.selectedPlatoons.length === 0) return;
  game.selectedSector = sector;

  const selected = game.selectedPlatoons
    .map((id) => game.platoons.find((p) => p.id === id))
    .filter((p): p is Platoon => !!p && p.side === "player" && p.strength > 0);

  const front = selected.filter((p) => p.state === "front");
  const staging = selected.filter((p) => p.state === "staging");
  const invaders = selected.filter((p) => p.state === "enemy_trench" && isInvader(p));

  if (zone === "player_trench") {
    if (front.length > 0) {
      moveSelectedLaterally(
        game.platoons,
        front.map((p) => p.id),
        sector,
      );
    }
    if (staging.length > 0) {
      staging.forEach((p, i) => {
        p.sector = sector;
        movePlatoonToFront(p, i, staging.length);
      });
    }
  } else if (zone === "player_staging") {
    const toStage = selected.filter((p) => p.state === "staging" || p.state === "front");
    toStage.forEach((p) => {
      p.sector = sector;
      movePlatoonToStaging(p);
    });
  } else if (zone === "enemy_trench" && invaders.length > 0) {
    moveSelectedLaterally(
      game.platoons,
      invaders.map((p) => p.id),
      sector,
    );
  }
}

export function selectPlatoonAt(game: GameState, platoonId: string, _additive: boolean): void {
  selectPlatoonSingle(game, platoonId);
}

export function assignSelectedToSector(game: GameState, sector: number): void {
  for (const id of game.selectedPlatoons) {
    const p = game.platoons.find((x) => x.id === id);
    if (!p || p.side !== "player") continue;
    if (p.state === "crossing" || p.state === "routing") continue;
    if (p.state === "enemy_trench" && isInvader(p)) continue;
    p.sector = sector;
    movePlatoonToStaging(p);
  }
  game.selectedPlatoons = [];
  game.selectedSector = sector;
}

export function moveSelectedLaterallyInGame(game: GameState, sector: number): void {
  moveSelectedLaterally(game.platoons, game.selectedPlatoons, sector);
  game.selectedSector = sector;
}

export function callUpTroops(game: GameState, sector?: number): void {
  const s = sector ?? game.selectedSector ?? 0;
  callUpPlatoon(game.platoons, s);
  layoutAllPlatoons(game.platoons);
  game.selectedSector = s;
}

export function reservesAvailableForSector(_game: GameState, _sector: number): boolean {
  return DEV_MODE;
}

export function moveSelectedToFront(game: GameState, sector: number): void {
  const group = game.selectedPlatoons
    .map((id) => game.platoons.find((p) => p.id === id))
    .filter((p): p is Platoon => !!p && p.side === "player");
  group.forEach((p, i) => {
    p.sector = sector;
    movePlatoonToFront(p, i, group.length);
  });
  game.selectedPlatoons = [];
}

export function playerSectorDoubleClick(game: GameState, sector: number): void {
  if (game.phase !== "playing") return;
  game.selectedSector = sector;
  queueSound(game, { type: "whistle" });
  playerAssault(game, sector);
  moveStagingToFront(game.platoons, sector, "player");
  layoutAllPlatoons(game.platoons);
}

export function placeMgInSector(game: GameState, sector: number): boolean {
  const emp = placeEmplacementInSector(game.emplacements, "player", sector, "mg");
  return !!emp;
}

export function playerAssault(game: GameState, sector: number): boolean {
  if (game.phase !== "playing") return false;
  const order = launchAssault(game.platoons, "player", sector, game.assaults);
  if (order) game.selectedSector = sector;
  return !!order;
}

export function playerReinforce(game: GameState): number {
  const sector = game.selectedSector ?? 0;
  return reinforceAssault(game.platoons, "player", sector, game.assaults);
}

export function handleArtilleryTap(game: GameState, x: number, y: number): "fired" | "stopped" | "none" {
  const sector = sectorFromX(x);
  game.selectedSector = sector;

  const active =
    activePlayerBatteryAt(game.playerBatteries, x, y) ??
    activePlayerBatteryInSector(game.playerBatteries, sector);

  if (active) {
    stopBattery(active);
    game.artyPreview = null;
    return "stopped";
  }

  const battery = nextAvailableBattery(game.playerBatteries);
  if (!battery) {
    game.artyPreview = null;
    return "none";
  }

  orderBatteryFire(battery, artyZoneForSector(sector));
  queueSound(game, { type: "arty_aim" });
  game.artyPreview = null;
  return "fired";
}

export function stopArtilleryAtPoint(game: GameState, x: number, y: number): boolean {
  const battery = activePlayerBatteryAt(game.playerBatteries, x, y);
  if (!battery) return false;
  stopBattery(battery);
  return true;
}

export function playerLateralAssault(game: GameState, toSector: number): boolean {
  if (game.phase !== "playing") return false;
  const invaders = game.selectedPlatoons
    .map((id) => game.platoons.find((p) => p.id === id))
    .filter((p): p is Platoon => !!p && p.side === "player" && p.state === "enemy_trench" && isInvader(p));
  if (invaders.length === 0) return false;
  const fromSector = invaders[0].sector;
  const ok = launchLateralTrenchAssault(game.platoons, "player", fromSector, toSector, game.assaults);
  if (ok) game.selectedSector = toSector;
  return ok;
}

export function placePlayerEmplacement(_game: GameState, _sector: number): boolean {
  return false;
}

export function tick(game: GameState, dt: number): void {
  if (game.paused || game.phase !== "playing") return;

  game.time += dt;
  game.replacementPool = tickReplacements(game.platoons, dt);
  spawnEnemyReplacements(game.platoons, dt);

  tickNmlEncounters(game.platoons, dt, game.events);
  tickHomeTrenchRelief(game.platoons, game.assaults);
  tickPlatoonMovement(game.platoons, dt, game.sectors);
  tickEmplacementCapture(game.emplacements, game.platoons);
  tickEmplacements(game.emplacements, game.platoons, dt, game.events);
  tickTrenchFire(game.platoons, dt, game.events);
  tickTrenchMelee(game.platoons, dt, game.events);
  tickArtillery(game.playerBatteries, dt, game.events, game.platoons);
  tickArtillery(game.enemyBatteries, dt, game.events, game.platoons);
  tickAI(game.platoons, game.assaults, game.enemyBatteries, game.sectors, game.ai, dt);
  decayEffects(game.events, dt);

  game.assaults = game.assaults.filter((a) => {
    const active = game.platoons.some((p) => {
      if (p.assaultId !== a.id || p.strength <= 0) return false;
      if (a.kind === "relief") return p.state === "crossing";
      return p.state === "crossing" || p.state === "enemy_trench";
    });
    a.active = active;
    return active || game.time - dt < 120;
  });

  if (checkVictory(game.sectors, game.platoons)) game.phase = "victory";
  else if (checkDefeat(game.platoons)) game.phase = "defeat";
}

export function getStatusText(game: GameState): string {
  if (game.phase === "victory") return "Enemy line overrun — sector secured!";
  if (game.phase === "defeat") return "Your line has collapsed.";
  if (game.paused) return "Paused — plan your next move";
  if (game.mode === "artillery") {
    const ready = game.playerBatteries.filter((b) => b.ammo > 0 && b.state === "idle").length;
    return ready > 0
      ? `Artillery — tap a sector in no man's land (${ready} battery${ready === 1 ? "" : "ies"} ready)`
      : "Artillery — tap an active bracket in no man's land to stop fire";
  }

  const sector = game.selectedSector;
  if (sector !== null) {
    const staging = platoonsInSector(game.platoons, "player", sector, ["staging"]).reduce((a, p) => a + p.strength, 0);
    const enemy = platoonsInSector(game.platoons, "enemy", sector, ["staging", "front"]).reduce((a, p) => a + p.strength, 0);
    return `Sector ${sector + 1}: ${Math.round(staging)} men staging · ${Math.round(enemy)} enemy opposite`;
  }
  return "Tap platoon to select · tap trench/staging to move · double-tap sector to advance";
}

export function getArtilleryStatus(game: GameState): string {
  return game.playerBatteries
    .map((b, i) => {
      const label = `B${i + 1}:${b.ammo}`;
      if (b.state === "idle") return label;
      const sector =
        b.targetZone !== null ? sectorFromX(b.targetZone.x + b.targetZone.w / 2) + 1 : "?";
      return `${label}→S${sector}(${b.state})`;
    })
    .join(" · ");
}

export function canAssault(game: GameState): boolean {
  const sector = game.selectedSector;
  if (sector === null) return false;
  const front = platoonsInSector(game.platoons, "player", sector, ["front"]);
  if (DEV_MODE) return front.length > 0;
  return totalStrength(front) >= CONFIG.platoonSize * 2.5;
}

export function getEvents(game: GameState): {
  casualties: CasualtyEvent[];
  tracers: Tracer[];
  impacts: ShellImpact[];
} {
  return game.events;
}
