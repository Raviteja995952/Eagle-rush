class AudioSynth {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Context is initialized lazily upon first user interaction to comply with browser autoplay policies.
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime); // A4
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  public playHit() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Impact Thump (Oscillator)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.2);

    // Noise/Splash layer (Metallic Ring)
    const highOsc = this.ctx.createOscillator();
    const highGain = this.ctx.createGain();
    
    highOsc.type = 'sine';
    highOsc.frequency.setValueAtTime(1200, now);
    highOsc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    
    highGain.gain.setValueAtTime(0.05, now);
    highGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    highOsc.connect(highGain);
    highGain.connect(this.ctx.destination);
    
    highOsc.start(now);
    highOsc.stop(now + 0.15);
  }

  public playCombo(comboCount: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Calculate pitch step based on combo count (Pentatonic scale for harmony)
    const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
    const index = Math.min(comboCount, pentatonic.length - 1);
    const rootFreq = pentatonic[index];

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(rootFreq, now);
    osc.frequency.setValueAtTime(rootFreq * 1.5, now + 0.05); // Perfect fifth fifth note transition

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(rootFreq * 2, now); // Octave

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc2.start(now);
    
    osc.stop(now + 0.25);
    osc2.stop(now + 0.25);
  }

  public playGolden() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    gain.connect(this.ctx.destination);

    // Arpeggio sparkle sweep
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      osc.connect(gain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.15);
    });
  }

  public playBossWarning() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Low sweeping siren
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now); // Low pitch A2

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(2.5, now); // Sweep rate 2.5Hz

    lfoGain.gain.setValueAtTime(40, now); // sweeps +- 40Hz

    // Hook up LFO to modulate oscillator frequency
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.setValueAtTime(0.12, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    lfo.start(now);
    osc.start(now);

    lfo.stop(now + 2.0);
    osc.stop(now + 2.0);
  }

  public playAchievement() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    gain.connect(this.ctx.destination);

    // Dynamic chord progression
    const chord = [261.63, 329.63, 392.00, 523.25]; // C major chord
    chord.forEach((freq) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.2, now + 0.6); // Rising triumph
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.8);
    });
  }

  public playRewardClaim() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    gain.connect(this.ctx.destination);

    // Coin ring effects
    const triggers = [0, 0.08, 0.16, 0.24];
    triggers.forEach((delay, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      // Rising pitches for standard feedback gratification
      const freq = 987.77 + idx * 220; // B5, C#6, etc.
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.connect(gain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.2);
    });
  }

  // Synthesize Background wind/sky ambient loop
  public playWindAmbient() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Create random white noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to shape into standard atmospheric breeze
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.0, now);
    
    // Slowly modulate the filter frequency for wind-gust feel (LFO)
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.15, now); // Extremely slow wave (0.15Hz)
    lfoGain.gain.setValueAtTime(250, now); // swing filter by 250Hz

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    
    filter.frequency.setValueAtTime(600, now); // Center at 600Hz

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.02, now); // Soft background wind level

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    lfo.start(now);
    whiteNoise.start(now);

    // Return controls to stop it if needed
    return {
      stop: () => {
        try {
          whiteNoise.stop();
          lfo.stop();
        } catch(e) {}
      }
    };
  }
}

export const audioSynth = new AudioSynth();
