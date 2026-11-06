/* لوحة المعلم: إدارة الطلبة، التقدم، الإتقان، التقارير والتصدير */
(function () {
  'use strict';
  var D = HK.data, S = HK.store, esc = D.esc;
  var GN = {}; D.GAMES.forEach(function (g) { GN[g.id] = g.name; });
  var UNLOCK_KEY = 'harf-teacher-unlocked';
  var root, ui, tab = 'students', selId = null;

  function ar(n) { return HK.games.toAr(n); }
  function $(s, r) { return (r || root).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || root).querySelectorAll(s)); }
  function fmtDate(t) { return t ? new Date(t).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'; }
  function fmtTime(sec) { sec = sec || 0; var m = Math.round(sec / 60); return m < 60 ? ar(m) + ' دقيقة' : ar(Math.floor(m / 60)) + ' س ' + ar(m % 60) + ' د'; }
  function unlocked() { try { return sessionStorage.getItem(UNLOCK_KEY) === '1'; } catch (e) { return false; } }
  function setUnlocked(v) { try { if (v) sessionStorage.setItem(UNLOCK_KEY, '1'); else sessionStorage.removeItem(UNLOCK_KEY); } catch (e) { } }

  function stats(st) {
    var ms = D.LETTERS.map(function (l) { return S.mastery(st, l.id); });
    var started = ms.filter(function (m) { return m !== null; });
    var fin = S.lastFinal(st);
    return {
      stars: S.totalStars(st),
      done: D.LETTERS.filter(function (l) { return S.letterDone(st, l.id); }).length,
      mastered: ms.filter(function (m) { return m !== null && m >= 80; }).length,
      weak: D.LETTERS.filter(function (l, i) { return ms[i] !== null && ms[i] < 50; }),
      avg: started.length ? Math.round(started.reduce(function (a, b) { return a + b; }, 0) / started.length) : null,
      final: fin ? fin.score : null, ms: ms, worlds: D.WORLDS.filter(function (w, i) { return S.worldDone(st, i); }).length
    };
  }
  function mcell(m) {
    var lv = S.masteryLevel(m);
    return '<td class="mc ' + lv.cls + '" title="' + lv.label + '">' + (m === null ? '—' : ar(m) + '٪') + '</td>';
  }

  function mount(el, api) {
    root = el; ui = api;
    if (!unlocked()) return lock();
    render();
  }

  /* ===== القفل بالرمز السري ===== */
  function lock() {
    var first = !S.state.teacher;
    root.innerHTML = '<div class="t-lock"><div class="t-lock-card">' +
      '<div class="t-lock-ic">👩‍🏫</div><h1>لوحة المعلم</h1>' +
      (first ? '<p>أنشئ رمزاً سرياً (٤ أرقام أو أكثر) لحماية بيانات الطلبة على هذا الجهاز.</p><input id="p1" type="password" inputmode="numeric" placeholder="الرمز السري" autocomplete="new-password"><input id="p2" type="password" inputmode="numeric" placeholder="أعد كتابة الرمز" autocomplete="new-password">'
        : '<p>أدخل الرمز السري للمعلم</p><input id="p1" type="password" inputmode="numeric" placeholder="الرمز السري" autocomplete="current-password">') +
      '<p class="t-err" id="perr"></p><button class="btn primary" id="pgo">' + (first ? 'إنشاء الرمز والدخول' : 'دخول') + '</button>' +
      '<div class="row-btns"><a class="btn ghost" href="#">🎮 العودة إلى اللعبة</a>' + (first ? '' : '<button class="btn ghost" id="pforgot">نسيت الرمز؟</button>') + '</div></div></div>';
    var go = function () {
      var p1 = $('#p1').value.trim();
      if (first) {
        if (!/^\d{4,12}$/.test(p1)) return err('الرمز يجب أن يكون من ٤ إلى ١٢ رقماً');
        if (p1 !== $('#p2').value.trim()) return err('الرمزان غير متطابقين');
        S.setPin(p1).then(function () { setUnlocked(true); render(); });
      } else {
        S.checkPin(p1).then(function (ok) { if (ok) { setUnlocked(true); render(); } else err('الرمز غير صحيح'); });
      }
    };
    function err(t) { $('#perr').textContent = t; }
    $('#pgo').onclick = go;
    $$('input').forEach(function (i) { i.onkeydown = function (e) { if (e.key === 'Enter') go(); }; });
    if ($('#pforgot')) $('#pforgot').onclick = function () {
      confirmBox('إعادة ضبط الرمز', 'لا يمكن استرجاع الرمز. يمكنك تعيين رمز جديد، لكن يجب أولاً تنزيل نسخة احتياطية ثم مسح جميع البيانات من هذا الجهاز. هل تريد مسح كل البيانات؟', 'امسح كل البيانات', function () {
        try { localStorage.removeItem('harf-kingdom-v1'); } catch (e) { }
        location.reload();
      });
    };
    setTimeout(function () { var i = $('#p1'); if (i) i.focus(); }, 50);
  }

  /* ===== الإطار العام ===== */
  function render() {
    root.innerHTML = '<div class="t-wrap">' +
      '<header class="t-head no-print"><h1>👩‍🏫 لوحة المعلم — مملكة الحروف</h1><div class="t-head-btns"><a class="btn ghost" href="#">🎮 اللعبة</a><button class="btn ghost" id="tlock">🔒 قفل</button></div></header>' +
      '<nav class="t-tabs no-print">' + [['students', '👧 الطلبة'], ['group', '📊 تقرير الصف'], ['student', '📄 تقرير فردي'], ['data', '💾 البيانات']].map(function (t) {
        return '<button data-tab="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>';
      }).join('') + '</nav><section id="tbody"></section></div>';
    $('#tlock').onclick = function () { setUnlocked(false); lock(); };
    $$('.t-tabs button').forEach(function (b) { b.onclick = function () { tab = b.dataset.tab; render(); }; });
    ({ students: students, group: group, student: student, data: dataTab })[tab]($('#tbody'));
  }

  function confirmBox(title, text, okLabel, fn) {
    var c = document.createElement('div');
    c.innerHTML = '<h2>' + esc(title) + '</h2><p>' + esc(text) + '</p><div class="row-btns"><button class="btn ghost" data-x>إلغاء</button><button class="btn danger" data-ok>' + esc(okLabel) + '</button></div>';
    ui.openModal(c, 'dismiss');
    c.querySelector('[data-x]').onclick = function () { ui.closeModal(true); };
    c.querySelector('[data-ok]').onclick = function () { ui.closeModal(true); fn(); };
  }
  function promptBox(title, fields, fn) {
    var c = document.createElement('div');
    c.innerHTML = '<h2>' + esc(title) + '</h2>' + fields.map(function (f, i) { return '<label class="t-field">' + esc(f.label) + '<input data-i="' + i + '" value="' + esc(f.value || '') + '" maxlength="' + (f.max || 40) + '"></label>'; }).join('') +
      '<div class="row-btns"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" data-ok>حفظ</button></div>';
    ui.openModal(c, 'dismiss');
    c.querySelector('[data-x]').onclick = function () { ui.closeModal(true); };
    c.querySelector('[data-ok]').onclick = function () {
      var vals = fields.map(function (f, i) { return c.querySelector('[data-i="' + i + '"]').value.trim(); });
      if (!vals[0]) { c.querySelector('[data-i="0"]').classList.add('shake'); return; }
      ui.closeModal(true); fn(vals);
    };
  }

  /* ===== تبويب الطلبة ===== */
  function students(el) {
    var list = S.state.students;
    el.innerHTML = '<div class="t-card no-print"><h2>إضافة طالب</h2><form class="t-add" id="addf"><input id="an" placeholder="اسم الطالب" maxlength="40" required><input id="ac" placeholder="الصف / الشعبة (اختياري)" maxlength="30"><button class="btn primary">➕ إضافة</button></form>' +
      '<p class="t-muted">يمكنك أيضاً إضافة أكثر من اسم دفعة واحدة: <button class="link" id="bulk">إضافة قائمة أسماء</button></p></div>' +
      '<div class="t-card"><h2>الطلبة (' + ar(list.length) + ')</h2>' +
      (list.length ? '<div class="t-scroll"><table class="t-table"><thead><tr><th>الاسم</th><th>الصف</th><th>البطل</th><th>⭐ النجوم</th><th>الحروف المكتملة</th><th>العوالم</th><th>متوسط الإتقان</th><th>الاختبار النهائي</th><th>وقت اللعب</th><th>آخر نشاط</th><th></th></tr></thead><tbody>' +
        list.map(function (s) {
          var x = stats(s);
          return '<tr><td><b>' + esc(s.name) + '</b></td><td>' + esc(s.cls || '—') + '</td><td>' + (s.hero ? esc(s.hero.name) : '—') + '</td><td>' + ar(x.stars) + '</td><td>' + ar(x.done) + ' / ٢٨</td><td>' + ar(x.worlds) + ' / ٧</td>' +
            mcell(x.avg) + '<td>' + (x.final === null ? '—' : ar(x.final) + ' / ١٠٠') + '</td><td>' + fmtTime(s.timeSpent) + '</td><td>' + fmtDate(s.lastPlayed) + '</td>' +
            '<td class="t-actions"><button class="btn sm" data-rep="' + s.id + '">📄 تقرير</button><button class="btn sm ghost" data-edit="' + s.id + '">✏️</button><button class="btn sm ghost" data-del="' + s.id + '">🗑️</button></td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<p class="t-empty">لا يوجد طلبة بعد. أضف أسماء طلبتك من الأعلى، أو سيظهر الطالب هنا تلقائياً عند إنشائه من شاشة اللعبة.</p>') + '</div>';
    $('#addf').onsubmit = function (e) {
      e.preventDefault(); var n = $('#an').value.trim(); if (!n) return;
      S.addStudent(n, $('#ac').value); ui.toast('<span class="t-ic">✅</span><div><b>تمت إضافة ' + esc(n) + '</b></div>'); render();
    };
    $('#bulk').onclick = function () {
      var c = document.createElement('div');
      c.innerHTML = '<h2>إضافة قائمة أسماء</h2><p>اكتب كل اسم في سطر مستقل.</p><textarea id="bl" rows="8" class="t-ta"></textarea><label class="t-field">الصف / الشعبة<input id="blc" maxlength="30"></label><div class="row-btns"><button class="btn ghost" data-x>إلغاء</button><button class="btn primary" data-ok>إضافة</button></div>';
      ui.openModal(c, 'dismiss');
      c.querySelector('[data-x]').onclick = function () { ui.closeModal(true); };
      c.querySelector('[data-ok]').onclick = function () {
        var names = c.querySelector('#bl').value.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
        var cls = c.querySelector('#blc').value;
        names.forEach(function (n) { S.addStudent(n, cls); });
        ui.closeModal(true); ui.toast('<span class="t-ic">✅</span><div><b>أضيف ' + ar(names.length) + ' طالباً</b></div>'); render();
      };
    };
    $$('[data-rep]').forEach(function (b) { b.onclick = function () { selId = b.dataset.rep; tab = 'student'; render(); }; });
    $$('[data-edit]').forEach(function (b) {
      b.onclick = function () {
        var s = S.getStudent(b.dataset.edit);
        promptBox('تعديل بيانات الطالب', [{ label: 'الاسم', value: s.name }, { label: 'الصف / الشعبة', value: s.cls, max: 30 }], function (v) { s.name = v[0].slice(0, 40); s.cls = v[1].slice(0, 30); S.save(); render(); });
      };
    });
    $$('[data-del]').forEach(function (b) {
      b.onclick = function () {
        var s = S.getStudent(b.dataset.del);
        confirmBox('حذف طالب', 'سيُحذف «' + s.name + '» وكل تقدمه نهائياً. هل أنت متأكد؟', 'حذف', function () { S.removeStudent(s.id); render(); });
      };
    });
  }

  /* ===== تقرير الصف (جماعي) ===== */
  function classFilter() { var c = group.cls || ''; return S.state.students.filter(function (s) { return !c || (s.cls || '') === c; }); }
  function group(el) {
    var classes = {}; S.state.students.forEach(function (s) { if (s.cls) classes[s.cls] = 1; });
    var list = classFilter();
    if (!S.state.students.length) { el.innerHTML = '<div class="t-card"><p class="t-empty">لا توجد بيانات بعد. ستظهر التقارير عندما يبدأ الطلبة اللعب.</p></div>'; return; }
    var all = list.map(stats);
    var letterAvg = D.LETTERS.map(function (l, i) {
      var v = all.map(function (x) { return x.ms[i]; }).filter(function (m) { return m !== null; });
      return v.length ? Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length) : null;
    });
    var avgs = all.map(function (x) { return x.avg; }).filter(function (m) { return m !== null; });
    var finals = all.map(function (x) { return x.final; }).filter(function (m) { return m !== null; });
    var weakL = D.LETTERS.map(function (l, i) { return { l: l, m: letterAvg[i] }; }).filter(function (o) { return o.m !== null && o.m < 60; }).sort(function (a, b) { return a.m - b.m; });
    var mean = function (a) { return a.length ? Math.round(a.reduce(function (x, y) { return x + y; }, 0) / a.length) : null; };
    el.innerHTML = '<div class="t-card no-print t-toolbar"><label>الصف: <select id="gcls"><option value="">جميع الطلبة</option>' + Object.keys(classes).map(function (c) { return '<option ' + (group.cls === c ? 'selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></label>' +
      '<button class="btn" id="gx">📗 تصدير Excel</button><button class="btn" id="gp">📕 طباعة / PDF</button></div>' +
      '<div class="print-area"><h2 class="print-only">تقرير الصف — مملكة الحروف ' + (group.cls ? '(' + esc(group.cls) + ')' : '') + ' — ' + fmtDate(Date.now()) + '</h2>' +
      '<div class="t-kpis"><div><b>' + ar(list.length) + '</b><small>طالباً</small></div><div><b>' + (mean(avgs) === null ? '—' : ar(mean(avgs)) + '٪') + '</b><small>متوسط الإتقان</small></div>' +
      '<div><b>' + ar(all.reduce(function (a, x) { return a + x.done; }, 0)) + '</b><small>حرفاً مكتملاً (مجموع)</small></div><div><b>' + (mean(finals) === null ? '—' : ar(mean(finals))) + '</b><small>متوسط الاختبار النهائي (' + ar(finals.length) + ' طالب)</small></div></div>' +
      '<div class="t-card"><h2>الحروف الأضعف في الصف</h2>' + (weakL.length ? '<div class="t-weak">' + weakL.map(function (o) { return '<span class="lv-weak">' + esc(o.l.display) + ' <small>' + ar(o.m) + '٪</small></span>'; }).join('') + '</div><p class="t-muted">يُنصح بإعادة شرح هذه الحروف وتكليف الطلبة بمراجعتها.</p>' : '<p class="t-muted">لا توجد حروف ضعيفة حتى الآن (أو لم تتوفر بيانات كافية).</p>') + '</div>' +
      '<div class="t-card"><h2>خريطة إتقان الحروف</h2><div class="t-legend"><span class="lv-master">متقن ٨٠٪+</span><span class="lv-progress">قيد التقدم ٥٠–٧٩٪</span><span class="lv-weak">يحتاج دعماً &lt;٥٠٪</span><span class="lv-none">لم يبدأ</span></div>' +
      '<div class="t-scroll"><table class="t-table heat"><thead><tr><th>الطالب</th>' + D.LETTERS.map(function (l) { return '<th>' + esc(l.display) + '</th>'; }).join('') + '<th>المتوسط</th></tr></thead><tbody>' +
      list.map(function (s, k) { return '<tr><td><b>' + esc(s.name) + '</b></td>' + all[k].ms.map(mcell).join('') + mcell(all[k].avg) + '</tr>'; }).join('') +
      '<tr class="avg-row"><td><b>متوسط الصف</b></td>' + letterAvg.map(mcell).join('') + mcell(mean(avgs)) + '</tr></tbody></table></div></div></div>';
    $('#gcls').onchange = function (e) { group.cls = e.target.value; render(); };
    $('#gp').onclick = function () { window.print(); };
    $('#gx').onclick = function () { exportExcel(list, 'تقرير-الصف'); };
  }

  /* ===== التقرير الفردي ===== */
  function student(el) {
    var list = S.state.students;
    if (!list.length) { el.innerHTML = '<div class="t-card"><p class="t-empty">لا يوجد طلبة بعد.</p></div>'; return; }
    if (!selId || !S.getStudent(selId)) selId = list[0].id;
    var s = S.getStudent(selId), x = stats(s), fin = S.lastFinal(s);
    var recs = [];
    if (x.weak.length) recs.push('مراجعة الحروف الضعيفة: ' + x.weak.map(function (l) { return l.display; }).join('، ') + ' مع إعادة ألعابها.');
    var gameAvg = D.GAMES.map(function (g) {
      var v = D.LETTERS.map(function (l) { var r = S.gameRec(s, l.id, g.id); return r ? r.best / 5 : null; }).filter(function (m) { return m !== null; });
      return { g: g, n: v.length, m: v.length ? Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length * 100) : null };
    });
    gameAvg.forEach(function (o) { if (o.m !== null && o.m < 60) recs.push('تحسين مهارة «' + o.g.name + '» (' + ar(o.m) + '٪): ' + ({ listen: 'تدريبات سمعية على أصوات الحروف', 'catch': 'تمييز الحرف بصرياً بين الحروف المتشابهة', match: 'ربط الحرف بصور كلمات تبدأ به', complete: 'تحليل الكلمات إلى حروف', trace: 'التدريب على كتابة الحرف باتجاهه الصحيح' })[o.g.id]); });
    if (fin && fin.byType) Object.keys(fin.byType).forEach(function (k) { var b = fin.byType[k]; if (b.n && b.c / b.n < 0.6) recs.push('في الاختبار النهائي: ضعف في «' + HK.games.FINAL_TYPE_NAMES[k] + '» (' + ar(b.c) + ' من ' + ar(b.n) + ').'); });
    if (!recs.length) recs.push(x.avg === null ? 'لم يبدأ الطالب اللعب بعد.' : 'أداء جيد، يُنصح بالاستمرار والانتقال إلى قراءة كلمات وجمل قصيرة.');

    el.innerHTML = '<div class="t-card no-print t-toolbar"><label>الطالب: <select id="ssel">' + list.map(function (o) { return '<option value="' + o.id + '" ' + (o.id === selId ? 'selected' : '') + '>' + esc(o.name) + '</option>'; }).join('') + '</select></label>' +
      '<button class="btn" id="sx">📗 تصدير Excel</button><button class="btn" id="sp">📕 طباعة / PDF</button></div>' +
      '<div class="print-area"><h2 class="print-only">تقرير فردي — مملكة الحروف — ' + fmtDate(Date.now()) + '</h2>' +
      '<div class="t-card t-profile"><div class="t-ph">' + (s.hero ? HK.art.hero(s.hero) : '👤') + '</div><div><h2>' + esc(s.name) + '</h2><p class="t-muted">' + esc(s.cls || '') + (s.hero ? ' — البطل: ' + esc(s.hero.name) : '') + ' — أُضيف في ' + fmtDate(s.createdAt) + '</p></div></div>' +
      '<div class="t-kpis"><div><b>' + ar(x.stars) + '</b><small>نجمة من ٧٠٠</small></div><div><b>' + ar(x.done) + ' / ٢٨</b><small>حرفاً مكتملاً</small></div><div><b>' + ar(x.mastered) + '</b><small>حرفاً متقناً</small></div><div><b>' + (x.avg === null ? '—' : ar(x.avg) + '٪') + '</b><small>متوسط الإتقان</small></div><div><b>' + (x.final === null ? '—' : ar(x.final)) + '</b><small>آخر اختبار نهائي</small></div><div><b>' + fmtTime(s.timeSpent) + '</b><small>وقت اللعب</small></div></div>' +
      '<div class="t-card"><h2>إتقان الحروف</h2><p class="t-muted no-print">اختر حروفاً ثم اضغط أحد الأزرار أدناه لإعادة أنشطتها أو تكليف الطالب بمراجعتها.</p><div class="t-letters">' +
      D.LETTERS.map(function (l, i) {
        var lv = S.masteryLevel(x.ms[i]);
        return '<label class="t-lt ' + lv.cls + '"><input type="checkbox" value="' + l.id + '" class="no-print"><span class="g">' + esc(l.display) + '</span><small>' + (x.ms[i] === null ? 'لم يبدأ' : ar(x.ms[i]) + '٪') + '</small>' + (s.assigned.indexOf(l.id) >= 0 ? '<i class="pin">📌</i>' : '') + '</label>';
      }).join('') + '</div>' +
      '<div class="row-btns no-print"><button class="btn" id="selweak">تحديد الحروف الضعيفة</button><button class="btn" id="assign">📌 تكليف بمراجعة المحدد</button><button class="btn ghost" id="unassign">إلغاء التكليف</button><button class="btn danger" id="reset">🔄 إعادة أنشطة المحدد</button></div></div>' +
      '<div class="t-card"><h2>التوصيات</h2><ul class="t-recs">' + recs.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="t-card"><h2>الأداء حسب نوع اللعبة</h2><div class="t-kpis small">' + gameAvg.map(function (o) { return '<div><b>' + (o.m === null ? '—' : ar(o.m) + '٪') + '</b><small>' + o.g.icon + ' ' + o.g.name + ' (' + ar(o.n) + ' حرف)</small></div>'; }).join('') + '</div></div>' +
      '<div class="t-card"><h2>تفاصيل الألعاب لكل حرف</h2><div class="t-scroll"><table class="t-table"><thead><tr><th>الحرف</th>' + D.GAMES.map(function (g) { return '<th>' + g.icon + ' ' + g.name + '</th>'; }).join('') + '<th>الإتقان</th></tr></thead><tbody>' +
      D.LETTERS.map(function (l, i) {
        return '<tr><td class="g">' + esc(l.display) + '</td>' + D.GAMES.map(function (g) {
          var r = S.gameRec(s, l.id, g.id);
          return '<td>' + (r ? 'أفضل ' + ar(r.best) + '/٥<br><small>' + ar(r.plays) + ' مرة، أخطاء ' + ar(r.mistakes) + '</small>' : '—') + '</td>';
        }).join('') + mcell(x.ms[i]) + '</tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="t-card"><h2>محاولات الاختبار النهائي</h2>' + (s.finals.length ? '<table class="t-table"><thead><tr><th>التاريخ</th><th>النتيجة</th><th>الصحيح</th>' + Object.keys(HK.games.FINAL_TYPE_NAMES).map(function (k) { return '<th>' + HK.games.FINAL_TYPE_NAMES[k] + '</th>'; }).join('') + '</tr></thead><tbody>' +
        s.finals.map(function (f) { return '<tr><td>' + fmtDate(f.at) + '</td><td><b>' + ar(f.score) + '</b> / ١٠٠</td><td>' + ar(f.correct) + ' / ' + ar(f.total) + '</td>' + Object.keys(HK.games.FINAL_TYPE_NAMES).map(function (k) { var b = f.byType && f.byType[k]; return '<td>' + (b ? ar(b.c) + '/' + ar(b.n) : '—') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>'
        : '<p class="t-muted">لم يُجرِ الطالب الاختبار النهائي بعد (يُفتح بعد إكمال العوالم السبعة).</p>') + '</div></div>';

    $('#ssel').onchange = function (e) { selId = e.target.value; render(); };
    $('#sp').onclick = function () { window.print(); };
    $('#sx').onclick = function () { exportExcel([s], 'تقرير-' + s.name); };
    function sel() { return $$('.t-letters input:checked').map(function (i) { return i.value; }); }
    $('#selweak').onclick = function () { $$('.t-letters input').forEach(function (i) { i.checked = x.weak.some(function (l) { return l.id === i.value; }); }); };
    $('#assign').onclick = function () {
      var ids = sel(); if (!ids.length) return ui.toast('<span class="t-ic">ℹ️</span><div><b>اختر حرفاً واحداً على الأقل</b></div>');
      s.assignedAt = s.assignedAt || {};
      ids.forEach(function (id) { if (s.assigned.indexOf(id) < 0) s.assigned.push(id); s.assignedAt[id] = Date.now(); });
      S.save(); ui.toast('<span class="t-ic">📌</span><div><b>تم التكليف</b><small>ستظهر الحروف للطالب على الخريطة</small></div>'); render();
    };
    $('#unassign').onclick = function () {
      var ids = sel(); s.assigned = s.assigned.filter(function (id) { return ids.length ? ids.indexOf(id) < 0 : false; }); S.save(); render();
    };
    $('#reset').onclick = function () {
      var ids = sel(); if (!ids.length) return ui.toast('<span class="t-ic">ℹ️</span><div><b>اختر حرفاً واحداً على الأقل</b></div>');
      confirmBox('إعادة الأنشطة', 'سيُمسح تقدم الطالب في الحروف: ' + ids.map(function (id) { return D.BY_ID[id].display; }).join('، ') + ' ليعيد ألعابها من جديد (تبقى العوالم المفتوحة مفتوحة). متابعة؟', 'إعادة الأنشطة', function () {
        S.resetLetters(s, ids);
        ids.forEach(function (id) { if (s.assigned.indexOf(id) < 0) s.assigned.push(id); });
        s.assignedAt = s.assignedAt || {}; ids.forEach(function (id) { s.assignedAt[id] = Date.now(); });
        S.save(); render();
      });
    };
  }

  /* ===== Excel ===== */
  function exportExcel(list, fname) {
    var sum = [['الاسم', 'الصف', 'البطل', 'النجوم', 'الحروف المكتملة', 'الحروف المتقنة', 'العوالم المكتملة', 'متوسط الإتقان %', 'الحروف الضعيفة', 'آخر اختبار نهائي', 'وقت اللعب (دقيقة)', 'آخر نشاط']];
    var heat = [['الاسم'].concat(D.LETTERS.map(function (l) { return l.display; }))];
    var games = [['الاسم', 'الحرف', 'اللعبة', 'عدد المرات', 'أفضل نتيجة (من 5)', 'آخر نتيجة (من 5)', 'مجموع الأخطاء', 'آخر لعب']];
    var finals = [['الاسم', 'التاريخ', 'النتيجة من 100', 'الصحيح', 'العدد'].concat(Object.keys(HK.games.FINAL_TYPE_NAMES).map(function (k) { return HK.games.FINAL_TYPE_NAMES[k]; }))];
    list.forEach(function (s) {
      var x = stats(s);
      sum.push([s.name, s.cls || '', s.hero ? s.hero.name : '', x.stars, x.done, x.mastered, x.worlds, x.avg === null ? '' : x.avg, x.weak.map(function (l) { return l.display; }).join(' '), x.final === null ? '' : x.final, Math.round((s.timeSpent || 0) / 60), s.lastPlayed ? new Date(s.lastPlayed).toLocaleString('ar') : '']);
      heat.push([s.name].concat(x.ms.map(function (m) { return m === null ? '' : m; })));
      D.LETTERS.forEach(function (l) {
        D.GAMES.forEach(function (g) {
          var r = S.gameRec(s, l.id, g.id);
          if (r) games.push([s.name, l.display, g.name, r.plays, r.best, r.last, r.mistakes, r.at ? new Date(r.at).toLocaleString('ar') : '']);
        });
      });
      s.finals.forEach(function (f) {
        finals.push([s.name, new Date(f.at).toLocaleString('ar'), f.score, f.correct, f.total].concat(Object.keys(HK.games.FINAL_TYPE_NAMES).map(function (k) { var b = f.byType && f.byType[k]; return b ? b.c + '/' + b.n : ''; })));
      });
    });
    var blob = HK.exporter.xlsx([{ name: 'ملخص الطلبة', rows: sum }, { name: 'إتقان الحروف %', rows: heat }, { name: 'تفاصيل الألعاب', rows: games }, { name: 'الاختبار النهائي', rows: finals }]);
    HK.exporter.download(blob, fname.replace(/[\\\/:*?"<>|]/g, '-') + '-' + new Date().toISOString().slice(0, 10) + '.xlsx');
  }

  /* ===== البيانات ===== */
  function dataTab(el) {
    el.innerHTML = '<div class="t-card"><h2>💾 أين تُحفظ البيانات؟</h2><p>تُحفظ جميع البيانات تلقائياً على هذا الجهاز داخل المتصفح، ولا تُرسل إلى أي خادم أو إنترنت. تبقى البيانات بعد إغلاق اللعبة، لكنها تُمسح إذا مُسحت بيانات المتصفح؛ لذلك ننصح بتنزيل نسخة احتياطية بانتظام.</p>' +
      '<div class="row-btns"><button class="btn primary" id="bk">⬇️ تنزيل نسخة احتياطية</button><label class="btn">⬆️ استعادة نسخة<input type="file" id="rs" accept=".json,application/json" hidden></label><button class="btn" id="xall">📗 تصدير كل الطلبة Excel</button></div></div>' +
      '<div class="t-card"><h2>🔐 الرمز السري</h2><div class="row-btns"><button class="btn" id="cpin">تغيير الرمز السري</button></div></div>' +
      '<div class="t-card danger-zone"><h2>⚠️ مسح جميع البيانات</h2><p>يحذف جميع الطلبة وتقدمهم من هذا الجهاز نهائياً.</p><button class="btn danger" id="wipe">مسح كل شيء</button></div>';
    $('#bk').onclick = function () { HK.exporter.download(new Blob([S.exportJSON()], { type: 'application/json' }), 'نسخة-مملكة-الحروف-' + new Date().toISOString().slice(0, 10) + '.json'); };
    $('#xall').onclick = function () { if (!S.state.students.length) return ui.toast('<span class="t-ic">ℹ️</span><div><b>لا يوجد طلبة بعد</b></div>'); exportExcel(S.state.students, 'جميع-الطلبة'); };
    $('#rs').onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        confirmBox('استعادة نسخة', 'ستحل بيانات الملف محل البيانات الحالية على هذا الجهاز. متابعة؟', 'استعادة', function () {
          try { S.importJSON(r.result); setUnlocked(false); ui.toast('<span class="t-ic">✅</span><div><b>تمت الاستعادة</b></div>'); lock(); }
          catch (er) { ui.toast('<span class="t-ic">⚠️</span><div><b>الملف غير صالح</b></div>'); }
        });
      };
      r.readAsText(f);
    };
    $('#cpin').onclick = function () {
      promptBox('رمز سري جديد', [{ label: 'الرمز الجديد (٤–١٢ رقماً)', max: 12 }], function (v) {
        if (!/^\d{4,12}$/.test(v[0])) return ui.toast('<span class="t-ic">⚠️</span><div><b>الرمز يجب أن يكون من ٤ إلى ١٢ رقماً</b></div>');
        S.setPin(v[0]).then(function () { ui.toast('<span class="t-ic">✅</span><div><b>تم تغيير الرمز</b></div>'); });
      });
    };
    $('#wipe').onclick = function () {
      confirmBox('مسح جميع البيانات', 'هل أنت متأكد؟ لا يمكن التراجع عن هذه الخطوة.', 'نعم، امسح', function () {
        S.state.students = []; S.state.activeId = null; S.save(true); render();
      });
    };
  }

  HK.teacher = { mount: mount };
})();
