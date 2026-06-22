import { companyLabel } from "./names";
import { COMPANY_MAX_STRENGTH } from "./oob";
import type { Company, CompanyStatus, Battalion, Brigade, Division } from "./types";

export {
  COMPANY_MAX_STRENGTH,
  PLATOON_SIZE,
  PLATOONS_PER_COMPANY,
  COMPANIES_PER_BATTALION,
} from "./oob";

export const COMPANY_REBUILD_TURNS = 4;
export const COMPANY_REBUILD_STRENGTH = Math.floor(COMPANY_MAX_STRENGTH * 0.35);

const STATUS_THRESHOLDS = {
  full: 0.85,
  depleted: 0.4,
} as const;

export function companyStatusFromStrength(strength: number, maxStrength: number): CompanyStatus {
  if (strength <= 0) return "destroyed";
  const ratio = strength / maxStrength;
  if (ratio >= STATUS_THRESHOLDS.full) return "full";
  if (ratio >= STATUS_THRESHOLDS.depleted) return "depleted";
  return "critical";
}

export function syncCompanyStatus(company: Company): void {
  if (company.status === "rebuilding" && company.rebuildTurnsRemaining > 0) return;
  company.status = companyStatusFromStrength(company.strength, company.maxStrength);
}

export function createCompany(
  id: string,
  label: string,
  battalionId: string,
  duty: Company["duty"],
  missionTemplateId: string,
  strength = COMPANY_MAX_STRENGTH,
): Company {
  const company: Company = {
    id,
    label,
    battalionId,
    duty,
    strength,
    maxStrength: COMPANY_MAX_STRENGTH,
    status: "full",
    rebuildTurnsRemaining: 0,
    redeployCooldown: 0,
    transferTargetBattalionId: null,
    transferArrivesTurn: null,
    missionTemplateId,
  };
  syncCompanyStatus(company);
  return company;
}

export function applyCompanyStrengthLoss(company: Company, loss: number): void {
  if (company.status === "rebuilding" || company.status === "destroyed") return;
  company.strength = Math.max(0, company.strength - loss);
  syncCompanyStatus(company);
}

export function setCompanyStrength(company: Company, strength: number): void {
  company.strength = Math.max(0, Math.min(company.maxStrength, strength));
  syncCompanyStatus(company);
}

export function startCompanyRebuild(company: Company): void {
  company.strength = 0;
  company.status = "rebuilding";
  company.rebuildTurnsRemaining = COMPANY_REBUILD_TURNS;
}

export function tickCompanyRebuild(company: Company): boolean {
  if (company.status !== "rebuilding" || company.rebuildTurnsRemaining <= 0) return false;
  company.rebuildTurnsRemaining -= 1;
  if (company.rebuildTurnsRemaining > 0) return false;
  company.strength = COMPANY_REBUILD_STRENGTH;
  syncCompanyStatus(company);
  return true;
}

export function battalionLineCompanies(battalion: Battalion): Company[] {
  return battalion.companies.filter(
    (c) => c.duty !== "battalion_reserve" && c.status !== "destroyed" && c.status !== "rebuilding",
  );
}

export function battalionStrength(battalion: Battalion): number {
  return battalion.companies
    .filter((c) => c.status !== "destroyed" && c.status !== "rebuilding")
    .reduce((sum, c) => sum + c.strength, 0);
}

export function brigadeStrength(brigade: Brigade): number {
  return brigade.battalions.reduce((sum, bn) => sum + battalionStrength(bn), 0);
}

export function divisionStrength(division: Division): number {
  return division.brigades.reduce((sum, bde) => sum + brigadeStrength(bde), 0);
}

export function findCompanyInDivision(division: Division, companyId: string): Company | null {
  for (const bde of division.brigades) {
    for (const bn of bde.battalions) {
      const found = bn.companies.find((c) => c.id === companyId);
      if (found) return found;
    }
  }
  return null;
}

export function findBattalion(division: Division, battalionId: string): Battalion | null {
  for (const bde of division.brigades) {
    const bn = bde.battalions.find((b) => b.id === battalionId);
    if (bn) return bn;
  }
  return null;
}

export function findBrigade(division: Division, brigadeId: string): Brigade | null {
  return division.brigades.find((b) => b.id === brigadeId) ?? null;
}

export function playableDivision(state: { army: { divisions: Division[] } }): Division | null {
  return state.army.divisions.find((d) => d.playable) ?? null;
}

export function lineCompany(battalion: Battalion): Company | null {
  return battalion.companies.find((c) => c.duty === "line" && c.strength > 0) ?? null;
}

export function assaultCompany(battalion: Battalion): Company | null {
  return battalion.companies.find((c) => c.duty === "assault" && c.strength > 0) ?? null;
}

/** @deprecated use findCompanyInDivision */
export function findCompany(division: Division, companyId: string): Company | null {
  return findCompanyInDivision(division, companyId);
}

/** @deprecated */
export function subsectorLineCompanies(_sub: unknown): Company[] {
  return [];
}

/** @deprecated */
export function subsectorLineStrength(_sub: unknown): number {
  return 0;
}

/** @deprecated */
export function subsectorTotalStrength(_sub: unknown): number {
  return 0;
}

/** @deprecated */
export function subsectorCompanies(_sub: unknown): Company[] {
  return [];
}

export function assignDefaultCompanyDuties(battalion: Battalion): void {
  const labels: Company["duty"][] = ["line", "assault", "battalion_reserve", "battalion_reserve"];
  battalion.companies.forEach((c, i) => {
    c.duty = labels[i] ?? "battalion_reserve";
  });
}

export function createBattalionCompanies(
  battalionId: string,
  templateId: string,
): Company[] {
  const letters = ["A", "B", "C", "D"];
  const duties: Company["duty"][] = ["line", "assault", "battalion_reserve", "battalion_reserve"];
  return letters.map((letter, i) =>
    createCompany(
      `${battalionId}-co-${i}`,
      companyLabel(letter),
      battalionId,
      duties[i],
      templateId,
    ),
  );
}
