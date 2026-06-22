import type { CampaignState } from "../types";
import { playableDivision } from "../company";
import { getCampaignSummary } from "../CampaignSave";
import { recentCampaignEvents } from "../overextension";
import { renderDivisionMap } from "./divisionMapView";

export interface DivisionScreenHandlers {
  getState: () => CampaignState;
  onMainMenu: () => void;
  onOpenArmy: () => void;
  onSelectBrigade: (brigadeId: string) => void;
}

let bound = false;

function renderEventLog(state: CampaignState): string {
  const events = recentCampaignEvents(state, 5);
  if (events.length === 0) {
    return `<p class="division-events-hint">Front reports will appear here after major actions.</p>`;
  }
  return `
    <h2 class="division-events-title">Front reports</h2>
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

export function renderDivisionScreen(state: CampaignState): void {
  const div = playableDivision(state);
  const map = document.getElementById("division-map");
  const events = document.getElementById("division-events");
  const summary = document.getElementById("division-summary");
  const title = document.getElementById("division-title");
  if (!div || !map || !summary || !title) return;

  title.textContent = div.label;
  summary.textContent = `${getCampaignSummary(state)} · Objective: ${state.objectiveLabel}`;
  map.innerHTML = renderDivisionMap(div.brigades, state.objectiveLabel);
  if (events) {
    events.classList.toggle("division-events-empty", (state.events ?? []).length === 0);
    events.innerHTML = renderEventLog(state);
  }
}

export function setupDivisionScreen(handlers: DivisionScreenHandlers): void {
  if (bound) return;
  bound = true;

  document.getElementById("btn-division-menu")?.addEventListener("click", handlers.onMainMenu);
  document.getElementById("btn-division-army")?.addEventListener("click", handlers.onOpenArmy);

  document.getElementById("division-map")?.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest("[data-brigade-id]") as HTMLElement | null;
    if (!target?.dataset.brigadeId) return;
    handlers.onSelectBrigade(target.dataset.brigadeId);
  });
}

export function refreshDivisionScreen(state: CampaignState): void {
  renderDivisionScreen(state);
}
