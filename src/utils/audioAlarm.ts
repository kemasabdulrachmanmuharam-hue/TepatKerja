import type { AlarmToneId, AmbientSoundPreset } from '../types/schedule';

class WebAudioAlarmEngine {
  private ctx: AudioContext | null = null;
  private loopTimer: number | null = null;
  private isPlaying = false;
  private isUnlocked = false;

  // Ambient focus/prep audio state
  private ambientTimer: number | null = null;
  private ambientNodes: AudioNode[] = [];
  private ambientMasterGain: GainNode | null = null;
  private activeAmbientPreset: AmbientSoundPreset = 'off';

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined' || !this.isUnlocked) {
      return null;
    }
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) {
      return null;
    }
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockAudio(): boolean {
    this.isUnlocked = true;
    const ctx = this.ensureContext();
    return ctx !== null;
  }

  private playPattern(tone: AlarmToneId, volume: number): void {
    const ctx = this.ensureContext();
    if (!ctx) {
      return;
    }

    const safeVolume = Math.max(0.05, Math.min(1, volume)) * 0.35;
    const now = ctx.currentTime;

    if (tone === 'lonceng') {
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.16);
        gain.gain.setValueAtTime(0.001, now + idx * 0.16);
        gain.gain.exponentialRampToValueAtTime(safeVolume, now + idx * 0.16 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.16);
        osc.stop(now + idx * 0.16 + 0.6);
      });
      return;
    }

    if (tone === 'ritmis') {
      const pulses = [0, 0.22, 0.44];
      pulses.forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(idx === 2 ? 880 : 660, now + offset);
        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.exponentialRampToValueAtTime(safeVolume, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.18);
      });
      return;
    }

    // 'tegas'
    const beeps = [0, 0.18, 0.36, 0.54];
    beeps.forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(940, now + offset);
      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.exponentialRampToValueAtTime(safeVolume * 0.65, now + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.14);
    });
  }

  public preview(tone: AlarmToneId, volume: number): void {
    this.unlockAudio();
    this.playPattern(tone, volume);
  }

  public startLoop(tone: AlarmToneId, volume: number): void {
    this.stop();
    this.isPlaying = true;
    this.playPattern(tone, volume);
    this.loopTimer = window.setInterval(() => {
      if (!this.isPlaying) {
        return;
      }
      this.playPattern(tone, volume);
    }, 2400);
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.loopTimer !== null) {
      window.clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
  }

  public startAmbient(preset: AmbientSoundPreset, volume: number): void {
    this.stopAmbient();
    if (preset === 'off') {
      return;
    }
    this.unlockAudio();
    const ctx = this.ensureContext();
    if (!ctx) {
      return;
    }

    this.activeAmbientPreset = preset;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(
      Math.max(0.02, Math.min(0.6, volume * 0.28)),
      ctx.currentTime,
    );
    masterGain.connect(ctx.destination);
    this.ambientMasterGain = masterGain;

    if (preset === 'hujan_tenang' || preset === 'white_noise') {
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i += 1) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.04 * white) / 1.04;
        output[i] = preset === 'hujan_tenang' ? lastOut * 2.2 : white * 0.25;
      }

      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = preset === 'hujan_tenang' ? 950 : 1800;

      source.connect(filter);
      filter.connect(masterGain);
      source.start();
      this.ambientNodes.push(source, filter, masterGain);
      return;
    }

    // Melodic ambient chord progressions ('pagi_cerah' / 'lofi_fokus')
    const chords =
      preset === 'pagi_cerah'
        ? [
            [261.63, 329.63, 392.0],
            [293.66, 369.99, 440.0],
            [246.94, 329.63, 392.0],
          ]
        : [
            [220.0, 261.63, 329.63],
            [196.0, 246.94, 293.66],
            [174.61, 220.0, 261.63],
          ];

    let step = 0;
    const playChord = () => {
      if (this.activeAmbientPreset !== preset || !this.ambientMasterGain) {
        return;
      }
      const notes = chords[step % chords.length];
      step += 1;
      const now = ctx.currentTime;
      notes.forEach((freq) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = preset === 'pagi_cerah' ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.linearRampToValueAtTime(0.18, now + 0.6);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + 3.4);
        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 3.5);
      });
    };

    playChord();
    this.ambientTimer = window.setInterval(playChord, 3400);
    this.ambientNodes.push(masterGain);
  }

  public setAmbientVolume(volume: number): void {
    if (this.ambientMasterGain && this.ctx) {
      this.ambientMasterGain.gain.setTargetAtTime(
        Math.max(0.02, Math.min(0.6, volume * 0.28)),
        this.ctx.currentTime,
        0.08,
      );
    }
  }

  public stopAmbient(): void {
    this.activeAmbientPreset = 'off';
    if (this.ambientTimer !== null) {
      window.clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
    for (const node of this.ambientNodes) {
      try {
        if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore already-stopped nodes
      }
    }
    this.ambientNodes = [];
    this.ambientMasterGain = null;
  }
}

export const alarmAudio = new WebAudioAlarmEngine();
