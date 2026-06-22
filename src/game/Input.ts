import type { GameState } from "./Game";
import {
  applySelectedMove,
  callUpTroops,
  clearSelection,
  closeCasualtyChart,
  getArtilleryStatus,
  getStatusText,
  handleArtilleryTap,
  moveSelectedMgToSector,
  placeMgInSector,
  playerSectorDoubleClick,
  returnToSelectMode,
  selectPlatoonGroup,
  selectPlatoonSingle,
  selectPlayerMg,
  setMode,
  stopArtilleryAtPoint,
  toggleCasualtyChart,
  togglePause,
} from "./Game";
import type { Renderer } from "./Renderer";
import { emplacementLineY, isInNml, isOnSectorStrip, moveTapZoneAt, platoonFrontY, sectorFromX, sectorStripAction } from "./battlefield";
import { playerMgAtPoint } from "./emplacements";
import { defaultArtyZoneFromPoint } from "./combat";
import { isInvader } from "./platoons";
import type { Platoon } from "../types";

const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_DIST = 32;

export interface GameUIHandlers {
  onMenu: () => void;
  isMissionActive: () => boolean;
  onCasualtyChartChange?: (open: boolean) => void;
}

function syncCasualtyOverlay(open: boolean): void {
  document.getElementById("casualty-overlay")?.classList.toggle("hidden", !open);
  document.getElementById("btn-casualties")?.classList.toggle("btn-active", open);
}

function syncPauseButton(paused: boolean): void {
  const pauseBtn = document.getElementById("btn-pause");
  if (pauseBtn) pauseBtn.textContent = paused ? "Resume" : "Pause";
}

export class InputHandler {
  private dragging = false;
  private dragStart: { x: number; y: number } | null = null;
  private lastTap: { t: number; x: number; y: number } | null = null;
  private activePointerId: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    private renderer: Renderer,
    private getGame: () => GameState,
  ) {
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    canvas.addEventListener("pointermove", (e) => this.onPointerMove(e));
    canvas.addEventListener("pointerup", (e) => this.onPointerUp(e));
    canvas.addEventListener("pointercancel", (e) => this.onPointerUp(e));
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  private platoonAt(game: GameState, x: number, y: number): string | null {
    const mgLine = emplacementLineY("player");
    const troopLine = platoonFrontY("player");
    const tapFavorsMg = Math.abs(y - mgLine) < Math.abs(y - troopLine);

    let best: Platoon | null = null;
    let bestDist = Infinity;
    for (const p of game.platoons) {
      if (p.side !== "player" || p.strength <= 0 || p.state === "reserve") continue;
      if (p.state === "front" && tapFavorsMg) continue;
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < 22 && dist < bestDist) {
        best = p;
        bestDist = dist;
      }
    }
    return best?.id ?? null;
  }

  private canGroupSelect(game: GameState, platoonId: string): boolean {
    const p = game.platoons.find((x) => x.id === platoonId);
    return (
      !!p &&
      p.side === "player" &&
      p.strength > 0 &&
      (p.state === "front" ||
        p.state === "staging" ||
        (p.state === "enemy_trench" && isInvader(p)))
    );
  }

  private onPointerDown(e: PointerEvent): void {
    const game = this.getGame();
    if (game.phase !== "playing" || game.paused) return;
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;

    this.activePointerId = e.pointerId;
    const { x, y } = this.renderer.screenToWorld(e.clientX, e.clientY);
    this.dragging = true;
    this.dragStart = { x, y };

    const strip = sectorStripAction(x, y);
    if (strip?.type === "callup") {
      callUpTroops(game, strip.sector);
      this.dragging = false;
      return;
    }
    if (strip?.type === "mg") {
      placeMgInSector(game, strip.sector);
      this.dragging = false;
      return;
    }

    if (game.mode === "artillery" && isInNml(y)) {
      game.artyPreview = defaultArtyZoneFromPoint(x, y);
    }
  }

  private onPointerMove(e: PointerEvent): void {
    const game = this.getGame();
    if (!this.dragging || e.pointerId !== this.activePointerId) return;
    const { x, y } = this.renderer.screenToWorld(e.clientX, e.clientY);

    if (game.mode === "artillery" && isInNml(y)) {
      game.artyPreview = defaultArtyZoneFromPoint(x, y);
    } else if (game.mode === "artillery") {
      game.artyPreview = null;
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (e.pointerId !== this.activePointerId) return;

    const game = this.getGame();
    if (game.phase !== "playing" || game.paused) {
      this.dragging = false;
      this.dragStart = null;
      this.activePointerId = null;
      return;
    }

    const { x, y } = this.renderer.screenToWorld(e.clientX, e.clientY);
    const moved =
      this.dragStart !== null && Math.hypot(x - this.dragStart.x, y - this.dragStart.y) > 10;

    if (game.mode === "artillery" && this.dragStart && !moved && isInNml(y)) {
      handleArtilleryTap(game, x, y);
      returnToSelectMode(game);
    } else if (game.mode === "artillery") {
      game.artyPreview = null;
      returnToSelectMode(game);
    } else if (game.mode === "select" && !moved) {
      this.handleSelectTap(x, y);
    }

    this.dragging = false;
    this.dragStart = null;
    this.activePointerId = null;
  }

  /**
   * Single taps apply immediately. Double-tap is detected by comparing this tap
   * to the previous one — no debounce timer on selection.
   */
  private handleSelectTap(x: number, y: number): void {
    const game = this.getGame();
    if (game.phase !== "playing") return;
    if (isOnSectorStrip(y)) return;

    const platoonId = this.platoonAt(game, x, y);
    const now = performance.now();
    const isDouble =
      this.lastTap !== null &&
      now - this.lastTap.t < DOUBLE_TAP_MS &&
      Math.hypot(x - this.lastTap.x, y - this.lastTap.y) < DOUBLE_TAP_DIST;

    if (isDouble) {
      this.lastTap = null;
      if (platoonId && this.canGroupSelect(game, platoonId)) {
        selectPlatoonGroup(game, platoonId);
      } else if (!platoonId) {
        if (game.selectedEmplacementId) {
          clearSelection(game);
        } else {
          playerSectorDoubleClick(game, sectorFromX(x));
        }
      } else {
        selectPlatoonSingle(game, platoonId);
      }
      return;
    }

    const mg = playerMgAtPoint(game.emplacements, x, y);

    if (game.selectedEmplacementId && moveTapZoneAt(x, y) === "player_trench") {
      const sector = sectorFromX(x);
      if (moveSelectedMgToSector(game, sector)) {
        this.lastTap = { t: now, x, y };
        return;
      }
    }

    if (mg) {
      selectPlayerMg(game, mg.id);
      this.lastTap = { t: now, x, y };
      return;
    }

    if (platoonId) {
      selectPlatoonSingle(game, platoonId);
    } else if (isInNml(y) && stopArtilleryAtPoint(game, x, y)) {
      /* arty stop */
    } else {
      const sector = sectorFromX(x);
      const zone = moveTapZoneAt(x, y);
      if (game.selectedPlatoons.length > 0 && zone !== "none") {
        applySelectedMove(game, sector, zone);
      } else {
        game.selectedSector = sector;
      }
    }

    this.lastTap = { t: now, x, y };
  }
}

function syncModeButtons(mode: "select" | "artillery"): void {
  document.getElementById("mode-select")?.classList.toggle("btn-active", mode === "select");
  document.getElementById("mode-artillery")?.classList.toggle("btn-active", mode === "artillery");
}

export function bindUI(
  getGame: () => GameState,
  onUpdate: () => void,
  _input: InputHandler,
  handlers: GameUIHandlers,
): void {
  const pauseBtn = document.getElementById("btn-pause")!;

  pauseBtn.addEventListener("click", () => {
    if (!handlers.isMissionActive() && getGame().phase !== "playing") return;
    const g = getGame();
    if (g.showCasualtyChart) return;
    togglePause(g);
    syncPauseButton(g.paused);
    onUpdate();
  });

  document.getElementById("btn-menu-ingame")!.addEventListener("click", () => {
    closeCasualtyChart(getGame());
    syncCasualtyOverlay(false);
    handlers.onMenu();
    syncPauseButton(false);
  });

  const openCasualtyChart = (): void => {
    const g = getGame();
    if (g.phase !== "playing") return;
    const open = toggleCasualtyChart(g);
    syncCasualtyOverlay(open);
    syncPauseButton(g.paused);
    handlers.onCasualtyChartChange?.(open);
    onUpdate();
  };

  document.getElementById("btn-casualties")!.addEventListener("click", openCasualtyChart);
  document.getElementById("btn-casualties-close")!.addEventListener("click", () => {
    const g = getGame();
    closeCasualtyChart(g);
    syncCasualtyOverlay(false);
    syncPauseButton(false);
    handlers.onCasualtyChartChange?.(false);
    onUpdate();
  });

  const modes: Record<string, "select" | "artillery"> = {
    "mode-select": "select",
    "mode-artillery": "artillery",
  };

  for (const [id, mode] of Object.entries(modes)) {
    document.getElementById(id)!.addEventListener("click", () => {
      setMode(getGame(), mode);
      syncModeButtons(mode);
      onUpdate();
    });
  }
}

export function updateHUD(game: GameState): void {
  const status = document.getElementById("status")!;
  const replacements = document.getElementById("replacements")!;
  const artyStatus = document.getElementById("artillery-status")!;

  syncModeButtons(game.mode);
  status.textContent = getStatusText(game);
  if (game.campaignStrengthReserve !== null) {
    const callable = Math.ceil(game.campaignStrengthReserve / 36);
    replacements.textContent = `Assault reserve: ${game.campaignStrengthReserve} riflemen (~${callable} call-ups) · sector strip below`;
  } else {
    replacements.textContent = "Sector strip: + Call Up · + MG";
  }
  artyStatus.textContent = getArtilleryStatus(game);
}
