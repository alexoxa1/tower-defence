import type { SoundName } from "../sim/ports";

export type { SoundName };

export class AudioEngine {
  private ctx: AudioContext | null = null;
  muted = false;

  unlock(): void {
    if (this.ctx) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    void this.ctx.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  play(name: SoundName): void {
    if (this.muted) return;
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;

    const now = ctx.currentTime;
    switch (name) {
      case "shoot":
        this.blip(ctx, now, 420, 0.045, "square", 0.04);
        break;
      case "hit":
        this.blip(ctx, now, 180, 0.06, "triangle", 0.05);
        break;
      case "kill":
        this.blip(ctx, now, 660, 0.09, "sawtooth", 0.055);
        this.blip(ctx, now + 0.05, 880, 0.08, "triangle", 0.04);
        break;
      case "build":
        this.blip(ctx, now, 320, 0.08, "triangle", 0.05);
        this.blip(ctx, now + 0.07, 480, 0.1, "triangle", 0.045);
        break;
      case "upgrade":
        this.blip(ctx, now, 520, 0.07, "square", 0.04);
        this.blip(ctx, now + 0.06, 740, 0.1, "triangle", 0.05);
        break;
      case "sell":
        this.blip(ctx, now, 240, 0.12, "sine", 0.04);
        break;
      case "wave":
        this.blip(ctx, now, 300, 0.12, "sawtooth", 0.05);
        this.blip(ctx, now + 0.1, 450, 0.14, "triangle", 0.05);
        break;
      case "clear":
        this.blip(ctx, now, 500, 0.1, "triangle", 0.05);
        this.blip(ctx, now + 0.08, 700, 0.12, "triangle", 0.05);
        break;
      case "life":
        this.blip(ctx, now, 140, 0.16, "sawtooth", 0.07);
        break;
      case "lose":
        this.blip(ctx, now, 220, 0.22, "sawtooth", 0.08);
        this.blip(ctx, now + 0.16, 110, 0.28, "triangle", 0.07);
        break;
    }
  }

  private blip(
    ctx: AudioContext,
    when: number,
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
  ): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.55), when + dur);
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }
}
