// All sound is synthesized live with WebAudio — no audio files.
// Engine hum, two-tone siren, gunshot, punch thud, pickup blip, mission
// jingle and a light bassline loop. Created lazily on first user gesture.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenTimer = 0;
  let musicTimer = 0;
  let musicStep = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 420;
      engineOsc.connect(filt);
      filt.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, freq) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = freq || 1800;
    const g = ctx.createGain();
    g.gain.value = vol || 0.3;
    src.connect(filt); filt.connect(g); g.connect(master);
    src.start(t0);
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
    get muted() { return muted; },
    click() { tone(660, 0.07, 'square', 0.12); },
    punch() { noise(0.09, 0.25, 500); tone(120, 0.1, 'sine', 0.25, 60); },
    gunshot() { noise(0.14, 0.5, 2600); tone(180, 0.08, 'square', 0.18, 70); },
    pickup() { tone(880, 0.09, 'sine', 0.2); setTimeout(() => tone(1320, 0.12, 'sine', 0.2), 70); },
    buy() { tone(520, 0.08, 'triangle', 0.2); setTimeout(() => tone(780, 0.1, 'triangle', 0.2), 60); },
    denied() { tone(160, 0.16, 'square', 0.15, 110); },
    mission() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.22), i * 110));
    },
    busted() { [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.16), i * 160)); },
    wasted() { [330, 262, 196, 131].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'sawtooth', 0.16), i * 180)); },
    // Called every frame: engine pitch follows speed; siren wails while wanted.
    update(dt, speed, wanted) {
      if (!ctx || muted) return;
      if (engineGain) {
        const target = speed > 5 ? 0.05 + Math.min(0.09, speed / 560 * 0.09) : 0;
        engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
        engineOsc.frequency.setTargetAtTime(48 + speed * 0.16, ctx.currentTime, 0.1);
      }
      if (wanted > 0) {
        sirenTimer -= dt;
        if (sirenTimer <= 0) {
          sirenTimer = 0.42;
          tone(720, 0.38, 'sine', 0.05, 960);
          setTimeout(() => { if (!muted) tone(960, 0.38, 'sine', 0.05, 720); }, 210);
        }
      }
      // Sparse bassline: one note every 0.42 s, roots C - A - F - G.
      musicTimer -= dt;
      if (musicTimer <= 0) {
        musicTimer = 0.42;
        const roots = [65.4, 55, 43.65, 49];
        tone(roots[musicStep % 4] * 2, 0.36, 'triangle', 0.045);
        musicStep++;
      }
    },
  };
}
