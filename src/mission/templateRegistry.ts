import type { EnemyCompanyOob } from "../campaign/types";
import table from "./data/templates.json";

export type TerrainKind = "flat" | "ridge" | "mud";

export interface SkirmishOobSpec {
  label: string;
  frontPlatoons: number;
  platoonStrength: number;
  mgCount: number;
  pillboxSectors: number[];
  difficultyTier: number;
}

export interface MissionTemplateDef {
  id: string;
  name: string;
  intel: string[];
  enemyTrenchOffset: number[];
  playerTrenchOffset: number[];
  nmlDepthScale: number;
  wireSectors: number[];
  terrain: TerrainKind[];
  enemySectorWeight: number[];
  wireVariance: number;
  skirmishOob: SkirmishOobSpec;
}

interface TemplateTable {
  templates: Record<string, MissionTemplateDef>;
}

const TEMPLATES = (table as TemplateTable).templates;

export function allTemplateIds(): string[] {
  return Object.keys(TEMPLATES);
}

export function getTemplate(templateId: string): MissionTemplateDef {
  return TEMPLATES[templateId] ?? TEMPLATES.straight;
}

export function templateDisplayName(templateId: string): string {
  return getTemplate(templateId).name;
}

export function templateIntelLines(templateId: string): string[] {
  return getTemplate(templateId).intel;
}

export function skirmishOobFromTemplate(templateId: string): EnemyCompanyOob {
  const template = getTemplate(templateId);
  const spec = template.skirmishOob;
  return {
    id: `skirmish-${templateId}`,
    label: spec.label,
    templateId: template.id,
    platoonStrength: spec.platoonStrength,
    frontPlatoons: spec.frontPlatoons,
    mgCount: spec.mgCount,
    pillboxSectors: spec.pillboxSectors,
    difficultyTier: spec.difficultyTier,
  };
}
