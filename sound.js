/**
 * Cyber Snake Sound Engine
 * Synthesizes all music and SFX procedurally using Web Audio API.
 * No external asset dependencies.
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    
    this.sfxVolume = 0.7; // 0 to 1
    this.musicVolume = 0.6; // 0 to 1
    this.muted = false;
    
    // Music Sequencer state
    this.musicIntervalId = null;
    this.tempoBPM = 120;
    this.currentStep = 0;
    this.musicSpeedMultiplier = 1.0;
    
    // Bass sequence notes (midi values or frequencies)
    // C2 (65.41), Eb2 (77.78), G2 (98.00), Bb2 (116.54)
    this.bassLine = [
      65.41, 65.41, 77.78, 77.78,
      98.00, 98.00, 116.54, 116.54
    ];
    
    // Melody scales: minor pentatonic in C
    this.melodyScale = [
      130.81, 146.83, 155.56, 196.00, 220.00, 
      261.63, 293.66, 311.13, 392.00, 440.00
    ];
  }

  init() {
    if (this.ctx) return;
    
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      // Node tree setup
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
      
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
      
      console.log("Audio Engine initialized successfully.");
    } catch(e) {
      console.warn("Web Audio API not supported in this browser:", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setSfxVolume(pct) {
    this.sfxVolume = pct / 100;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
    }
  }

  setMusicVolume(pct) {
    this.musicVolume = pct / 100;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05);
    }
  }

  setMute(isMuted) {
    this.muted = isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(isMuted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
  }

  // SFX PROCEDURAL SYNTHESIZERS
  playClick() {
    this.init(); this.resume();
    if (!this.ctx) return;
    
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, time);
    osc.frequency.exponentialRampToValueAtTime(300, time + 0.06);
    
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.06);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(time);
    osc.stop(time + 0.07);
  }

  playEat() {
    this.init(); this.resume();
    if (!this.ctx) return;
    
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, time);
    osc.frequency.exponentialRampToValueAtTime(600, time + 0.12);
    
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(time);
    osc.stop(time + 0.13);
  }

  playPowerup() {
    this.init(); this.resume();
    if (!this.ctx) return;
    
    const time = this.ctx.currentTime;
    // Play a futuristic polyphonic chord arpeggio
    const notes = [261.63, 329.63, 392.00, 523.25]; // C major chord
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + idx * 0.07);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, time + idx * 0.07 + 0.3);
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.25, time + idx * 0.07 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, time + idx * 0.07 + 0.35);
      
      osc.connect(gain);
      gain.connect(this.sfxGain);
      
      osc.start(time + idx * 0.07);
      osc.stop(time + idx * 0.07 + 0.4);
    });
  }

  playDash() {
    this.init(); this.resume();
    if (!this.ctx) return;
    
    const time = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.25; // 0.25 seconds buffer
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill buffer with white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(4.0, time);
    filter.frequency.setValueAtTime(400, time);
    filter.frequency.exponentialRampToValueAtTime(3500, time + 0.22);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
    
    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    noiseNode.start(time);
    noiseNode.stop(time + 0.26);
  }

  playShieldHit() {
    this.init(); this.resume();
    if (!this.ctx) return;
    
    const time = this.ctx.currentTime;
    
    // Metal impact (hard triangle osc + long low sinus bass drop)
    const oscMetal = this.ctx.createOscillator();
    const oscBass = this.ctx.createOscillator();
    const gainMetal = this.ctx.createGain();
    const gainBass = this.ctx.createGain();
    
    oscMetal.type = 'sawtooth';
    oscMetal.frequency.setValueAtTime(800, time);
    oscMetal.frequency.exponentialRampToValueAtTime(200, time + 0.15);
    
    gainMetal.gain.setValueAtTime(0.3, time);
    gainMetal.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    
    oscBass.type = 'sine';
    oscBass.frequency.setValueAtTime(120, time);
    oscBass.frequency.linearRampToValueAtTime(45, time + 0.4);
    
    gainBass.gain.setValueAtTime(0.6, time);
    gainBass.gain.exponentialRampToValueAtTime(0.01, time + 0.45);
    
    oscMetal.connect(gainMetal);
    gainMetal.connect(this.sfxGain);
    
    oscBass.connect(gainBass);
    gainBass.connect(this.sfxGain);
    
    oscMetal.start(time);
    oscMetal.stop(time + 0.16);
    
    oscBass.start(time);
    oscBass.stop(time + 0.46);
  }

  playGameOver() {
    this.init(); this.resume();
    if (!this.ctx) return;
    
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.linearRampToValueAtTime(55, time + 0.85);
    
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.linearRampToValueAtTime(0.01, time + 0.9);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(time);
    osc.stop(time + 0.95);
  }

  playLevelUp() {
    this.init(); this.resume();
    if (!this.ctx) return;
    
    const time = this.ctx.currentTime;
    // Ascending arpeggio
    const steps = [196.00, 246.94, 293.66, 392.00, 493.88, 587.33, 783.99]; // G major
    steps.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time + idx * 0.08);
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.2, time + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, time + idx * 0.08 + 0.35);
      
      osc.connect(gain);
      gain.connect(this.sfxGain);
      
      osc.start(time + idx * 0.08);
      osc.stop(time + idx * 0.08 + 0.4);
    });
  }

  playBossDamage() {
    this.init(); this.resume();
    if (!this.ctx) return;
    
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, time);
    osc.frequency.setValueAtTime(320, time + 0.05);
    osc.frequency.setValueAtTime(180, time + 0.1);
    
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(time);
    osc.stop(time + 0.22);
  }

  playLaser() {
    this.init(); this.resume();
    if (!this.ctx) return;
    
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.15);
    
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.16);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(time);
    osc.stop(time + 0.17);
  }

  // MUSIC SEQUENCER
  startMusic() {
    this.init(); this.resume();
    if (!this.ctx || this.musicIntervalId) return;
    
    const intervalTime = (60 / this.tempoBPM) / 2 * 1000; // Eighth notes
    this.musicIntervalId = setInterval(() => {
      this.playSequencerStep();
    }, intervalTime);
  }

  stopMusic() {
    if (this.musicIntervalId) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }

  setMusicSpeed(speedMultiplier) {
    this.musicSpeedMultiplier = speedMultiplier;
    const baseBpm = 120;
    this.tempoBPM = baseBpm * speedMultiplier;
    
    if (this.musicIntervalId) {
      this.stopMusic();
      this.startMusic();
    }
  }

  playSequencerStep() {
    if (!this.ctx || this.muted) return;
    
    const time = this.ctx.currentTime;
    
    // 1. Synth Bass Drum (on steps 0, 4, 8, 12, etc.)
    if (this.currentStep % 4 === 0) {
      const oscKick = this.ctx.createOscillator();
      const gainKick = this.ctx.createGain();
      
      oscKick.type = 'sine';
      oscKick.frequency.setValueAtTime(150, time);
      oscKick.frequency.exponentialRampToValueAtTime(50, time + 0.12);
      
      gainKick.gain.setValueAtTime(0.35, time);
      gainKick.gain.exponentialRampToValueAtTime(0.01, time + 0.14);
      
      oscKick.connect(gainKick);
      gainKick.connect(this.musicGain);
      
      oscKick.start(time);
      oscKick.stop(time + 0.15);
    }
    
    // 2. High-hat (on off-beats: steps 2, 6, 10, 14, etc.)
    if (this.currentStep % 4 === 2) {
      const noise = this.ctx.createOscillator(); // Sine high sweep behaves like a clean hihat
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      
      noise.type = 'triangle';
      noise.frequency.setValueAtTime(9000, time);
      noise.frequency.exponentialRampToValueAtTime(6000, time + 0.04);
      
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(5000, time);
      
      gain.gain.setValueAtTime(0.04, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      
      noise.start(time);
      noise.stop(time + 0.05);
    }
    
    // 3. Cyber Bass Synth Loop
    const bassNoteFreq = this.bassLine[(Math.floor(this.currentStep / 2)) % this.bassLine.length];
    
    const oscBass = this.ctx.createOscillator();
    const gainBass = this.ctx.createGain();
    const filterBass = this.ctx.createBiquadFilter();
    
    // Sawtooth bass sound
    oscBass.type = 'sawtooth';
    oscBass.frequency.setValueAtTime(bassNoteFreq, time);
    
    // Filter sweep (gives retro analog feel)
    filterBass.type = 'lowpass';
    filterBass.frequency.setValueAtTime(180, time);
    filterBass.frequency.exponentialRampToValueAtTime(450, time + 0.08);
    
    gainBass.gain.setValueAtTime(0.12, time);
    gainBass.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    
    oscBass.connect(filterBass);
    filterBass.connect(gainBass);
    gainBass.connect(this.musicGain);
    
    oscBass.start(time);
    oscBass.stop(time + 0.23);
    
    // 4. Random Melody Arpeggiator (Occasional)
    // Plays minor pentatonic notes synced with the rhythm
    if (Math.random() < 0.25 && this.currentStep % 2 === 0) {
      const scaleDegree = Math.floor(Math.random() * this.melodyScale.length);
      const melFreq = this.melodyScale[scaleDegree] * 2; // Arpeggiate up a octave
      
      const oscMel = this.ctx.createOscillator();
      const gainMel = this.ctx.createGain();
      
      oscMel.type = 'triangle';
      oscMel.frequency.setValueAtTime(melFreq, time);
      
      gainMel.gain.setValueAtTime(0.04, time);
      gainMel.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
      
      oscMel.connect(gainMel);
      gainMel.connect(this.musicGain);
      
      oscMel.start(time);
      oscMel.stop(time + 0.36);
    }
    
    // Step forward in 16-step grid
    this.currentStep = (this.currentStep + 1) % 16;
  }
}

// Global Single Instance
window.Sound = new SoundEngine();
