// Web Audio API 8-bit Chiptune Micro-Sound Synthesizer

export type MusicMood = 'day' | 'dusk' | 'night' | 'rain' | 'storm';

const MUSIC_FILES: Record<MusicMood, string> = {
  day: 'audio/pixel-day-loop.wav',
  dusk: 'audio/pixel-dusk-loop.wav',
  night: 'audio/pixel-night-loop.wav',
  rain: 'audio/pixel-rain-loop.wav',
  storm: 'audio/pixel-storm-loop.wav',
};

class PixelAudioEngine {
  private ctx: AudioContext | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private musicBuffers = new Map<MusicMood, AudioBuffer>();
  private musicLoadPromises = new Map<MusicMood, Promise<AudioBuffer>>();
  private musicMood: MusicMood = 'day';
  private lastClickAt = 0;
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

  private async loadMusicBuffer(
    ctx: AudioContext,
    mood: MusicMood
  ): Promise<AudioBuffer> {
    const cached = this.musicBuffers.get(mood);
    if (cached) return cached;

    let promise = this.musicLoadPromises.get(mood);
    if (!promise) {
      promise = fetch(`/${MUSIC_FILES[mood]}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Music request failed: ${response.status}`);
          }
          return response.arrayBuffer();
        })
        .then((buffer) => ctx.decodeAudioData(buffer))
        .then((decoded) => {
          this.musicBuffers.set(mood, decoded);
          return decoded;
        })
        .finally(() => {
          this.musicLoadPromises.delete(mood);
        });
      this.musicLoadPromises.set(mood, promise);
    }
    return promise;
  }

  private async startMusic(): Promise<boolean> {
    const ctx = this.getMusicContext();
    if (!ctx) {
      this.musicEnabled = false;
      return false;
    }

    const mood = this.musicMood;
    try {
      const buffer = await this.loadMusicBuffer(ctx, mood);
      if (!this.musicEnabled || this.musicMood !== mood) {
        return this.musicEnabled;
      }
      if (this.musicSource) return true;

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

  async setMusicEnabled(
    enabled: boolean,
    mood: MusicMood = this.musicMood
  ): Promise<boolean> {
    this.musicMood = mood;
    this.musicEnabled = enabled;

    if (!enabled) {
      this.stopMusic();
      return false;
    }

    return this.startMusic();
  }

  async setMusicMood(mood: MusicMood): Promise<void> {
    if (this.musicMood === mood) return;
    this.musicMood = mood;
    if (!this.musicEnabled) return;
    this.stopMusic();
    await this.startMusic();
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
    const now = performance.now();
    if (now - this.lastClickAt < 45) return;
    this.lastClickAt = now;

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

  playViewerOpen() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [392, 523.25, 659.25].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + index * 0.045;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.028, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.1);
    });
  }

  playViewerClose() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [659.25, 523.25, 392].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + index * 0.04;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.026, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.09);
    });
  }

  playInfoOpen() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [587.33, 880].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + index * 0.04;
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.022, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.07);
    });
  }

  playInfoClose() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [880, 587.33].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + index * 0.04;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.022, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.07);
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

  playCommentOpen() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [440, 660].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + index * 0.045;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.03, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.09);
    });
  }

  playCommentPost() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + index * 0.038;
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.028, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.09);
    });
  }

  playCommentError() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [220, 164.81].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + index * 0.07;
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.025, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.11);
    });
  }

  playReaction(selected: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = selected
      ? [523.25, 659.25, 783.99, 1046.5]
      : [783.99, 659.25, 523.25, 392];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + index * 0.035;
      osc.type = selected ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.03, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.08);
    });
  }

  playHeart(liked: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = liked ? [659.25, 987.77] : [987.77, 659.25];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + index * 0.055;
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.035, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.1);
    });
  }

  playCamera() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.045].forEach((offset, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + offset;
      osc.type = 'square';
      osc.frequency.setValueAtTime(index === 0 ? 1400 : 920, start);
      gain.gain.setValueAtTime(0.028, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.04);
    });
  }

  playCopy() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [880, 1174.66].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + index * 0.045;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.03, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.09);
    });
  }
}

export const pixelAudio = new PixelAudioEngine();
