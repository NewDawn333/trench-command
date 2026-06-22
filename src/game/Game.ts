import type {
  ArtilleryBattery,
  AssaultOrder,
  CasualtyEvent,
  FixedEmplacement,
  InteractionMode,
  Platoon,
  Sector,
  SectorController,
  ShellImpact,
  SoundCue,
  Tracer,
} from "../types";
import {
  decayEffects,
  activePlayerBatteryAt,
  activePlayerBatteryInSector,
  artyZoneForSector,
  nextAvailableBattery,
  orderBatteryFire,
  stopBattery,
  tickArtillery,
  tickArtilleryRegen,
  tickEmplacements,
  tickNmlEncounters,
  tickTrenchFire,
  tickTrenchMelee,
  type CombatEvents,
} from "./combat";
import {
  canPlaceMgInSector,
  movePlayerMgToSector,
  placeEmplacementInSector,
  tickEmplacementMoveCooldown,
} from "./emplacements";
import {
  callUpPlatoon,
  isInvader,
  movePlatoonToFront,
  movePlatoonToStaging,
  platoonsInSector,
} from "./platoons";
import { layoutAllPlatoons } from "./layout";
import {
  checkDefeat,
  checkVictory,
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
  canLaunchAssault,
  type AIState,
} from "./simulation";
import { CONFIG } from "../types";
import { CALL_UP_REGEN_SEC } from "./ResourceConfig";
import {
  sectorsUnderBarrage,
  snapshotAssaultActive,
  tickPlayerEffectiveness,
  trackAssaultEffectivenessEvents,
} from "./effectiveness";
import { queueSound } from "../audio/AudioDirector";
import type { GameToast } from "../app/Toasts";
import { pushToast, tickToasts, toastBarrageSectors, toastSectorControlChanges } from "../app/Toasts";
import { sampleCasualtyHistory, type MissionStats } from "../app/MissionStats";
import type { AIDifficulty } from "../app/Difficulty";
import { createGameFromMission } from "../mission/campaignMission";
import { buildSkirmishSetup, skirmishBattalionForMission } from "../mission/skirmishSetup";
import type { MissionLayout } from "../mission/MissionLayout";
import { sectorFromX, type MoveTapZone } from "./battlefield";

export interface NewGameOptions {
  aiDifficulty?: AIDifficulty;
  campaignLevel?: number;
  unlimitedResources?: boolean;
  showEffectivenessBadge?: boolean;
  /** Campaign mission — company strength at deploy (for early retreat). */
  campaignCompanyStartStrength?: number;
  /** Skirmish map template (Phase 4). */
  skirmishTemplateId?: string;
  skirmishSeed?: number;
}

export type GamePhase = "playing" | "victory" | "defeat" | "retreat";

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
  selectedEmplacementId: string | null;
  selectedSector: number | null;
  mode: InteractionMode;
  replacementPool: number;
  artyPreview: { x: number; y: number; w: number; h: number } | null;
  time: number;
  soundCues: SoundCue[];
  stats: MissionStats;
  showCasualtyChart: boolean;
  aiDifficulty: AIDifficulty;
  campaignLevel: number;
  callUpRegen: number[];
  mgPool: number;
  mgPoolMax: number;
  unlimitedResources: boolean;
  assaultActivePrev: Map<string, boolean>;
  toasts: GameToast[];
  prevSectorControllers: SectorController[];
  barrageToastSectors: Set<number>;
  showEffectivenessBadge: boolean;
  /** Set for campaign tactical missions. */
  campaignCompanyStartStrength: number | null;
  /** Campaign only — riflemen left to call up (null in skirmish). */
  campaignStrengthReserve: number | null;
  /** Active map template layout for rendering and terrain rules. */
  missionLayout: MissionLayout;
}

export function createGame(options: NewGameOptions = {}): GameState {
  const templateId = options.skirmishTemplateId ?? "straight";
  const seed = options.skirmishSeed ?? Date.now();
  const setup = buildSkirmishSetup(templateId, seed);
  return createGameFromMission(setup, skirmishBattalionForMission(), options);
}

export function togglePause(game: GameState): void {
  if (game.phase !== "playing") return;
  if (game.showCasualtyChart) return;
  game.paused = !game.paused;
}

export function toggleCasualtyChart(game: GameState): boolean {
  if (game.phase !== "playing") return false;
  game.showCasualtyChart = !game.showCasualtyChart;
  if (game.showCasualtyChart) {
    sampleCasualtyHistory(game.stats, game.time);
    game.paused = true;
  } else {
    game.paused = false;
  }
  return game.showCasualtyChart;
}

export function closeCasualtyChart(game: GameState): void {
  if (!game.showCasualtyChart) return;
  game.showCasualtyChart = false;
  game.paused = false;
}

/** End mission without defeat — no skirmish penalty (campaign redeploy rules in v0.7.2). */
export function playerRetreatMission(game: GameState): void {
  if (game.phase !== "playing") return;
  game.phase = "retreat";
  game.paused = false;
  game.showCasualtyChart = false;
}

export function setMode(game: GameState, mode: InteractionMode): void {
  game.mode = mode;
  game.artyPreview = null;
  game.selectedEmplacementId = null;
}

export function returnToSelectMode(game: GameState): void {
  setMode(game, "select");
}

export function selectPlatoonSingle(game: GameState, platoonId: string): void {
  game.selectedPlatoons = [platoonId];
  game.selectedEmplacementId = null;
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
  } else if (p.state === "staging") {
    game.selectedPlatoons = game.platoons
      .filter((q) => q.side === "player" && q.sector === p.sector && q.state === "staging" && q.strength > 0)
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
  game.selectedEmplacementId = null;
}

export function clearSelection(game: GameState): void {
  game.selectedPlatoons = [];
  game.selectedEmplacementId = null;
}

export function selectPlayerMg(game: GameState, emplacementId: string): void {
  const emp = game.emplacements.find((e) => e.id === emplacementId);
  if (!emp || emp.side !== "player" || emp.type !== "mg") return;
  game.selectedEmplacementId = emplacementId;
  game.selectedPlatoons = [];
  game.selectedSector = emp.sector;
}

export function moveSelectedMgToSector(game: GameState, sector: number): boolean {
  if (!game.selectedEmplacementId) return false;
  const ok = movePlayerMgToSector(game.emplacements, game.selectedEmplacementId, sector);
  if (ok) {
    game.selectedSector = sector;
    pushToast(game, `MG relocated to sector ${sector + 1}`, "info");
    clearSelection(game);
  }
  return ok;
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
  let tasked = false;

  if (zone === "player_trench") {
    if (front.length > 0) {
      moveSelectedLaterally(
        game.platoons,
        front.map((p) => p.id),
        sector,
      );
      tasked = true;
    }
    if (staging.length > 0) {
      staging.forEach((p, i) => {
        p.sector = sector;
        movePlatoonToFront(p, i, staging.length);
      });
      tasked = true;
    }
  } else if (zone === "player_staging") {
    const toStage = selected.filter((p) => p.state === "staging" || p.state === "front");
    if (toStage.length > 0) {
      toStage.forEach((p) => {
        p.sector = sector;
        movePlatoonToStaging(p);
      });
      tasked = true;
    }
  } else if (zone === "enemy_trench" && invaders.length > 0) {
    moveSelectedLaterally(
      game.platoons,
      invaders.map((p) => p.id),
      sector,
    );
    tasked = true;
  }

  if (tasked) clearSelection(game);
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
  clearSelection(game);
}

export function callUpTroops(game: GameState, sector?: number): void {
  const s = sector ?? game.selectedSector ?? 0;
  if (!reservesAvailableForSector(game, s)) return;

  if (game.campaignStrengthReserve !== null) {
    const amount = Math.min(CONFIG.platoonSize, game.campaignStrengthReserve);
    callUpPlatoon(game.platoons, s, amount);
    game.campaignStrengthReserve -= amount;
  } else {
    callUpPlatoon(game.platoons, s);
  }

  if (!game.unlimitedResources) game.callUpRegen[s] = 0;
  layoutAllPlatoons(game.platoons);
  game.selectedSector = s;
}

export function reservesAvailableForSector(game: GameState, sector: number): boolean {
  if (game.campaignStrengthReserve !== null && game.campaignStrengthReserve <= 0) return false;
  if (game.unlimitedResources) return true;
  return game.callUpRegen[sector] >= 1;
}

export function mgAvailableForSector(game: GameState, sector: number): boolean {
  if (game.unlimitedResources) return canPlaceMgInSector(game.emplacements, "player", sector);
  if (game.mgPool <= 0) return false;
  return canPlaceMgInSector(game.emplacements, "player", sector);
}

export function tickResourceRegen(game: GameState, dt: number): void {
  if (game.unlimitedResources) return;
  for (let i = 0; i < CONFIG.sectorCount; i++) {
    if (game.callUpRegen[i] < 1) {
      game.callUpRegen[i] = Math.min(1, game.callUpRegen[i] + dt / CALL_UP_REGEN_SEC);
    }
  }
  tickArtilleryRegen(game.playerBatteries, dt);
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
  const launched = playerAssault(game, sector);
  if (launched) {
    queueSound(game, { type: "whistle" });
    pushToast(game, `Assault on sector ${sector + 1}`, "good");
  }
  moveStagingToFront(game.platoons, sector, "player");
  layoutAllPlatoons(game.platoons);
  clearSelection(game);
}

export function placeMgInSector(game: GameState, sector: number): boolean {
  if (!mgAvailableForSector(game, sector)) return false;
  const emp = placeEmplacementInSector(game.emplacements, "player", sector, "mg");
  if (!emp) return false;
  if (!game.unlimitedResources) game.mgPool -= 1;
  return true;
}

export function playerAssault(game: GameState, sector: number): boolean {
  if (game.phase !== "playing") return false;
  const order = launchAssault(game.platoons, "player", sector, game.assaults);
  if (order) {
    game.selectedSector = sector;
    game.stats.assaultsOrdered += 1;
  }
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
    pushToast(game, `Cease fire — sector ${sector + 1}`, "info");
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
  pushToast(game, `Battery bracketing sector ${sector + 1}`, "info");
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
  tickResourceRegen(game, dt);
  tickEmplacementMoveCooldown(game.emplacements, dt);

  tickNmlEncounters(game.platoons, dt, game.events, game.stats);
  tickHomeTrenchRelief(game.platoons, game.assaults);
  tickPlatoonMovement(game.platoons, dt, game.sectors);
  toastSectorControlChanges(
    game,
    game.sectors.map((s) => s.controller),
  );
  tickEmplacementCapture(game.emplacements, game.platoons);
  tickEmplacements(game.emplacements, game.platoons, dt, game.events, game.stats);
  tickTrenchFire(game.platoons, dt, game.events, game.stats);
  tickTrenchMelee(game.platoons, dt, game.events, game.stats);
  tickArtillery(game.playerBatteries, dt, game.events, game.platoons, game.stats);
  tickArtillery(game.enemyBatteries, dt, game.events, game.platoons, game.stats);
  tickAI(game.platoons, game.assaults, game.enemyBatteries, game.sectors, game.emplacements, game.ai, dt);
  decayEffects(game.events, dt);
  sampleCasualtyHistory(game.stats, game.time);

  for (const a of game.assaults) {
    a.active = game.platoons.some((p) => {
      if (p.assaultId !== a.id || p.strength <= 0) return false;
      if (a.kind === "relief") return p.state === "crossing";
      return p.state === "crossing" || p.state === "enemy_trench";
    });
  }
  trackAssaultEffectivenessEvents(game.platoons, game.assaults, game.assaultActivePrev);
  const barrage = sectorsUnderBarrage([...game.playerBatteries, ...game.enemyBatteries]);
  toastBarrageSectors(game, barrage);
  tickPlayerEffectiveness(game.platoons, dt, barrage);
  tickToasts(game, dt);

  game.assaults = game.assaults.filter((a) => {
    return a.active || game.time - dt < 120;
  });
  game.assaultActivePrev = snapshotAssaultActive(game.assaults);

  if (checkVictory(game.sectors, game.platoons)) game.phase = "victory";
  else if (checkDefeat(game.platoons, game.sectors)) game.phase = "defeat";
}

export function getStatusText(game: GameState): string {
  if (game.phase === "victory") return "Enemy line overrun — sector secured!";
  if (game.phase === "defeat") return "Your line has collapsed.";
  if (game.phase === "retreat") return "Withdrawn from the sector.";
  if (game.paused) return "Paused — plan your next move";
  if (game.showCasualtyChart) return "Casualties — game paused";
  if (game.selectedEmplacementId) {
    const emp = game.emplacements.find((e) => e.id === game.selectedEmplacementId);
    if (emp) {
      const cd =
        emp.moveCooldown > 0 ? ` · move ready in ${Math.ceil(emp.moveCooldown)}s` : " · tap your trench to relocate";
      return `MG selected (sector ${emp.sector + 1})${cd}`;
    }
  }
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
    const frontPlatoons = platoonsInSector(game.platoons, "player", sector, ["front"]);
    const avgEff =
      frontPlatoons.length > 0
        ? Math.round(frontPlatoons.reduce((a, p) => a + p.effectiveness, 0) / frontPlatoons.length)
        : null;
    const effHint = avgEff !== null ? ` · eff ${avgEff}%` : "";
    const assaultHint = canLaunchAssault(game.platoons, "player", sector)
      ? "double-tap sector to advance"
      : "need front troops to assault";
    return `Sector ${sector + 1}: ${Math.round(staging)} staging · ${Math.round(enemy)} enemy${effHint} · ${assaultHint}`;
  }
  return `Opponent: ${game.ai.profile.label} · tap platoon or MG · double-tap sector to advance`;
}

export function getArtilleryStatus(game: GameState): string {
  return game.playerBatteries
    .map((b, i) => {
      const regen = b.state === "idle" && b.ammo < b.maxAmmo && !game.unlimitedResources;
      const label = `B${i + 1}:${b.ammo}/${b.maxAmmo}${regen ? "↗" : ""}`;
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
  return canLaunchAssault(game.platoons, "player", sector);
}

export function getEvents(game: GameState): {
  casualties: CasualtyEvent[];
  tracers: Tracer[];
  impacts: ShellImpact[];
} {
  return game.events;
}
