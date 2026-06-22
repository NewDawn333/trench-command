import type { EnemyBattalionOob } from "../campaign/types";
import { PLATOON_SIZE } from "../campaign/oob";
import { CONFIG } from "../types";
import { getTemplate } from "./templateRegistry";

export function skirmishBattalionOob(templateId: string): EnemyBattalionOob {
  const template = getTemplate(templateId);
  const spec = template.skirmishOob;
  return {
    id: `skirmish-${templateId}`,
    label: spec.label,
    templateId: template.id,
    platoonStrength: PLATOON_SIZE,
    frontPlatoons: spec.frontPlatoons,
    mgCount: spec.mgCount,
    pillboxSectors: spec.pillboxSectors,
    difficultyTier: spec.difficultyTier,
  };
}

export function skirmishCompanyMaxStrength(): number {
  return CONFIG.sectorCount * PLATOON_SIZE;
}
