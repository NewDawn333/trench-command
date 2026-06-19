import { loadAudioSettings, saveAudioSettings, type AudioSettings } from "./AudioSettings";

/** Web Audio implementation — works in browser and Capacitor Android WebView. Swap file URLs in later without changing call sites. */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicNodes: OscillatorNode[] = [];
  private musicLfo: OscillatorNode | null = null;
  private musicPlaying = false;
  private settings: AudioSettings = loadAudioSettings();
  private unlocked = false;

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...partial };
    saveAudioSettings(this.settings);
    this.applyGainLevels();
    if (!this.settings.musicEnabled) this.stopMusic();
    else if (this.unlocked && !this.musicPlaying) this.startMusic();
  }

  /** Must run from a user gesture before first sound on mobile. */
  async unlock(): Promise<void> {
    if (this.unlocked) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    this.applyGainLevels();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.unlocked = true;
    if (this.settings.musicEnabled) this.startMusic();
  }

  private applyGainLevels(): void {
    if (!this.musicGain || !this.sfxGain) return;
    this.musicGain.gain.value = this.settings.musicEnabled ? this.settings.musicVolume : 0;
    this.sfxGain.gain.value = this.settings.sfxEnabled ? this.settings.sfxVolume : 0;
  }

  private ensureCtx(): AudioContext | null {
    return this.unlocked ? this.ctx : null;
  }

  startMusic(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.musicGain || this.musicPlaying || !this.settings.musicEnabled) return;

    this.musicPlaying = true;
    const base = ctx.createOscillator();
    base.type = "sine";
    base.frequency.value = 55;
    const baseGain = ctx.createGain();
    baseGain.gain.value = 0.08;
    base.connect(baseGain);
    baseGain.connect(this.musicGain);
    base.start();

    const pad = ctx.createOscillator();
    pad.type = "triangle";
    pad.frequency.value = 110;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.03;
    pad.connect(padGain);
    padGain.connect(this.musicGain);
    pad.start();

    this.musicLfo = ctx.createOscillator();
    this.musicLfo.type = "sine";
    this.musicLfo.frequency.value = 0.04;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 8;
    this.musicLfo.connect(lfoGain);
    lfoGain.connect(pad.frequency);
    this.musicLfo.start();

    this.musicNodes = [base, pad];
  }

  stopMusic(): void {
    for (const node of this.musicNodes) {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
    }
    this.musicNodes = [];
    if (this.musicLfo) {
      try {
        this.musicLfo.stop();
      } catch {
        /* noop */
      }
      this.musicLfo = null;
    }
    this.musicPlaying = false;
  }

  playRifle(): void {
    this.playNoiseBurst(0.06, 180, 900, 0.12);
  }

  playMg(): void {
    this.playNoiseBurst(0.14, 120, 600, 0.18, 6);
  }

  playWhistle(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.linearRampToValueAtTime(1760, t + 0.15);
    osc.frequency.linearRampToValueAtTime(1320, t + 0.45);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.6);
  }

  playSectorCapture(): void {
    this.playToneSequence([440, 554, 659, 880], 0.12, 0.2);
  }

  playSectorLoss(): void {
    this.playToneSequence([440, 370, 311, 247], 0.14, 0.22, "sawtooth");
  }

  playVictory(): void {
    this.playToneSequence([523, 659, 784, 988, 1175], 0.1, 0.18);
  }

  playDefeat(): void {
    this.playToneSequence([392, 330, 262, 196], 0.15, 0.25, "square");
  }

  playArtyImpact(): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.5);
    this.playNoiseBurst(0.25, 40, 200, 0.22, 1, t);
  }

  playArtyAim(): void {
    this.playToneSequence([220, 330], 0.08, 0.1, "triangle");
  }

  private playToneSequence(
    freqs: number[],
    step: number,
    volume: number,
    type: OscillatorType = "sine",
  ): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;
    const t0 = ctx.currentTime;
    freqs.forEach((freq, i) => {
      const t = t0 + i * step;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + step * 0.95);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + step);
    });
  }

  private playNoiseBurst(
    duration: number,
    lowHz: number,
    highHz: number,
    volume: number,
    bursts = 1,
    startTime?: number,
  ): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;
    const t0 = startTime ?? ctx.currentTime;
    for (let b = 0; b < bursts; b++) {
      const t = t0 + b * (duration / bursts) * 0.6;
      const bufferSize = Math.floor(ctx.sampleRate * (duration / bursts));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = (lowHz + highHz) / 2;
      filter.Q.value = 0.8;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration / bursts);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      source.start(t);
      source.stop(t + duration / bursts + 0.02);
    }
  }
}

export const audioManager = new AudioManager();
