import { CONFIG } from "../types";
import { assaultCompany, lineCompany, COMPANY_MAX_STRENGTH } from "./company";
import { PLATOON_SIZE, PLATOONS_PER_COMPANY } from "./oob";
import type { Battalion } from "./types";

export { PLATOON_SIZE, PLATOONS_PER_COMPANY, COMPANY_MAX_STRENGTH } from "./oob";

export interface BattalionDeploymentPlan {
  linePlatoons: { sector: number; strength: number }[];
  lineRiflemen: number;
  reserveRiflemen: number;
}

export interface BattalionMissionForce {
  lineStrength: number;
  lineMax: number;
  assaultReserve: number;
  assaultMax: number;
  totalEngaged: number;
}

export function companyPlatoonCount(strength: number): number {
  if (strength <= 0) return 0;
  return Math.ceil(strength / PLATOON_SIZE);
}

export function formatCompanyForce(strength: number, _maxStrength: number = COMPANY_MAX_STRENGTH): string {
  return `${companyPlatoonCount(strength)}/${PLATOONS_PER_COMPANY} platoons · ${strength} riflemen`;
}

export function battalionMissionForce(battalion: Battalion): BattalionMissionForce {
  const line = lineCompany(battalion);
  const assault = assaultCompany(battalion);
  const lineStrength = line?.strength ?? 0;
  const assaultReserve = assault?.strength ?? 0;
  return {
    lineStrength,
    lineMax: line?.maxStrength ?? COMPANY_MAX_STRENGTH,
    assaultReserve,
    assaultMax: assault?.maxStrength ?? COMPANY_MAX_STRENGTH,
    totalEngaged: lineStrength + assaultReserve,
  };
}

/** Line company holds the trench (1 platoon per sector). Assault company is the call-up pool. */
export function planBattalionDeployment(battalion: Battalion): BattalionDeploymentPlan {
  const line = lineCompany(battalion);
  const assault = assaultCompany(battalion);
  const lineStrength = line?.strength ?? 0;
  const reserveRiflemen = assault?.strength ?? 0;

  const linePlatoons: { sector: number; strength: number }[] = [];
  if (lineStrength > 0) {
    const count = Math.min(PLATOONS_PER_COMPANY, companyPlatoonCount(lineStrength));
    let remaining = lineStrength;
    for (let i = 0; i < count; i++) {
      const sector = Math.floor((i * CONFIG.sectorCount) / count);
      const slotsLeft = count - i;
      const share = Math.min(PLATOON_SIZE, Math.ceil(remaining / slotsLeft));
      const platoonStrength = Math.max(1, share);
      linePlatoons.push({ sector, strength: platoonStrength });
      remaining -= platoonStrength;
    }
  }

  return {
    linePlatoons,
    lineRiflemen: lineStrength - (linePlatoons.reduce((a, p) => a + p.strength, 0) - lineStrength > 0 ? 0 : 0),
    reserveRiflemen,
  };
}

export function planBattalionDeploymentFixed(battalion: Battalion): BattalionDeploymentPlan {
  const line = lineCompany(battalion);
  const assault = assaultCompany(battalion);
  const lineStrength = line?.strength ?? 0;
  const reserveRiflemen = assault?.strength ?? 0;
  const linePlatoons: { sector: number; strength: number }[] = [];
  let remaining = lineStrength;

  if (lineStrength > 0) {
    const count = Math.min(PLATOONS_PER_COMPANY, Math.max(1, companyPlatoonCount(lineStrength)));
    for (let i = 0; i < count; i++) {
      const sector = Math.floor((i * CONFIG.sectorCount) / count);
      const slotsLeft = count - i;
      const share = Math.min(PLATOON_SIZE, Math.ceil(remaining / slotsLeft));
      const platoonStrength = Math.max(1, share);
      linePlatoons.push({ sector, strength: platoonStrength });
      remaining -= platoonStrength;
    }
  }

  const deployed = linePlatoons.reduce((a, p) => a + p.strength, 0);
  return {
    linePlatoons,
    lineRiflemen: deployed,
    reserveRiflemen,
  };
}

export function battalionBriefingLines(battalion: Battalion): string[] {
  const force = battalionMissionForce(battalion);
  const plan = planBattalionDeploymentFixed(battalion);
  return [
    `Battalion assault: ${force.totalEngaged} riflemen engaged`,
    `${plan.linePlatoons.length} platoons on the line (${force.lineStrength} riflemen)`,
    `${companyPlatoonCount(force.assaultReserve)} platoons in assault reserve (${force.assaultReserve} riflemen)`,
    `2 companies in battalion reserve (strategic — brigade map)`,
  ];
}
