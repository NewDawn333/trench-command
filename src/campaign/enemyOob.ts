import type { EnemyBattalionOob, EnemyOobTable } from "./types";
import table from "./data/enemy-oob.json";
import { PLATOON_SIZE } from "./oob";
import { CONFIG } from "../types";

const OOB = table as unknown as EnemyOobTable;

export function getEnemyBattalionOob(battalionId: string): EnemyBattalionOob {
  const found = OOB.battalions?.[battalionId];
  if (found) return found;
  return generateBattalionOob(battalionId);
}

function generateBattalionOob(battalionId: string): EnemyBattalionOob {
  let h = 0;
  for (let i = 0; i < battalionId.length; i++) h = (h * 31 + battalionId.charCodeAt(i)) >>> 0;
  const tier = (h % 3) + 1;
  const templates = ["straight", "bulge_forward", "re_entrant", "staggered", "ridge_line"];
  return {
    id: battalionId,
    label: `Enemy ${100 + (h % 900)}th Battalion`,
    templateId: templates[h % templates.length],
    platoonStrength: PLATOON_SIZE,
    frontPlatoons: CONFIG.sectorCount,
    mgCount: 1 + (h % 3),
    pillboxSectors: h % 5 === 0 ? [3] : [],
    difficultyTier: tier,
  };
}

export function allEnemyBattalionIds(): string[] {
  return Object.keys(OOB.battalions ?? {});
}
