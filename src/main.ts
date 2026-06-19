import { createGame, tick, type GameState } from "./game/Game";
import { Renderer } from "./game/Renderer";
import { InputHandler, bindUI, updateHUD } from "./game/Input";
import { audioManager } from "./audio/AudioManager";
import { AudioDirector } from "./audio/AudioDirector";

let game: GameState = createGame();

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const input = new InputHandler(canvas, renderer, () => game);
const audioDirector = new AudioDirector(audioManager);

audioDirector.reset(game);

bindUI(() => game, refreshHUD, input, audioManager);

function refreshHUD(): void {
  updateHUD(game, audioManager);
}

let last = performance.now();
let audioUnlocked = false;

function ensureAudio(): void {
  if (audioUnlocked) return;
  audioUnlocked = true;
  void audioManager.unlock();
}

canvas.addEventListener("pointerdown", ensureAudio, { once: false });
document.getElementById("btn-pause")?.addEventListener("click", ensureAudio);

function loop(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tick(game, dt);
  if (audioUnlocked) audioDirector.tick(game, dt);
  renderer.render(game);
  refreshHUD();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

export {};
