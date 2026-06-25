import { CONFIG } from "../types";

/** Per-sector call-up button regen duration (seconds). */
export const CALL_UP_REGEN_SEC = 30;

/** Player MG teams available at mission start. */
export const MG_POOL_START = 4;

/** Maximum player MGs deployable in one trench sector. */
export const MAX_MG_PER_SECTOR = 3;

/** Seconds before the same MG can relocate again. */
export const MG_MOVE_COOLDOWN_SEC = 15;

/** Defender edge when invaders are still moving along the trench (not in bay). */
export const DEFENDER_APPROACH_ADVANTAGE = 1.06;

/** Phase 4 — combat feel */
export const TRENCH_MELEE_DPS = 9;
export const TRENCH_RIFLE_DPS = 4.5;

/** Seconds between shell recovery when a battery is idle. */
export const ARTY_SHELL_REGEN_SEC = 8;

/** Minimum front-line strength to launch a player assault (one platoon). */
export const PLAYER_ASSAULT_MIN_STRENGTH = CONFIG.platoonSize;

/** Enemy needs ~two platoons on the line before a NML push (matches AI mass threshold). */
export const ENEMY_ASSAULT_MIN_STRENGTH = Math.round(CONFIG.platoonSize * 1.75);

/** Phase 2 — effectiveness tuning */
export const EFFECTIVENESS_SURGE_DECAY_SEC = 120;
export const EFFECTIVENESS_SURGE_DECAY_RATE = 50 / EFFECTIVENESS_SURGE_DECAY_SEC;
export const EFFECTIVENESS_STRENGTH_THRESHOLD = 0.2;
export const EFFECTIVENESS_INVADER_FLOOR = 50;
export const EFFECTIVENESS_CALLUP_START = 70;
export const EFFECTIVENESS_STAGING_SETTLE_SEC = 8;
export const EFFECTIVENESS_STAGING_RECOVERY_RATE = 4;
export const EFFECTIVENESS_IDLE_FRONT_SEC = 90;
export const EFFECTIVENESS_IDLE_DRAIN_RATE = 0.3;
export const EFFECTIVENESS_BARRAGE_DRAIN_RATE = 1.5;
export const EFFECTIVENESS_HEADCOUNT_DRAIN_RATE = 0.6;
export const EFFECTIVENESS_REPULSED_GAIN = 15;
export const EFFECTIVENESS_ASSAULT_GAIN = 20;
export const EFFECTIVENESS_NEIGHBOR_GAIN = 8;
