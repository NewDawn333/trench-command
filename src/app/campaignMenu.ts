import {
  campaignContinueAvailable,
  getCampaignSummary,
  loadCampaignState,
  startCampaign,
} from "../campaign/CampaignSave";
import type { CampaignState } from "../campaign/types";

export function initCampaignMenu(): void {
  refreshCampaignMenuButtons();
}

export function refreshCampaignMenuButtons(): void {
  const continueBtn = document.getElementById("btn-continue") as HTMLButtonElement | null;
  const hint = document.getElementById("campaign-hint");
  const state = loadCampaignState();

  if (continueBtn) {
    const canContinue = campaignContinueAvailable();
    continueBtn.disabled = !canContinue;
    continueBtn.title = canContinue ? "Resume division front" : "Start a campaign first";
  }

  if (hint) {
    hint.textContent =
      state && state.phase !== "inactive"
        ? getCampaignSummary(state)
        : "Campaign · BEF Fourth Army · Objective: River Line";
  }
}

export function handleCampaignStart(): CampaignState {
  return startCampaign();
}

export function handleCampaignContinue(): CampaignState | null {
  const state = loadCampaignState();
  if (!state || state.phase === "inactive") return null;
  return state;
}
