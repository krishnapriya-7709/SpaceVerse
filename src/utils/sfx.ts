// Web Audio API synthesizer for SPACEVERSE aerospace UI & assembly feedback

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private lastClickTime = 0;

  constructor() {
    try {
      if (localStorage.getItem('gx_sound_muted') === '1') {
        this.muted = true;
      }
    } catch {
      // ignore storage errors
    }
  }

  private getCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AC) this.ctx = new AC();
      } catch {
        return null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private play(notes: [number, number, number][], type: OscillatorType, vol: number): void {
    if (this.muted) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    notes.forEach(([freq, start, dur]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t + start);
      gain.gain.setValueAtTime(0, t + start);
      gain.gain.linearRampToValueAtTime(vol, t + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + start);
      osc.stop(t + start + dur + 0.02);
    });
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('gx_sound_muted', this.muted ? '1' : '0');
    } catch {
      // ignore
    }
    return this.muted;
  }

  click(): void {
    const now = Date.now();
    if (now - this.lastClickTime < 60) return;
    this.lastClickTime = now;
    this.play([[520, 0, 0.055], [780, 0.04, 0.045]], 'square', 0.05);
  }

  select(): void {
    this.play([[380, 0, 0.04], [570, 0.03, 0.065]], 'sine', 0.08);
  }

  snapCorrect(): void {
    this.play([[587, 0, 0.07], [880, 0.07, 0.11], [1174, 0.14, 0.16]], 'triangle', 0.11);
  }

  snapWrong(): void {
    this.play([[180, 0, 0.09], [140, 0.09, 0.1]], 'sawtooth', 0.08);
  }

  taskComplete(): void {
    this.play([[523, 0, 0.12], [659, 0.11, 0.13], [784, 0.22, 0.22]], 'sine', 0.12);
  }

  levelComplete(): void {
    this.play(
      [
        [523, 0, 0.14],
        [659, 0.12, 0.14],
        [784, 0.24, 0.14],
        [1047, 0.36, 0.3],
      ],
      'triangle',
      0.13
    );
  }

  badgeUnlock(): void {
    this.play(
      [
        [784, 0, 0.1],
        [988, 0.09, 0.1],
        [1175, 0.18, 0.1],
        [1568, 0.27, 0.24],
      ],
      'sine',
      0.12
    );
  }

  navigate(): void {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.22);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  }
}

export const SFX = new SoundEngine();
