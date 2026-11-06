/* مغامرة إنقاذ مملكة الحروف — الشاشات وتدفق اللعب */
(function () {
  'use strict';
  var D = HK.data, S = HK.store, A = HK.audio, ART = HK.art, G = HK.games;
  var esc = D.esc, ar = G.toAr;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var screenEl = $('#screen'), topbar = $('#topbar');
  var current = { name: null, cleanup: null, session: null };
  var lastGuide = '';
  // داخل منصة تعلم (SCORM): المتعلم معروف من المنصة، ولوحة المعلم تُستبدل بتقارير المنصة
  var LMS = !!(HK.scorm && HK.scorm.active);

  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function btn(cls, html, fn, label) {
    var b = h('button', 'btn ' + (cls || ''), html);
    if (label) b.setAttribute('aria-label', label);
    b.addEventListener('click', function (e) { A.sfx('click'); fn(e); });
    return b;
  }
  function st() { return S.active(); }

  /* ===== التنقل الآمن بين الشاشات ===== */
  var SCREENS = {};
  function go(name, params) {
    try {
      if (current.session) { current.session.dispose(); current.session = null; }
      if (current.cleanup) { try { current.cleanup(); } catch (e) { } current.cleanup = null; }
      A.stop(); closeModal(true); hideFallback();
      document.body.className = 'scr-' + name;
      screenEl.innerHTML = ''; screenEl.scrollTop = 0; window.scrollTo(0, 0);
      setGuide(null);
      current.name = name; current.params = params || {};
      var r = SCREENS[name](params || {});
      if (typeof r === 'function') current.cleanup = r;
      screenEl.focus({ preventScroll: true });
    } catch (e) {
      console.error(e);
      if (name !== 'map' && st() && st().hero) go('map'); else if (name !== 'title') go('title');
    }
  }

  function setTop(opts) {
    if (!opts) { topbar.classList.add('hidden'); return; }
    topbar.classList.remove('hidden');
    $('#tb-title').textContent = opts.title || '';
    $('#tb-back').style.visibility = opts.back ? 'visible' : 'hidden';
    $('#tb-back').onclick = opts.back ? function () { A.sfx('click'); opts.back(); } : null;
    refreshStats();
  }
  function refreshStats() {
    var s = st(); if (!s) return;
    $('#tb-stars b').textContent = ar(S.totalStars(s));
    $('#tb-keys b').textContent = ar(s.keys);
  }
  $('#tb-settings').onclick = function () { A.sfx('click'); openSettings(); };
  $('#tb-badges').onclick = function () { A.sfx('click'); go('badges'); };

  function theme(w) {
    var r = document.documentElement.style;
    var W = D.WORLDS[w] || { sky1: '#bfe6ff', sky2: '#7ec8ff' };
    r.setProperty('--sky1', W.sky1); r.setProperty('--sky2', W.sky2);
    r.setProperty('--w1', W.c1 || '#7b61ff'); r.setProperty('--w2', W.c2 || '#5b3fd1');
    document.body.dataset.theme = W.theme || 'default';
  }
  function floaters(on, chars) {
    var f = $('#floaters'); f.innerHTML = '';
    if (!on) return;
    var list = chars || D.LETTERS.map(function (l) { return l.display; });
    for (var i = 0; i < 12; i++) {
      var s = h('span', 'floater', esc(D.pick(list)));
      s.style.left = (Math.random() * 95) + '%'; s.style.animationDelay = (-Math.random() * 20) + 's';
      s.style.animationDuration = (14 + Math.random() * 12) + 's'; s.style.fontSize = (1.6 + Math.random() * 2.4) + 'rem';
      f.appendChild(s);
    }
  }

  /* ===== حكيم الحروف ===== */
  $('#guide-owl').innerHTML = ART.hakeem();
  function setGuide(text, speak) {
    var g = $('#guide');
    if (text == null) { g.classList.add('hidden'); return; }
    g.classList.remove('hidden');
    lastGuide = text;
    $('#guide-text').textContent = text;
    $('#guide-bubble').classList.remove('fb');
    var b = $('#guide-bubble'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    if (speak) A.say(text, { show: false });
  }
  $('#guide-replay').onclick = function () { if (lastGuide) A.say(lastGuide, { show: false }); };
  $('#guide-owl').onclick = function () {
    if (current.session && current.session.hint) { current.session.hint(); A.say('إليك تلميحاً', { show: false }); }
    else if (lastGuide) A.say(lastGuide, { show: false });
  };
  A.onSpeaking(function (on) { $('#guide').classList.toggle('talking', on); });

  // بديل مرئي عند تعذّر النطق
  var fbTimer;
  A.onFallback(function (text) {
    // إن كان حكيم ظاهراً يعرض النص في فقاعته، وإلا يظهر شريط صغير
    if (!$('#guide').classList.contains('hidden')) {
      $('#guide-text').textContent = '💬 ' + text;
      var gb = $('#guide-bubble'); gb.classList.remove('pop'); void gb.offsetWidth; gb.classList.add('pop', 'fb');
      return;
    }
    var f = $('#say-fallback');
    f.innerHTML = '<span class="fb-ic">💬</span> ' + esc(text);
    f.classList.remove('hidden'); f.classList.remove('pop'); void f.offsetWidth; f.classList.add('pop');
    clearTimeout(fbTimer); fbTimer = setTimeout(hideFallback, 3800);
  });
  function hideFallback() { $('#say-fallback').classList.add('hidden'); }

  /* ===== نوافذ وإشعارات ===== */
  var modalOnClose = null;
  function openModal(html, cls, onClose) {
    var m = $('#modal'), c = $('#modal-card');
    c.className = 'modal-card ' + (cls || '');
    c.innerHTML = ''; if (typeof html === 'string') c.innerHTML = html; else c.appendChild(html);
    m.classList.remove('hidden'); modalOnClose = onClose || null;
    return c;
  }
  function closeModal(silent) {
    var m = $('#modal'); if (m.classList.contains('hidden')) return;
    m.classList.add('hidden'); var f = modalOnClose; modalOnClose = null;
    if (f && !silent) f();
  }
  $('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal' && $('#modal-card').classList.contains('dismiss')) closeModal(); });
  function toast(html, ms) {
    var t = h('div', 'toast', html); $('#toasts').appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, ms || 3200);
    setTimeout(function () { t.remove(); }, (ms || 3200) + 500);
  }
  function showBadges(list) {
    list.forEach(function (b, i) {
      setTimeout(function () { A.sfx('star'); toast('<span class="t-ic">' + b.icon + '</span><div><b>شارة جديدة: ' + esc(b.name) + '</b><small>' + esc(b.desc) + '</small></div>', 3800); }, i * 900);
    });
  }

  /* ===== الإعدادات ===== */
  function openSettings() {
    var s = S.settings();
    var vi = A.voiceInfo();
    var vtxt = vi.state === 'ok' ? 'صوت عربي متوفر: ' + esc(vi.name || '') :
      'لم يُعثر على صوت عربي في هذا الجهاز؛ ستظهر الكلمات مكتوبة على الشاشة. يمكن تثبيت صوت عربي من إعدادات الجهاز (تحويل النص إلى كلام).';
    var c = openModal(
      '<h2>⚙️ الإعدادات</h2>' +
      '<label class="set-row"><span>🔇 كتم الصوت</span><input type="checkbox" id="set-mute" ' + (s.muted ? 'checked' : '') + '></label>' +
      '<label class="set-row"><span>🔊 مستوى الصوت</span><input type="range" id="set-vol" min="0" max="1" step="0.05" value="' + s.volume + '"></label>' +
      '<label class="set-row"><span>🎵 الموسيقى</span><input type="checkbox" id="set-music" ' + (s.music ? 'checked' : '') + '></label>' +
      '<label class="set-row"><span>🐢 سرعة النطق</span><input type="range" id="set-rate" min="0.55" max="1.1" step="0.05" value="' + s.rate + '"></label>' +
      '<p class="voice-status">' + vtxt + '</p>' +
      '<div class="row-btns"><button class="btn" id="set-test">🗣️ جرّب الصوت</button><button class="btn" id="set-full">⛶ ملء الشاشة</button></div>' +
      (st() && !LMS ? '<div class="row-btns"><button class="btn ghost" id="set-switch">👤 تغيير البطل</button></div>' : '') +
      '<div class="row-btns"><button class="btn primary" id="set-close">تم ✔️</button></div>', 'dismiss settings');
    $('#set-mute', c).onchange = function (e) { s.muted = e.target.checked; S.save(); A.applyVolume(); if (s.muted) { A.stop(); A.music(false); } else A.music(true); };
    $('#set-vol', c).oninput = function (e) { s.volume = +e.target.value; S.save(); A.applyVolume(); };
    $('#set-music', c).onchange = function (e) { s.music = e.target.checked; S.save(); A.music(s.music); };
    $('#set-rate', c).onchange = function (e) { s.rate = +e.target.value; S.save(); };
    $('#set-test', c).onclick = function () { A.refreshVoices(); A.say('مرحباً يا بطل! هذا حرف الباء: بَ، بُ، بِ'); };
    $('#set-full', c).onclick = function () {
      var d = document.documentElement;
      if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen().catch(function () { });
      else if (document.exitFullscreen) document.exitFullscreen().catch(function () { });
    };
    if ($('#set-switch', c)) $('#set-switch', c).onclick = function () { closeModal(true); go('profiles'); };
    $('#set-close', c).onclick = function () { closeModal(); };
  }

  /* ================= الشاشات ================= */

  SCREENS.title = function () {
    setTop(null); theme(-1); floaters(true); A.music(true, 0);
    var w = h('div', 'title-screen');
    w.innerHTML =
      '<div class="title-chars"><div class="t-owl">' + ART.hakeem() + '</div><div class="t-hero">' + ART.hero({ color: '#ff5d8f', hat: 'crown', cape: '#3a86ff' }) + '</div></div>' +
      '<h1 class="game-title"><span>مغامرة إنقاذ</span><span class="big">مملكة الحروف</span></h1>' +
      '<p class="subtitle">رحلة ممتعة لتعلّم الحروف الهجائية العربية الثمانية والعشرين</p>';
    var b = btn('primary huge', '▶ ابدأ المغامرة', function () { if (LMS) enterStudent(); else go('profiles'); });
    w.appendChild(b);
    var row = h('div', 'row-btns');
    row.appendChild(btn('ghost', '⚙️ الإعدادات', openSettings));
    if (!LMS) row.appendChild(btn('ghost', '👩‍🏫 لوحة المعلم', function () { location.hash = 'teacher'; }));
    else if (st()) w.appendChild(h('p', 'subtitle', 'مرحباً يا ' + esc(st().name) + ' 👋'));
    w.appendChild(row);
    if (!S.storageOk()) w.appendChild(h('p', 'warn', 'تنبيه: التخزين في هذا المتصفح غير متاح، لن يُحفظ التقدم.'));
    screenEl.appendChild(w);
  };

  SCREENS.profiles = function () {
    if (LMS) return enterStudent();
    setTop({ title: 'من البطل اليوم؟', back: function () { go('title'); } });
    theme(-1); floaters(true);
    var w = h('div', 'page profiles');
    w.appendChild(h('h2', 'page-h', 'اختر اسمك لتبدأ'));
    var grid = h('div', 'profile-grid');
    S.state.students.forEach(function (s) {
      var c = h('button', 'profile-card');
      c.innerHTML = '<div class="pc-hero">' + (s.hero ? ART.hero(s.hero) : '<div class="pc-new">👤</div>') + '</div>' +
        '<div class="pc-name">' + esc(s.name) + '</div><div class="pc-stars">⭐ ' + ar(S.totalStars(s)) + '</div>';
      c.onclick = function () { A.sfx('click'); S.setActive(s.id); enterStudent(); };
      grid.appendChild(c);
    });
    var add = h('button', 'profile-card add', '<div class="pc-new">➕</div><div class="pc-name">بطل جديد</div>');
    add.onclick = function () { A.sfx('click'); go('newStudent'); };
    grid.appendChild(add);
    w.appendChild(grid);
    screenEl.appendChild(w);
    setGuide(S.state.students.length ? 'اضغط على اسمك لنكمل المغامرة!' : 'مرحباً! اضغط على «بطل جديد» واكتب اسمك', true);
  };

  function enterStudent() {
    var s = st();
    if (!s) return go('profiles');
    if (!s.hero) return go('hero', { first: true });
    if (!s.seenIntro) return go('intro');
    go('map');
  }

  SCREENS.newStudent = function () {
    setTop({ title: 'بطل جديد', back: function () { go('profiles'); } });
    var w = h('div', 'page narrow');
    w.innerHTML = '<h2 class="page-h">ما اسمك؟</h2>' +
      '<input id="ns-name" class="big-input" maxlength="40" autocomplete="off" placeholder="اكتب اسمك هنا">' +
      '<input id="ns-class" class="big-input small" maxlength="30" autocomplete="off" placeholder="الصف أو الشعبة (اختياري)">';
    var b = btn('primary huge', 'التالي ◀', function () {
      var n = $('#ns-name').value.trim();
      if (!n) { $('#ns-name').classList.add('shake'); setGuide('اكتب اسمك أولاً من فضلك', true); return; }
      var s = S.addStudent(n, $('#ns-class').value);
      S.setActive(s.id); go('hero', { first: true });
    });
    w.appendChild(b); screenEl.appendChild(w);
    setTimeout(function () { var i = $('#ns-name'); if (i) i.focus(); }, 100);
    setGuide('اكتب اسمك، أو اطلب من معلمك أن يساعدك', true);
  };

  SCREENS.hero = function (p) {
    var s = st(); if (!s) return go('profiles');
    setTop({ title: 'صمّم بطلك', back: p.first ? function () { go(LMS ? 'title' : 'profiles'); } : function () { go('badges'); } });
    var hero = Object.assign({ name: '', color: ART.COLORS[0], cape: ART.CAPES[0], hat: 'none', eyes: 'round' }, s.hero || {});
    var w = h('div', 'page hero-builder');
    var prev = h('div', 'hb-preview'); w.appendChild(prev);
    var form = h('div', 'hb-form'); w.appendChild(form);
    form.innerHTML = '<label class="hb-label">اسم بطلك</label><input id="hb-name" class="big-input" maxlength="20" placeholder="مثل: نجم، برق، سنا" value="' + esc(hero.name) + '">';
    function row(title, items, key, render) {
      form.appendChild(h('div', 'hb-label', title));
      var r = h('div', 'swatches');
      items.forEach(function (it) {
        var b = h('button', 'swatch' + (hero[key] === it.v ? ' on' : ''), render(it));
        b.setAttribute('aria-label', it.n || it.v);
        b.onclick = function () { A.sfx('pop'); hero[key] = it.v; r.querySelectorAll('.swatch').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); draw(); };
        r.appendChild(b);
      });
      form.appendChild(r);
    }
    var colors = ART.COLORS.concat(s.wardrobe.colors).map(function (c) { return { v: c }; });
    var capes = ART.CAPES.concat(s.wardrobe.capes).map(function (c) { return { v: c }; });
    var hatIcons = { none: '🚫', cap: '🧢', bow: '🎀', flower: '🌼', band: '🥋', crown: '👑', wizard: '🧙', astro: '🪐' };
    var hats = ART.HATS.map(function (x) { return { v: x.id, n: x.name }; }).concat(s.wardrobe.hats.map(function (x) { return { v: x, n: x }; }));
    row('لون البطل', colors, 'color', function (it) { return '<i style="background:' + it.v + '"></i>'; });
    row('لون العباءة', capes, 'cape', function (it) { return '<i style="background:' + it.v + '"></i>'; });
    row('الزينة', hats, 'hat', function (it) { return '<span>' + (hatIcons[it.v] || '🎩') + '</span>'; });
    row('العيون', ART.EYES.map(function (x) { return { v: x.id, n: x.name }; }), 'eyes', function (it) { return '<span>' + ({ round: '👀', happy: '😊', glasses: '🤓' })[it.v] + '</span>'; });
    function draw() { prev.innerHTML = ART.hero(hero) + '<div class="hb-name">' + esc($('#hb-name') ? $('#hb-name').value : hero.name) + '</div>'; }
    screenEl.appendChild(w); draw();
    $('#hb-name').oninput = draw;
    w.appendChild(btn('primary huge', '✔️ احفظ بطلي', function () {
      var n = $('#hb-name').value.trim();
      if (!n) { $('#hb-name').classList.add('shake'); setGuide('اختر اسماً لبطلك!', true); return; }
      hero.name = n; s.hero = hero; S.save(); A.sfx('correct'); ART.confetti(60);
      if (p.first) go('intro'); else go('map');
    }));
    setGuide('اختر اسماً وشكلاً لبطلك الذي سيرافقك في المغامرة', true);
  };

  SCREENS.intro = function () {
    var s = st(); if (!s) return go('profiles');
    setTop(null); theme(5); floaters(true);
    var slides = [
      { t: 'مرحباً يا ' + s.name + '! أنا حكيم الحروف، حارس مملكة الحروف.', art: 'owl' },
      { t: 'هبّت عاصفة النسيان، فبعثرت الحروف الثمانية والعشرين في سبعة عوالم، وأصبحت المملكة مظلمة!', art: 'storm' },
      { t: 'مع بطلك ' + s.hero.name + ' سنستعيد الحروف حرفاً حرفاً. كل عالم تكمله يمنحك مفتاحاً يفتح العالم التالي.', art: 'hero' },
      { t: 'في كل حرف خمس ألعاب ممتعة. إن احتجت مساعدة فاضغط على المصباح 💡 أو عليّ. هيا بنا!', art: 'go' }
    ];
    var i = 0;
    var w = h('div', 'intro');
    screenEl.appendChild(w);
    function show() {
      var sl = slides[i];
      var art = sl.art === 'owl' ? '<div class="intro-owl">' + ART.hakeem() + '</div>' :
        sl.art === 'storm' ? '<div class="storm">🌪️<div class="storm-letters">' + D.LETTERS.slice(0, 14).map(function (l, k) { return '<span style="--k:' + k + '">' + l.display + '</span>'; }).join('') + '</div></div>' :
          sl.art === 'hero' ? '<div class="intro-duo"><div class="intro-owl sm">' + ART.hakeem() + '</div><div class="intro-hero">' + ART.hero(s.hero) + '</div></div>' :
            '<div class="intro-keys">🔑 🗺️ 🏰</div>';
      w.innerHTML = '<div class="intro-art">' + art + '</div><div class="intro-bubble">' + esc(sl.t) + '</div>';
      var row = h('div', 'row-btns');
      row.appendChild(btn('ghost', 'تخطَّ', finish));
      row.appendChild(btn('primary huge', i < slides.length - 1 ? 'التالي ◀' : 'هيا نبدأ! 🚀', function () { i++; if (i >= slides.length) finish(); else show(); }));
      w.appendChild(row);
      A.say(sl.t, { show: false });
    }
    function finish() { s.seenIntro = true; S.save(); go('map'); }
    show();
  };

  /* ===== الخريطة ===== */
  var mapMounted = false, mapOk = false;
  function worldStatus(s, i) {
    if (i === 7) return S.allWorldsDone(s) ? (s.finals.length ? 'restored' : 'open') : 'locked';
    if (S.worldDone(s, i)) return 'done';
    return i < s.unlockedWorlds ? 'open' : 'locked';
  }
  function currentWorld(s) {
    for (var i = 0; i < 7; i++) if (!S.worldDone(s, i)) return Math.min(i, s.unlockedWorlds - 1);
    return 7;
  }
  function worldStars(s, i) {
    var n = 0; D.WORLDS[i].letters.forEach(function (l) { G_IDS.forEach(function (g) { var r = S.gameRec(s, l.id, g); if (r) n += r.best; }); }); return n;
  }
  var G_IDS = D.GAMES.map(function (g) { return g.id; });

  function labelHtml(s, i) {
    var stt = worldStatus(s, i);
    if (i === 7) {
      return '<span class="ml-ic">🏰</span><span class="ml-name">قلعة المملكة</span><span class="ml-sub">' +
        (stt === 'locked' ? '🔒 اختبار الإنقاذ' : stt === 'restored' ? '✨ المملكة مضيئة' : '⚔️ اختبار الإنقاذ') + '</span>';
    }
    var W = D.WORLDS[i];
    return '<span class="ml-ic">' + (stt === 'locked' ? '🔒' : W.icon) + '</span>' +
      '<span class="ml-name">' + ar(i + 1) + '. ' + esc(W.short) + '</span>' +
      '<span class="ml-letters">' + W.letters.map(function (l) { return '<i class="' + (S.letterDone(s, l.id) ? 'got' : '') + '">' + esc(l.display) + '</i>'; }).join('') + '</span>' +
      (stt !== 'locked' ? '<span class="ml-sub">⭐ ' + ar(worldStars(s, i)) + ' / ' + ar(100) + (stt === 'done' ? ' ✅' : '') + '</span>' : '');
  }

  function onSelectWorld(i) {
    var s = st(), stt = worldStatus(s, i);
    A.sfx('click');
    if (stt === 'locked' && i > 0 && i < 7 && S.worldDone(s, i - 1)) { go('worldDone', { w: i - 1 }); return; }
    if (stt === 'locked') {
      A.sfx('wrong');
      if (i === 7) setGuide('القلعة مغلقة! أكمل العوالم السبعة لتفتح اختبار إنقاذ المملكة', true);
      else setGuide('هذا العالم مغلق 🔒 أكمل «' + D.WORLDS[i - 1].short + '» لتحصل على المفتاح', true);
      return;
    }
    if (i === 7) go('finalIntro'); else go('world', { w: i });
  }

  SCREENS.map = function (p) {
    var s = st(); if (!s || !s.hero) return go('profiles');
    setTop({ title: 'خريطة المملكة', back: function () { go(LMS ? 'title' : 'profiles'); } });
    theme(-1); floaters(false);
    document.body.classList.add('map-mode');
    A.music(true, 0);
    var stage = $('#map-stage');
    if (!mapMounted) { mapMounted = true; mapOk = HK.map3d.mount(stage, { onSelect: onSelectWorld }); }
    var cur = currentWorld(s);
    var statuses = [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { return worldStatus(s, i); });
    var labels = [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { return labelHtml(s, i); });
    var heroHtml = '<div class="mh">' + ART.hero(s.hero) + '</div><div class="mh-name">' + esc(s.hero.name) + '</div>';
    var overlay = h('div', 'map-overlay');
    if (mapOk) {
      HK.map3d.update(statuses, labels, heroHtml, cur);
      HK.map3d.focus(p.focus != null ? p.focus : cur, p.focus == null);
      HK.map3d.start();
    } else {
      // خريطة بديلة ثنائية الأبعاد
      var flat = h('div', 'flat-map');
      for (var i = 7; i >= 0; i--) {
        var b = h('button', 'flat-node map-label st-' + statuses[i] + (i === cur ? ' current' : ''), labels[i]);
        b.dataset.idx = i; b.style.setProperty('--off', (Math.sin(i * 1.25) * 30) + '%');
        if (i !== 7) b.style.setProperty('--wc', D.WORLDS[i].c1);
        b.onclick = function (e) { onSelectWorld(+e.currentTarget.dataset.idx); };
        flat.appendChild(b);
      }
      screenEl.appendChild(flat);
      setTimeout(function () { var c = flat.querySelector('.current'); if (c) c.scrollIntoView({ block: 'center' }); }, 50);
    }
    // مهام المعلم
    var tasks = s.assigned.filter(function (id) { return D.BY_ID[id]; });
    if (tasks.length) {
      var tb = h('div', 'teacher-task');
      tb.innerHTML = '<b>📌 مهمة من معلمك:</b> راجع ' + tasks.map(function (id) { return '<button class="tt-l" data-l="' + id + '">' + esc(D.BY_ID[id].display) + '</button>'; }).join('');
      tb.querySelectorAll('.tt-l').forEach(function (b) { b.onclick = function () { A.sfx('click'); go('letter', { id: b.dataset.l }); }; });
      overlay.appendChild(tb);
    }
    if (mapOk) overlay.appendChild(h('div', 'map-hint', '👆 اسحب لأعلى وأسفل لتتجول في المملكة'));
    screenEl.appendChild(overlay);
    var msg;
    if (cur === 7) msg = S.state && s.finals.length ? 'المملكة مضيئة بفضلك! يمكنك مراجعة أي عالم أو إعادة الاختبار' : 'رائع! استعدت كل الحروف. ادخل قلعة المملكة لاختبار الإنقاذ!';
    else if (S.totalStars(s) === 0) msg = 'هذه خريطة المملكة! اضغط على «' + D.WORLDS[0].short + '» لنبدأ أول مهمة';
    else msg = 'لنكمل في «' + D.WORLDS[cur].name + '»';
    setGuide(msg, true);
    return function () { if (mapOk) HK.map3d.stop(); document.body.classList.remove('map-mode'); };
  };

  /* ===== العالم ===== */
  SCREENS.world = function (p) {
    var s = st(), W = D.WORLDS[p.w];
    if (!s || !W || p.w >= s.unlockedWorlds && !S.worldDone(s, p.w)) return go('map');
    setTop({ title: W.name, back: function () { go('map', { focus: p.w }); } });
    theme(p.w); floaters(true, W.letters.map(function (l) { return l.display; }));
    A.music(true, p.w + 1);
    var w = h('div', 'page world-page');
    w.appendChild(h('div', 'world-banner', '<span class="wb-ic">' + W.icon + '</span><div><h2>' + esc(W.name) + '</h2><p>استعد الحروف الأربعة لتحصل على مفتاح العالم التالي</p></div>'));
    var grid = h('div', 'letter-grid');
    W.letters.forEach(function (l, k) {
      var done = S.letterDone(s, l.id), stars = 0, played = 0;
      G_IDS.forEach(function (g) { var r = S.gameRec(s, l.id, g); if (r) { stars += r.best; played++; } });
      var c = h('button', 'letter-card' + (done ? ' done' : ''));
      c.style.animationDelay = (k * 80) + 'ms';
      c.innerHTML = (s.assigned.indexOf(l.id) >= 0 ? '<span class="pin">📌</span>' : '') +
        '<span class="lc-glyph">' + esc(l.display) + '</span><span class="lc-name">' + esc(l.plainName) + '</span>' +
        '<span class="lc-prog"><i style="width:' + (played / 5 * 100) + '%"></i></span>' +
        '<span class="lc-stars">⭐ ' + ar(stars) + ' / ' + ar(25) + (done ? ' ✅' : '') + '</span>';
      c.onclick = function () { A.sfx('click'); go('letter', { id: l.id }); };
      grid.appendChild(c);
    });
    w.appendChild(grid);
    if (S.worldDone(s, p.w) && s.chests.indexOf(p.w) < 0) w.appendChild(btn('primary huge', '🎁 افتح صندوق الكنز', function () { go('worldDone', { w: p.w }); }));
    screenEl.appendChild(w);
    var next = W.letters.filter(function (l) { return !S.letterDone(s, l.id); })[0];
    setGuide(next ? 'اختر حرف ' + G.defName(next) + ' لنبدأ' : 'أحسنت! استعدت كل حروف هذا العالم', true);
  };

  /* ===== مرحلة الحرف (التعلم) ===== */
  SCREENS.letter = function (p) {
    var s = st(), L = D.BY_ID[p.id];
    if (!s || !L) return go('map');
    if (L.world >= s.unlockedWorlds && !S.worldDone(s, L.world)) return go('map');
    var rec = S.letterRec(s, L.id); rec.learned = true; S.save();
    setTop({ title: 'حرف ' + G.defName(L), back: function () { go('world', { w: L.world }); } });
    theme(L.world); floaters(false);
    var w = h('div', 'page letter-page');

    // الحرف الكبير
    var hero = h('section', 'lp-hero');
    hero.innerHTML = '<div class="big-letter" role="img" aria-label="حرف ' + esc(L.plainName) + '">' + esc(L.display) + '</div><div class="lp-name">' + esc(L.name) + '</div>';
    var sp = h('button', 'speaker big', '🔊'); sp.setAttribute('aria-label', 'استمع إلى الحرف');
    sp.onclick = function () { bounce(hero.querySelector('.big-letter')); A.say(L.name, { fallback: 'حرف ' + L.name }); };
    hero.appendChild(sp);
    hero.querySelector('.big-letter').onclick = sp.onclick;
    w.appendChild(hero);

    // الحركات
    var hk = h('section', 'lp-sec');
    hk.appendChild(h('h3', '', 'الحرف مع الحركات'));
    var hr = h('div', 'harakat');
    L.harakat.forEach(function (x) {
      var b = h('button', 'haraka-card', '<span class="glyph">' + esc(x.t) + '</span><small>' + x.n + '</small>');
      b.onclick = function () { bounce(b); A.say(x.t, { fallback: x.t + ' (' + x.n + ')' }); };
      hr.appendChild(b);
    });
    hk.appendChild(hr); w.appendChild(hk);

    // الكلمات المصوّرة
    var ws = h('section', 'lp-sec');
    ws.appendChild(h('h3', '', 'كلمات تبدأ بحرف ' + esc(L.display)));
    var wg = h('div', 'word-gallery');
    L.words.forEach(function (x) {
      var b = h('button', 'word-tile', '<span class="emoji">' + x.e + '</span><span class="wt-word">' + D.highlightWord(x.w, 0) + '</span>');
      b.onclick = function () { bounce(b); A.say(x.w); };
      wg.appendChild(b);
    });
    ws.appendChild(wg); w.appendChild(ws);

    // أشكال الحرف
    var fs = h('section', 'lp-sec');
    fs.appendChild(h('h3', '', 'أشكال حرف ' + esc(L.display) + ' في الكلمة'));
    var fg = h('div', 'forms-grid');
    var ex = { iso: null, ini: { w: L.words[0].w, e: L.words[0].e, i: 0 }, med: { w: L.mid.w, e: L.mid.e, i: D.findIndex(L.mid.w, L.ch, false) }, fin: { w: L.end.w, e: L.end.e, i: D.findIndex(L.end.w, L.ch, true) } };
    [['iso', 'منفصل'], ['ini', 'في أول الكلمة'], ['med', 'في وسط الكلمة'], ['fin', 'في آخر الكلمة']].forEach(function (f) {
      var e = ex[f[0]];
      var b = h('button', 'form-card', '<small>' + f[1] + '</small><span class="glyph">' + esc(L.forms[f[0]]) + '</span>' +
        (e ? '<span class="fc-ex">' + (e.e ? '<i>' + e.e + '</i>' : '') + D.highlightWord(e.w, e.i) + '</span>' : '<span class="fc-ex">' + esc(L.name) + '</span>'));
      b.onclick = function () { bounce(b); A.say(e ? e.w : L.name); };
      fg.appendChild(b);
    });
    fs.appendChild(fg);
    if (!L.joins) fs.appendChild(h('p', 'note', '💡 حرف ' + esc(L.display) + ' لا يتصل بالحرف الذي بعده، لذلك يبقى شكله في أول الكلمة مثل شكله منفصلاً.'));
    w.appendChild(fs);

    // الألعاب
    var gs = h('section', 'lp-sec games-sec');
    gs.appendChild(h('h3', '', '🎮 تحديات حرف ' + esc(L.display)));
    var gg = h('div', 'game-grid');
    D.GAMES.forEach(function (g, k) {
      var r = S.gameRec(s, L.id, g.id);
      var b = h('button', 'game-tile' + (r ? ' played' : ''));
      b.innerHTML = '<span class="gt-ic">' + g.icon + '</span><span class="gt-name">' + ar(k + 1) + '. ' + g.name + '</span>' +
        '<span class="gt-stars">' + rateStars(r ? r.rating : 0) + '</span>';
      b.onclick = function () { A.sfx('click'); go('game', { id: L.id, g: g.id }); };
      gg.appendChild(b);
    });
    gs.appendChild(gg); w.appendChild(gs);
    screenEl.appendChild(w);
    setGuide('هذا حرف ' + G.defName(L) + '. استمع إليه، ثم ابدأ التحديات', false);
    setTimeout(function () { if (current.name === 'letter') A.say('هذا حرف ' + G.defName(L) + '. ' + L.name, { fallback: 'هذا حرف ' + G.defName(L) + ' (' + L.name + ')' }); }, 400);
  };
  function rateStars(n) { var o = ''; for (var i = 0; i < 3; i++) o += '<i class="' + (i < n ? 'on' : '') + '">★</i>'; return o; }
  function bounce(el) { el.classList.remove('bounce'); void el.offsetWidth; el.classList.add('bounce'); }

  /* ===== شاشة اللعب ===== */
  SCREENS.game = function (p) {
    var s = st(), L = D.BY_ID[p.id], GM = D.GAMES.filter(function (g) { return g.id === p.g; })[0];
    if (!s || !L || !GM) return go('map');
    setTop({ title: GM.icon + ' ' + GM.name + ' — ' + L.display, back: function () { go('letter', { id: L.id }); } });
    theme(L.world);
    var wasDone = S.letterDone(s, L.id), worldWasDone = S.worldDone(s, L.world);
    var w = h('div', 'game-screen');
    var hud = h('div', 'game-hud');
    hud.innerHTML = '<div class="dots"></div><div class="g-stars" id="g-stars">⭐ <b>٠</b></div>';
    var hint = h('button', 'hint-btn', '💡'); hint.setAttribute('aria-label', 'تلميح');
    hud.appendChild(hint);
    w.appendChild(hud);
    var body = h('div', 'game-body game-' + GM.id); w.appendChild(body);
    screenEl.appendChild(w);
    var got = 0, hintFn = null;
    hint.onclick = function () { A.sfx('click'); if (hintFn) { hintFn(); setGuide('إليك تلميحاً 💡', false); } };
    var api = {
      say: function (t, o) { o = o || {}; return A.say(t, { rate: o.rate, fallback: o.fallback }); },
      hakeem: function (t, speak) { setGuide(t, speak); },
      star: function (el) { got++; var c = $('#g-stars'); A.sfx('star'); ART.flyStar(el || c, c); setTimeout(function () { if (c) c.querySelector('b').textContent = ar(got); }, 700); },
      progress: function (i, n) {
        var d = hud.querySelector('.dots'); d.innerHTML = '';
        for (var k = 0; k < n; k++) d.appendChild(h('i', k < i ? 'done' : k === i ? 'cur' : ''));
      },
      setHint: function (fn) { hintFn = fn; },
      done: function (res) {
        current.session = null;
        var out = S.recordGame(s, L.id, GM.id, res.first, res.total, res.mistakes);
        // إنهاء تكليف المعلم عند إعادة الألعاب الخمس بعد التكليف
        var ai = s.assigned.indexOf(L.id);
        if (ai >= 0) {
          var since = (s.assignedAt || {})[L.id] || 0;
          if (G_IDS.every(function (g) { var r = S.gameRec(s, L.id, g); return r && r.at >= since; })) { s.assigned.splice(ai, 1); S.save(); }
        }
        S.checkBadges(s); // تُعرض لاحقاً
        result(s, L, GM, res, out, wasDone, worldWasDone);
      }
    };
    setGuide(GM.desc, false);
    current.session = G[GM.id](body, L, api);
  };

  function result(s, L, GM, res, out, wasDone, worldWasDone) {
    var idx = G_IDS.indexOf(GM.id);
    var nextG = D.GAMES.filter(function (g, k) { return k > idx && !S.gameRec(s, L.id, g.id); })[0] ||
      D.GAMES.filter(function (g) { return !S.gameRec(s, L.id, g.id); })[0];
    var msgs = { 3: 'إتقان رائع! ثلاث نجوم ذهبية!', 2: 'عمل ممتاز! أنت قريب من الإتقان', 1: 'أحسنت المحاولة! التدريب يجعلك أقوى' };
    A.sfx(out.rating === 3 ? 'fanfare' : 'correct');
    if (out.rating === 3) ART.confetti(120);
    var c = h('div', 'result');
    c.innerHTML = '<div class="res-stars">' + [0, 1, 2].map(function (i) { return '<span class="' + (i < out.rating ? 'on' : '') + '" style="animation-delay:' + (i * 220) + 'ms">★</span>'; }).join('') + '</div>' +
      '<h2>' + msgs[out.rating] + '</h2>' +
      '<p>أجبت بشكل صحيح من أول مرة عن <b>' + ar(res.first) + '</b> من ' + ar(res.total) + ' أسئلة</p>' +
      (out.newStars ? '<p class="plus">+' + ar(out.newStars) + ' ⭐ نجوم جديدة</p>' : '');
    var row = h('div', 'row-btns');
    var nowDone = S.letterDone(s, L.id);
    var cont = function () {
      if (nowDone && !wasDone) return go('letterDone', { id: L.id, worldJust: S.worldDone(s, L.world) && !worldWasDone });
      if (nextG) go('game', { id: L.id, g: nextG.id }); else go('letter', { id: L.id });
    };
    row.appendChild(btn('ghost', '🔁 العب مرة أخرى', function () { go('game', { id: L.id, g: GM.id }); }));
    row.appendChild(btn('primary', nowDone && !wasDone ? '🎉 تابع' : nextG ? 'التحدي التالي ◀' : 'عودة إلى الحرف', cont));
    c.appendChild(row);
    openModal(c, 'result-card');
    setGuide(msgs[out.rating], true);
    refreshStats();
    var nb = S.checkBadges(s); // لا جديد هنا عادة (حُسبت سابقاً)
    pendingBadges(s);
  }
  // عرض الشارات التي لم تُعرض بعد
  function pendingBadges(s) {
    s.shownBadges = s.shownBadges || [];
    var fresh = s.badges.filter(function (b) { return s.shownBadges.indexOf(b) < 0; });
    if (!fresh.length) return;
    s.shownBadges = s.shownBadges.concat(fresh); S.save();
    showBadges(fresh.map(function (id) { return S.BADGES.filter(function (b) { return b.id === id; })[0]; }).filter(Boolean));
  }

  /* ===== استعادة حرف ===== */
  SCREENS.letterDone = function (p) {
    var s = st(), L = D.BY_ID[p.id]; if (!s || !L) return go('map');
    setTop(null); theme(L.world);
    A.sfx('fanfare'); ART.confetti(160);
    var w = h('div', 'celebrate');
    w.innerHTML = '<div class="rays"></div><div class="cel-letter">' + esc(L.display) + '</div>' +
      '<h2>استعدت حرف ' + esc(G.defName(L)) + '!</h2><div class="cel-hero">' + ART.hero(Object.assign({}, s.hero, { mood: 'wow' })) + '</div>';
    w.appendChild(btn('primary huge', p.worldJust ? '🎁 أكملت العالم! افتح الكنز' : 'تابع المغامرة ◀', function () {
      if (p.worldJust) go('worldDone', { w: L.world }); else go('world', { w: L.world });
    }));
    screenEl.appendChild(w);
    setGuide('رائع! عاد حرف ' + G.defName(L) + ' إلى مكانه في المملكة', true);
  };

  /* ===== إكمال العالم: صندوق الكنز والمفتاح ===== */
  SCREENS.worldDone = function (p) {
    var s = st(), W = D.WORLDS[p.w]; if (!s || !W || !S.worldDone(s, p.w)) return go('map');
    setTop(null); theme(p.w);
    A.sfx('fanfare'); ART.confetti(200);
    var opened = s.chests.indexOf(p.w) >= 0;
    var tr = S.TREASURES[p.w];
    var w = h('div', 'celebrate world-done');
    w.innerHTML = '<div class="rays"></div><h2>🎉 أكملت ' + esc(W.name) + '!</h2>' +
      '<div class="wd-letters">' + W.letters.map(function (l) { return '<span>' + esc(l.display) + '</span>'; }).join('') + '</div>' +
      '<button class="chest' + (opened ? ' open' : '') + '" aria-label="صندوق الكنز"><span class="lid"></span><span class="box"></span><span class="loot">' + tr.icon + '</span></button>' +
      '<p class="wd-msg">' + (opened ? 'حصلت على: ' + esc(tr.name) + ' ومفتاح 🔑' : 'اضغط على صندوق الكنز لتفتحه!') + '</p>';
    var nextBtn = btn('primary huge' + (opened ? '' : ' hidden'), p.w < 6 ? '🔑 افتح العالم التالي' : '🏰 إلى قلعة المملكة', function () {
      go('map', { focus: Math.min(p.w + 1, 7) });
      setTimeout(function () { if (p.w < 6) { A.sfx('key'); toast('<span class="t-ic">🔓</span><div><b>فُتح عالم جديد!</b><small>' + esc(D.WORLDS[p.w + 1].name) + '</small></div>'); } }, 600);
    });
    w.appendChild(nextBtn);
    screenEl.appendChild(w);
    var chest = w.querySelector('.chest');
    chest.onclick = function () {
      if (s.chests.indexOf(p.w) >= 0 && chest.classList.contains('open')) return;
      chest.classList.add('open'); A.sfx('chest'); ART.confetti(120);
      if (s.chests.indexOf(p.w) < 0) {
        s.chests.push(p.w); s.keys++;
        s.unlockedWorlds = Math.max(s.unlockedWorlds, Math.min(7, p.w + 2));
        var key = { hat: 'hats', color: 'colors', cape: 'capes' }[tr.type];
        if (s.wardrobe[key].indexOf(tr.id) < 0) s.wardrobe[key].push(tr.id);
        S.save();
      }
      w.querySelector('.wd-msg').innerHTML = 'مفاجأة! حصلت على: <b>' + esc(tr.name) + '</b> لبطلك، ومفتاح 🔑 العالم التالي';
      nextBtn.classList.remove('hidden');
      setTimeout(function () { A.sfx('key'); }, 700);
      refreshStats(); S.checkBadges(s); pendingBadges(s);
      setGuide('مفاجأة رائعة! يمكنك تزيين بطلك بها من خزانة الإنجازات 🏆', true);
    };
    setGuide(opened ? 'أحسنت يا بطل!' : 'أحسنت! استعدت حروف ' + W.short + '. افتح صندوق الكنز!', true);
  };

  /* ===== الإنجازات ===== */
  SCREENS.badges = function () {
    var s = st(); if (!s) return go('profiles');
    setTop({ title: 'خزانة الإنجازات', back: function () { go('map'); } });
    theme(-1); floaters(false);
    var w = h('div', 'page badges-page');
    var mastered = D.LETTERS.filter(function (l) { var m = S.mastery(s, l.id); return m !== null && m >= 80; }).length;
    w.innerHTML = '<div class="bp-head"><div class="bp-hero">' + ART.hero(s.hero) + '</div><div><h2>' + esc(s.hero.name) + '</h2><p>البطل: ' + esc(s.name) + '</p>' +
      '<div class="bp-stats"><span>⭐ ' + ar(S.totalStars(s)) + '</span><span>🔑 ' + ar(s.keys) + '</span><span>🔤 ' + ar(D.LETTERS.filter(function (l) { return S.letterDone(s, l.id); }).length) + ' / ٢٨ حرفاً</span><span>🏅 ' + ar(mastered) + ' متقن</span></div></div></div>';
    w.querySelector('.bp-head > div:last-child').appendChild(btn('', '🎨 زيّن بطلك', function () { go('hero', {}); }));
    w.appendChild(h('h3', 'page-h3', 'الشارات'));
    var g = h('div', 'badge-grid');
    S.BADGES.forEach(function (b) {
      var has = s.badges.indexOf(b.id) >= 0;
      g.appendChild(h('div', 'badge' + (has ? ' has' : ''), '<span class="b-ic">' + (has ? b.icon : '🔒') + '</span><b>' + esc(b.name) + '</b><small>' + esc(b.desc) + '</small>'));
    });
    w.appendChild(g);
    w.appendChild(h('h3', 'page-h3', 'كنوز العوالم'));
    var tg = h('div', 'badge-grid');
    S.TREASURES.forEach(function (t, i) {
      var has = s.chests.indexOf(i) >= 0;
      tg.appendChild(h('div', 'badge' + (has ? ' has' : ''), '<span class="b-ic">' + (has ? t.icon : '🎁') + '</span><b>' + (has ? esc(t.name) : 'كنز ' + esc(D.WORLDS[i].short)) + '</b>'));
    });
    w.appendChild(tg);
    var fin = S.lastFinal(s);
    if (fin) w.appendChild(btn('primary', '🎓 شهادتي', function () { go('certificate'); }));
    screenEl.appendChild(w);
  };

  /* ===== الاختبار النهائي ===== */
  SCREENS.finalIntro = function () {
    var s = st(); if (!s || !S.allWorldsDone(s)) return go('map');
    setTop({ title: 'اختبار إنقاذ المملكة', back: function () { go('map'); } });
    theme(6); floaters(true);
    var w = h('div', 'page narrow final-intro');
    w.innerHTML = '<div class="fi-castle">🏰</div><h2>اختبار إنقاذ المملكة</h2>' +
      '<p>استعدت كل الحروف! بقيت خطوة أخيرة لتضيء المملكة: <b>٢٨ سؤالاً</b>، سؤال لكل حرف.</p>' +
      '<ul class="fi-types"><li>🔤 تمييز الحرف</li><li>👂 سماع الصوت</li><li>🖼️ اختيار الصورة</li><li>✍️ أشكال الحروف</li><li>َ ُ ِ الحركات</li><li>🧩 الكلمة الناقصة</li></ul>';
    w.appendChild(btn('primary huge', '⚔️ ابدأ الاختبار', function () { go('final'); }));
    screenEl.appendChild(w);
    setGuide('خذ وقتك وفكّر جيداً في كل سؤال. أنا واثق بك!', true);
  };

  SCREENS.final = function () {
    var s = st(); if (!s || !S.allWorldsDone(s)) return go('map');
    var qs = G.buildFinal(), i = 0, answers = [];
    setTop({ title: 'اختبار إنقاذ المملكة', back: function () { confirmExit(); } });
    theme(6);
    var w = h('div', 'game-screen final-screen'); screenEl.appendChild(w);
    var timers = [];
    function confirmExit() {
      var c = h('div', '', '<h2>هل تريد الخروج من الاختبار؟</h2><p>لن تُحفظ إجاباتك في هذه المحاولة.</p>');
      var r = h('div', 'row-btns');
      r.appendChild(btn('ghost', 'أكمل الاختبار', function () { closeModal(); }));
      r.appendChild(btn('primary', 'خروج', function () { closeModal(true); go('map'); }));
      c.appendChild(r); openModal(c);
    }
    function show() {
      var q = qs[i];
      w.innerHTML = '<div class="final-prog"><span>سؤال ' + ar(i + 1) + ' من ' + ar(qs.length) + '</span><span class="fp-type">' + q.typeName + '</span><div class="fp-bar"><i style="width:' + (i / qs.length * 100) + '%"></i></div></div>';
      var card = h('div', 'final-q');
      var noVoice = q.audioOnly && !A.hasVoice();
      card.innerHTML = (q.wordHtml ? '<div class="word-card">' + q.wordHtml + '</div>' : '') + '<div class="prompt-text center">' + esc(noVoice ? q.fallback : q.text) + '</div>';
      var sp = h('button', 'speaker' + (q.audioOnly ? ' big' : ''), '🔊');
      sp.onclick = function () { A.say(q.say, { fallback: q.fallback || q.text }); };
      card.insertBefore(sp, card.firstChild);
      w.appendChild(card);
      var g = h('div', 'opts letters n' + q.options.length + (q.pictures ? ' pics-opts' : ''));
      var locked = false;
      q.options.forEach(function (o) {
        var b = h('button', 'opt', o.html); o.el = b;
        b.onclick = function () {
          if (locked) return; locked = true;
          answers.push({ letter: q.letter.id, type: q.type, ok: !!o.ok });
          if (o.ok) { A.sfx('correct'); b.classList.add('ok'); setGuide(D.pick(D.PRAISE), true); }
          else {
            A.sfx('wrong'); b.classList.add('bad');
            q.options.forEach(function (x) { if (x.ok) x.el.classList.add('ok', 'reveal'); });
            setGuide('الإجابة الصحيحة مضيئة باللون الأخضر، سنراجعها معاً لاحقاً', true);
          }
          timers.push(setTimeout(function () { i++; if (i < qs.length) show(); else finish(); }, o.ok ? 1200 : 2200));
        };
        g.appendChild(b);
      });
      w.appendChild(g);
      timers.push(setTimeout(function () { A.say(q.say, { fallback: q.fallback || q.text }); }, 350));
    }
    function finish() {
      var correct = answers.filter(function (a) { return a.ok; }).length;
      var per = {}, byType = {};
      answers.forEach(function (a) {
        per[a.letter] = a.ok;
        byType[a.type] = byType[a.type] || { c: 0, n: 0 }; byType[a.type].n++; if (a.ok) byType[a.type].c++;
      });
      var score = Math.round(correct / qs.length * 100);
      s.finals.push({ at: Date.now(), score: score, correct: correct, total: qs.length, perLetter: per, byType: byType });
      S.save(true); S.checkBadges(s);
      go('finalResult');
    }
    setGuide('اختبار إنقاذ المملكة بدأ!', false);
    show();
    return function () { timers.forEach(clearTimeout); };
  };

  function finalLevel(score) {
    if (score >= 90) return { t: 'ممتاز — فارس الحروف', c: 'lv-master', icon: '🏆' };
    if (score >= 75) return { t: 'جيد جداً', c: 'lv-master', icon: '🥇' };
    if (score >= 60) return { t: 'جيد', c: 'lv-progress', icon: '🥈' };
    return { t: 'يحتاج إلى مزيد من التدريب', c: 'lv-weak', icon: '💪' };
  }

  SCREENS.finalResult = function () {
    var s = st(), f = s && S.lastFinal(s); if (!f) return go('map');
    setTop({ title: 'نتيجة الاختبار', back: function () { go('map'); } });
    theme(6);
    var lv = finalLevel(f.score);
    var wrong = Object.keys(f.perLetter).filter(function (id) { return !f.perLetter[id]; });
    var weak = D.LETTERS.filter(function (l) { var m = S.mastery(s, l.id); return m !== null && m < 60; }).map(function (l) { return l.id; });
    var review = wrong.concat(weak.filter(function (x) { return wrong.indexOf(x) < 0; }));
    A.sfx('fanfare'); ART.confetti(f.score >= 60 ? 200 : 80);
    var w = h('div', 'page final-result');
    w.innerHTML = '<div class="score-ring" style="--p:' + f.score + '"><div><b>' + ar(f.score) + '</b><small>من ١٠٠</small></div></div>' +
      '<h2 class="' + lv.c + '">' + lv.icon + ' ' + lv.t + '</h2>' +
      '<p>أجبت إجابة صحيحة عن <b>' + ar(f.correct) + '</b> من ' + ar(f.total) + ' سؤالاً</p>' +
      '<div class="type-break">' + Object.keys(G.FINAL_TYPE_NAMES).filter(function (k) { return f.byType[k]; }).map(function (k) {
        var b = f.byType[k]; return '<div><span>' + G.FINAL_TYPE_NAMES[k] + '</span><b>' + ar(b.c) + ' / ' + ar(b.n) + '</b></div>';
      }).join('') + '</div>' +
      '<h3>التوصيات</h3>' +
      (review.length ? '<p>أحسنت! لتصبح أقوى، راجع هذه الحروف وأعد ألعابها:</p><div class="review-letters">' + review.map(function (id) { return '<button data-l="' + id + '">' + esc(D.BY_ID[id].display) + '</button>'; }).join('') + '</div>'
        : '<p>رائع! لقد أتقنت جميع الحروف. استمر في القراءة كل يوم لتبقى فارس الحروف.</p>');
    w.querySelectorAll('.review-letters button').forEach(function (b) { b.onclick = function () { A.sfx('click'); go('letter', { id: b.dataset.l }); }; });
    var row = h('div', 'row-btns');
    row.appendChild(btn('ghost', '🔁 أعد الاختبار', function () { go('final'); }));
    row.appendChild(btn('primary huge', '🏰 شاهد المملكة', function () { go('ending'); }));
    w.appendChild(row);
    screenEl.appendChild(w);
    setGuide('حصلت على ' + f.score + ' من مئة. ' + lv.t, true);
  };

  /* ===== شاشة النهاية ===== */
  var ENDING = 'أحسنت يا بطل! لقد أنقذت مملكة الحروف، وأصبحت فارس الحروف العربية!';
  SCREENS.ending = function () {
    var s = st(); if (!s || !S.lastFinal(s)) return go('map');
    setTop(null); theme(6); floaters(false);
    A.music(true, 6);
    var w = h('div', 'ending');
    var letters = D.LETTERS.map(function (l, i) {
      var a = Math.PI * (i / 27), r = 44;
      return '<span style="--x:' + (50 + Math.cos(a) * r) + '%;--y:' + (64 - Math.sin(a) * r * 1.1) + '%;--d:' + (i * 90) + 'ms">' + esc(l.display) + '</span>';
    }).join('');
    w.innerHTML = '<div class="end-sky"></div><div class="end-rainbow"></div><div class="end-castle">' + castleSvg() + '</div><div class="end-letters">' + letters + '</div>' +
      '<div class="end-chars"><div class="end-owl">' + ART.hakeem() + '</div><div class="end-hero">' + ART.hero(Object.assign({}, s.hero, { mood: 'wow' })) + '</div></div>' +
      '<div class="end-bubble">«' + esc(ENDING) + '»</div>';
    w.appendChild(btn('primary huge end-btn', '🎓 استلم شهادتك', function () { go('certificate'); }));
    screenEl.appendChild(w);
    var t1 = setTimeout(function () { w.classList.add('lit'); A.sfx('fanfare'); ART.confetti(250); }, 700);
    var t2 = setTimeout(function () { A.say(ENDING, { show: false }); }, 2600);
    var t3 = setInterval(function () { ART.confetti(60, { x: Math.random() * innerWidth, y: innerHeight * .3 }); }, 2500);
    return function () { clearTimeout(t1); clearTimeout(t2); clearInterval(t3); };
  };
  function castleSvg() {
    return '<svg viewBox="0 0 300 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="cw" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff6e5"/><stop offset="1" stop-color="#f1d6b0"/></linearGradient></defs>' +
      '<rect x="70" y="100" width="160" height="130" fill="url(#cw)" stroke="#d8b98a" stroke-width="3"/>' +
      '<rect x="30" y="80" width="50" height="150" fill="url(#cw)" stroke="#d8b98a" stroke-width="3"/><rect x="220" y="80" width="50" height="150" fill="url(#cw)" stroke="#d8b98a" stroke-width="3"/>' +
      '<rect x="120" y="50" width="60" height="180" fill="url(#cw)" stroke="#d8b98a" stroke-width="3"/>' +
      '<path d="M22 82 L55 20 L88 82Z" fill="#7a5cff"/><path d="M212 82 L245 20 L278 82Z" fill="#7a5cff"/><path d="M112 52 L150 -6 L188 52Z" fill="#ff5d8f"/>' +
      '<path d="M120 230 v-50 a30 30 0 0 1 60 0 v50z" fill="#8d5524"/>' +
      '<g class="win"><rect x="45" y="120" width="20" height="28" rx="10"/><rect x="235" y="120" width="20" height="28" rx="10"/><rect x="140" y="80" width="20" height="30" rx="10"/><rect x="90" y="130" width="18" height="26" rx="9"/><rect x="192" y="130" width="18" height="26" rx="9"/></g>' +
      '<path d="M150 -6 v-20" stroke="#fff" stroke-width="3"/><path d="M150 -26 l26 8 l-26 8z" fill="#ffd23f"/></svg>';
  }

  /* ===== الشهادة ===== */
  SCREENS.certificate = function () {
    var s = st(), f = s && S.lastFinal(s); if (!f) return go('map');
    setTop({ title: 'شهادة الإنجاز', back: function () { go('map'); } });
    theme(6);
    var mastered = D.LETTERS.filter(function (l) { var m = S.mastery(s, l.id); return m !== null && m >= 80; });
    var best = Math.max.apply(null, s.finals.map(function (x) { return x.score; }));
    var d = new Date(f.at);
    var w = h('div', 'page cert-page');
    w.innerHTML = '<div class="certificate" id="certificate">' +
      '<div class="cert-border"><div class="cert-seal">🏅</div>' +
      '<h1>شهادة إنجاز</h1><p class="cert-sub">مملكة الحروف العربية</p>' +
      '<p class="cert-text">تشهد مملكة الحروف بأن البطل</p><h2 class="cert-name">' + esc(s.name) + '</h2>' +
      '<p class="cert-text">قد أنقذ مملكة الحروف مع بطله «' + esc(s.hero.name) + '»، وأصبح<br><b>فارس الحروف العربية</b></p>' +
      '<div class="cert-stats"><div><b>⭐ ' + ar(S.totalStars(s)) + '</b><small>نجمة</small></div><div><b>🔤 ' + ar(mastered.length) + ' / ٢٨</b><small>حرفاً متقناً</small></div><div><b>🎯 ' + ar(best) + '</b><small>نتيجة الاختبار</small></div></div>' +
      (mastered.length ? '<div class="cert-letters">' + mastered.map(function (l) { return '<span>' + esc(l.display) + '</span>'; }).join('') + '</div>' : '') +
      '<div class="cert-foot"><span>التاريخ: ' + d.toLocaleDateString('ar') + '</span><span class="cert-owl">' + ART.hakeem() + '<small>حكيم الحروف</small></span></div>' +
      '</div></div>';
    var row = h('div', 'row-btns no-print');
    if (!window.HK_EMBED) row.appendChild(btn('primary', '🖨️ اطبع أو احفظ PDF', function () { window.print(); }));
    row.appendChild(btn('ghost', '🗺️ إلى الخريطة', function () { go('map'); }));
    w.appendChild(row);
    screenEl.appendChild(w);
    setGuide('مبارك! هذه شهادتك يا فارس الحروف', true);
  };

  /* ===== تتبع وقت اللعب ===== */
  setInterval(function () {
    var s = st();
    if (s && !document.hidden && current.name && current.name !== 'title' && current.name !== 'profiles' && document.body.className.indexOf('teacher') < 0) { s.timeSpent += 30; s.lastPlayed = Date.now(); S.save(); }
  }, 30000);

  /* ===== التوجيه بين اللعبة ولوحة المعلم ===== */
  function route() {
    if (location.hash === '#teacher' && !LMS) {
      if (current.session) { current.session.dispose(); current.session = null; }
      if (current.cleanup) { try { current.cleanup(); } catch (e) { } current.cleanup = null; }
      current.name = 'teacher';
      A.stop(); A.music(false); setGuide(null); setTop(null); closeModal(true);
      document.body.className = 'teacher';
      screenEl.innerHTML = '';
      HK.teacher.mount(screenEl, { openModal: openModal, closeModal: closeModal, toast: toast });
    } else if (current.name === 'teacher' || !current.name) {
      go('title');
    }
  }
  window.addEventListener('hashchange', route);
  document.addEventListener('visibilitychange', function () { if (document.hidden) { A.music(false); A.stop(); } else if (current.name && current.name !== 'teacher') A.music(true); });
  window.addEventListener('error', function (e) { console.error('خطأ:', e.message); });
  window.addEventListener('unhandledrejection', function (e) { e.preventDefault(); });

  HK.app = { go: go, refreshStats: refreshStats };
  route();
})();
