/* الربط مع منصات التعلم (SCORM 1.2 و SCORM 2004)
 * إن وُجدت واجهة المنصة: يصبح المتعلم هو طالب المنصة، ويُحفظ تقدمه في المنصة (suspend_data)،
 * وتُرسل حالة الإكمال ونتيجة الاختبار النهائي وإتقان كل حرف (objectives).
 * إن لم توجد: تعمل اللعبة كالمعتاد دون أي تغيير. */
(function () {
  'use strict';
  var D = HK.data, S = HK.store;
  var GAMES = S.GAME_IDS;
  var api = null, ver = null;

  function findIn(win) {
    for (var n = 0; win && n < 12; n++) {
      try {
        if (win.API_1484_11) { ver = '2004'; return win.API_1484_11; }
        if (win.API) { ver = '1.2'; return win.API; }
      } catch (e) { return null; } // نافذة من نطاق آخر
      if (!win.parent || win.parent === win) break;
      win = win.parent;
    }
    return null;
  }
  try { api = findIn(window) || (window.opener ? findIn(window.opener) : null); } catch (e) { api = null; }

  var M = { active: false, version: null };
  HK.scorm = M;
  if (!api) return;

  var is12 = ver === '1.2';
  function call(n12, n04, args) { try { var f = api[is12 ? n12 : n04]; return f ? f.apply(api, args || ['']) : ''; } catch (e) { return ''; } }
  function get(k12, k04) { return String(call('LMSGetValue', 'GetValue', [is12 ? k12 : k04]) || ''); }
  function set(k12, k04, v) { if (!(is12 ? k12 : k04)) return; call('LMSSetValue', 'SetValue', [is12 ? k12 : k04, String(v)]); }
  function commit() { call('LMSCommit', 'Commit', ['']); }

  var ok = call('LMSInitialize', 'Initialize', ['']);
  if (String(ok) !== 'true' && ok !== true) {
    // بعض المنصات تُهيّأ مسبقاً؛ نتابع إن كانت القراءة تعمل
    if (!get('cmi.core.student_id', 'cmi.learner_id') && !get('cmi.core.lesson_status', 'cmi.completion_status')) return;
  }
  M.active = true; M.version = ver;
  var startTime = Date.now(), finished = false;

  /* ===== ترميز مضغوط لبيانات الطالب (حد SCORM 1.2 هو 4096 حرفاً) ===== */
  function encode(st) {
    var L = [];
    D.LETTERS.forEach(function (l) {
      var r = st.letters[l.id]; if (!r) return;
      var gs = GAMES.map(function (g) { var x = r.games[g]; return x ? [x.best, x.plays, Math.min(x.mistakes, 999), x.last, x.rating || 0].join('.') : ''; });
      L.push(l.idx + '=' + gs.join(','));
    });
    // نحتفظ بأفضل محاولة وآخر محاولة فقط لتبقى البيانات ضمن حد المنصة
    var bestF = st.finals.reduce(function (b, f) { return !b || f.score > b.score ? f : b; }, null), lastF = st.finals[st.finals.length - 1];
    var keep = bestF ? (bestF === lastF ? [lastF] : [bestF, lastF]) : [];
    var fins = keep.map(function (f) {
      var bits = D.LETTERS.map(function (l) { return l.id in f.perLetter ? (f.perLetter[l.id] ? '1' : '0') : '-'; }).join('');
      var bt = Object.keys(f.byType || {}).map(function (k) { return k + ':' + f.byType[k].c + '/' + f.byType[k].n; }).join(',');
      return [Math.round(f.at / 1000), f.score, f.correct, f.total, bits, bt];
    });
    var o = { v: 1, h: st.hero, u: st.unlockedWorlds, k: st.keys, c: st.chests, b: st.badges, w: st.wardrobe, i: st.seenIntro ? 1 : 0, t: st.timeSpent, f: fins, L: L.join(';') };
    var sb = st.shownBadges || [];
    if (sb.length !== st.badges.length) o.sb = sb;
    return JSON.stringify(o);
  }
  function decode(str, st) {
    var o = JSON.parse(str);
    if (!o || o.v !== 1) return false;
    st.hero = o.h || null; st.unlockedWorlds = o.u || 1; st.keys = o.k || 0; st.chests = o.c || []; st.badges = o.b || [];
    st.shownBadges = o.sb || st.badges.slice(); st.wardrobe = o.w || { hats: [], colors: [], capes: [] };
    st.seenIntro = !!o.i; st.timeSpent = o.t || 0; st.letters = {};
    (o.L || '').split(';').filter(Boolean).forEach(function (part) {
      var kv = part.split('='), l = D.LETTERS[+kv[0]]; if (!l) return;
      var rec = { learned: true, games: {} };
      (kv[1] || '').split(',').forEach(function (g, gi) {
        if (!g) return; var a = g.split('.').map(Number);
        rec.games[GAMES[gi]] = { best: a[0], plays: a[1], mistakes: a[2], last: a[3], rating: a[4], correct: 0, questions: 0, at: Date.now() };
      });
      st.letters[l.id] = rec;
    });
    st.finals = (o.f || []).map(function (f) {
      var per = {}; D.LETTERS.forEach(function (l, i) { var c = f[4].charAt(i); if (c !== '-') per[l.id] = c === '1'; });
      var bt = {}; (f[5] || '').split(',').filter(Boolean).forEach(function (x) { var p = x.split(':'), cn = p[1].split('/'); bt[p[0]] = { c: +cn[0], n: +cn[1] }; });
      return { at: f[0] * 1000, score: f[1], correct: f[2], total: f[3], perLetter: per, byType: bt };
    });
    return true;
  }

  /* ===== المتعلم ===== */
  var lmsId = get('cmi.core.student_id', 'cmi.learner_id') || 'learner';
  var rawName = get('cmi.core.student_name', 'cmi.learner_name');
  var name = rawName.indexOf(',') > 0 ? rawName.split(',').map(function (x) { return x.trim(); }).reverse().join(' ') : rawName.trim();
  var sid = 'lms-' + lmsId;
  var st = S.getStudent(sid);
  if (!st) {
    st = S.normalize({ id: sid, name: name || 'المتعلم', cls: '', createdAt: Date.now() });
    S.state.students.push(st);
  }
  if (name) st.name = name.slice(0, 40);
  var susp = get('cmi.suspend_data', 'cmi.suspend_data');
  if (susp) { try { decode(susp, st); S.normalize(st); } catch (e) { } }
  S.setActive(sid);

  var status = get('cmi.core.lesson_status', 'cmi.completion_status');
  if (!status || status === 'not attempted' || status === 'unknown') {
    set('cmi.core.lesson_status', 'cmi.completion_status', 'incomplete');
  }

  /* ===== إرسال التقدم ===== */
  var lastSusp = susp, pushTimer = null;
  function push() {
    if (finished) return;
    var s = S.getStudent(sid); if (!s) return;
    var data = encode(s);
    if (is12 && data.length > 4096) { var tmp = JSON.parse(data); tmp.f = tmp.f.slice(0, 1); data = JSON.stringify(tmp); }
    if (data !== lastSusp) { set('cmi.suspend_data', 'cmi.suspend_data', data); lastSusp = data; }

    var done = D.LETTERS.filter(function (l) { return S.letterDone(s, l.id); }).length;
    var all = S.allWorldsDone(s), fin = S.lastFinal(s);
    set(null, 'cmi.progress_measure', (done / 28).toFixed(2));
    set('cmi.core.lesson_location', 'cmi.location', String(Math.min(s.unlockedWorlds, 7)));
    if (fin) {
      var best = Math.max.apply(null, s.finals.map(function (f) { return f.score; }));
      set('cmi.core.score.min', 'cmi.score.min', 0); set('cmi.core.score.max', 'cmi.score.max', 100);
      set('cmi.core.score.raw', 'cmi.score.raw', best);
      set(null, 'cmi.score.scaled', (best / 100).toFixed(2));
      // لا عقاب: نتيجة أقل من ٦٠ تُسجَّل «مكتمل» وليس «راسب»
      if (is12) set('cmi.core.lesson_status', null, best >= 60 ? 'passed' : 'completed');
      else { set(null, 'cmi.completion_status', 'completed'); set(null, 'cmi.success_status', best >= 60 ? 'passed' : 'unknown'); }
    } else if (all) {
      set('cmi.core.lesson_status', 'cmi.completion_status', 'completed');
    }
    // إتقان كل حرف
    D.LETTERS.forEach(function (l, i) {
      var m = S.mastery(s, l.id); if (m === null) return;
      var p = 'cmi.objectives.' + i + '.';
      set(p + 'id', p + 'id', 'letter_' + l.id);
      set(p + 'score.raw', p + 'score.raw', m);
      set(p + 'score.min', p + 'score.min', 0); set(p + 'score.max', p + 'score.max', 100);
      if (is12) set(p + 'status', null, m >= 80 ? 'passed' : S.letterDone(s, l.id) ? 'completed' : 'incomplete');
      else {
        set(null, p + 'score.scaled', (m / 100).toFixed(2));
        set(null, p + 'success_status', m >= 80 ? 'passed' : 'unknown');
        set(null, p + 'completion_status', S.letterDone(s, l.id) ? 'completed' : 'incomplete');
      }
    });
    set('cmi.core.exit', 'cmi.exit', 'suspend');
    commit();
  }
  S.onSave(function (now) { clearTimeout(pushTimer); if (now) push(); else pushTimer = setTimeout(push, 1200); });

  function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
  function finish() {
    if (finished) return;
    clearTimeout(pushTimer); push();
    var sec = Math.round((Date.now() - startTime) / 1000);
    if (is12) set('cmi.core.session_time', null, pad(Math.floor(sec / 3600), 4) + ':' + pad(Math.floor(sec / 60) % 60, 2) + ':' + pad(sec % 60, 2));
    else set(null, 'cmi.session_time', 'PT' + Math.floor(sec / 3600) + 'H' + (Math.floor(sec / 60) % 60) + 'M' + (sec % 60) + 'S');
    commit();
    finished = true;
    call('LMSFinish', 'Terminate', ['']);
  }
  window.addEventListener('pagehide', finish);
  window.addEventListener('beforeunload', finish);
  setTimeout(push, 500);

  M.learnerName = name; M.push = push; M.finish = finish; M.encode = encode; M.decode = decode;
})();
