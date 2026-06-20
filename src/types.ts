export type Side = "player" | "enemy";

export type PlatoonState =
  | "reserve"
  | "staging"
  | "front"
  | "crossing"
  | "enemy_trench"
  | "routing";

export type InteractionMode = "select" | "artillery";

export type CasualtyCause = "mg" | "rifle" | "enemy_arty" | "friendly_arty";

export type SectorController = "enemy" | "contested" | "player";

export interface Vec2 {
  x: number;
  y: number;
}

export interface Platoon {
  id: string;
  side: Side;
  sector: number;
  strength: number;
  maxStrength: number;
  state: PlatoonState;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  morale: number;
  timeOnFront: number;
  assaultId: string | null;
}

export interface FixedEmplacement {
  id: string;
  side: Side;
  sector: number;
  x: number;
  y: number;
  type: "mg" | "pillbox";
  arcStart: number;
  arcEnd: number;
  fireCooldown: number;
}

export interface ArtilleryBattery {
  id: string;
  side: Side;
  ammo: number;
  maxAmmo: number;
  state: "idle" | "aiming" | "firing" | "stopping";
  stateTimer: number;
  targetZone: { x: number; y: number; w: number; h: number } | null;
  shellTimer: number;
  aimDelay: number;
  stopDelay: number;
  /** Accumulator toward next shell when idle and below max ammo. */
  regenTimer: number;
}

export interface ShellImpact {
  x: number;
  y: number;
  side: Side;
  timer: number;
  radius: number;
}

export interface CasualtyEvent {
  x: number;
  y: number;
  cause: CasualtyCause;
  side: Side;
  timer: number;
}

export interface Tracer {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  timer: number;
  side: Side;
}

export type SoundCue =
  | { type: "rifle" }
  | { type: "mg" }
  | { type: "arty_impact" }
  | { type: "whistle" }
  | { type: "arty_aim" }
  | { type: "sector_capture"; sector: number }
  | { type: "sector_loss"; sector: number };

export interface Sector {
  index: number;
  x: number;
  width: number;
  controller: SectorController;
  captureProgress: number;
}

export interface AssaultOrder {
  id: string;
  side: Side;
  sector: number;
  active: boolean;
  /** Offensive push vs. rushing back to own trench under occupation */
  kind: "assault" | "relief";
}

export interface GameConfig {
  sectorCount: number;
  mapWidth: number;
  mapHeight: number;
  platoonsPerSide: number;
  platoonSize: number;
  replacementRate: number;
}

export const CONFIG: GameConfig = {
  sectorCount: 8,
  mapWidth: 1200,
  mapHeight: 600,
  platoonsPerSide: 24,
  platoonSize: 36,
  replacementRate: 0.08,
};

/** Dev mode: uncapped assault thresholds and reinforcements (resources use per-game unlimited flag). */
export const DEV_MODE = false;

/** Unified march speed for trench, staging, lateral, and NML movement. */
export const PLATOON_MOVE_SPEED = 16;

export const LAYOUT = {
  enemyReserveY: 32,
  enemyTrenchY: 78,
  nmlTop: 96,
  nmlBottom: 376,
  playerTrenchY: 396,
  playerStagingY: 476,
  playerReserveY: 546,
  /** Per-sector button strip at map bottom (call-up row + MG row) */
  callUpY: 570,
  callUpRowH: 14,
  mgButtonRowH: 14,
};

export const SECTOR_STRIP_H = LAYOUT.callUpRowH + LAYOUT.mgButtonRowH;

/** Depth of no man's land in world units. */
export const NML_DEPTH = LAYOUT.nmlBottom - LAYOUT.nmlTop;

/** Small-arms reach into NML from own trench line (same both sides). */
export const FIRE_RANGE = {
  /** Trench rifle fire: 1/5 of NML depth. */
  trenchRifle: NML_DEPTH / 5,
  /** MG / pillbox fire: 2/3 of NML depth. */
  emplacement: (NML_DEPTH * 2) / 3,
} as const;
