import { BUILTIN_TRACKS, BuiltInTrack } from '../game/catalog';
import { ComponentHealth, EqSettings } from '../game/types';

export interface AudioFrameMetrics {
  bassEnergy: number;   // 0..1
  voiceEnergy: number;  // 0..1
  driverEnergy: number; // 0..1
  overall: number;      // 0..1
}

export interface LoadedTrack {
  id: string;
  title: string;
  artist: string;
  kind: 'file' | 'builtin';
  objectUrl?: string;
  builtinSpec?: BuiltInTrack;
}

class ChipeoAudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private subGain: GainNode | null = null;
  private bassBandGain: GainNode | null = null;
  private voiceBandGain: GainNode | null = null;
  private driverBandGain: GainNode | null = null;

  private filters: {
    subHpf: BiquadFilterNode;
    hz50: BiquadFilterNode;
    subPunch: BiquadFilterNode;
    hz125: BiquadFilterNode;
    mudCut: BiquadFilterNode;
    hz315: BiquadFilterNode;
    hz750: BiquadFilterNode;
    khz2_2: BiquadFilterNode;
    presence: BiquadFilterNode;
    khz6: BiquadFilterNode;
    khz16: BiquadFilterNode;
  } | null = null;

  private audioEl: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private freqBuffer: Uint8Array<ArrayBuffer> | null = null;

  private builtinTimer: number | null = null;
  private builtinStep = 0;
  private activeTrack: LoadedTrack | null = null;
  private isPlayingState = false;
  private syntheticEnergy = { bass: 0, voice: 0, driver: 0 };

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.82;

      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -8;
      this.limiter.knee.value = 16;
      this.limiter.ratio.value = 5.5;
      this.limiter.attack.value = 0.005;
      this.limiter.release.value = 0.16;

      this.subGain = this.ctx.createGain();
      this.subGain.gain.value = 1.1;

      this.bassBandGain = this.ctx.createGain();
      this.voiceBandGain = this.ctx.createGain();
      this.driverBandGain = this.ctx.createGain();

      const makeFilter = (type: BiquadFilterType, freq: number, q = 1.0): BiquadFilterNode => {
        const f = this.ctx!.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        f.gain.value = 0;
        return f;
      };

      this.filters = {
        subHpf: makeFilter('highpass', 28, 0.7),
        hz50: makeFilter('lowshelf', 52, 0.85),
        subPunch: makeFilter('peaking', 72, 1.15),
        hz125: makeFilter('peaking', 125, 1.1),
        mudCut: makeFilter('peaking', 240, 1.0),
        hz315: makeFilter('peaking', 315, 1.1),
        hz750: makeFilter('peaking', 750, 1.1),
        khz2_2: makeFilter('peaking', 2200, 1.1),
        presence: makeFilter('peaking', 3200, 0.9),
        khz6: makeFilter('peaking', 6000, 1.1),
        khz16: makeFilter('highshelf', 14000, 0.8),
      };

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.72;
      this.freqBuffer = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

      // Chain: subHpf -> sub-bass + studio clarity EQ -> band gains -> subGain -> soft-knee limiter -> masterGain -> analyser -> destination
      this.filters.subHpf
        .connect(this.filters.hz50)
        .connect(this.filters.subPunch)
        .connect(this.filters.hz125)
        .connect(this.filters.mudCut)
        .connect(this.filters.hz315)
        .connect(this.filters.hz750)
        .connect(this.filters.khz2_2)
        .connect(this.filters.presence)
        .connect(this.filters.khz6)
        .connect(this.filters.khz16)
        .connect(this.bassBandGain)
        .connect(this.voiceBandGain)
        .connect(this.driverBandGain)
        .connect(this.subGain)
        .connect(this.limiter)
        .connect(this.masterGain)
        .connect(this.analyser)
        .connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private ensureAudioElement(): HTMLAudioElement {
    const ctx = this.ensureContext();
    if (!this.audioEl) {
      this.audioEl = new Audio();
      this.audioEl.crossOrigin = 'anonymous';
      this.audioEl.loop = true;
      this.mediaSource = ctx.createMediaElementSource(this.audioEl);
      this.mediaSource.connect(this.filters!.subHpf);
    }
    return this.audioEl;
  }

  public getBuiltInTracks(): LoadedTrack[] {
    return BUILTIN_TRACKS.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      kind: 'builtin',
      builtinSpec: t,
    }));
  }

  public async playTrack(track: LoadedTrack): Promise<void> {
    this.stop();
    this.activeTrack = track;
    this.ensureContext();

    if (track.kind === 'file' && track.objectUrl) {
      const el = this.ensureAudioElement();
      el.src = track.objectUrl;
      await el.play();
      this.isPlayingState = true;
    } else if (track.kind === 'builtin' && track.builtinSpec) {
      this.startBuiltInPattern(track.builtinSpec);
      this.isPlayingState = true;
    }
  }

  public pause(): void {
    this.isPlayingState = false;
    if (this.audioEl && !this.audioEl.paused) {
      this.audioEl.pause();
    }
    if (this.builtinTimer !== null) {
      window.clearInterval(this.builtinTimer);
      this.builtinTimer = null;
    }
    this.syntheticEnergy = { bass: 0, voice: 0, driver: 0 };
  }

  public stop(): void {
    this.pause();
    if (this.audioEl) {
      this.audioEl.currentTime = 0;
    }
  }

  public isPlaying(): boolean {
    return this.isPlayingState;
  }

  public getActiveTrack(): LoadedTrack | null {
    return this.activeTrack;
  }

  public getPlaybackTiming(): { currentTime: number; duration: number } {
    if (this.activeTrack?.kind === 'file' && this.audioEl) {
      const duration =
        Number.isFinite(this.audioEl.duration) && this.audioEl.duration > 0
          ? this.audioEl.duration
          : 0;
      return {
        currentTime: this.audioEl.currentTime || 0,
        duration,
      };
    }
    if (this.activeTrack?.kind === 'builtin' && this.activeTrack.builtinSpec) {
      const stepSec = 60 / this.activeTrack.builtinSpec.bpm / 4;
      const duration = 64 * stepSec; // 4-bar loop visual span
      const currentTime = (this.builtinStep % 64) * stepSec;
      return { currentTime, duration };
    }
    return { currentTime: 0, duration: 0 };
  }

  public seekFraction(fraction: number): void {
    const clamped = Math.max(0, Math.min(1, fraction));
    if (this.activeTrack?.kind === 'file' && this.audioEl) {
      if (Number.isFinite(this.audioEl.duration) && this.audioEl.duration > 0) {
        this.audioEl.currentTime = clamped * this.audioEl.duration;
      }
      return;
    }
    if (this.activeTrack?.kind === 'builtin') {
      this.builtinStep = Math.round(clamped * 64);
    }
  }

  public applyEqAndHealth(
    eq: EqSettings,
    health: ComponentHealth,
    masterMultiplier: number,
    kitipoBoost = 1
  ): void {
    if (!this.ctx || !this.filters || !this.masterGain || !this.bassBandGain || !this.voiceBandGain || !this.driverBandGain) {
      return;
    }
    const now = this.ctx.currentTime;
    const redVolMult = Math.max(0.25, Math.min(1.5, (eq.redVol ?? 100) / 100));
    const redSubMult = Math.max(0.35, Math.min(1.5, (eq.redSub ?? 100) / 100));
    const inputBoostMult = eq.redInputBoost ? 1.08 : 1.0;
    const vol = eq.muted ? 0 : (eq.volume / 100) * redVolMult * inputBoostMult * masterMultiplier;
    const overallHealth =
      (health.drivers <= 0 && health.voice <= 0 && health.bass <= 0) ? 0.08 : 1.0;

    this.masterGain.gain.setTargetAtTime(eq.muted ? 0 : Math.max(0.01, vol * overallHealth), now, 0.03);

    const clampedKitipo = Math.max(0, Math.min(2, kitipoBoost));
    if (this.subGain) {
      this.subGain.gain.setTargetAtTime(
        health.bass <= 0 ? 0.6 : (1.0 + clampedKitipo * 0.14) * redSubMult,
        now,
        0.04
      );
    }

    if (this.limiter) {
      const isProc = eq.crossoverEnabled && eq.dspMode === 'processor';
      this.limiter.threshold.setTargetAtTime(
        isProc ? -9 : eq.crossoverEnabled ? -7 : -2,
        now,
        0.04
      );
      this.limiter.ratio.setTargetAtTime(isProc ? 9 : eq.crossoverEnabled ? 7 : 2.5, now, 0.04);
    }

    const redSubBassVal = eq.eqBypass ? 0 : (eq.redSubBass ?? 0) * 0.65;
    const redMidBassVal = eq.eqBypass ? 0 : (eq.redMidBass ?? 0) * 0.65;
    const redMidVal = eq.eqBypass ? 0 : (eq.redMid ?? 0) * 0.65;
    const redTrebleVal = eq.eqBypass ? 0 : (eq.redTreble ?? 0) * 0.65;

    const hz50Val = eq.eqBypass ? 0 : eq.hz50 + redSubBassVal;
    const hz125Val = eq.eqBypass ? 0 : eq.hz125 + redMidBassVal;
    const hz315Val = eq.eqBypass ? 0 : eq.hz315 + redMidVal * 0.5;
    const hz750Val = eq.eqBypass ? 0 : eq.hz750 + redMidVal;
    const khz2_2Val = eq.eqBypass ? 0 : eq.khz2_2 + redMidVal * 0.7;
    const khz6Val = eq.eqBypass ? 0 : eq.khz6 + redTrebleVal * 0.8;
    const khz16Val = eq.eqBypass ? 0 : eq.khz16 + redTrebleVal;

    // Shape LPF sub shelf frequency & HPF mid clarity using crossover / processor DSP settings
    if (eq.crossoverEnabled) {
      this.filters.subHpf.frequency.setTargetAtTime(eq.dspMode === 'processor' ? 32 : 28, now, 0.05);
      this.filters.hz50.frequency.setTargetAtTime(Math.max(46, Math.min(110, eq.lpfSubHz * 0.56)), now, 0.05);
      this.filters.hz315.frequency.setTargetAtTime(Math.max(180, Math.min(400, eq.hpfVoiceHz * 1.4)), now, 0.05);
    } else {
      this.filters.subHpf.frequency.setTargetAtTime(24, now, 0.05);
      this.filters.hz50.frequency.setTargetAtTime(52, now, 0.05);
      this.filters.hz315.frequency.setTargetAtTime(315, now, 0.05);
    }

    const subCurveDb = ((eq.subLevel - 45) / 55) * 7.5 + clampedKitipo * 2.2;
    const punchDb = ((eq.subLevel - 40) / 60) * 5.0 + clampedKitipo * 1.8;

    // If a component is burned, heavily attenuate or choke its corresponding band
    this.filters.hz50.gain.setTargetAtTime(
      health.bass <= 0 ? -24 : Math.max(-16, Math.min(18, hz50Val + subCurveDb)),
      now,
      0.04
    );
    this.filters.subPunch.gain.setTargetAtTime(
      health.bass <= 0 ? -22 : Math.max(-14, Math.min(14, punchDb + redSubBassVal * 0.4)),
      now,
      0.04
    );
    this.filters.hz125.gain.setTargetAtTime(
      health.bass <= 0 ? -18 : Math.max(-16, Math.min(16, hz125Val)),
      now,
      0.04
    );
    this.filters.mudCut.gain.setTargetAtTime(eq.eqBypass ? 0 : -2.0, now, 0.04);
    this.filters.hz315.gain.setTargetAtTime(
      health.voice <= 0 ? -22 : Math.max(-16, Math.min(16, hz315Val)),
      now,
      0.04
    );
    this.filters.hz750.gain.setTargetAtTime(
      health.voice <= 0 ? -24 : Math.max(-16, Math.min(16, hz750Val)),
      now,
      0.04
    );
    this.filters.khz2_2.gain.setTargetAtTime(
      health.voice <= 0 ? -20 : Math.max(-16, Math.min(16, khz2_2Val)),
      now,
      0.04
    );
    this.filters.presence.gain.setTargetAtTime(
      health.drivers <= 0 || eq.eqBypass ? 0 : 1.6,
      now,
      0.04
    );
    this.filters.khz6.gain.setTargetAtTime(
      health.drivers <= 0 ? -26 : Math.max(-16, Math.min(16, khz6Val)),
      now,
      0.04
    );
    this.filters.khz16.gain.setTargetAtTime(
      health.drivers <= 0 ? -26 : Math.max(-16, Math.min(16, khz16Val)),
      now,
      0.04
    );
  }

  public sampleMetrics(): AudioFrameMetrics {
    if (!this.isPlayingState) {
      return { bassEnergy: 0, voiceEnergy: 0, driverEnergy: 0, overall: 0 };
    }

    if (this.analyser && this.freqBuffer) {
      this.analyser.getByteFrequencyData(this.freqBuffer);
      const len = this.freqBuffer.length;
      // fftSize=256 -> 128 bins (~172Hz per bin at 44.1kHz)
      const bassRaw = (this.freqBuffer[0] + this.freqBuffer[1]) / (2 * 255);
      let voiceSum = 0;
      for (let i = 2; i < Math.min(16, len); i++) voiceSum += this.freqBuffer[i];
      const voiceRaw = voiceSum / (14 * 255);

      let driverSum = 0;
      for (let i = 16; i < Math.min(64, len); i++) driverSum += this.freqBuffer[i];
      const driverRaw = driverSum / (48 * 255);

      // Blend with synthetic envelope for immediate built-in responsiveness
      this.syntheticEnergy.bass *= 0.88;
      this.syntheticEnergy.voice *= 0.86;
      this.syntheticEnergy.driver *= 0.84;

      const bassEnergy = Math.min(1, Math.max(bassRaw, this.syntheticEnergy.bass));
      const voiceEnergy = Math.min(1, Math.max(voiceRaw, this.syntheticEnergy.voice));
      const driverEnergy = Math.min(1, Math.max(driverRaw, this.syntheticEnergy.driver));
      const overall = Math.min(1, bassEnergy * 0.5 + voiceEnergy * 0.3 + driverEnergy * 0.2);

      return { bassEnergy, voiceEnergy, driverEnergy, overall };
    }

    return { bassEnergy: 0.4, voiceEnergy: 0.3, driverEnergy: 0.25, overall: 0.35 };
  }

  public playSfx(type: 'coin' | 'burn' | 'repair' | 'burst'): void {
    try {
      const ctx = this.ensureContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'coin') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.14);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.24);
      } else if (type === 'repair') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(840, now + 0.18);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.26);
      } else if (type === 'burn') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(48, now + 0.32);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.36);
      } else {
        // Bass burst drop
        osc.type = 'sine';
        osc.frequency.setValueAtTime(115, now);
        osc.frequency.exponentialRampToValueAtTime(36, now + 0.45);
        gain.gain.setValueAtTime(0.32, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch {
      // ignore if audio locked
    }
  }

  private startBuiltInPattern(spec: BuiltInTrack): void {
    const stepMs = (60 / spec.bpm / 4) * 1000; // 16th-note grid
    this.builtinStep = 0;

    const triggerStep = () => {
      if (!this.ctx || !this.filters) return;
      const step = this.builtinStep % 16;
      const now = this.ctx.currentTime;

      // Authentic Dominican Dembow / Chipeo kick & snare syncopation
      const isKick =
        spec.pattern === 'dembow'
          ? step === 0 || step === 4 || step === 8 || step === 12
          : step === 0 || step === 3 || step === 6 || step === 8 || step === 11 || step === 14;

      const isSnare = step === 3 || step === 6 || step === 11 || step === 14;
      const isHat = step % 2 === 1;
      const isLead = step === 0 || step === 6 || step === 10 || step === 12;

      if (isKick) {
        // Punchy upper kick transient + deep sustained 808 subwoofer drop
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(spec.bassHz * 2.6, now);
        osc.frequency.exponentialRampToValueAtTime(spec.bassHz, now + 0.075);
        osc.frequency.exponentialRampToValueAtTime(34, now + 0.44);

        g.gain.setValueAtTime(0.84, now);
        g.gain.exponentialRampToValueAtTime(0.32, now + 0.22);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.46);

        osc.connect(g);
        g.connect(this.filters.subHpf);
        osc.start(now);
        osc.stop(now + 0.48);

        // Warm 2nd-harmonic sub presence so sub bass is audible on laptop & mobile speakers too
        const subHarm = this.ctx.createOscillator();
        const sg = this.ctx.createGain();
        subHarm.type = 'triangle';
        subHarm.frequency.setValueAtTime(spec.bassHz * 2, now);
        subHarm.frequency.exponentialRampToValueAtTime(spec.bassHz * 1.45, now + 0.28);
        sg.gain.setValueAtTime(0.18, now);
        sg.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        subHarm.connect(sg);
        sg.connect(this.filters.subHpf);
        subHarm.start(now);
        subHarm.stop(now + 0.32);

        this.syntheticEnergy.bass = 0.96;
      }

      // Sustained 808 bassline note on offbeats for continuous chipeo sub pressure
      const isSubNote = step === 2 || step === 7 || step === 10 || step === 15;
      if (isSubNote) {
        const subNotes = [spec.bassHz, spec.bassHz * 1.12, spec.bassHz * 0.94, spec.bassHz * 1.25];
        const subOsc = this.ctx.createOscillator();
        const subG = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(subNotes[(step % 4) | 0], now);
        subG.gain.setValueAtTime(0.46, now);
        subG.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        subOsc.connect(subG);
        subG.connect(this.filters.subHpf);
        subOsc.start(now);
        subOsc.stop(now + 0.3);
        this.syntheticEnergy.bass = Math.max(this.syntheticEnergy.bass, 0.72);
      }

      if (isSnare) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.09);
        g.gain.setValueAtTime(0.3, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        osc.connect(g);
        g.connect(this.filters.subHpf);
        osc.start(now);
        osc.stop(now + 0.12);

        this.syntheticEnergy.voice = 0.84;
      }

      if (isHat) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(6800, now);
        g.gain.setValueAtTime(0.06, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(g);
        g.connect(this.filters.subHpf);
        osc.start(now);
        osc.stop(now + 0.05);

        this.syntheticEnergy.driver = 0.78;
      }

      if (isLead) {
        const notes = [261.6, 311.1, 349.2, 392.0];
        const freq = notes[(step / 2) % notes.length | 0];
        const osc = this.ctx.createOscillator();
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(2400, now);
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(0.095, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
        osc.connect(lp);
        lp.connect(g);
        g.connect(this.filters.subHpf);
        osc.start(now);
        osc.stop(now + 0.18);

        this.syntheticEnergy.voice = Math.max(this.syntheticEnergy.voice, 0.65);
      }

      // Warm rhythmic Chipeo synth chord stabs on offbeats
      const isChordStab = step === 4 || step === 10 || step === 14;
      if (isChordStab) {
        const chordRoots = [196.0, 233.08, 261.63];
        const root = chordRoots[(this.builtinStep / 4) % chordRoots.length | 0];
        [root, root * 1.2, root * 1.5].forEach((chordFreq) => {
          if (!this.ctx || !this.filters) return;
          const cOsc = this.ctx.createOscillator();
          const cGain = this.ctx.createGain();
          cOsc.type = 'triangle';
          cOsc.frequency.setValueAtTime(chordFreq, now);
          cGain.gain.setValueAtTime(0.038, now);
          cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          cOsc.connect(cGain);
          cGain.connect(this.filters.subHpf);
          cOsc.start(now);
          cOsc.stop(now + 0.15);
        });
        this.syntheticEnergy.voice = Math.max(this.syntheticEnergy.voice, 0.58);
      }

      this.builtinStep++;
    };

    triggerStep();
    this.builtinTimer = window.setInterval(triggerStep, stepMs);
  }
}

export const chipeoAudio = new ChipeoAudioEngine();
