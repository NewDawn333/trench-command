import type { CampaignState } from "../types";
import { getCampaignSummary } from "../CampaignSave";
import {
  pendingReinforcementRequests,
  recruitPoolLabel,
  VICTORY_RECRUIT_BONUS,
} from "../recruits";
import { recentCampaignEvents } from "../overextension";

export interface ArmyScreenHandlers {
  getState: () => CampaignState;
  onBackToDivision: () => void;
  onApproveRequest: (requestId: string) => void;
}

let bound = false;

function renderRequestList(state: CampaignState): string {
  const requests = pendingReinforcementRequests(state);
  if (requests.length === 0) {
    return `<p class="army-empty">No reinforcement requests. Depleted or destroyed companies can request men from the brigade map.</p>`;
  }

  return `
    <ul class="army-request-list">
      ${requests
        .map((req) => {
          const canAfford = state.recruitPool >= req.menRequested;
          const action =
            req.kind === "rebuild"
              ? `Rebuild (${req.menRequested} recruits)`
              : `Reinforce (+${req.menRequested} riflemen)`;
          return `
        <li class="army-request">
          <div class="army-request__head">
            <strong>${req.companyLabel}</strong>
            <span class="army-request__unit">${req.battalionLabel}</span>
          </div>
          <p class="army-request__detail">${action} · requested turn ${req.requestedTurn}</p>
          <button
            type="button"
            class="btn btn-active army-request__approve"
            data-approve-request="${req.id}"
            ${canAfford ? "" : "disabled title=\"Not enough recruits\""}
          >Approve</button>
        </li>`;
        })
        .join("")}
    </ul>
  `;
}

function renderEventLog(state: CampaignState): string {
  const events = recentCampaignEvents(state, 6);
  if (events.length === 0) {
    return `<p class="division-events-hint">Reinforcement and front reports appear here.</p>`;
  }
  return `
    <ul class="division-event-list">
      ${events
        .map(
          (ev) =>
            `<li class="division-event division-event-${ev.kind}"><span class="division-event-turn">Turn ${ev.turn}</span> ${ev.message}</li>`,
        )
        .join("")}
    </ul>
  `;
}

export function renderArmyScreen(state: CampaignState): void {
  const title = document.getElementById("army-title");
  const summary = document.getElementById("army-summary");
  const pool = document.getElementById("army-recruit-pool");
  const requests = document.getElementById("army-requests");
  const events = document.getElementById("army-events");
  if (!title || !summary || !pool || !requests) return;

  title.textContent = state.army.label;
  summary.textContent = `${getCampaignSummary(state)} · Objective progress ${state.army.objectiveProgress}%`;
  pool.textContent = `${recruitPoolLabel(state.recruitPool)} · +${state.recruitTricklePerTurn} per turn · +${VICTORY_RECRUIT_BONUS} on battalion victory`;
  requests.innerHTML = renderRequestList(state);
  if (events) {
    events.innerHTML = renderEventLog(state);
  }
}

export function setupArmyScreen(handlers: ArmyScreenHandlers): void {
  if (bound) return;
  bound = true;

  document.getElementById("btn-army-division")?.addEventListener("click", handlers.onBackToDivision);

  document.getElementById("army-requests")?.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("[data-approve-request]") as HTMLElement | null;
    if (!btn?.dataset.approveRequest) return;
    handlers.onApproveRequest(btn.dataset.approveRequest);
  });
}

export function refreshArmyScreen(state: CampaignState): void {
  renderArmyScreen(state);
}
