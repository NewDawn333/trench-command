import type { Battalion } from "../campaign/types";
import type { EnemyBattalionOob } from "../campaign/types";
import { getEnemyBattalionOob } from "../campaign/enemyOob";
import {
  battalionMissionForce,
} from "../campaign/companyDeployment";
import { templateDisplayName, templateIntelLines } from "./templateRegistry";
import { resolveMissionLayout } from "./MissionLayout";

export interface MissionSetup {
  seed: number;
  templateId: string;
  battalionId: string;
  battalionLabel: string;
  brigadeId: string;
  lineStrength: number;
  lineMaxStrength: number;
  assaultReserve: number;
  assaultMaxStrength: number;
  playerStrength: number;
  playerMaxStrength: number;
  enemyOob: EnemyBattalionOob;
}

export { templateDisplayName };

export function briefingIntelLines(templateId: string, oob: EnemyBattalionOob, seed?: number): string[] {
  const lines = [...templateIntelLines(templateId)].slice(0, 3);
  if (seed !== undefined) {
    const layout = resolveMissionLayout({ templateId, seed });
    if (layout.wireSectors.length > 0) {
      lines.push(`Wire belts in sectors ${layout.wireSectors.map((s) => s + 1).join(", ")}`);
    }
  }
  lines.push(`${oob.frontPlatoons} enemy platoons on line · ${oob.platoonStrength} men each`);
  if (oob.mgCount > 0) lines.push(`${oob.mgCount} machine gun team${oob.mgCount > 1 ? "s" : ""}`);
  if (oob.pillboxSectors.length > 0) {
    lines.push(`Pillbox sectors: ${oob.pillboxSectors.map((s) => s + 1).join(", ")}`);
  }
  return lines.slice(0, 6);
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

export function buildMissionSetup(battalion: Battalion, campaignTurn: number): MissionSetup | null {
  const oob = getEnemyBattalionOob(battalion.enemyOobId);
  if (!oob) return null;
  const force = battalionMissionForce(battalion);
  const templateId = battalion.missionTemplateId || oob.templateId;
  const seed = hashSeed(`${battalion.id}:${campaignTurn}:${templateId}`);

  return {
    seed,
    templateId,
    battalionId: battalion.id,
    battalionLabel: battalion.label,
    brigadeId: battalion.brigadeId,
    lineStrength: force.lineStrength,
    lineMaxStrength: force.lineMax,
    assaultReserve: force.assaultReserve,
    assaultMaxStrength: force.assaultMax,
    playerStrength: force.totalEngaged,
    playerMaxStrength: force.lineMax + force.assaultMax,
    enemyOob: oob,
  };
}

export function estimateEnemyStrength(oob: EnemyBattalionOob): number {
  return oob.frontPlatoons * oob.platoonStrength;
}

export { battalionBriefingLines, planBattalionDeploymentFixed } from "../campaign/companyDeployment";
