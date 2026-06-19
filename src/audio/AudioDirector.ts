import type { GameState } from "../game/Game";
import type { CasualtyCause, SectorController, SoundCue } from "../types";
import type { AudioManager } from "./AudioManager";

const RIFLE_MIN_INTERVAL = 0.07;
const MG_MIN_INTERVAL = 0.12;
const ARTY_MIN_INTERVAL = 0.2;

export class AudioDirector {
  private prevControllers: SectorController[] = [];
  private celebratedSectors = new Set<number>();
  private alarmedSectors = new Set<number>();
  private processedCasualties = new WeakSet<object>();
  private processedImpacts = new WeakSet<object>();
  private rifleTimer = 0;
  private mgTimer = 0;
  private artyTimer = 0;
  private victoryPlayed = false;
  private defeatPlayed = false;

  constructor(private audio: AudioManager) {}

  reset(game: GameState): void {
    this.prevControllers = game.sectors.map((s) => s.controller);
    this.celebratedSectors.clear();
    this.alarmedSectors.clear();
    this.victoryPlayed = false;
    this.defeatPlayed = false;
  }

  tick(game: GameState, dt: number): void {
    this.rifleTimer = Math.max(0, this.rifleTimer - dt);
    this.mgTimer = Math.max(0, this.mgTimer - dt);
    this.artyTimer = Math.max(0, this.artyTimer - dt);

    this.processSectorChanges(game);
    this.processCues(game);
    this.processCombatEvents(game);

    if (game.phase === "victory" && !this.victoryPlayed) {
      this.victoryPlayed = true;
      this.audio.playVictory();
    }
    if (game.phase === "defeat" && !this.defeatPlayed) {
      this.defeatPlayed = true;
      this.audio.playDefeat();
    }
  }

  private processSectorChanges(game: GameState): void {
    if (this.prevControllers.length === 0) {
      this.prevControllers = game.sectors.map((s) => s.controller);
      return;
    }

    for (let i = 0; i < game.sectors.length; i++) {
      const s = game.sectors[i];
      const prev = this.prevControllers[i];
      if (
        prev !== "player" &&
        s.controller === "player" &&
        s.captureProgress >= 8 &&
        !this.celebratedSectors.has(i)
      ) {
        this.celebratedSectors.add(i);
        queueSound(game, { type: "sector_capture", sector: i });
      }
      if (prev === "player" && s.controller === "enemy" && !this.alarmedSectors.has(i)) {
        this.alarmedSectors.add(i);
        queueSound(game, { type: "sector_loss", sector: i });
      }
    }
    this.prevControllers = game.sectors.map((s) => s.controller);
  }

  private processCues(game: GameState): void {
    for (const cue of game.soundCues) {
      switch (cue.type) {
        case "whistle":
          this.audio.playWhistle();
          break;
        case "arty_aim":
          this.audio.playArtyAim();
          break;
        case "sector_capture":
          this.audio.playSectorCapture();
          break;
        case "sector_loss":
          this.audio.playSectorLoss();
          break;
        case "rifle":
          if (this.rifleTimer <= 0) {
            this.audio.playRifle();
            this.rifleTimer = RIFLE_MIN_INTERVAL;
          }
          break;
        case "mg":
          if (this.mgTimer <= 0) {
            this.audio.playMg();
            this.mgTimer = MG_MIN_INTERVAL;
          }
          break;
        case "arty_impact":
          if (this.artyTimer <= 0) {
            this.audio.playArtyImpact();
            this.artyTimer = ARTY_MIN_INTERVAL;
          }
          break;
      }
    }
    game.soundCues.length = 0;
  }

  private processCombatEvents(game: GameState): void {
    for (const c of game.events.casualties) {
      if (this.processedCasualties.has(c)) continue;
      this.processedCasualties.add(c);
      this.playCasualtySound(c.cause);
    }

    for (const i of game.events.impacts) {
      if (this.processedImpacts.has(i)) continue;
      this.processedImpacts.add(i);
      if (this.artyTimer <= 0) {
        this.audio.playArtyImpact();
        this.artyTimer = ARTY_MIN_INTERVAL;
      }
    }
  }

  private playCasualtySound(cause: CasualtyCause): void {
    switch (cause) {
      case "mg":
        if (this.mgTimer <= 0) {
          this.audio.playMg();
          this.mgTimer = MG_MIN_INTERVAL;
        }
        break;
      case "rifle":
        if (this.rifleTimer <= 0) {
          this.audio.playRifle();
          this.rifleTimer = RIFLE_MIN_INTERVAL;
        }
        break;
      case "enemy_arty":
      case "friendly_arty":
        if (this.artyTimer <= 0) {
          this.audio.playArtyImpact();
          this.artyTimer = ARTY_MIN_INTERVAL;
        }
        break;
    }
  }
}

export function queueSound(game: GameState, cue: SoundCue): void {
  game.soundCues.push(cue);
}
