import { MIN_BATTALION_ASSAULT_STRENGTH } from "./constants";
import { assaultCompany, lineCompany } from "./company";
import type { Battalion, Brigade } from "./types";

export function isBattalionUndermanned(battalion: Battalion): boolean {
  const line = lineCompany(battalion);
  const assault = assaultCompany(battalion);
  if (!line || line.strength < MIN_BATTALION_ASSAULT_STRENGTH) return true;
  if (!assault || assault.strength < MIN_BATTALION_ASSAULT_STRENGTH) return true;
  return false;
}

export function battalionGarrisonLabel(battalion: Battalion): string | null {
  if (!isBattalionUndermanned(battalion)) return null;
  return "Understrength — line or assault company depleted";
}

export function brigadeFrontBattalions(brigade: Brigade): Battalion[] {
  if (brigade.threeSectionFront) {
    return brigade.battalions.filter((b) => b.role === "front");
  }
  return brigade.battalions;
}
