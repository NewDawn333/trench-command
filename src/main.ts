import { createGame, tick, type GameState } from "./game/Game";
import { Renderer } from "./game/Renderer";
import { InputHandler, bindUI, updateHUD } from "./game/Input";

let game: GameState = createGame();

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const input = new InputHandler(canvas, renderer, () => game);

bindUI(() => game, refreshHUD, input);

function refreshHUD(): void {
  updateHUD(game);
}

let last = performance.now();

function loop(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tick(game, dt);
  renderer.render(game);
  refreshHUD();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

export {};
