import type { GameState } from "./Game";
import {
  applySelectedMove,
  callUpTroops,
  getArtilleryStatus,
  getStatusText,
  handleArtilleryTap,
  placeMgInSector,
  playerSectorDoubleClick,
  returnToSelectMode,
  selectPlatoonGroup,
  selectPlatoonSingle,
  setMode,
  stopArtilleryAtPoint,
} from "./Game";
import type { Renderer } from "./Renderer";
import { isInNml, isOnSectorStrip, moveTapZoneAt, sectorFromX, sectorStripAction } from "./battlefield";
import { defaultArtyZoneFromPoint } from "./combat";
import { isInvader } from "./platoons";
import type { Platoon } from "../types";

const DOUBLE_TAP_MS = 380;
const DOUBLE_TAP_DIST = 32;

export class InputHandler {
  private dragging = false;
  private dragStart: { x: number; y: number } | null = null;
  private lastTap: { t: number; x: number; y: number } | null = null;
  private pendingSingle: ReturnType<typeof setTimeout> | null = null;
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
    let best: Platoon | null = null;
    let bestDist = Infinity;
    for (const p of game.platoons) {
      if (p.side !== "player" || p.strength <= 0 || p.state === "reserve") continue;
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
      (p.state === "front" || (p.state === "enemy_trench" && isInvader(p)))
    );
  }

  private cancelPendingSingle(): void {
    if (this.pendingSingle) {
      clearTimeout(this.pendingSingle);
      this.pendingSingle = null;
    }
  }

  private scheduleSingleTap(action: () => void): void {
    this.cancelPendingSingle();
    this.pendingSingle = setTimeout(() => {
      this.pendingSingle = null;
      action();
    }, DOUBLE_TAP_MS);
  }

  private onPointerDown(e: PointerEvent): void {
    const game = this.getGame();
    if (game.phase !== "playing") return;
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
      this.cancelPendingSingle();
      this.lastTap = null;

      if (platoonId && this.canGroupSelect(game, platoonId)) {
        selectPlatoonGroup(game, platoonId);
      } else if (!platoonId) {
        playerSectorDoubleClick(game, sectorFromX(x));
      } else {
        selectPlatoonSingle(game, platoonId);
      }
      return;
    }

    this.lastTap = { t: now, x, y };

    this.scheduleSingleTap(() => {
      if (platoonId) {
        selectPlatoonSingle(game, platoonId);
        return;
      }

      if (isInNml(y) && stopArtilleryAtPoint(game, x, y)) {
        return;
      }

      const sector = sectorFromX(x);
      const zone = moveTapZoneAt(y);
      if (game.selectedPlatoons.length > 0 && zone !== "none") {
        applySelectedMove(game, sector, zone);
      } else {
        game.selectedSector = sector;
      }
    });
  }
}

function syncModeButtons(mode: "select" | "artillery"): void {
  document.getElementById("mode-select")?.classList.toggle("btn-active", mode === "select");
  document.getElementById("mode-artillery")?.classList.toggle("btn-active", mode === "artillery");
}

export function bindUI(getGame: () => GameState, onUpdate: () => void, _input: InputHandler): void {
  const pauseBtn = document.getElementById("btn-pause")!;

  pauseBtn.addEventListener("click", () => {
    const g = getGame();
    g.paused = !g.paused;
    pauseBtn.textContent = g.paused ? "Resume" : "Pause";
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
  const overlay = document.getElementById("overlay")!;
  const overlayContent = document.getElementById("overlay-content")!;

  syncModeButtons(game.mode);
  status.textContent = getStatusText(game);
  replacements.textContent = "Sector strip: + Call Up · + MG";
  artyStatus.textContent = getArtilleryStatus(game);

  if (game.phase !== "playing") {
    overlay.classList.remove("hidden");
    overlayContent.innerHTML =
      game.phase === "victory"
        ? `<h2>Sector Captured</h2><p>The entire enemy trench line is yours.</p><button class="btn" id="btn-restart">Next Level</button>`
        : `<h2>Line Lost</h2><p>Your battalion cannot hold the front.</p><button class="btn" id="btn-restart">Try Again</button>`;
    document.getElementById("btn-restart")?.addEventListener("click", () => location.reload());
  } else {
    overlay.classList.add("hidden");
  }
}
