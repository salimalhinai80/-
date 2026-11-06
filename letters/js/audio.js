/* الصوت: نطق عربي عبر Web Speech API، وتسجيلات اختيارية في audio/manifest.js،
 * ومؤثرات وموسيقى مولّدة برمجياً (Web Audio). بديل مرئي عند تعذّر النطق. */
(function () {
  'use strict';
  var S = function () { return HK.store.settings(); };
  var ctx = null, master = null, musicGain = null, musicTimer = null, musicOn = false;
  var arVoice = null, ttsState = 'unknown'; // unknown | ok | none
  var synth = window.speechSynthesis || null;
  var FILES = window.HK_AUDIO_FILES || {};
  var fallbackCb = null; // يُستدعى لعرض النص عند تعذر النطق
  var speakingCb = null;

  function ensureCtx() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.18; musicGain.connect(master);
      applyVolume();
    } catch (e) { ctx = null; }
    return ctx;
  }
  function vol() { var s = S(); return s.muted ? 0 : s.volume; }
  function applyVolume() { if (master) master.gain.value = vol(); }

  // ===== الأصوات العربية =====
  function pickVoice() {
    if (!synth) { ttsState = 'none'; return; }
    var vs = synth.getVoices() || [];
    var ar = vs.filter(function (v) { return /^ar/i.test(v.lang); });
    if (ar.length) {
      // تفضيل الأصوات المحلية ثم الأعلى جودة
      ar.sort(function (a, b) { return score(b) - score(a); });
      arVoice = ar[0]; ttsState = 'ok';
    } else if (vs.length) { arVoice = null; ttsState = 'none'; }
  }
  function score(v) {
    var s = 0;
    if (/ar-SA/i.test(v.lang)) s += 3;
    if (/google|natural|neural|premium|enhanced/i.test(v.name)) s += 2;
    if (/maged|majed|tarik|hamed|zariyah|laila|hoda|naayf/i.test(v.name)) s += 1;
    return s;
  }
  if (synth) {
    pickVoice();
    if ('onvoiceschanged' in synth) synth.onvoiceschanged = pickVoice;
    setTimeout(pickVoice, 600); setTimeout(pickVoice, 2000);
  } else ttsState = 'none';

  var currentAudio = null;
  function stopSpeech() {
    if (synth) try { synth.cancel(); } catch (e) { }
    if (currentAudio) { try { currentAudio.pause(); } catch (e) { } currentAudio = null; }
  }

  /* say(text, opts): ينطق النص. opts.key مفتاح تسجيل اختياري، opts.show لعرض النص عند تعذر النطق
     يعيد Promise تكتمل عند الانتهاء (أو بعد مهلة) */
  var sayId = 0;
  function say(text, opts) {
    opts = opts || {};
    opts._id = ++sayId;
    return new Promise(function (resolve) {
      var done = false;
      function finish() { if (done) return; done = true; duck(false); if (speakingCb) speakingCb(false); resolve(); }
      if (S().muted) { if (fallbackCb && opts.show !== false) fallbackCb(opts.fallback || text, true); return setTimeout(finish, 300); }
      if (!synth || ttsState === 'none') { if (!FILES[opts.key || text]) { showFallback(text, opts); return setTimeout(finish, 600); } }
      stopSpeech();
      duck(true);
      if (speakingCb) speakingCb(true);
      var file = FILES[opts.key || text];
      if (file) {
        var a = new Audio(file); currentAudio = a; a.volume = vol();
        a.onended = finish; a.onerror = function () { speakTTS(text, opts, finish); };
        a.play().catch(function () { speakTTS(text, opts, finish); });
        return;
      }
      speakTTS(text, opts, finish);
    });
  }

  function speakTTS(text, opts, finish) {
    if (!synth || ttsState === 'none') { showFallback(text, opts); return setTimeout(finish, 900); }
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = arVoice ? arVoice.lang : 'ar-SA';
      if (arVoice) u.voice = arVoice;
      u.rate = opts.rate || S().rate || 0.85; u.pitch = opts.pitch || 1.08; u.volume = Math.max(0, Math.min(1, vol()));
      var started = false;
      u.onstart = function () { started = true; };
      u.onend = finish;
      u.onerror = function () { if (!started) showFallback(text, opts); finish(); };
      synth.speak(u);
      // إن لم يبدأ النطق خلال ثانيتين نعرض النص بديلاً
      setTimeout(function () { if (!started) { showFallback(text, opts); if (ttsState !== 'ok') ttsState = 'none'; finish(); } }, 2200);
      setTimeout(finish, 1200 + text.length * 160);
    } catch (e) { showFallback(text, opts); setTimeout(finish, 900); }
  }
  function showFallback(text, opts) {
    if (opts.show === false || opts._id !== sayId) return;
    beepTalk();
    if (fallbackCb) fallbackCb(opts.fallback || text, false);
  }
  function hasVoice() { return ttsState === 'ok' || !!Object.keys(FILES).length; }

  // ===== المؤثرات =====
  function tone(freq, t0, dur, type, g, slideTo) {
    var c = ensureCtx(); if (!c) return;
    var o = c.createOscillator(), gn = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, c.currentTime + t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + t0 + dur);
    gn.gain.setValueAtTime(0.0001, c.currentTime + t0);
    gn.gain.exponentialRampToValueAtTime(g || 0.3, c.currentTime + t0 + 0.015);
    gn.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
    o.connect(gn); gn.connect(master); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.05);
  }
  var SFX = {
    click: function () { tone(660, 0, 0.08, 'triangle', 0.18, 880); },
    correct: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, i * 0.07, 0.25, 'triangle', 0.25); }); },
    wrong: function () { tone(300, 0, 0.18, 'sine', 0.2, 240); tone(250, 0.16, 0.22, 'sine', 0.16, 210); },
    star: function () { [1318, 1568, 2093].forEach(function (f, i) { tone(f, i * 0.05, 0.2, 'sine', 0.15); }); },
    pop: function () { tone(900, 0, 0.07, 'square', 0.08, 300); },
    whoosh: function () { tone(200, 0, 0.3, 'sawtooth', 0.05, 1200); },
    key: function () { [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, i * 0.12, 0.35, 'triangle', 0.22); }); },
    chest: function () { tone(150, 0, 0.3, 'square', 0.08, 90); [523, 784, 1046, 1318, 1568].forEach(function (f, i) { tone(f, 0.3 + i * 0.08, 0.4, 'sine', 0.2); }); },
    fanfare: function () {
      var seq = [[523, 0], [523, 0.15], [523, 0.3], [659, 0.45], [784, 0.75], [659, 1.0], [784, 1.15], [1046, 1.4]];
      seq.forEach(function (n) { tone(n[0], n[1], 0.35, 'triangle', 0.25); tone(n[0] / 2, n[1], 0.35, 'sine', 0.12); });
    }
  };
  function sfx(name) { try { ensureCtx(); if (SFX[name] && !S().muted) SFX[name](); } catch (e) { } }
  function beepTalk() { if (S().muted) return; [520, 600, 560].forEach(function (f, i) { tone(f, i * 0.09, 0.08, 'sine', 0.12); }); }

  // ===== موسيقى خلفية هادئة =====
  var MEL = [0, 4, 7, 9, 7, 4, 2, 4, 0, 2, 4, 7, 9, 12, 9, 7];
  var step = 0, theme = 0, wantMusic = false, gestured = false;
  var KEYS = [261.6, 293.7, 329.6, 246.9, 349.2, 220, 392];
  function musicTick() {
    if (!musicOn || !ctx) return;
    var base = KEYS[theme % KEYS.length];
    var n = MEL[step % MEL.length];
    var f = base * Math.pow(2, n / 12);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    o.connect(g); g.connect(musicGain); o.start(); o.stop(ctx.currentTime + 0.55);
    if (step % 4 === 0) {
      var b = ctx.createOscillator(), bg = ctx.createGain();
      b.type = 'sine'; b.frequency.value = base / 2;
      bg.gain.setValueAtTime(0.3, ctx.currentTime); bg.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      b.connect(bg); bg.connect(musicGain); b.start(); b.stop(ctx.currentTime + 1.25);
    }
    step++;
  }
  function music(on, th) {
    if (typeof th === 'number') theme = th;
    var want = on && S().music && !S().muted;
    wantMusic = want;
    if (want && !musicOn) { if (!gestured || !ensureCtx()) return; musicOn = true; musicTimer = setInterval(musicTick, 420); }
    else if (!want && musicOn) { musicOn = false; clearInterval(musicTimer); }
  }
  function duck(d) {
    if (!musicGain || !ctx) return;
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.linearRampToValueAtTime(d ? 0.04 : 0.18, ctx.currentTime + 0.2);
  }

  // فتح سياق الصوت عند أول لمسة (متطلب المتصفحات)
  function unlock() {
    gestured = true;
    ensureCtx();
    if (wantMusic && !musicOn) music(true);
    if (synth && !unlock.done) { try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) { } unlock.done = true; }
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, unlock, { passive: true }); });

  HK.audio = {
    say: say, stop: stopSpeech, sfx: sfx, music: music, applyVolume: applyVolume, hasVoice: hasVoice,
    voiceInfo: function () { return { state: ttsState, name: arVoice ? arVoice.name : null }; },
    onFallback: function (fn) { fallbackCb = fn; }, onSpeaking: function (fn) { speakingCb = fn; },
    refreshVoices: pickVoice
  };
})();
