import { createGame, tick, type GameState } from "./game/Game";
import { Renderer } from "./game/Renderer";
import { InputHandler, bindUI, updateHUD } from "./game/Input";
import { audioManager } from "./audio/AudioManager";
import { AudioDirector } from "./audio/AudioDirector";
import {
  loadGameSettings,
  recordMissionResult,
  saveGameSettings,
  type GameSettings,
} from "./app/GameSettings";
import {
  buildMissionSummary,
  captureBaseline,
  type MissionBaseline,
} from "./app/MissionStats";
import { bindMenuSettings, bindDifficultyPicker, renderMissionEnd, updateMenuHighScores } from "./app/Menu";
import { applyControlHintsVisible, showScreen, type AppScreen } from "./app/screens";
import { drawCasualtyChart } from "./app/CasualtyChart";

let game: GameState = createGame();
let baseline: MissionBaseline = captureBaseline(game);
let appSettings: GameSettings = loadGameSettings();
let screen: AppScreen = "menu";
let missionEnded = false;

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const casualtyChartCanvas = document.getElementById("casualty-chart") as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const input = new InputHandler(canvas, renderer, () => game);
const audioDirector = new AudioDirector(audioManager);

let last = performance.now();
let audioUnlocked = false;

function ensureAudio(): void {
  if (audioUnlocked) return;
  audioUnlocked = true;
  void audioManager.unlock();
}

function refreshHUD(): void {
  updateHUD(game);
}

function applySettings(): void {
  saveGameSettings(appSettings);
  applyControlHintsVisible(appSettings.showControlHints);
}

function hideOverlay(): void {
  document.getElementById("overlay")?.classList.add("hidden");
}

function showMissionEnd(): void {
  missionEnded = true;
  const summary = buildMissionSummary(
    game,
    baseline,
    game.phase === "victory" ? "victory" : "defeat",
  );
  const scores = recordMissionResult(summary.outcome === "victory", summary.timeSeconds);

  const overlay = document.getElementById("overlay")!;
  const content = document.getElementById("overlay-content")!;
  overlay.classList.remove("hidden");
  content.innerHTML = renderMissionEnd(summary, scores);

  document.getElementById("btn-retry")?.addEventListener("click", () => {
    hideOverlay();
    startNewGame();
  });
  document.getElementById("btn-menu")?.addEventListener("click", () => {
    hideOverlay();
    goToMenu();
  });
}

function startNewGame(): void {
  ensureAudio();
  game = createGame({
    aiDifficulty: appSettings.aiDifficulty,
    campaignLevel: 1,
  });
  baseline = captureBaseline(game);
  missionEnded = false;
  game.paused = false;
  game.showCasualtyChart = false;
  screen = "game";
  audioDirector.reset(game);
  showScreen("game");
  applySettings();
  document.getElementById("btn-pause")!.textContent = "Pause";
  document.getElementById("casualty-overlay")?.classList.add("hidden");
  document.getElementById("btn-casualties")?.classList.remove("btn-active");
  // Canvas was hidden at init — layout now that the game screen is visible.
  requestAnimationFrame(() => renderer.resize());
  refreshHUD();
}

function goToMenu(): void {
  screen = "menu";
  missionEnded = false;
  hideOverlay();
  showScreen("menu");
  updateMenuHighScores();
}

bindUI(() => game, refreshHUD, input, {
  onMenu: goToMenu,
  isMissionActive: () => screen === "game" && !missionEnded && game.phase === "playing",
  onCasualtyChartChange: (open) => {
    if (open) drawCasualtyChart(casualtyChartCanvas, game.stats.history, game.time);
  },
});

bindMenuSettings(audioManager, appSettings, (s) => {
  appSettings = s;
  applySettings();
});

bindDifficultyPicker(appSettings, (s) => {
  appSettings = s;
  saveGameSettings(appSettings);
});

document.getElementById("btn-new-game")!.addEventListener("click", () => {
  ensureAudio();
  screen = "game";
  startNewGame();
});

document.getElementById("btn-settings")!.addEventListener("click", () => {
  document.getElementById("panel-settings")!.classList.remove("hidden");
  document.getElementById("panel-credits")!.classList.add("hidden");
});

document.getElementById("btn-credits")!.addEventListener("click", () => {
  document.getElementById("panel-credits")!.classList.remove("hidden");
  document.getElementById("panel-settings")!.classList.add("hidden");
});

document.getElementById("btn-settings-close")!.addEventListener("click", () => {
  document.getElementById("panel-settings")!.classList.add("hidden");
});

document.getElementById("btn-credits-close")!.addEventListener("click", () => {
  document.getElementById("panel-credits")!.classList.add("hidden");
});

canvas.addEventListener("pointerdown", ensureAudio, { once: false });
document.getElementById("btn-pause")?.addEventListener("click", ensureAudio);

showScreen("menu");
applySettings();
updateMenuHighScores();

function loop(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (screen === "game") {
    if (!missionEnded) {
      if (game.phase === "playing") {
        tick(game, dt);
        if (audioUnlocked) audioDirector.tick(game, dt);
      } else {
        showMissionEnd();
      }
    }
    renderer.render(game);
    if (game.showCasualtyChart) {
      drawCasualtyChart(casualtyChartCanvas, game.stats.history, game.time);
    }
    refreshHUD();
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

export {};
