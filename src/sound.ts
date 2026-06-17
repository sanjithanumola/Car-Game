class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;

  // Engine Audio Nodes
  private engineOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Drift Screech Nodes
  private screechOsc: OscillatorNode | null = null;
  private screechGain: GainNode | null = null;

  // Nitro Boost Nodes
  private nitroNoise: AudioWorkletNode | ScriptProcessorNode | null = null;
  private nitroGain: GainNode | null = null;

  // Music synthesis parameters
  private musicIntervalId: any = null;

  constructor() {
    // AudioContext is initialized on user interaction
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupEngineSynth();
      this.setupScreechSynth();
      this.setupNitroSynth();
      this.startAmbientMusic();
    } catch (e) {
      console.warn("Failed to initialize Web Audio API:", e);
    }
  }

  private setupEngineSynth() {
    if (!this.ctx || !this.masterGain) return;

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.setValueAtTime(60, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.setValueAtTime(150, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(4, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc.start();
  }

  private setupScreechSynth() {
    if (!this.ctx || !this.masterGain) return;

    this.screechOsc = this.ctx.createOscillator();
    this.screechOsc.type = "sine";
    this.screechOsc.frequency.setValueAtTime(800, this.ctx.currentTime);

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.screechOsc.connect(this.screechGain);
    this.screechGain.connect(this.masterGain);
    this.screechOsc.start();
  }

  private setupNitroSynth() {
    if (!this.ctx || !this.masterGain) return;

    // Use a ScriptProcessor for quick cross-browser noise generation
    try {
      this.nitroGain = this.ctx.createGain();
      this.nitroGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      const bufferSize = 4096;
      const scriptNode = this.ctx.createScriptProcessor(bufferSize, 1, 1);
      scriptNode.onaudioprocess = (e) => {
        const outputBuffer = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          // White noise formula
          outputBuffer[i] = Math.random() * 2 - 1;
        }
      };

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.setValueAtTime(350, this.ctx.currentTime);
      bandpass.Q.setValueAtTime(1.5, this.ctx.currentTime);

      scriptNode.connect(bandpass);
      bandpass.connect(this.nitroGain);
      this.nitroGain.connect(this.masterGain);
      this.nitroNoise = scriptNode;
    } catch (err) {
      console.warn("Failed to bundle noise script processor:", err);
    }
  }

  public setEngineRPM(speedRatio: number, throttle: boolean) {
    if (!this.ctx || !this.engineOsc || !this.engineFilter || this.isMuted) return;

    // Map speedRatio (0 - 1) to frequency (55Hz to 280Hz)
    const baseFreq = 50 + speedRatio * 150 + (throttle ? 15 : 0);
    this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.05);

    // Map frequency cutoff so engine sounds beefier when accelerating
    const filterFreq = 120 + speedRatio * 600 + (throttle ? 180 : 0);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.08);
  }

  public setDriftIntensity(intensity: number) {
    if (!this.ctx || !this.screechGain || !this.screechOsc || this.isMuted) return;

    const volume = Math.min(intensity * 0.1, 0.08);
    this.screechGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);

    // Slight pitch fluctuation for realism
    const pitch = 700 + Math.random() * 80 + intensity * 60;
    this.screechOsc.frequency.setTargetAtTime(pitch, this.ctx.currentTime, 0.02);
  }

  public setNitroIntensity(isBoosting: boolean) {
    if (!this.ctx || !this.nitroGain || this.isMuted) return;

    const volume = isBoosting ? 0.15 : 0.0;
    this.nitroGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.08);
  }

  public triggerCountdownBeep(isHigh: boolean) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(isHigh ? 900 : 450, this.ctx.currentTime);
    oscGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  public triggerCrash() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    // Explosion pitch drop
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.5);

    oscGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.55);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }

  public triggerOvertake() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(450, this.ctx.currentTime);
    osc.frequency.setValueAtTime(650, this.ctx.currentTime + 0.08);

    oscGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  public triggerLevelUp() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const notes = [261.63, 329.63, 392.00, 523.25]; // C-E-G-C chord
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const oscGain = this.ctx!.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.1);

      oscGain.gain.setValueAtTime(0.1, this.ctx!.currentTime + idx * 0.1);
      oscGain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.1 + 0.4);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain!);
      osc.start(this.ctx!.currentTime + idx * 0.1);
      osc.stop(this.ctx!.currentTime + idx * 0.1 + 0.5);
    });
  }

  private startAmbientMusic() {
    if (!this.ctx || !this.masterGain) return;

    // Lightweight synthwave track: play alternating bass and lead notes in 115 BPM state
    let beat = 0;
    const chords = [
      [110.0, 165.0], // A2, E3
      [130.81, 196.0], // C3, G3
      [146.83, 220.0], // D3, A3
      [116.54, 174.61] // Bb2, F3
    ];
    const bpms = 135;
    const beatInterval = 60 / bpms / 2; // eighth notes

    this.musicIntervalId = setInterval(() => {
      if (!this.ctx || this.isMuted) return;

      const currentChord = chords[Math.floor(beat / 16) % chords.length];

      // Bass note on downbeats
      if (beat % 4 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = "sawtooth";
        bassOsc.frequency.setValueAtTime(currentChord[beat % 8 === 0 ? 0 : 1] / 2, this.ctx.currentTime);

        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(140, this.ctx.currentTime);

        bassGain.gain.setValueAtTime(0.03, this.ctx.currentTime);
        bassGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

        bassOsc.connect(filter);
        filter.connect(bassGain);
        bassGain.connect(this.masterGain!);
        bassOsc.start();
        bassOsc.stop(this.ctx.currentTime + 0.5);
      }

      // Neon lead synth lines
      if (beat % 6 === 0 || beat % 16 === 10) {
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.type = "sine";

        // Generate melodic lead notes related to chords
        const melody = [440, 493.88, 523.25, 587.33, 659.25, 783.99];
        const pitch = melody[(beat * 3) % melody.length];
        leadOsc.frequency.setValueAtTime(pitch, this.ctx.currentTime);

        leadGain.gain.setValueAtTime(0.015, this.ctx.currentTime);
        leadGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);

        leadOsc.connect(leadGain);
        leadGain.connect(this.masterGain!);
        leadOsc.start();
        leadOsc.stop(this.ctx.currentTime + 0.35);
      }

      beat++;
    }, beatInterval * 1000);
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0.0 : 0.4, this.ctx.currentTime);
    }
  }

  public destroy() {
    if (this.musicIntervalId) {
      clearInterval(this.musicIntervalId);
    }
    if (this.ctx) {
      this.ctx.close();
    }
  }
}

export const GameAudio = new SoundSynthesizer();
