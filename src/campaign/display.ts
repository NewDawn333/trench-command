import type { Company, Battalion } from "./types";
import { transferTurnsRemaining } from "./transfers";
import { battalionMissionForce } from "./companyDeployment";
import { battalionCanFight } from "./outcomes";

export function battalionAvailableForMission(battalion: Battalion): boolean {
  if (battalion.role === "brigade_reserve") return false;
  if (battalion.controller === "enemy") return false;
  if (!battalionCanFight(battalion)) return false;
  const line = battalion.companies.find((c) => c.duty === "line");
  const assault = battalion.companies.find((c) => c.duty === "assault");
  if (!line || line.redeployCooldown > 0 || line.status === "destroyed") return false;
  if (!assault || assault.redeployCooldown > 0 || assault.status === "destroyed") return false;
  return true;
}

export function companyStatusLabel(company: Company, turn = 0): string {
  const transferLeft = transferTurnsRemaining(company, turn);
  if (transferLeft > 0) return `Moving ${transferLeft}t`;
  if (company.redeployCooldown > 0) return `Redeploy ${company.redeployCooldown}t`;
  switch (company.status) {
    case "full":
      return "Full";
    case "depleted":
      return "Depleted";
    case "critical":
      return "Critical";
    case "destroyed":
      return "Lost";
    case "rebuilding":
      return `Rebuild ${company.rebuildTurnsRemaining}t`;
  }
}

export function companyDutyLabel(duty: Company["duty"]): string {
  switch (duty) {
    case "line":
      return "Line";
    case "assault":
      return "Assault";
    default:
      return "Battalion reserve";
  }
}

export function battalionStatusLabel(battalion: Battalion): string {
  const force = battalionMissionForce(battalion);
  return `${force.totalEngaged} rifles · ${battalion.controller}`;
}

export function controllerTint(controller: "player" | "enemy" | "contested"): string {
  switch (controller) {
    case "player":
      return "#3d5c3a";
    case "contested":
      return "#5c523a";
    default:
      return "#4a3a3a";
  }
}

/** @deprecated */
export function companyAvailableForMission(company: Company): boolean {
  if (company.status === "destroyed" || company.status === "rebuilding") return false;
  if (company.redeployCooldown > 0) return false;
  if (company.transferArrivesTurn !== null) return false;
  return company.strength > 0;
}
