/* التخزين: يُحفظ كل شيء محلياً في متصفح الجهاز (localStorage) ولا يُرسل لأي خادم */
(function () {
  'use strict';
  var KEY = 'harf-kingdom-v1';
  var D = HK.data;
  var GAME_IDS = D.GAMES.map(function (g) { return g.id; });

  var BADGES = [
    { id: 'first_star', icon: '⭐', name: 'النجمة الأولى', desc: 'حصلت على أول نجمة' },
    { id: 'first_letter', icon: '🔓', name: 'المنقذ الصغير', desc: 'استعدت أول حرف' },
    { id: 'perfect', icon: '💯', name: 'الإتقان الكامل', desc: 'أنهيت لعبة دون أي خطأ' },
    { id: 'listener', icon: '👂', name: 'الأذن الذهبية', desc: 'أتقنت 5 ألعاب استماع' },
    { id: 'hunter', icon: '🎈', name: 'صياد الحروف', desc: 'أتقنت 5 ألعاب اصطياد' },
    { id: 'artist', icon: '🎨', name: 'الخطاط الماهر', desc: 'أتقنت رسم 5 حروف' },
    { id: 'world1', icon: '🌳', name: 'حارس الغابة', desc: 'أكملت العالم الأول' },
    { id: 'world4', icon: '⛄', name: 'بطل الثلج', desc: 'أكملت أربعة عوالم' },
    { id: 'stars50', icon: '🌟', name: 'جامع النجوم', desc: 'جمعت 50 نجمة' },
    { id: 'stars150', icon: '✨', name: 'سماء النجوم', desc: 'جمعت 150 نجمة' },
    { id: 'all_worlds', icon: '🗺️', name: 'مستكشف المملكة', desc: 'أكملت العوالم السبعة' },
    { id: 'knight', icon: '🛡️', name: 'فارس الحروف', desc: 'أنهيت اختبار إنقاذ المملكة' }
  ];

  // مفاجآت صناديق الكنوز (تُفتح عند إكمال كل عالم)
  var TREASURES = [
    { type: 'hat', id: 'crown', icon: '👑', name: 'تاج ذهبي' },
    { type: 'color', id: '#ff8a3d', icon: '🧡', name: 'لون برتقالي لامع' },
    { type: 'hat', id: 'wizard', icon: '🧙', name: 'قبعة الساحر' },
    { type: 'cape', id: '#2ec4b6', icon: '🧣', name: 'عباءة فيروزية' },
    { type: 'hat', id: 'astro', icon: '👩‍🚀', name: 'خوذة الفضاء' },
    { type: 'color', id: '#8b5cf6', icon: '💜', name: 'لون بنفسجي سحري' },
    { type: 'cape', id: '#ffd23f', icon: '✨', name: 'عباءة ذهبية' }
  ];

  var state = load();

  function blank() {
    return { version: 1, teacher: null, students: [], activeId: null, settings: { volume: 0.8, muted: false, music: true, rate: 0.85 } };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      var s = JSON.parse(raw);
      if (!s || !Array.isArray(s.students)) return blank();
      var b = blank();
      s.settings = Object.assign(b.settings, s.settings || {});
      s.students.forEach(normalize);
      return s;
    } catch (e) { return blank(); }
  }

  var saveTimer = null, storageOk = true;
  function save(now) {
    clearTimeout(saveTimer);
    var doit = function () {
      try { localStorage.setItem(KEY, JSON.stringify(state)); storageOk = true; }
      catch (e) { storageOk = false; }
    };
    if (now) doit(); else saveTimer = setTimeout(doit, 150);
  }
  window.addEventListener('pagehide', function () { save(true); });
  window.addEventListener('storage', function (e) { if (e.key === KEY) { state = load(); emit(); } });

  var listeners = [];
  function on(fn) { listeners.push(fn); }
  function emit() { listeners.forEach(function (f) { try { f(); } catch (e) { } }); }

  function uid() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function normalize(st) {
    st.hero = st.hero || null;
    st.letters = st.letters || {};
    st.unlockedWorlds = st.unlockedWorlds || 1;
    st.keys = st.keys || 0;
    st.chests = st.chests || [];
    st.badges = st.badges || [];
    st.wardrobe = st.wardrobe || { hats: [], colors: [], capes: [] };
    st.finals = st.finals || [];
    st.assigned = st.assigned || [];
    st.timeSpent = st.timeSpent || 0;
    st.seenIntro = !!st.seenIntro;
    return st;
  }

  function addStudent(name, cls) {
    var st = normalize({ id: uid(), name: String(name).trim().slice(0, 40), cls: (cls || '').trim().slice(0, 30), createdAt: Date.now() });
    state.students.push(st); save(); emit(); return st;
  }
  function getStudent(id) { return state.students.filter(function (s) { return s.id === id; })[0] || null; }
  function removeStudent(id) {
    state.students = state.students.filter(function (s) { return s.id !== id; });
    if (state.activeId === id) state.activeId = null;
    save(); emit();
  }
  function active() { return state.activeId ? getStudent(state.activeId) : null; }
  function setActive(id) { state.activeId = id; save(); }

  function letterRec(st, lid) {
    if (!st.letters[lid]) st.letters[lid] = { learned: false, games: {} };
    return st.letters[lid];
  }

  /* تسجيل نتيجة لعبة: firstTry = عدد الإجابات الصحيحة من المحاولة الأولى (من 5) */
  function recordGame(st, lid, gid, firstTry, total, mistakes) {
    var L = letterRec(st, lid);
    var g = L.games[gid] || { best: 0, last: 0, plays: 0, mistakes: 0, correct: 0, questions: 0 };
    var prevBest = g.best;
    g.plays++; g.last = firstTry; g.best = Math.max(g.best, firstTry);
    g.mistakes += mistakes; g.correct += firstTry; g.questions += total; g.at = Date.now();
    g.rating = Math.max(g.rating || 0, rating(firstTry, total));
    L.games[gid] = g;
    var newStars = Math.max(0, g.best - prevBest);
    save(); emit();
    return { newStars: newStars, rating: rating(firstTry, total) };
  }
  function rating(c, t) { if (c >= t) return 3; if (c >= t - 1) return 2; return 1; }

  function gameRec(st, lid, gid) { var L = st.letters[lid]; return L && L.games[gid] || null; }
  function letterDone(st, lid) {
    var L = st.letters[lid]; if (!L) return false;
    return GAME_IDS.every(function (g) { return L.games[g] && L.games[g].plays > 0; });
  }
  function worldDone(st, w) { return D.WORLDS[w].letters.every(function (l) { return letterDone(st, l.id); }); }
  function allWorldsDone(st) { return D.WORLDS.every(function (w, i) { return worldDone(st, i); }); }

  function totalStars(st) {
    var n = 0;
    Object.keys(st.letters).forEach(function (lid) {
      var gs = st.letters[lid].games;
      Object.keys(gs).forEach(function (g) { n += gs[g].best || 0; });
    });
    return n;
  }

  /* نسبة إتقان الحرف (0-100) أو null إن لم يبدأ: متوسط أفضل نتيجة في الألعاب الخمس (الألعاب غير الملعوبة = صفر)
     ويُدمج معها آخر اختبار نهائي (20%) إن وُجد */
  function mastery(st, lid) {
    var L = st.letters[lid];
    var played = L ? GAME_IDS.filter(function (g) { return L.games[g] && L.games[g].plays > 0; }) : [];
    var fin = lastFinal(st);
    var hasFin = fin && fin.perLetter && (lid in fin.perLetter);
    if (!played.length && !hasFin) return null;
    var sum = 0;
    GAME_IDS.forEach(function (g) { var r = L && L.games[g]; if (r && r.plays) sum += r.best / 5; });
    var m = sum / GAME_IDS.length * 100;
    if (hasFin) m = played.length ? m * 0.8 + (fin.perLetter[lid] ? 20 : 0) : (fin.perLetter[lid] ? 100 : 0);
    return Math.round(m);
  }
  function masteryLevel(m) {
    if (m === null || m === undefined) return { key: 'none', label: 'لم يبدأ', cls: 'lv-none' };
    if (m >= 80) return { key: 'master', label: 'متقن', cls: 'lv-master' };
    if (m >= 50) return { key: 'progress', label: 'قيد التقدم', cls: 'lv-progress' };
    return { key: 'weak', label: 'يحتاج دعماً', cls: 'lv-weak' };
  }
  function lastFinal(st) { return st.finals.length ? st.finals[st.finals.length - 1] : null; }

  function award(st, badgeId) {
    if (st.badges.indexOf(badgeId) >= 0) return null;
    st.badges.push(badgeId); save(); emit();
    return BADGES.filter(function (b) { return b.id === badgeId; })[0];
  }

  // يفحص الشارات المستحقة ويعيد الجديدة منها
  function checkBadges(st) {
    var got = [];
    var stars = totalStars(st);
    function give(id) { var b = award(st, id); if (b) got.push(b); }
    if (stars >= 1) give('first_star');
    if (stars >= 50) give('stars50');
    if (stars >= 150) give('stars150');
    if (D.LETTERS.some(function (l) { return letterDone(st, l.id); })) give('first_letter');
    var perfectBy = {}, anyPerfect = false;
    D.LETTERS.forEach(function (l) {
      GAME_IDS.forEach(function (g) {
        var r = gameRec(st, l.id, g);
        if (r && r.best >= 5) { anyPerfect = true; perfectBy[g] = (perfectBy[g] || 0) + 1; }
      });
    });
    if (anyPerfect) give('perfect');
    if ((perfectBy.listen || 0) >= 5) give('listener');
    if ((perfectBy['catch'] || 0) >= 5) give('hunter');
    if ((perfectBy.trace || 0) >= 5) give('artist');
    var wd = D.WORLDS.filter(function (w, i) { return worldDone(st, i); }).length;
    if (worldDone(st, 0)) give('world1');
    if (wd >= 4) give('world4');
    if (wd >= 7) give('all_worlds');
    if (st.finals.length) give('knight');
    return got;
  }

  function resetLetters(st, lids) {
    lids.forEach(function (lid) { delete st.letters[lid]; });
    save(); emit();
  }

  // ===== المعلم: رمز سري مُجزّأ (SHA-256 مع ملح) =====
  function hashPin(pin, salt) {
    var text = salt + ':' + pin;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      });
    }
    // بديل عند عدم توفر Web Crypto (سياق غير آمن)
    var h = 5381; for (var i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
    return Promise.resolve('d' + h.toString(16));
  }
  function setPin(pin) {
    var salt = Math.random().toString(36).slice(2, 12);
    return hashPin(pin, salt).then(function (h) { state.teacher = { salt: salt, hash: h }; save(true); });
  }
  function checkPin(pin) {
    if (!state.teacher) return Promise.resolve(false);
    return hashPin(pin, state.teacher.salt).then(function (h) { return h === state.teacher.hash; });
  }

  function exportJSON() { return JSON.stringify(state, null, 1); }
  function importJSON(text) {
    var s = JSON.parse(text);
    if (!s || !Array.isArray(s.students)) throw new Error('ملف غير صالح');
    s.students.forEach(normalize);
    s.settings = Object.assign(blank().settings, s.settings || {});
    state = s; save(true); emit();
  }

  HK.store = {
    get state() { return state; },
    settings: function () { return state.settings; },
    save: save, on: on, emit: emit, storageOk: function () { return storageOk; },
    addStudent: addStudent, getStudent: getStudent, removeStudent: removeStudent, active: active, setActive: setActive,
    letterRec: letterRec, recordGame: recordGame, gameRec: gameRec, letterDone: letterDone, worldDone: worldDone,
    allWorldsDone: allWorldsDone, totalStars: totalStars, mastery: mastery, masteryLevel: masteryLevel,
    lastFinal: lastFinal, award: award, checkBadges: checkBadges, resetLetters: resetLetters,
    setPin: setPin, checkPin: checkPin, exportJSON: exportJSON, importJSON: importJSON,
    BADGES: BADGES, TREASURES: TREASURES, GAME_IDS: GAME_IDS
  };
})();
