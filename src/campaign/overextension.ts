import { COMPANY_MAX_STRENGTH } from "./oob";
import { isBattalionUndermanned } from "./garrison";
import { assaultCompany, lineCompany, playableDivision } from "./company";
import type { CampaignEvent, CampaignState, Brigade, Battalion } from "./types";
import { setCompanyStrength, syncCompanyStatus } from "./company";

export const COUNTER_PUSH_CRITICAL_STRENGTH = Math.floor(COMPANY_MAX_STRENGTH * 0.28);

const MAX_EVENT_LOG = 20;

function brigadeBattalionNeighbors(brigade: Brigade, slot: number): number[] {
  const neighbors: number[] = [];
  if (slot > 0) neighbors.push(slot - 1);
  if (slot < brigade.battalions.length - 1) neighbors.push(slot + 1);
  return neighbors;
}

export function isBattalionVulnerable(battalion: Battalion, brigade: Brigade): boolean {
  if (battalion.controller !== "player" || battalion.role !== "front") return false;
  return brigadeBattalionNeighbors(brigade, battalion.slot).some((idx) => {
    const n = brigade.battalions[idx];
    return n && n.controller !== "player";
  });
}

export function recomputeVulnerableFlags(state: CampaignState, brigadeId?: string): void {
  const div = playableDivision(state);
  if (!div) return;
  for (const bde of div.brigades) {
    if (brigadeId && bde.id !== brigadeId) continue;
    for (const bn of bde.battalions) {
      bn.vulnerable = isBattalionVulnerable(bn, bde);
    }
  }
}

export function counterPushTargets(state: CampaignState, brigadeId: string): Battalion[] {
  const div = playableDivision(state);
  if (!div) return [];
  const bde = div.brigades.find((b) => b.id === brigadeId);
  if (!bde) return [];

  return bde.battalions.filter((bn) => {
    if (!isBattalionUndermanned(bn)) return false;
    return brigadeBattalionNeighbors(bde, bn.slot).some((idx) => bde.battalions[idx]?.vulnerable);
  });
}

function applyCounterPush(state: CampaignState, target: Battalion, brigade: Brigade): CampaignEvent {
  const exposed =
    brigadeBattalionNeighbors(brigade, target.slot)
      .map((idx) => brigade.battalions[idx])
      .find((n) => n?.vulnerable) ?? target;

  target.controller = "enemy";
  const line = lineCompany(target);
  const assault = assaultCompany(target);
  const victim = line ?? assault;
  if (victim) {
    if (victim.status === "critical" || victim.strength <= COUNTER_PUSH_CRITICAL_STRENGTH) {
      victim.strength = 0;
      victim.status = "destroyed";
    } else {
      setCompanyStrength(victim, COUNTER_PUSH_CRITICAL_STRENGTH);
      syncCompanyStatus(victim);
    }
  }

  state.army.objectiveProgress = Math.max(0, state.army.objectiveProgress - 3);
  const message = `${exposed.label} exposed — ${target.label} overrun`;

  return { turn: state.turn, kind: "counter_push", message, battalionId: target.id };
}

export function resolveOverextension(state: CampaignState, brigadeId: string): CampaignEvent[] {
  recomputeVulnerableFlags(state, brigadeId);
  const div = playableDivision(state);
  if (!div) return [];
  const bde = div.brigades.find((b) => b.id === brigadeId);
  if (!bde) return [];

  const targets = counterPushTargets(state, brigadeId);
  if (targets.length === 0) return [];

  const newEvents = targets.map((t) => applyCounterPush(state, t, bde));
  recomputeVulnerableFlags(state, brigadeId);
  state.events = [...(state.events ?? []), ...newEvents].slice(-MAX_EVENT_LOG);
  return newEvents;
}

export function recentCampaignEvents(state: CampaignState, limit = 5): CampaignEvent[] {
  return (state.events ?? []).slice(-limit).reverse();
}

export function subsectorVulnerableLabel(battalion: Battalion): string | null {
  if (!battalion.vulnerable) return null;
  return "Vulnerable — flank exposed";
}
