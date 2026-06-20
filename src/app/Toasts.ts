import type { SectorController } from "../types";

export type ToastKind = "info" | "good" | "warn";

export interface GameToast {
  message: string;
  timer: number;
  kind: ToastKind;
}

const TOAST_DURATION = 3.2;
const MAX_TOASTS = 5;

export function pushToast(game: { toasts: GameToast[] }, message: string, kind: ToastKind = "info"): void {
  game.toasts.push({ message, timer: TOAST_DURATION, kind });
  if (game.toasts.length > MAX_TOASTS) game.toasts.shift();
}

export function tickToasts(game: { toasts: GameToast[] }, dt: number): void {
  for (const t of game.toasts) t.timer -= dt;
  game.toasts = game.toasts.filter((t) => t.timer > 0);
}

export function renderToasts(container: HTMLElement | null, toasts: GameToast[]): void {
  if (!container) return;
  container.innerHTML = toasts
    .map(
      (t) =>
        `<div class="game-toast game-toast-${t.kind}" style="opacity:${Math.min(1, t.timer / 0.4).toFixed(2)}">${t.message}</div>`,
    )
    .join("");
}

export function toastSectorControlChanges(
  game: { toasts: GameToast[]; prevSectorControllers: SectorController[] },
  controllers: SectorController[],
): void {
  for (let i = 0; i < controllers.length; i++) {
    const prev = game.prevSectorControllers[i];
    const now = controllers[i];
    if (prev !== "player" && now === "player") {
      pushToast(game, `Sector ${i + 1} captured`, "good");
    } else if (prev === "player" && now === "enemy") {
      pushToast(game, `Sector ${i + 1} lost`, "warn");
    } else if (prev === "player" && now === "contested") {
      pushToast(game, `Sector ${i + 1} under pressure`, "warn");
    } else if (prev === "enemy" && now === "contested") {
      pushToast(game, `Sector ${i + 1} assault underway`, "info");
    }
    game.prevSectorControllers[i] = now;
  }
}

export function toastBarrageSectors(
  game: { toasts: GameToast[]; barrageToastSectors: Set<number> },
  sectors: Set<number>,
): void {
  for (const s of sectors) {
    if (!game.barrageToastSectors.has(s)) {
      pushToast(game, `Sector ${s + 1} under barrage`, "warn");
      game.barrageToastSectors.add(s);
    }
  }
  for (const s of game.barrageToastSectors) {
    if (!sectors.has(s)) game.barrageToastSectors.delete(s);
  }
}
