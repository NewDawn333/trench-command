import type { GameState, NewGameOptions } from "../game/Game";
import { createPlayerBatteries, createEnemyBatteries } from "../game/combat";
import { createEmplacement, seedPlayerEmplacements } from "../game/emplacements";
import { layoutAllPlatoons, layoutEmplacements } from "../game/layout";
import { createPlatoon } from "../game/platoons";
import { createSectors } from "../game/battlefield";
import { createAIState } from "../game/simulation";
import { getAIProfile } from "../app/Difficulty";
import { createMissionStats } from "../app/MissionStats";
import { initialEffectiveness } from "../game/effectiveness";
import { CONFIG } from "../types";
import type { FixedEmplacement, Platoon } from "../types";
import { MG_POOL_START } from "../game/ResourceConfig";
import type { MissionSetup } from "./MissionSetup";
import type { EnemyBattalionOob } from "../campaign/types";
import {
  mulberry32,
  resolveMissionLayout,
  setActiveMissionLayout,
  getMissionLayout,
  type MissionLayout,
} from "./MissionLayout";
import { planBattalionDeploymentFixed } from "../campaign/companyDeployment";
import { findBattalion, playableDivision } from "../campaign/company";
import type { Battalion } from "../campaign/types";
import type { CampaignState } from "../campaign/types";

export function distributeByWeight(total: number, weights: number[], rng: () => number): number[] {
  const counts = Array.from({ length: weights.length }, () => 0);
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
  let remaining = total;

  for (let i = 0; i < weights.length; i++) {
    counts[i] = Math.floor((total * weights[i]) / weightSum);
    remaining -= counts[i];
  }

  while (remaining > 0) {
    let pick = rng() * weightSum;
    for (let i = 0; i < weights.length; i++) {
      pick -= weights[i];
      if (pick <= 0) {
        counts[i]++;
        remaining--;
        break;
      }
    }
  }

  return counts;
}

function buildPlayerPlatoons(_setup: MissionSetup, battalion: Battalion): { platoons: Platoon[]; reserveRiflemen: number } {
  const plan = planBattalionDeploymentFixed(battalion);
  const platoons: Platoon[] = [];

  for (const slot of plan.linePlatoons) {
    const p = createPlatoon("player", slot.sector, "front");
    p.strength = slot.strength;
    p.maxStrength = CONFIG.platoonSize;
    p.effectiveness = initialEffectiveness("player", "front");
    platoons.push(p);
  }

  return { platoons, reserveRiflemen: plan.reserveRiflemen };
}

function buildEnemyPlatoons(setup: MissionSetup, layout: MissionLayout): Platoon[] {
  const platoons: Platoon[] = [];
  const oob = setup.enemyOob;
  const rng = mulberry32(setup.seed);
  const frontSlots = distributeByWeight(oob.frontPlatoons, layout.enemySectorWeight, rng);
  let id = 0;

  for (let sector = 0; sector < CONFIG.sectorCount; sector++) {
    for (let i = 0; i < frontSlots[sector]; i++) {
      const p = createPlatoon("enemy", sector, "front");
      p.id = `enemy-m-${setup.battalionId}-${id++}`;
      p.strength = oob.platoonStrength;
      p.maxStrength = oob.platoonStrength;
      platoons.push(p);
    }
  }

  const reserveCount = Math.max(2, Math.floor(oob.difficultyTier * 2));
  for (let i = 0; i < reserveCount; i++) {
    const p = createPlatoon("enemy", i % CONFIG.sectorCount, "reserve");
    p.id = `enemy-m-${setup.battalionId}-r${i}`;
    p.strength = oob.platoonStrength;
    p.maxStrength = oob.platoonStrength;
    platoons.push(p);
  }

  return platoons;
}

function pickMgSectors(count: number, weights: number[], seed: number): number[] {
  if (count <= 0) return [];
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const sectors: number[] = [];
  const available = Array.from({ length: CONFIG.sectorCount }, (_, i) => i);

  for (let i = 0; i < count && available.length > 0; i++) {
    const weightSum = available.reduce((sum, s) => sum + weights[s], 0) || 1;
    let pick = rng() * weightSum;
    let chosen = available[0];
    for (const sector of available) {
      pick -= weights[sector];
      if (pick <= 0) {
        chosen = sector;
        break;
      }
    }
    sectors.push(chosen);
    available.splice(available.indexOf(chosen), 1);
  }

  return sectors;
}

function buildEnemyEmplacements(setup: MissionSetup, layout: MissionLayout): FixedEmplacement[] {
  const out: FixedEmplacement[] = [];
  const oob = setup.enemyOob;
  const mgSectors = pickMgSectors(oob.mgCount, layout.enemySectorWeight, setup.seed);

  for (const sector of mgSectors) {
    out.push(createEmplacement("enemy", sector, "mg"));
  }

  for (const sector of oob.pillboxSectors) {
    if (sector >= 0 && sector < CONFIG.sectorCount) {
      out.push(createEmplacement("enemy", sector, "pillbox"));
    }
  }

  layoutEmplacements(out);
  return out;
}

function initialCallUpRegen(strengthRatio: number): number[] {
  const fill = Math.max(0.25, Math.min(1, strengthRatio));
  return Array.from({ length: CONFIG.sectorCount }, () => fill);
}

export function createGameFromMission(
  setup: MissionSetup,
  battalion: Battalion,
  options: NewGameOptions = {},
): GameState {
  const layout = resolveMissionLayout(setup);
  setActiveMissionLayout(layout);

  const aiDifficulty = options.aiDifficulty ?? "balanced";
  const campaignLevel = options.campaignLevel ?? 1;
  const unlimitedResources = options.unlimitedResources ?? false;
  const showEffectivenessBadge = options.showEffectivenessBadge ?? true;
  const aiProfile = getAIProfile(aiDifficulty, campaignLevel + setup.enemyOob.difficultyTier - 1);

  const playerForce = buildPlayerPlatoons(setup, battalion);
  const playerPlatoons = playerForce.platoons;
  const enemyPlatoons = buildEnemyPlatoons(setup, layout);
  layoutAllPlatoons([...playerPlatoons, ...enemyPlatoons]);

  const sectors = createSectors();
  const strengthRatio = setup.playerStrength / Math.max(1, setup.playerMaxStrength);
  const mgPool = Math.max(1, Math.round(MG_POOL_START * strengthRatio));
  const isSkirmish = setup.battalionId === "skirmish";

  return {
    platoons: [...playerPlatoons, ...enemyPlatoons],
    sectors,
    emplacements: [
      ...(isSkirmish ? seedPlayerEmplacements() : []),
      ...buildEnemyEmplacements(setup, layout),
    ],
    playerBatteries: createPlayerBatteries(),
    enemyBatteries: createEnemyBatteries(),
    assaults: [],
    events: { casualties: [], tracers: [], impacts: [] },
    ai: createAIState(aiProfile),
    paused: false,
    phase: "playing",
    selectedPlatoons: [],
    selectedEmplacementId: null,
    selectedSector: null,
    mode: "select",
    replacementPool: 0,
    artyPreview: null,
    time: 0,
    soundCues: [],
    stats: createMissionStats(),
    showCasualtyChart: false,
    aiDifficulty,
    campaignLevel: campaignLevel + setup.enemyOob.difficultyTier - 1,
    callUpRegen: initialCallUpRegen(strengthRatio),
    mgPool,
    mgPoolMax: mgPool,
    unlimitedResources,
    assaultActivePrev: new Map(),
    toasts: [],
    prevSectorControllers: sectors.map((s) => s.controller),
    barrageToastSectors: new Set(),
    showEffectivenessBadge,
    campaignCompanyStartStrength: isSkirmish ? null : setup.playerStrength,
    campaignStrengthReserve: isSkirmish ? null : playerForce.reserveRiflemen,
    missionLayout: getMissionLayout(),
  };
}

export function battalionForSetup(setup: MissionSetup, state: CampaignState): Battalion | null {
  const div = playableDivision(state);
  if (!div) return null;
  return findBattalion(div, setup.battalionId);
}

/** @deprecated */
export function frontPlatoonCount(playerStrength: number, playerMaxStrength: number): number {
  const ratio = playerStrength / Math.max(1, playerMaxStrength);
  if (ratio >= 0.85) return CONFIG.sectorCount;
  if (ratio >= 0.4) return Math.max(5, Math.round(CONFIG.sectorCount * ratio));
  return Math.max(3, Math.round(CONFIG.sectorCount * ratio * 0.85));
}

export type { EnemyBattalionOob };
