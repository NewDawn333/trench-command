import { createNewCampaign } from "./factory";
import { playableDivision } from "./company";
import { normalizeCampaignState } from "./outcomes";
import {
  CAMPAIGN_OBJECTIVE_LABEL,
  CAMPAIGN_STORAGE_KEY,
  RECRUIT_TRICKLE_PER_TURN,
} from "./constants";
import type { CampaignState } from "./types";

export { CAMPAIGN_OBJECTIVE_LABEL, CAMPAIGN_STORAGE_KEY, RECRUIT_TRICKLE_PER_TURN };

export type { CampaignState, Company, Battalion, Brigade, Division, Army } from "./types";
export { createNewCampaign } from "./factory";
export {
  applyCompanyStrengthLoss,
  companyStatusFromStrength,
  divisionStrength,
  findBattalion,
  findBrigade,
  findCompanyInDivision,
  playableDivision,
  setCompanyStrength,
  startCompanyRebuild,
  syncCompanyStatus,
  tickCompanyRebuild,
  COMPANY_MAX_STRENGTH,
  COMPANY_REBUILD_TURNS,
  PLATOON_SIZE,
  PLATOONS_PER_COMPANY,
} from "./company";
export { getEnemyBattalionOob } from "./enemyOob";

interface CampaignSaveV2 {
  version: 2;
}

function parseCampaignState(raw: unknown): CampaignState | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  if (data.version === 3 && data.army) {
    return data as unknown as CampaignState;
  }

  return null;
}

export function loadCampaignState(): CampaignState | null {
  try {
    const raw = localStorage.getItem(CAMPAIGN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const state = parseCampaignState(parsed);
    if (!state) {
      if ((parsed as CampaignSaveV2).version === 2) {
        const fresh = createNewCampaign();
        saveCampaignState(fresh);
        return fresh;
      }
      return null;
    }
    return normalizeCampaignState(state);
  } catch {
    return null;
  }
}

export function saveCampaignState(state: CampaignState): void {
  state.updatedAt = Date.now();
  localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(state));
}

export function hasCampaignSave(): boolean {
  return loadCampaignState() !== null;
}

export function campaignContinueAvailable(): boolean {
  const state = loadCampaignState();
  return state !== null && state.phase !== "inactive";
}

export function startCampaign(): CampaignState {
  const state = createNewCampaign();
  saveCampaignState(state);
  return state;
}

export function getCampaignSummary(state: CampaignState): string {
  const div = playableDivision(state);
  if (!div) return `Turn ${state.turn} · ${state.objectiveLabel}`;
  const bns = div.brigades.flatMap((b) => b.battalions).filter((bn) => bn.role === "front").length;
  return `Turn ${state.turn} · ${div.label} · ${div.brigades.length} brigades · ${bns} battalion fronts · ${state.recruitPool} recruits`;
}

export function ensureCampaignSaveSlot(): CampaignState | null {
  return loadCampaignState();
}
