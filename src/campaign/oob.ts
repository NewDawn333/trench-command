import { CONFIG } from "../types";

/** Riflemen per platoon (BEF rifle platoon, game abstraction). */
export const PLATOON_SIZE = 30;

/** Platoons per company (matches 8 tactical sectors). */
export const PLATOONS_PER_COMPANY = CONFIG.sectorCount;

/** Riflemen in a full company. */
export const COMPANY_MAX_STRENGTH = PLATOONS_PER_COMPANY * PLATOON_SIZE;

export const COMPANIES_PER_BATTALION = 4;
export const BATTALIONS_PER_BRIGADE = 4;
export const BRIGADES_PER_DIVISION = 3;

/** Divisions on the army strategic map. */
export const ARMY_DIVISION_COUNT = 10;

/** Map slots (0-based) for the three player-commanded divisions. */
export const PLAYABLE_DIVISION_SLOTS = [2, 4, 6] as const;

/** Battalions holding the brigade front when using a 3-section layout. */
export const BRIGADE_FRONT_BATTALIONS = 3;

export const BATTALION_MAX_STRENGTH = COMPANY_MAX_STRENGTH * COMPANIES_PER_BATTALION;
