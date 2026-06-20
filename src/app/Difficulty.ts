export type AIDifficulty = "defensive" | "balanced" | "aggressive";

export interface AIProfile {
  label: string;
  /** Scales assault urgency, spread, and counter-attacks. */
  aggression: number;
  massingDurationMin: number;
  massingDurationMax: number;
  assaultThresholdMult: number;
  assaultCooldownMin: number;
  assaultCooldownMax: number;
  artyCooldownMin: number;
  artyCooldownMax: number;
  invaderSpreadMin: number;
  invaderSpreadMax: number;
  invaderSpreadFraction: number;
  counterAttackRate: number;
  reserveCallRate: number;
  pillboxAssaultPenalty: number;
}

const PROFILES: Record<AIDifficulty, AIProfile> = {
  defensive: {
    label: "Defensive",
    aggression: 0.72,
    massingDurationMin: 10,
    massingDurationMax: 18,
    assaultThresholdMult: 1.45,
    assaultCooldownMin: 42,
    assaultCooldownMax: 58,
    artyCooldownMin: 32,
    artyCooldownMax: 48,
    invaderSpreadMin: 5,
    invaderSpreadMax: 8,
    invaderSpreadFraction: 0.35,
    counterAttackRate: 0.06,
    reserveCallRate: 0.22,
    pillboxAssaultPenalty: 1.4,
  },
  balanced: {
    label: "Balanced",
    aggression: 1,
    massingDurationMin: 6,
    massingDurationMax: 12,
    assaultThresholdMult: 1,
    assaultCooldownMin: 28,
    assaultCooldownMax: 42,
    artyCooldownMin: 20,
    artyCooldownMax: 32,
    invaderSpreadMin: 3,
    invaderSpreadMax: 5.5,
    invaderSpreadFraction: 0.5,
    counterAttackRate: 0.14,
    reserveCallRate: 0.38,
    pillboxAssaultPenalty: 1.1,
  },
  aggressive: {
    label: "Aggressive",
    aggression: 1.45,
    massingDurationMin: 2.5,
    massingDurationMax: 5.5,
    assaultThresholdMult: 0.65,
    assaultCooldownMin: 12,
    assaultCooldownMax: 22,
    artyCooldownMin: 12,
    artyCooldownMax: 22,
    invaderSpreadMin: 1.8,
    invaderSpreadMax: 3.2,
    invaderSpreadFraction: 0.65,
    counterAttackRate: 0.24,
    reserveCallRate: 0.55,
    pillboxAssaultPenalty: 1,
  },
};

/** +8% aggression per campaign level above 1 (for v0.4 ladder). */
export function getAIProfile(difficulty: AIDifficulty, campaignLevel = 1): AIProfile {
  const base = { ...PROFILES[difficulty] };
  const ramp = 1 + Math.max(0, campaignLevel - 1) * 0.08;
  const agg = base.aggression * ramp;

  return {
    ...base,
    aggression: agg,
    assaultThresholdMult: base.assaultThresholdMult / ramp,
    assaultCooldownMin: base.assaultCooldownMin / ramp,
    assaultCooldownMax: base.assaultCooldownMax / ramp,
    artyCooldownMin: base.artyCooldownMin / ramp,
    artyCooldownMax: base.artyCooldownMax / ramp,
    invaderSpreadMin: base.invaderSpreadMin / ramp,
    invaderSpreadMax: base.invaderSpreadMax / ramp,
    counterAttackRate: base.counterAttackRate * ramp,
    reserveCallRate: base.reserveCallRate * ramp,
    invaderSpreadFraction: Math.min(0.85, base.invaderSpreadFraction * ramp),
  };
}

export function difficultyDescription(d: AIDifficulty): string {
  switch (d) {
    case "defensive":
      return "Masses longer, holds sectors, sparing with artillery.";
    case "aggressive":
      return "Early assaults, heavy arty, rapid trench overrun.";
    default:
      return "Standard tempo — watch for staging and weak sectors.";
  }
}
