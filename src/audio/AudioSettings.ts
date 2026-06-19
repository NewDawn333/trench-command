const STORAGE_KEY = "trench-command-audio";

export interface AudioSettings {
  musicVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

const DEFAULTS: AudioSettings = {
  musicVolume: 0.35,
  sfxVolume: 0.7,
  musicEnabled: true,
  sfxEnabled: true,
};

export function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
