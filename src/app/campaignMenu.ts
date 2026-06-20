import {
  campaignContinueAvailable,
  CAMPAIGN_OBJECTIVE_LABEL,
  ensureCampaignSaveSlot,
  hasCampaignSave,
} from "../campaign/CampaignSave";

export function initCampaignMenuSlot(): void {
  ensureCampaignSaveSlot();
  refreshCampaignMenuButtons();
}

export function refreshCampaignMenuButtons(): void {
  const campaignBtn = document.getElementById("btn-campaign") as HTMLButtonElement | null;
  const continueBtn = document.getElementById("btn-continue") as HTMLButtonElement | null;
  const hint = document.getElementById("campaign-hint");

  if (campaignBtn) {
    campaignBtn.disabled = true;
    campaignBtn.title = "Division map arrives in v0.7";
  }

  if (continueBtn) {
    const canContinue = campaignContinueAvailable();
    continueBtn.disabled = !canContinue;
    continueBtn.title = canContinue
      ? "Resume campaign"
      : hasCampaignSave()
        ? "Start a campaign in v0.7"
        : "No campaign in progress";
  }

  if (hint) {
    hint.textContent = hasCampaignSave()
      ? `Campaign objective: ${CAMPAIGN_OBJECTIVE_LABEL} · division front unlocks in v0.7`
      : "";
  }
}
