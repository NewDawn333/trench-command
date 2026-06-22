import {
  findBattalion,
  findCompanyInDivision,
  lineCompany,
  assaultCompany,
  playableDivision,
  setCompanyStrength,
  syncCompanyStatus,
} from "./company";
import { EARLY_RETREAT_STRENGTH_PENALTY, REDEPLOY_COOLDOWN_TURNS } from "./constants";
import { recomputeVulnerableFlags, resolveOverextension } from "./overextension";
import { resolvePendingTransfers } from "./transfers";
import { awardVictoryRecruits, tickReinforcementPipeline } from "./recruits";
import type { CampaignState, Company, Battalion } from "./types";
import type { MissionOutcome } from "../mission/MissionOutcome";
import { saveCampaignState } from "./CampaignSave";
import { battalionMissionForce } from "./companyDeployment";

function findBattalionInState(state: CampaignState, battalionId: string): Battalion | null {
  const div = playableDivision(state);
  if (!div) return null;
  return findBattalion(div, battalionId);
}

function tickRedeployCooldowns(state: CampaignState): void {
  const div = playableDivision(state);
  if (!div) return;
  for (const bde of div.brigades) {
    for (const bn of bde.battalions) {
      for (const c of bn.companies) {
        if (c.redeployCooldown > 0) c.redeployCooldown -= 1;
      }
    }
  }
}

export function advanceCampaignTurn(state: CampaignState): void {
  state.turn += 1;
  resolvePendingTransfers(state);
  tickRedeployCooldowns(state);
  tickReinforcementPipeline(state);
  state.recruitPool += state.recruitTricklePerTurn;
}

function applyRedeployCooldown(company: Company): void {
  company.redeployCooldown = REDEPLOY_COOLDOWN_TURNS;
}

export function briefingBackOut(state: CampaignState, battalionId: string): void {
  const bn = findBattalionInState(state, battalionId);
  if (!bn) return;
  for (const c of bn.companies) {
    if (c.duty === "line" || c.duty === "assault") applyRedeployCooldown(c);
  }
  advanceCampaignTurn(state);
  saveCampaignState(state);
}

export function applyCampaignEarlyRetreat(
  state: CampaignState,
  battalionId: string,
  missionStartStrength: number,
  tacticalStrengthRemaining: number,
): void {
  const bn = findBattalionInState(state, battalionId);
  if (!bn) return;

  const penalty = Math.ceil(missionStartStrength * EARLY_RETREAT_STRENGTH_PENALTY);
  const nextTotal = Math.max(1, tacticalStrengthRemaining - penalty);
  applyStrengthToBattalion(bn, nextTotal);
  for (const c of bn.companies) {
    if (c.duty === "line" || c.duty === "assault") applyRedeployCooldown(c);
  }
  advanceCampaignTurn(state);
  saveCampaignState(state);
}

function applyStrengthToBattalion(battalion: Battalion, totalStrength: number): void {
  const line = lineCompany(battalion);
  const assault = assaultCompany(battalion);
  if (!line && !assault) return;

  let remaining = totalStrength;
  if (line) {
    const lineShare = assault ? Math.ceil(remaining / 2) : remaining;
    setCompanyStrength(line, Math.min(line.maxStrength, lineShare));
    remaining -= line.strength;
  }
  if (assault) {
    setCompanyStrength(assault, Math.max(0, Math.min(assault.maxStrength, remaining)));
  }
}

function applyTacticalStrengthToBattalion(battalion: Battalion, totalStrength: number): void {
  applyStrengthToBattalion(battalion, totalStrength);
}

export function applyMissionOutcomeToCampaign(
  state: CampaignState,
  battalionId: string,
  outcome: MissionOutcome,
): void {
  const bn = findBattalionInState(state, battalionId);
  if (!bn) return;

  if (outcome.result === "defeat" && outcome.companyStrengthAfter <= 0) {
    for (const c of bn.companies) {
      if (c.duty === "line" || c.duty === "assault") {
        c.strength = 0;
        c.status = "destroyed";
        c.rebuildTurnsRemaining = 0;
      }
    }
  } else {
    applyTacticalStrengthToBattalion(bn, outcome.companyStrengthAfter);
  }

  if (outcome.result === "retreat") {
    for (const c of bn.companies) {
      if (c.duty === "line" || c.duty === "assault") applyRedeployCooldown(c);
    }
  }

  if (outcome.result === "victory") {
    bn.controller = "player";
    state.army.objectiveProgress = Math.min(100, state.army.objectiveProgress + 4);
    awardVictoryRecruits(state);
    resolveOverextension(state, bn.brigadeId);
  } else if (outcome.result === "defeat" && outcome.companyStrengthAfter <= 0) {
    bn.controller = "contested";
  }

  if (outcome.result !== "victory") {
    recomputeVulnerableFlags(state, bn.brigadeId);
  }

  advanceCampaignTurn(state);
  saveCampaignState(state);
}

export function normalizeCampaignState(state: CampaignState): CampaignState {
  const div = playableDivision(state);
  if (!div) return state;
  for (const bde of div.brigades) {
    for (const bn of bde.battalions) {
      if (bn.vulnerable === undefined) bn.vulnerable = false;
      for (const c of bn.companies) {
        if (c.redeployCooldown === undefined) c.redeployCooldown = 0;
        if (c.transferTargetBattalionId === undefined) c.transferTargetBattalionId = null;
        if (c.transferArrivesTurn === undefined) c.transferArrivesTurn = null;
        syncCompanyStatus(c);
      }
    }
  }
  if (!state.events) state.events = [];
  if (!state.reinforcementRequests) state.reinforcementRequests = [];
  if (state.activeBrigadeId === undefined) state.activeBrigadeId = null;
  for (const bde of div.brigades) {
    recomputeVulnerableFlags(state, bde.id);
  }
  return state;
}

export function getCompany(state: CampaignState, companyId: string): Company | null {
  const div = playableDivision(state);
  if (!div) return null;
  return findCompanyInDivision(div, companyId);
}

export function getBattalion(state: CampaignState, battalionId: string): Battalion | null {
  return findBattalionInState(state, battalionId);
}

export function battalionCanFight(battalion: Battalion): boolean {
  const force = battalionMissionForce(battalion);
  return force.lineStrength > 0 && force.totalEngaged > 0;
}
