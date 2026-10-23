// Web Audio API 8-bit Chiptune Micro-Sound Synthesizer

class PixelAudioEngine {
  private ctx: AudioContext | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private musicBuffer: AudioBuffer | null = null;
  private musicLoadPromise: Promise<AudioBuffer> | null = null;
  public enabled: boolean = true;
  public musicEnabled: boolean = false;

  private getMusicContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    return this.getMusicContext();
  }

  private async loadMusicBuffer(ctx: AudioContext): Promise<AudioBuffer> {
    if (this.musicBuffer) return this.musicBuffer;
    if (!this.musicLoadPromise) {
      this.musicLoadPromise = fetch(
        `${import.meta.env.BASE_URL}audio/pixel-night-loop.wav`
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Music request failed: ${response.status}`);
          }
          return response.arrayBuffer();
        })
        .then((buffer) => ctx.decodeAudioData(buffer))
        .then((decoded) => {
          this.musicBuffer = decoded;
          return decoded;
        })
        .finally(() => {
          this.musicLoadPromise = null;
        });
    }
    return this.musicLoadPromise;
  }

  async setMusicEnabled(enabled: boolean): Promise<boolean> {
    this.musicEnabled = enabled;

    if (!enabled) {
      this.stopMusic();
      return false;
    }

    const ctx = this.getMusicContext();
    if (!ctx) {
      this.musicEnabled = false;
      return false;
    }

    try {
      const buffer = await this.loadMusicBuffer(ctx);
      if (!this.musicEnabled || this.musicSource) return this.musicEnabled;

      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      source.buffer = buffer;
      source.loop = true;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.13, now + 0.8);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      this.musicSource = source;
      this.musicGain = gain;
      return true;
    } catch (error) {
      console.warn('[pixel-audio] Failed to start background music', error);
      this.musicEnabled = false;
      this.stopMusic();
      return false;
    }
  }

  private stopMusic() {
    const source = this.musicSource;
    const gain = this.musicGain;
    this.musicSource = null;
    this.musicGain = null;

    if (source && this.ctx) {
      const now = this.ctx.currentTime;
      if (gain) {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      }
      try {
        source.stop(now + 0.32);
      } catch {
        // already stopped
      }
    }
  }

  playClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.035);

    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  }

  playModeSwitch(toTerminal: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = toTerminal ? [523.25, 659.25, 783.99, 1046.5] : [1046.5, 783.99, 659.25, 523.25];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      gain.gain.setValueAtTime(0.045, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.07);
    });
  }

  playThemeSwitch() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.09);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playCommandRun() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.setValueAtTime(720, now + 0.03);
    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }
}

export const pixelAudio = new PixelAudioEngine();
