/** Campaign persistence — Phase 0 stub; division/army UI lands in v0.7+. */

export const CAMPAIGN_SAVE_VERSION = 1;
export const CAMPAIGN_STORAGE_KEY = "trench-command-campaign-v1";

/** Slow trickle — tune up after playtesting (not infinite). */
export const RECRUIT_TRICKLE_PER_TURN = 8;

/** v1 placeholder objective on the Amiens sector map. */
export const CAMPAIGN_OBJECTIVE_LABEL = "River Line";

export type CampaignPhase = "inactive" | "division" | "army";

export interface CompanySlot {
  id: string;
  label: string;
  strength: number;
  maxStrength: number;
  status: "full" | "depleted" | "critical" | "destroyed" | "rebuilding";
}

export interface SubsectorSlot {
  id: string;
  label: string;
  companies: CompanySlot[];
}

export interface DivisionSnapshot {
  id: string;
  label: string;
  subsectors: SubsectorSlot[];
}

export interface CampaignSave {
  version: number;
  createdAt: number;
  updatedAt: number;
  /** Strategic step counter (advances when returning from tactical). */
  turn: number;
  phase: CampaignPhase;
  objectiveLabel: string;
  recruitPool: number;
  recruitTricklePerTurn: number;
  /** Populated in v0.7.0 — null keeps Phase 0 save tiny. */
  division: DivisionSnapshot | null;
}

function fictionalCompany(id: string, label: string): CompanySlot {
  return { id, label, strength: 288, maxStrength: 288, status: "full" };
}

/** Seed division OOB for future phases — not playable until v0.7. */
export function createStubDivision(): DivisionSnapshot {
  const subLabels = ["Left Subsector", "Center Subsector", "Right Subsector"];
  return {
    id: "div-1",
    label: "1st Division",
    subsectors: subLabels.map((label, si) => ({
      id: `sub-${si}`,
      label,
      companies: [0, 1, 2].map((ci) => fictionalCompany(`c-${si}-${ci}`, `Company ${String.fromCharCode(65 + si * 3 + ci)}`)),
    })),
  };
}

export function createEmptyCampaignSave(): CampaignSave {
  const now = Date.now();
  return {
    version: CAMPAIGN_SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    turn: 0,
    phase: "inactive",
    objectiveLabel: CAMPAIGN_OBJECTIVE_LABEL,
    recruitPool: 40,
    recruitTricklePerTurn: RECRUIT_TRICKLE_PER_TURN,
    division: null,
  };
}

export function loadCampaignSave(): CampaignSave | null {
  try {
    const raw = localStorage.getItem(CAMPAIGN_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CampaignSave;
    if (data.version !== CAMPAIGN_SAVE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveCampaignSave(save: CampaignSave): void {
  save.updatedAt = Date.now();
  localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(save));
}

export function hasCampaignSave(): boolean {
  return loadCampaignSave() !== null;
}

/** Reserve an empty campaign slot on first launch (Phase 0 menu hint). */
export function ensureCampaignSaveSlot(): CampaignSave {
  const existing = loadCampaignSave();
  if (existing) return existing;
  const save = createEmptyCampaignSave();
  saveCampaignSave(save);
  return save;
}

export function campaignContinueAvailable(): boolean {
  const save = loadCampaignSave();
  return save !== null && save.phase !== "inactive";
}
