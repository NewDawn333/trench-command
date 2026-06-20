import type { MissionOutcome } from "../mission/MissionOutcome";
import { formatTime, loadHighScores, type GameSettings } from "./GameSettings";
import type { AudioManager } from "../audio/AudioManager";
import type { AIDifficulty } from "./Difficulty";
import { difficultyDescription } from "./Difficulty";

function missionEndCopy(outcome: MissionOutcome): { title: string; subtitle: string } {
  switch (outcome.result) {
    case "victory":
      return {
        title: "Sector Captured",
        subtitle: "The entire enemy trench line is yours.",
      };
    case "retreat":
      return {
        title: "Withdrawn",
        subtitle: "Your company pulled back from the sector.",
      };
    default:
      return {
        title: "Line Lost",
        subtitle: "Your battalion cannot hold the front.",
      };
  }
}

export function renderMissionEnd(outcome: MissionOutcome, scores: ReturnType<typeof loadHighScores>): string {
  const { title, subtitle } = missionEndCopy(outcome);

  const bestLine =
    outcome.result === "victory" && scores.bestVictoryTime !== null
      ? `<p class="best-time">Best victory: ${formatTime(scores.bestVictoryTime)}</p>`
      : "";

  const recordLine =
    outcome.result === "retreat"
      ? ""
      : `<p class="record-line">Record: ${scores.victories} wins · ${scores.defeats} losses</p>`;

  return `
    <h2>${title}</h2>
    <p>${subtitle}</p>
    <dl class="mission-stats">
      <dt>Opponent</dt><dd>${outcome.aiDifficulty.charAt(0).toUpperCase() + outcome.aiDifficulty.slice(1)}</dd>
      <dt>Time</dt><dd>${formatTime(outcome.durationSec)}</dd>
      <dt>Sectors held</dt><dd>${outcome.sectorsCaptured} / 8</dd>
      <dt>Strength remaining</dt><dd>${outcome.companyStrengthAfter}</dd>
      <dt>Platoons lost</dt><dd>${outcome.platoonsLost}</dd>
      <dt>Your casualties</dt><dd>${outcome.playerCasualties}</dd>
      <dt>Enemy casualties</dt><dd>${outcome.enemyCasualties}</dd>
      <dt>Shells fired</dt><dd>${outcome.shellsFired}</dd>
      <dt>Assaults ordered</dt><dd>${outcome.assaultsOrdered}</dd>
    </dl>
    ${bestLine}
    ${recordLine}
    <div class="overlay-actions">
      <button class="btn" id="btn-retry">Retry</button>
      <button class="btn btn-active" id="btn-menu">Main Menu</button>
    </div>
  `;
}

export function bindDifficultyPicker(settings: GameSettings, onChange: (s: GameSettings) => void): void {
  const blurb = document.getElementById("difficulty-blurb");
  const syncActive = (): void => {
    document.querySelectorAll(".btn-diff").forEach((btn) => {
      const el = btn as HTMLButtonElement;
      el.classList.toggle("btn-active", el.dataset.difficulty === settings.aiDifficulty);
    });
    if (blurb) blurb.textContent = difficultyDescription(settings.aiDifficulty);
  };

  document.querySelectorAll(".btn-diff").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = (btn as HTMLButtonElement).dataset.difficulty as AIDifficulty;
      if (!d) return;
      settings.aiDifficulty = d;
      onChange({ ...settings });
      syncActive();
    });
  });

  syncActive();
}

export function bindMenuSettings(audio: AudioManager, settings: GameSettings, onSettingsChange: (s: GameSettings) => void): void {
  const musicVol = document.getElementById("menu-music-vol") as HTMLInputElement;
  const sfxVol = document.getElementById("menu-sfx-vol") as HTMLInputElement;
  const musicMute = document.getElementById("menu-music-mute") as HTMLInputElement;
  const sfxMute = document.getElementById("menu-sfx-mute") as HTMLInputElement;
  const hintsToggle = document.getElementById("setting-hints") as HTMLInputElement;
  const unlimitedToggle = document.getElementById("setting-unlimited") as HTMLInputElement;
  const effBadgeToggle = document.getElementById("setting-eff-badge") as HTMLInputElement;

  const sync = (): void => {
    const a = audio.getSettings();
    musicVol.value = String(Math.round(a.musicVolume * 100));
    sfxVol.value = String(Math.round(a.sfxVolume * 100));
    musicMute.checked = !a.musicEnabled;
    sfxMute.checked = !a.sfxEnabled;
    hintsToggle.checked = settings.showControlHints;
    unlimitedToggle.checked = settings.unlimitedResources;
    effBadgeToggle.checked = settings.showEffectivenessBadge;
  };

  musicVol.addEventListener("input", () => audio.updateSettings({ musicVolume: Number(musicVol.value) / 100 }));
  sfxVol.addEventListener("input", () => audio.updateSettings({ sfxVolume: Number(sfxVol.value) / 100 }));
  musicMute.addEventListener("change", () => audio.updateSettings({ musicEnabled: !musicMute.checked }));
  sfxMute.addEventListener("change", () => audio.updateSettings({ sfxEnabled: !sfxMute.checked }));
  hintsToggle.addEventListener("change", () => {
    settings.showControlHints = hintsToggle.checked;
    onSettingsChange({ ...settings });
  });
  unlimitedToggle.addEventListener("change", () => {
    settings.unlimitedResources = unlimitedToggle.checked;
    onSettingsChange({ ...settings });
  });
  effBadgeToggle.addEventListener("change", () => {
    settings.showEffectivenessBadge = effBadgeToggle.checked;
    onSettingsChange({ ...settings });
  });

  sync();
}

export function updateMenuHighScores(): void {
  const el = document.getElementById("menu-scores");
  if (!el) return;
  const scores = loadHighScores();
  const best =
    scores.bestVictoryTime !== null ? `Best time: ${formatTime(scores.bestVictoryTime)} · ` : "";
  el.textContent = `${best}${scores.victories} wins · ${scores.defeats} losses`;
}
