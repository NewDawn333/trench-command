import {
  GARRISON_RECOVERY_PER_TURN,
  REBUILD_RECRUIT_COST,
  REPLENISH_RECRUIT_CHUNK,
  VICTORY_RECRUIT_BONUS,
} from "./constants";
import {
  findCompanyInDivision,
  playableDivision,
  setCompanyStrength,
  startCompanyRebuild,
  tickCompanyRebuild,
} from "./company";
import type { CampaignEvent, CampaignState, Company, ReinforcementRequest } from "./types";
import { saveCampaignState } from "./CampaignSave";

const MAX_EVENT_LOG = 20;

export function companyCanRequestReinforcements(company: Company): boolean {
  if (company.status === "rebuilding") return false;
  if (company.transferArrivesTurn !== null) return false;
  if (company.strength >= company.maxStrength) return false;
  return true;
}

export function reinforcementNeed(company: Company): { men: number; kind: ReinforcementRequest["kind"] } {
  const destroyed = company.status === "destroyed" || company.strength <= 0;
  if (destroyed) {
    return { men: REBUILD_RECRUIT_COST, kind: "rebuild" };
  }
  const gap = company.maxStrength - company.strength;
  return { men: Math.min(REPLENISH_RECRUIT_CHUNK, gap), kind: "replenish" };
}

export function hasPendingRequest(state: CampaignState, companyId: string): boolean {
  return (state.reinforcementRequests ?? []).some((r) => r.companyId === companyId);
}

export function pendingReinforcementRequests(state: CampaignState): ReinforcementRequest[] {
  return state.reinforcementRequests ?? [];
}

export function queueReinforcementRequest(state: CampaignState, companyId: string): boolean {
  const div = playableDivision(state);
  if (!div) return false;
  const company = findCompanyInDivision(div, companyId);
  if (!company || !companyCanRequestReinforcements(company)) return false;
  if (hasPendingRequest(state, companyId)) return false;

  let battalionLabel = "Battalion";
  for (const bde of div.brigades) {
    const bn = bde.battalions.find((b) => b.id === company.battalionId);
    if (bn) {
      battalionLabel = bn.label;
      break;
    }
  }

  const need = reinforcementNeed(company);
  if (!state.reinforcementRequests) state.reinforcementRequests = [];
  state.reinforcementRequests.push({
    id: `req-${companyId}-${state.turn}`,
    companyId,
    companyLabel: company.label,
    battalionLabel,
    menRequested: need.men,
    kind: need.kind,
    requestedTurn: state.turn,
  });
  saveCampaignState(state);
  return true;
}

export function approveReinforcementRequest(state: CampaignState, requestId: string): boolean {
  const div = playableDivision(state);
  if (!div) return false;
  const requests = state.reinforcementRequests ?? [];
  const index = requests.findIndex((r) => r.id === requestId);
  if (index < 0) return false;

  const request = requests[index];
  if (state.recruitPool < request.menRequested) return false;

  const company = findCompanyInDivision(div, request.companyId);
  if (!company) return false;

  state.recruitPool -= request.menRequested;
  requests.splice(index, 1);

  if (request.kind === "rebuild") {
    startCompanyRebuild(company);
    pushEvent(state, {
      turn: state.turn,
      kind: "reinforcement",
      message: `${request.companyLabel} rebuilding — ${company.rebuildTurnsRemaining} turns`,
    });
  } else {
    setCompanyStrength(company, company.strength + request.menRequested);
    pushEvent(state, {
      turn: state.turn,
      kind: "reinforcement",
      message: `${request.companyLabel} reinforced (+${request.menRequested} riflemen)`,
    });
  }

  saveCampaignState(state);
  return true;
}

export function awardVictoryRecruits(state: CampaignState): void {
  state.recruitPool += VICTORY_RECRUIT_BONUS;
}

export function tickReinforcementPipeline(state: CampaignState): void {
  const div = playableDivision(state);
  if (!div) return;

  for (const bde of div.brigades) {
    for (const bn of bde.battalions) {
      for (const company of bn.companies) {
        if (tickCompanyRebuild(company)) {
          pushEvent(state, {
            turn: state.turn,
            kind: "rebuild_complete",
            message: `${company.label} returned to the line (${company.strength} riflemen)`,
            battalionId: bn.id,
          });
        }

        if (
          company.duty === "battalion_reserve" &&
          company.status !== "destroyed" &&
          company.status !== "rebuilding" &&
          company.strength > 0 &&
          company.strength < company.maxStrength
        ) {
          setCompanyStrength(company, company.strength + GARRISON_RECOVERY_PER_TURN);
        }
      }
    }
  }
}

function pushEvent(state: CampaignState, event: CampaignEvent): void {
  state.events = [...(state.events ?? []), event].slice(-MAX_EVENT_LOG);
}

export function recruitPoolLabel(pool: number): string {
  return `${pool} recruits available`;
}

export { REBUILD_RECRUIT_COST, REPLENISH_RECRUIT_CHUNK, VICTORY_RECRUIT_BONUS };
