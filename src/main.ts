import { createGame, playerRetreatMission, tick, type GameState } from "./game/Game";
import { Renderer } from "./game/Renderer";
import { InputHandler, bindUI, updateHUD } from "./game/Input";
import { audioManager } from "./audio/AudioManager";
import { AudioDirector } from "./audio/AudioDirector";
import {
  loadGameSettings,
  loadHighScores,
  recordMissionResult,
  saveGameSettings,
  type GameSettings,
} from "./app/GameSettings";
import { buildMissionOutcome, captureBaseline, type MissionBaseline } from "./app/MissionStats";
import { bindMenuSettings, bindDifficultyPicker, renderMissionEnd, updateMenuHighScores } from "./app/Menu";
import {
  handleCampaignContinue,
  handleCampaignStart,
  initCampaignMenu,
  refreshCampaignMenuButtons,
} from "./app/campaignMenu";
import { applyControlHintsVisible, showScreen, type AppScreen } from "./app/screens";
import { drawCasualtyChart } from "./app/CasualtyChart";
import { renderToasts } from "./app/Toasts";
import type { MissionResult } from "./mission/MissionOutcome";
import type { CampaignState } from "./campaign/types";
import { loadCampaignState, saveCampaignState } from "./campaign/CampaignSave";
import {
  applyCampaignEarlyRetreat,
  applyMissionOutcomeToCampaign,
  briefingBackOut,
} from "./campaign/outcomes";
import { queueCompanyTransfer } from "./campaign/transfers";
import { refreshDivisionScreen, setupDivisionScreen } from "./campaign/ui/divisionScreen";
import { refreshBrigadeScreen, setupBrigadeScreen } from "./campaign/ui/brigadeScreen";
import { refreshArmyScreen, setupArmyScreen } from "./campaign/ui/armyScreen";
import { approveReinforcementRequest, queueReinforcementRequest } from "./campaign/recruits";
import { findBattalion, playableDivision } from "./campaign/company";
import { buildMissionSetup } from "./mission/MissionSetup";
import { createGameFromMission } from "./mission/campaignMission";
import { retreatKind } from "./mission/campaignTactical";

type PlayMode = "skirmish" | "campaign" | null;

let game: GameState = createGame();
let baseline: MissionBaseline = captureBaseline(game);
let appSettings: GameSettings = loadGameSettings();
let screen: AppScreen = "menu";
let playMode: PlayMode = null;
let campaignState: CampaignState | null = null;
let activeBattalionId: string | null = null;
let missionEnded = false;

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const casualtyChartCanvas = document.getElementById("casualty-chart") as HTMLCanvasElement;
const toastContainer = document.getElementById("game-toasts");
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
  if (screen === "game") game.showEffectivenessBadge = appSettings.showEffectivenessBadge;
}

function hideOverlay(): void {
  document.getElementById("overlay")?.classList.add("hidden");
}

function missionResultFromPhase(phase: GameState["phase"]): MissionResult {
  if (phase === "victory") return "victory";
  if (phase === "retreat") return "retreat";
  return "defeat";
}

function playerStrengthRemaining(): number {
  return game.platoons
    .filter((p) => p.side === "player" && p.strength > 0)
    .reduce((a, p) => a + p.strength, 0);
}

function showEarlyRetreatOverlay(): void {
  const overlay = document.getElementById("overlay")!;
  const content = document.getElementById("overlay-content")!;
  overlay.classList.remove("hidden");
  content.innerHTML = `
    <h2>Pulled Back</h2>
    <p>Withdrawn before reaching the enemy trench — light losses, battalion redeploying.</p>
    <div class="overlay-actions">
      <button class="btn btn-active" id="btn-menu">Return to brigade</button>
    </div>
  `;
  document.getElementById("btn-menu")?.addEventListener("click", () => {
    hideOverlay();
    const state = campaignState ?? loadCampaignState();
    if (state?.activeBrigadeId) goToBrigade(state.activeBrigadeId);
    else goToDivision();
  });
}

function handleCampaignWithdraw(): void {
  if (!campaignState || !activeBattalionId) {
    playerRetreatMission(game);
    return;
  }

  const startStrength = game.campaignCompanyStartStrength ?? 0;
  if (retreatKind(game.platoons) === "early") {
    missionEnded = true;
    applyCampaignEarlyRetreat(
      campaignState,
      activeBattalionId,
      startStrength,
      playerStrengthRemaining(),
    );
    campaignState = loadCampaignState();
    activeBattalionId = null;
    showEarlyRetreatOverlay();
    return;
  }

  playerRetreatMission(game);
}

function finishCampaignMission(outcome: ReturnType<typeof buildMissionOutcome>): void {
  if (!campaignState || !activeBattalionId) return;
  applyMissionOutcomeToCampaign(campaignState, activeBattalionId, outcome);
  campaignState = loadCampaignState();
  activeBattalionId = null;
}

function showMissionEnd(): void {
  missionEnded = true;
  const result = missionResultFromPhase(game.phase);
  const mode = playMode === "campaign" ? "campaign" : "skirmish";
  const outcome = buildMissionOutcome(game, baseline, result, mode);

  if (playMode === "campaign") {
    finishCampaignMission(outcome);
  }

  const scores =
    playMode === "skirmish" && result !== "retreat"
      ? recordMissionResult(result === "victory", outcome.durationSec)
      : loadHighScores();

  const overlay = document.getElementById("overlay")!;
  const content = document.getElementById("overlay-content")!;
  overlay.classList.remove("hidden");
  content.innerHTML = renderMissionEnd(outcome, scores, { campaign: playMode === "campaign" });

  document.getElementById("btn-retry")?.addEventListener("click", () => {
    hideOverlay();
    if (playMode === "campaign") return;
    startSkirmish();
  });

  document.getElementById("btn-menu")?.addEventListener("click", () => {
    hideOverlay();
    if (playMode === "campaign") {
      const state = campaignState ?? loadCampaignState();
      if (state?.activeBrigadeId) goToBrigade(state.activeBrigadeId);
      else goToDivision();
    } else {
      goToMenu();
    }
  });
}

function startSkirmish(): void {
  ensureAudio();
  playMode = "skirmish";
  activeBattalionId = null;
  game = createGame({
    aiDifficulty: appSettings.aiDifficulty,
    campaignLevel: 1,
    unlimitedResources: appSettings.unlimitedResources,
    showEffectivenessBadge: appSettings.showEffectivenessBadge,
    skirmishTemplateId: appSettings.skirmishTemplateId,
    skirmishSeed: Date.now(),
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
  requestAnimationFrame(() => renderer.resize());
  refreshHUD();
}

function startCampaignMission(battalionId: string): void {
  if (!campaignState) return;
  const div = playableDivision(campaignState);
  const battalion = div ? findBattalion(div, battalionId) : null;
  if (!battalion) return;

  const setup = buildMissionSetup(battalion, campaignState.turn);
  if (!setup) return;

  ensureAudio();
  playMode = "campaign";
  activeBattalionId = battalionId;
  game = createGameFromMission(setup, battalion, {
    aiDifficulty: appSettings.aiDifficulty,
    unlimitedResources: appSettings.unlimitedResources,
    showEffectivenessBadge: appSettings.showEffectivenessBadge,
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
  requestAnimationFrame(() => renderer.resize());
  refreshHUD();
}

function goToDivision(): void {
  campaignState = loadCampaignState();
  if (campaignState) {
    campaignState.phase = "division";
    campaignState.activeBrigadeId = null;
    saveCampaignState(campaignState);
  }
  playMode = null;
  missionEnded = false;
  hideOverlay();
  screen = "division";
  showScreen("division");
  if (campaignState) refreshDivisionScreen(campaignState);
  refreshCampaignMenuButtons();
}

function goToArmy(): void {
  campaignState = loadCampaignState();
  if (!campaignState) return;
  campaignState.phase = "army";
  saveCampaignState(campaignState);
  playMode = null;
  missionEnded = false;
  hideOverlay();
  screen = "army";
  showScreen("army");
  refreshArmyScreen(campaignState);
  refreshCampaignMenuButtons();
}

function goToBrigade(brigadeId: string): void {
  campaignState = loadCampaignState();
  if (!campaignState) return;
  campaignState.phase = "brigade";
  campaignState.activeBrigadeId = brigadeId;
  saveCampaignState(campaignState);
  playMode = null;
  missionEnded = false;
  hideOverlay();
  screen = "brigade";
  showScreen("brigade");
  refreshBrigadeScreen(campaignState);
  refreshCampaignMenuButtons();
}

function goToMenu(): void {
  screen = "menu";
  playMode = null;
  activeBattalionId = null;
  missionEnded = false;
  hideOverlay();
  showScreen("menu");
  updateMenuHighScores();
  refreshCampaignMenuButtons();
}

function enterCampaign(state: CampaignState): void {
  campaignState = state;
  state.phase = "division";
  saveCampaignState(state);
  goToDivision();
}

bindUI(() => game, refreshHUD, input, {
  onMenu: () => {
    if (playMode === "campaign") {
      const state = campaignState ?? loadCampaignState();
      if (state?.activeBrigadeId) goToBrigade(state.activeBrigadeId);
      else goToDivision();
    } else goToMenu();
  },
  isMissionActive: () => screen === "game" && !missionEnded && game.phase === "playing",
  onCasualtyChartChange: (open) => {
    if (open) drawCasualtyChart(casualtyChartCanvas, game.stats.history, game.time);
  },
});

setupDivisionScreen({
  getState: () => campaignState ?? loadCampaignState()!,
  onMainMenu: goToMenu,
  onOpenArmy: goToArmy,
  onSelectBrigade: (brigadeId) => goToBrigade(brigadeId),
});

setupArmyScreen({
  getState: () => campaignState ?? loadCampaignState()!,
  onBackToDivision: goToDivision,
  onApproveRequest: (requestId) => {
    if (!campaignState) return;
    if (approveReinforcementRequest(campaignState, requestId)) {
      campaignState = loadCampaignState();
      if (campaignState) refreshArmyScreen(campaignState);
    }
  },
});

setupBrigadeScreen({
  getState: () => campaignState ?? loadCampaignState()!,
  onBackToDivision: goToDivision,
  onBriefingBackOut: (battalionId) => {
    if (!campaignState) return;
    briefingBackOut(campaignState, battalionId);
    campaignState = loadCampaignState();
    if (campaignState) refreshBrigadeScreen(campaignState);
  },
  onBriefingCommit: (battalionId) => {
    startCampaignMission(battalionId);
  },
  onTransfer: (companyId, targetBattalionId) => {
    if (!campaignState || !campaignState.activeBrigadeId) return;
    if (queueCompanyTransfer(campaignState, campaignState.activeBrigadeId, companyId, targetBattalionId)) {
      campaignState = loadCampaignState();
      if (campaignState) refreshBrigadeScreen(campaignState);
    }
  },
  onRequestReinforcement: (companyId) => {
    if (!campaignState) return;
    if (queueReinforcementRequest(campaignState, companyId)) {
      campaignState = loadCampaignState();
      if (campaignState) refreshBrigadeScreen(campaignState);
    }
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

document.getElementById("btn-skirmish")!.addEventListener("click", () => {
  ensureAudio();
  startSkirmish();
});

document.getElementById("btn-campaign")!.addEventListener("click", () => {
  ensureAudio();
  enterCampaign(handleCampaignStart());
});

document.getElementById("btn-continue")!.addEventListener("click", () => {
  const state = handleCampaignContinue();
  if (state) enterCampaign(state);
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

document.getElementById("btn-withdraw")!.addEventListener("click", () => {
  if (screen !== "game" || missionEnded || game.phase !== "playing") return;
  if (playMode === "campaign") handleCampaignWithdraw();
  else playerRetreatMission(game);
});

canvas.addEventListener("pointerdown", ensureAudio, { once: false });
document.getElementById("btn-pause")?.addEventListener("click", ensureAudio);

initCampaignMenu();

if (import.meta.env.DEV) {
  import("./campaign/CampaignSave").then((m) => {
    (window as unknown as { __campaign: typeof m }).__campaign = m;
  });
}

showScreen("menu");
applySettings();
updateMenuHighScores();
refreshCampaignMenuButtons();

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
    renderToasts(toastContainer, game.toasts);
    if (game.showCasualtyChart) {
      drawCasualtyChart(casualtyChartCanvas, game.stats.history, game.time);
    }
    refreshHUD();
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

export {};
