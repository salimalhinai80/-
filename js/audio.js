/* مؤثرات صوتية وموسيقى مولّدة بالكامل عبر Web Audio (لا حاجة لملفات صوت) */
(function () {
  let ctx = null, master, sfx, mus, windGain, windFilter, noiseBuf, musicTimer = null, muted = false, step = 0, nextT = 0, theme = 0;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = 0.8; sfx.connect(master);
    mus = ctx.createGain(); mus.gain.value = 0.22; mus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // صوت الرياح أثناء القيادة
    const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    windFilter = ctx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 500; windFilter.Q.value = 0.6;
    windGain = ctx.createGain(); windGain.gain.value = 0;
    n.connect(windFilter); windFilter.connect(windGain); windGain.connect(master); n.start();
  }

  function tone(f, dur, { type = 'sine', vol = 0.3, when = 0, to = null, attack = 0.01, dest = null } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, { vol = 0.3, f = 1200, type = 'lowpass', when = 0, to = null } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + when, s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; fl.type = type; fl.frequency.setValueAtTime(f, t); if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(sfx); s.start(t); s.stop(t + dur + 0.05);
  }

  const N = m => 440 * Math.pow(2, (m - 69) / 12);
  const THEMES = [
    { bpm: 118, root: 60, scale: [0, 2, 4, 7, 9], lead: 'triangle' },
    { bpm: 124, root: 62, scale: [0, 2, 4, 7, 9], lead: 'triangle' },
    { bpm: 136, root: 57, scale: [0, 3, 5, 7, 10], lead: 'square' }
  ];
  const MEL = [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 6, 5, 4, 2, -1];
  const BASS = [0, 0, 3, 3, 4, 4, 2, 2];

  function schedule() {
    const th = THEMES[theme], spb = 60 / th.bpm / 2;
    while (nextT < ctx.currentTime + 0.25) {
      const when = nextT - ctx.currentTime, i = step % 16, bar = Math.floor(step / 16) % 8;
      const deg = MEL[(i + bar * 3) % 16];
      if (deg >= 0 && (i % 2 === 0 || Math.random() < 0.5)) {
        const sc = th.scale, oct = Math.floor(deg / sc.length), m = th.root + 12 + sc[((deg % sc.length) + sc.length) % sc.length] + 12 * oct;
        tone(N(m), spb * 1.6, { type: th.lead, vol: 0.12, when: Math.max(0, when), dest: mus });
      }
      if (i % 4 === 0) {
        const b = th.root - 12 + th.scale[BASS[bar] % th.scale.length];
        tone(N(b), spb * 3.5, { type: 'sine', vol: 0.35, when: Math.max(0, when), dest: mus });
      }
      if (i % 4 === 2) { // إيقاع خفيف
        const t = ctx.currentTime + Math.max(0, when), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 6000; g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        s.connect(f); f.connect(g); g.connect(mus); s.start(t); s.stop(t + 0.06);
      }
      nextT += spb; step++;
    }
  }

  window.Sfx = {
    init,
    get muted() { return muted; },
    setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05); },
    music(on, th = 0) {
      if (!ctx) return;
      theme = th;
      if (on && !musicTimer) { nextT = ctx.currentTime + 0.05; musicTimer = setInterval(schedule, 90); }
      if (!on && musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    },
    wind(speed) { if (windGain) { windGain.gain.setTargetAtTime(Math.min(0.12, speed * 0.006), ctx.currentTime, 0.2); windFilter.frequency.setTargetAtTime(300 + speed * 40, ctx.currentTime, 0.2); } },
    click() { tone(880, 0.08, { type: 'square', vol: 0.12 }); },
    correct() { [72, 76, 79, 84].forEach((m, i) => tone(N(m), 0.25, { type: 'triangle', vol: 0.3, when: i * 0.08 })); tone(N(96), 0.4, { vol: 0.1, when: 0.32 }); },
    wrong() { tone(220, 0.25, { type: 'sawtooth', vol: 0.18, to: 160 }); tone(180, 0.35, { type: 'sawtooth', vol: 0.15, when: 0.18, to: 110 }); },
    star() { tone(N(88), 0.12, { type: 'sine', vol: 0.22 }); tone(N(95), 0.18, { type: 'sine', vol: 0.18, when: 0.06 }); },
    boost() { noise(0.9, { vol: 0.35, f: 400, to: 4000, type: 'bandpass' }); tone(200, 0.8, { type: 'sawtooth', vol: 0.12, to: 900 }); },
    slow() { tone(500, 0.6, { type: 'sine', vol: 0.2, to: 150 }); },
    crash() { noise(0.4, { vol: 0.6, f: 900, to: 120 }); tone(90, 0.3, { type: 'square', vol: 0.2, to: 50 }); },
    bell() { [0, 0.18].forEach(w => { tone(2100, 0.35, { vol: 0.16, when: w }); tone(2650, 0.3, { vol: 0.08, when: w }); }); },
    whoosh() { noise(0.35, { vol: 0.25, f: 2500, to: 600, type: 'bandpass' }); },
    brake() { noise(0.6, { vol: 0.2, f: 3000, type: 'highpass' }); },
    win() { [60, 64, 67, 72, 67, 72, 76, 79, 84].forEach((m, i) => tone(N(m), i === 8 ? 1 : 0.22, { type: 'triangle', vol: 0.28, when: i * 0.13 })); },
    pop() { tone(600, 0.1, { type: 'sine', vol: 0.2, to: 1200 }); }
  };
})();
