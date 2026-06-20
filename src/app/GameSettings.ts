const SETTINGS_KEY = "trench-command-settings";
const SCORES_KEY = "trench-command-scores";

import type { AIDifficulty } from "./Difficulty";

export interface GameSettings {
  showControlHints: boolean;
  aiDifficulty: AIDifficulty;
  /** Bypass call-up regen, MG pool, and arty regen limits (balance testing). */
  unlimitedResources: boolean;
}

export interface HighScores {
  bestVictoryTime: number | null;
  victories: number;
  defeats: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  showControlHints: true,
  aiDifficulty: "balanced",
  unlimitedResources: false,
};

const DEFAULT_SCORES: HighScores = {
  bestVictoryTime: null,
  victories: 0,
  defeats: 0,
};

export function loadGameSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveGameSettings(settings: GameSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadHighScores(): HighScores {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return { ...DEFAULT_SCORES };
    return { ...DEFAULT_SCORES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SCORES };
  }
}

export function saveHighScores(scores: HighScores): void {
  localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
}

export function recordMissionResult(victory: boolean, timeSeconds: number): HighScores {
  const scores = loadHighScores();
  if (victory) {
    scores.victories += 1;
    if (scores.bestVictoryTime === null || timeSeconds < scores.bestVictoryTime) {
      scores.bestVictoryTime = timeSeconds;
    }
  } else {
    scores.defeats += 1;
  }
  saveHighScores(scores);
  return scores;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
