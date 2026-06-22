import { playableDivision } from "./company";
import { TRANSFER_DELAY_TURNS } from "./constants";
import type { CampaignState, Brigade, Company, Battalion } from "./types";
import { saveCampaignState } from "./CampaignSave";

export function moveCompanyToBattalion(
  brigade: Brigade,
  companyId: string,
  targetBattalionId: string,
): boolean {
  const company = findCompanyInBrigade(brigade, companyId);
  const targetBn = brigade.battalions.find((b) => b.id === targetBattalionId);
  if (!company || !targetBn || company.battalionId === targetBattalionId) return false;

  const sourceBn = brigade.battalions.find((b) => b.companies.some((c) => c.id === companyId));
  if (!sourceBn) return false;

  sourceBn.companies = sourceBn.companies.filter((c) => c.id !== companyId);
  company.battalionId = targetBn.id;
  company.duty = "battalion_reserve";
  targetBn.companies.push(company);
  return true;
}

function findCompanyInBrigade(brigade: Brigade, companyId: string): Company | null {
  for (const bn of brigade.battalions) {
    const c = bn.companies.find((x) => x.id === companyId);
    if (c) return c;
  }
  return null;
}

export function resolvePendingTransfers(state: CampaignState): void {
  const div = playableDivision(state);
  if (!div) return;

  for (const bde of div.brigades) {
    for (const bn of bde.battalions) {
      for (const company of [...bn.companies]) {
        if (
          company.transferTargetBattalionId === null ||
          company.transferArrivesTurn === null ||
          state.turn < company.transferArrivesTurn
        ) {
          continue;
        }
        moveCompanyToBattalion(bde, company.id, company.transferTargetBattalionId);
        company.transferTargetBattalionId = null;
        company.transferArrivesTurn = null;
      }
    }
  }
}

export function queueCompanyTransfer(
  state: CampaignState,
  brigadeId: string,
  companyId: string,
  targetBattalionId: string,
): boolean {
  const div = playableDivision(state);
  if (!div) return false;
  const bde = div.brigades.find((b) => b.id === brigadeId);
  if (!bde) return false;

  const company = findCompanyInBrigade(bde, companyId);
  if (!company || company.battalionId === targetBattalionId) return false;
  if (company.status === "destroyed" || company.status === "rebuilding") return false;
  if (company.transferArrivesTurn !== null) return false;
  if (!companyAvailableForTransfer(company)) return false;

  company.transferTargetBattalionId = targetBattalionId;
  company.transferArrivesTurn = state.turn + TRANSFER_DELAY_TURNS;
  saveCampaignState(state);
  return true;
}

export function companyAvailableForTransfer(company: Company): boolean {
  if (company.status === "destroyed" || company.status === "rebuilding") return false;
  if (company.redeployCooldown > 0) return false;
  if (company.transferArrivesTurn !== null) return false;
  if (company.duty === "line" || company.duty === "assault") return false;
  return true;
}

export function transferTurnsRemaining(company: { transferArrivesTurn: number | null }, turn: number): number {
  if (company.transferArrivesTurn === null) return 0;
  return Math.max(0, company.transferArrivesTurn - turn);
}

export function assignCompanyDuty(battalion: Battalion, companyId: string, duty: Company["duty"]): boolean {
  const company = battalion.companies.find((c) => c.id === companyId);
  if (!company || company.status === "destroyed") return false;
  if (duty === "line" || duty === "assault") {
    const existing = battalion.companies.find((c) => c.duty === duty && c.id !== companyId);
    if (existing) existing.duty = "battalion_reserve";
  }
  company.duty = duty;
  return true;
}
