/** Slow trickle — tune up after playtesting (not infinite). */
export const RECRUIT_TRICKLE_PER_TURN = 8;

/** Bonus recruits added to army pool after a battalion tactical victory. */
export const VICTORY_RECRUIT_BONUS = 20;

/** Recruits required to approve a destroyed-company rebuild. */
export const REBUILD_RECRUIT_COST = 60;

/** Riflemen requested per replenishment for a depleted company. */
export const REPLENISH_RECRUIT_CHUNK = 40;

/** Riflemen recovered per turn for garrisoned battalion-reserve companies. */
export const GARRISON_RECOVERY_PER_TURN = 6;

/** v1 placeholder objective on the Amiens sector map. */
export const CAMPAIGN_OBJECTIVE_LABEL = "River Line";

export const CAMPAIGN_STORAGE_KEY = "trench-command-campaign-v1";

export const MIN_BATTALION_ASSAULT_STRENGTH = 30;

/** Strategic turns before company can enter a new map after briefing back-out. */
export const REDEPLOY_COOLDOWN_TURNS = 2;

/** Strategic turns for company relocation between battalions. */
export const TRANSFER_DELAY_TURNS = 1;

/** Early retreat (before enemy trench) — fraction of company strength lost. */
export const EARLY_RETREAT_STRENGTH_PENALTY = 0.05;
