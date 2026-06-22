import { CONFIG, LAYOUT, NML_DEPTH } from "../types";
import { getTemplate, type TerrainKind } from "./templateRegistry";

export interface MissionLayout {
  templateId: string;
  displayName: string;
  seed: number;
  enemyTrenchOffset: number[];
  playerTrenchOffset: number[];
  nmlTop: number;
  nmlBottom: number;
  wireSectors: number[];
  terrain: TerrainKind[];
  enemySectorWeight: number[];
}

let activeLayout: MissionLayout = defaultMissionLayout();

export function defaultMissionLayout(): MissionLayout {
  return resolveMissionLayout({ templateId: "straight", seed: 0 });
}

export function setActiveMissionLayout(layout: MissionLayout): void {
  activeLayout = layout;
}

export function getMissionLayout(): MissionLayout {
  return activeLayout;
}

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function clampSector(index: number): number {
  return Math.max(0, Math.min(CONFIG.sectorCount - 1, index));
}

function applyWireVariance(base: number[], variance: number, rng: () => number): number[] {
  const wire = new Set(base);
  let tries = 0;
  while (wire.size < base.length + variance && tries < 12) {
    const sector = clampSector(Math.floor(rng() * CONFIG.sectorCount));
    wire.add(sector);
    tries++;
  }
  return [...wire].sort((a, b) => a - b);
}

function jitterOffsets(base: number[], rng: () => number, amount: number): number[] {
  return base.map((offset) => {
    const delta = Math.round((rng() * 2 - 1) * amount);
    return offset + delta;
  });
}

export function resolveMissionLayout(setup: { templateId: string; seed: number }): MissionLayout {
  const template = getTemplate(setup.templateId);
  const rng = mulberry32(setup.seed);
  const depthScale = template.nmlDepthScale;
  const depthDelta = ((depthScale - 1) * NML_DEPTH) / 2;
  const nmlTop = Math.round(LAYOUT.nmlTop + depthDelta);
  const nmlBottom = Math.round(LAYOUT.nmlBottom - depthDelta);

  return {
    templateId: template.id,
    displayName: template.name,
    seed: setup.seed,
    enemyTrenchOffset: jitterOffsets(template.enemyTrenchOffset, rng, 2),
    playerTrenchOffset: [...template.playerTrenchOffset],
    nmlTop,
    nmlBottom,
    wireSectors: applyWireVariance(template.wireSectors, template.wireVariance, rng),
    terrain: [...template.terrain],
    enemySectorWeight: template.enemySectorWeight.map((w) => w * (0.92 + rng() * 0.16)),
  };
}

export function trenchLineY(side: "player" | "enemy", sector: number): number {
  const layout = activeLayout;
  const base = side === "player" ? LAYOUT.playerTrenchY : LAYOUT.enemyTrenchY;
  const offset =
    side === "player"
      ? layout.playerTrenchOffset[clampSector(sector)] ?? 0
      : layout.enemyTrenchOffset[clampSector(sector)] ?? 0;
  return base + offset;
}

export function platoonLineY(side: "player" | "enemy", sector: number): number {
  const y = trenchLineY(side, sector);
  return side === "player" ? y + 12 : y - 12;
}

export function emplacementLineYForSector(side: "player" | "enemy", sector: number): number {
  const y = trenchLineY(side, sector);
  return side === "player" ? y - 16 : y + 16;
}

export function nmlBounds(): { top: number; bottom: number } {
  return { top: activeLayout.nmlTop, bottom: activeLayout.nmlBottom };
}

export function sectorHasWire(sector: number): boolean {
  return activeLayout.wireSectors.includes(clampSector(sector));
}

export function sectorTerrain(sector: number): TerrainKind {
  return activeLayout.terrain[clampSector(sector)] ?? "flat";
}

/** Movement multiplier while crossing NML in a sector. */
export function crossingTerrainMult(sector: number): number {
  let mult = 1;
  if (sectorHasWire(sector)) mult *= 0.65;
  const terrain = sectorTerrain(sector);
  if (terrain === "mud") mult *= 0.75;
  return mult;
}
