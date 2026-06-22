/** Campaign layer types — v3 BEF order of battle. */

export type CampaignPhase = "inactive" | "division" | "brigade" | "army";

export type FrontController = "player" | "enemy" | "contested";

export type CompanyStatus = "full" | "depleted" | "critical" | "destroyed" | "rebuilding";

export type BattalionRole = "front" | "brigade_reserve" | "reinforcing";

export interface Company {
  id: string;
  label: string;
  battalionId: string;
  /** Line / assault reserve / local battalion reserve (strategic). */
  duty: "line" | "assault" | "battalion_reserve";
  strength: number;
  maxStrength: number;
  status: CompanyStatus;
  rebuildTurnsRemaining: number;
  redeployCooldown: number;
  transferTargetBattalionId: string | null;
  transferArrivesTurn: number | null;
  missionTemplateId: string;
}

export interface Battalion {
  id: string;
  label: string;
  brigadeId: string;
  /** Order on brigade front (0–3). */
  slot: number;
  role: BattalionRole;
  controller: FrontController;
  vulnerable: boolean;
  companies: Company[];
  enemyOobId: string;
  missionTemplateId: string;
}

export interface Brigade {
  id: string;
  label: string;
  divisionId: string;
  /** When true, only 3 battalion slots hold the brigade front. */
  threeSectionFront: boolean;
  battalions: Battalion[];
}

export interface Division {
  id: string;
  label: string;
  playable: boolean;
  brigades: Brigade[];
}

export interface Army {
  id: string;
  label: string;
  objectiveProgress: number;
  divisions: Division[];
}

export interface ReinforcementRequest {
  id: string;
  companyId: string;
  companyLabel: string;
  battalionLabel: string;
  menRequested: number;
  kind: "rebuild" | "replenish";
  requestedTurn: number;
}

export interface CampaignEvent {
  turn: number;
  kind: "counter_push" | "reinforcement" | "rebuild_complete";
  message: string;
  battalionId?: string;
}

export interface CampaignState {
  version: 3;
  createdAt: number;
  updatedAt: number;
  turn: number;
  phase: CampaignPhase;
  /** Selected brigade when phase === "brigade". */
  activeBrigadeId: string | null;
  objectiveLabel: string;
  recruitPool: number;
  recruitTricklePerTurn: number;
  army: Army;
  events: CampaignEvent[];
  reinforcementRequests: ReinforcementRequest[];
}

/** Enemy order of battle for one battalion-sized tactical map. */
export interface EnemyBattalionOob {
  id: string;
  label: string;
  templateId: string;
  platoonStrength: number;
  frontPlatoons: number;
  mgCount: number;
  pillboxSectors: number[];
  difficultyTier: number;
}

export interface EnemyOobTable {
  battalions: Record<string, EnemyBattalionOob>;
}

/** @deprecated v2 company OOB — kept for type compat during migration only. */
export interface EnemyCompanyOob {
  id: string;
  label: string;
  templateId: string;
  platoonStrength: number;
  frontPlatoons: number;
  mgCount: number;
  pillboxSectors: number[];
  difficultyTier: number;
}
