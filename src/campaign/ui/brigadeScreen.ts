import type { CampaignState } from "../types";
import { findBrigade, playableDivision } from "../company";
import { battalionBriefingLines } from "../companyDeployment";
import { getCampaignSummary } from "../CampaignSave";
import { battalionAvailableForMission } from "../display";
import { companyAvailableForTransfer } from "../transfers";
import {
  briefingIntelLines,
  buildMissionSetup,
  estimateEnemyStrength,
  templateDisplayName,
} from "../../mission/MissionSetup";
import type { Battalion, Company } from "../types";
import { renderBrigadeMap } from "./brigadeMapView";

export interface BrigadeScreenHandlers {
  getState: () => CampaignState;
  onBackToDivision: () => void;
  onBriefingBackOut: (battalionId: string) => void;
  onBriefingCommit: (battalionId: string) => void;
  onTransfer: (companyId: string, targetBattalionId: string) => void;
}

let bound = false;
let selectedBattalionId: string | null = null;

function activeBrigade(state: CampaignState) {
  const div = playableDivision(state);
  if (!div || !state.activeBrigadeId) return null;
  return findBrigade(div, state.activeBrigadeId);
}

function renderTransferTargets(state: CampaignState, brigadeId: string, company: Company): string {
  const div = playableDivision(state);
  const bde = div ? findBrigade(div, brigadeId) : null;
  if (!bde || !companyAvailableForTransfer(company)) return "";

  const options = bde.battalions
    .filter((bn) => bn.id !== company.battalionId)
    .map(
      (bn) =>
        `<button type="button" class="btn btn-transfer" data-company-id="${company.id}" data-transfer-to="${bn.id}">→ ${bn.label}</button>`,
    )
    .join("");

  if (!options) return "";
  return `
    <div class="briefing-transfer">
      <span class="briefing-transfer-label">Relocate company (1 turn)</span>
      <div class="briefing-transfer-actions">${options}</div>
    </div>
  `;
}

function renderReserveTransfers(state: CampaignState, brigadeId: string, battalion: Battalion): string {
  const reserves = battalion.companies.filter((c) => c.duty === "battalion_reserve");
  return reserves
    .map(
      (c) => `
    <div class="briefing-transfer">
      <span class="briefing-transfer-label">${c.label} — relocate (1 turn)</span>
      ${renderTransferTargets(state, brigadeId, c)}
    </div>
  `,
    )
    .join("");
}

function closeBriefing(): void {
  selectedBattalionId = null;
  document.getElementById("briefing-panel")?.classList.add("hidden");
}

function openBriefing(state: CampaignState, battalionId: string): void {
  const bde = activeBrigade(state);
  if (!bde) return;
  const battalion = bde.battalions.find((b) => b.id === battalionId);
  if (!battalion || !battalionAvailableForMission(battalion)) return;

  const setup = buildMissionSetup(battalion, state.turn);
  const panel = document.getElementById("briefing-panel");
  const content = document.getElementById("briefing-content");
  if (!panel || !content || !setup) return;

  selectedBattalionId = battalionId;
  const intel = briefingIntelLines(setup.templateId, setup.enemyOob, setup.seed);
  const forceLines = battalionBriefingLines(battalion);

  content.innerHTML = `
    <h2>${battalion.label}</h2>
    <p class="briefing-sub">${bde.label} · Line + assault companies on map</p>
    <ul class="briefing-force">${forceLines.map((line) => `<li>${line}</li>`).join("")}</ul>
    <dl class="briefing-stats">
      <dt>Enemy unit</dt><dd>${setup.enemyOob.label}</dd>
      <dt>Enemy strength</dt><dd>~${estimateEnemyStrength(setup.enemyOob)} (estimate)</dd>
      <dt>Terrain</dt><dd>${templateDisplayName(setup.templateId)}</dd>
    </dl>
    <ul class="briefing-intel">${intel.map((line) => `<li>${line}</li>`).join("")}</ul>
    ${renderReserveTransfers(state, bde.id, battalion)}
    <div class="briefing-actions">
      <button type="button" class="btn" id="btn-briefing-back">Back out</button>
      <button type="button" class="btn btn-active" id="btn-briefing-commit">Commit assault</button>
    </div>
  `;
  panel.classList.remove("hidden");
}

export function renderBrigadeScreen(state: CampaignState): void {
  const bde = activeBrigade(state);
  const map = document.getElementById("brigade-map");
  const events = document.getElementById("brigade-events");
  const summary = document.getElementById("brigade-summary");
  const title = document.getElementById("brigade-title");
  if (!bde || !map || !summary || !title) return;

  title.textContent = bde.label;
  summary.textContent = `${getCampaignSummary(state)} · ${bde.threeSectionFront ? "3-section front" : "4-section front"}`;
  map.innerHTML = renderBrigadeMap(bde, state.turn, state.objectiveLabel);
  if (events) {
    const brigadeEvents = (state.events ?? []).slice(-5).reverse();
    events.classList.toggle("division-events-empty", brigadeEvents.length === 0);
    events.innerHTML =
      brigadeEvents.length === 0
        ? `<p class="division-events-hint">Battalion actions and counter-pushes appear here.</p>`
        : `<ul class="division-event-list">${brigadeEvents.map((ev) => `<li class="division-event"><span class="division-event-turn">Turn ${ev.turn}</span> ${ev.message}</li>`).join("")}</ul>`;
  }
}

export function setupBrigadeScreen(handlers: BrigadeScreenHandlers): void {
  if (bound) return;
  bound = true;

  document.getElementById("btn-brigade-division")?.addEventListener("click", handlers.onBackToDivision);

  document.getElementById("brigade-map")?.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest("[data-battalion-id]") as HTMLElement | null;
    if (!target?.dataset.battalionId) return;
    openBriefing(handlers.getState(), target.dataset.battalionId);
  });

  document.getElementById("briefing-panel")?.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;

    const transferBtn = t.closest("[data-transfer-to]") as HTMLElement | null;
    if (transferBtn?.dataset.transferTo && transferBtn.dataset.companyId) {
      handlers.onTransfer(transferBtn.dataset.companyId, transferBtn.dataset.transferTo);
      closeBriefing();
      return;
    }

    if (t.id === "btn-briefing-back") {
      if (selectedBattalionId) handlers.onBriefingBackOut(selectedBattalionId);
      closeBriefing();
    } else if (t.id === "btn-briefing-commit" && selectedBattalionId) {
      const id = selectedBattalionId;
      closeBriefing();
      handlers.onBriefingCommit(id);
    }
  });
}

export function refreshBrigadeScreen(state: CampaignState): void {
  renderBrigadeScreen(state);
  closeBriefing();
}
