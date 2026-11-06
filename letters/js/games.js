/* الألعاب الخمس لكل حرف + بنك أسئلة الاختبار النهائي */
(function () {
  'use strict';
  var D = HK.data, A = HK.audio;
  var shuffle = D.shuffle, esc = D.esc;
  var TOTAL = 5;

  function defName(l) { return 'ال' + l.plainName; }
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  /* ===== جلسة لعب عامة =====
   * api: { say, hakeem, star(el), progress(i,total), done(res), setHint(fn) } */
  function Session(root, letter, api) {
    this.root = root; this.L = letter; this.api = api;
    this.q = 0; this.first = 0; this.mistakes = 0; this.wrongQ = 0; this.locked = false;
    this.timers = []; this.rafs = []; this.alive = true; this.cleanups = [];
  }
  Session.prototype.later = function (fn, ms) {
    var self = this, t = setTimeout(function () { if (self.alive) fn(); }, ms); this.timers.push(t); return t;
  };
  Session.prototype.dispose = function () {
    this.alive = false;
    this.timers.forEach(clearTimeout); this.rafs.forEach(cancelAnimationFrame);
    this.cleanups.forEach(function (f) { try { f(); } catch (e) { } });
  };
  Session.prototype.begin = function (renderQ) {
    this.renderQ = renderQ; this.q = 0; this.show();
  };
  Session.prototype.show = function () {
    this.wrongQ = 0; this.locked = false;
    this.api.progress(this.q, TOTAL);
    this.root.innerHTML = '';
    this.renderQ(this.q);
  };
  Session.prototype.correct = function (el, msg) {
    if (this.locked) return; this.locked = true;
    var firstTry = this.wrongQ === 0;
    if (firstTry) { this.first++; this.api.star(el); }
    A.sfx('correct');
    if (el) el.classList.add('ok');
    var praise = msg || D.pick(D.PRAISE);
    this.api.hakeem(praise, true);
    var self = this;
    this.later(function () { self.next(); }, 1500);
  };
  Session.prototype.wrong = function (el, msg) {
    if (this.locked) return;
    this.mistakes++; this.wrongQ++;
    A.sfx('wrong');
    if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake', 'dim'); }
    this.api.hakeem(msg || D.pick(D.ENCOURAGE), true);
    if (this.wrongQ >= 2 && this.hint) this.hint(true);
  };
  Session.prototype.next = function () {
    this.q++;
    if (this.q >= TOTAL) { this.api.progress(TOTAL, TOTAL); this.api.done({ first: this.first, total: TOTAL, mistakes: this.mistakes }); return; }
    this.show();
  };
  Session.prototype.setHint = function (fn) { this.hint = fn; this.api.setHint(fn); };

  // شبكة خيارات كبيرة
  function optionGrid(sess, items, isCorrect, cls) {
    var g = h('div', 'opts ' + (cls || '') + ' n' + items.length);
    items.forEach(function (it) {
      var b = h('button', 'opt', it.html);
      b.setAttribute('aria-label', it.label || '');
      b.addEventListener('click', function () {
        if (sess.locked || b.classList.contains('dim')) return;
        if (isCorrect(it)) sess.correct(b, it.praise); else sess.wrong(b, it.wrongMsg);
      });
      it.el = b; g.appendChild(b);
    });
    return g;
  }
  function removeOneWrong(items, isCorrect) {
    var w = items.filter(function (it) { return !isCorrect(it) && it.el && !it.el.classList.contains('dim'); });
    if (w.length > 1) { var x = D.pick(w); x.el.classList.add('dim', 'gone'); }
  }
  function speakerBtn(onClick, big) {
    var b = h('button', 'speaker' + (big ? ' big' : ''), '🔊');
    b.setAttribute('aria-label', 'استمع');
    b.addEventListener('click', function () { b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); onClick(); });
    return b;
  }
  function letterHtml(l, form) { return '<span class="glyph">' + esc(form || l.display) + '</span>'; }

  /* ========== أ. استمع واختر ========== */
  function listen(root, L, api) {
    var s = new Session(root, L, api);
    var plan = [
      { n: 2, hard: false }, { n: 3, hard: false }, { n: 4, hard: false }, { n: 4, hard: true }, { haraka: true }
    ];
    s.begin(function (qi) {
      var p = plan[qi], items, isC, sayText, fallbackText;
      if (p.haraka) {
        var target = D.pick(L.harakat);
        items = shuffle(L.harakat).map(function (hk) { return { html: '<span class="glyph">' + esc(hk.t) + '</span>', v: hk.t, label: hk.n }; });
        isC = function (it) { return it.v === target.t; };
        sayText = target.t; fallbackText = 'الحرف مع ال' + target.n + ': ' + target.t;
      } else {
        var opts = [L].concat(D.distractors(L.id, p.n - 1, p.hard));
        items = shuffle(opts).map(function (l) { return { html: letterHtml(l), v: l.id, label: l.plainName }; });
        isC = function (it) { return it.v === L.id; };
        sayText = 'أين حرف ' + defName(L) + '؟'; fallbackText = 'أين حرف ' + defName(L) + '؟ (' + L.name + ')';
      }
      function play(slow) { api.say(sayText, { rate: slow ? 0.6 : undefined, fallback: fallbackText }); }
      var top = h('div', 'prompt');
      top.appendChild(speakerBtn(function () { play(); }, true));
      top.appendChild(h('div', 'prompt-text', p.haraka ? 'استمع ثم اختر الصوت الصحيح' : 'استمع ثم اختر الحرف'));
      root.appendChild(top);
      root.appendChild(optionGrid(s, items, isC, 'letters'));
      s.setHint(function () { removeOneWrong(items, isC); play(true); });
      s.later(function () { play(); }, 450);
    });
    return s;
  }

  /* ========== ب. اصطد الحرف (بالونات متحركة) ========== */
  function catchGame(root, L, api) {
    var s = new Session(root, L, api);
    var NEED = 3;
    var COLS = ['#ff5d8f', '#4cc9f0', '#ffd23f', '#06d6a0', '#9b5de5', '#ff7b54'];
    s.begin(function (qi) {
      var speed = 45 + qi * 14, interval = 1100 - qi * 110, maxOn = 5 + qi;
      var pool = qi >= 2 ? D.similarOf(L.id).map(function (x) { return D.BY_ID[x]; }) : [];
      while (pool.length < 4) { var d = D.distractors(L.id, 1, false, pool.map(function (x) { return x.id; }))[0]; pool.push(d); }
      if (qi < 2) pool = D.distractors(L.id, 5, false);
      var got = 0, balloons = [], last = 0, sinceTarget = 0, lastT = performance.now(), wrongRound = false;

      var top = h('div', 'prompt small');
      top.appendChild(speakerBtn(function () { api.say('اصطد حرف ' + defName(L)); }));
      top.appendChild(h('div', 'prompt-text', 'اصطد حرف <b class="glyph-inline">' + esc(L.display) + '</b> <span class="need">(' + toAr(0) + ' / ' + toAr(NEED) + ')</span>'));
      root.appendChild(top);
      var arena = h('div', 'arena'); root.appendChild(arena);
      var needEl = top.querySelector('.need');

      function spawn() {
        if (balloons.filter(function (b) { return !b.dead; }).length >= maxOn) return;
        var isT = sinceTarget >= 2 || Math.random() < 0.38;
        var l = isT ? L : D.pick(pool);
        sinceTarget = isT ? 0 : sinceTarget + 1;
        var W = arena.clientWidth, H = arena.clientHeight;
        var size = Math.max(64, Math.min(96, W / 5));
        var el = h('button', 'balloon', '<span>' + esc(l.display) + '</span>');
        el.style.setProperty('--c', D.pick(COLS)); el.style.width = size + 'px'; el.style.height = size * 1.18 + 'px';
        var b = { el: el, l: l, x: Math.random() * (W - size), y: H + 10, size: size, ph: Math.random() * 6, dead: false, sp: speed * (0.85 + Math.random() * .35) };
        el.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          if (b.dead || s.locked) return;
          if (b.l.id === L.id) {
            b.dead = true; el.classList.add('popped'); A.sfx('pop');
            got++; needEl.textContent = '(' + toAr(got) + ' / ' + toAr(NEED) + ')';
            s.later(function () { el.remove(); }, 400);
            if (got >= NEED) {
              s.wrongQ = wrongRound ? 1 : 0;
              balloons.forEach(function (o) { if (!o.dead) o.el.classList.add('fade'); });
              s.correct(el);
            } else A.sfx('star');
          } else {
            wrongRound = true; s.mistakes++; s.wrongQ++;
            A.sfx('wrong'); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
            api.hakeem('هذا حرف ' + defName(b.l) + '، ابحث عن ' + L.display, false);
            if (s.wrongQ >= 2) glow();
          }
        });
        arena.appendChild(el); balloons.push(b);
      }
      function glow() {
        balloons.forEach(function (b) { if (!b.dead && b.l.id === L.id) b.el.classList.add('glow'); });
        s.later(function () { balloons.forEach(function (b) { b.el.classList.remove('glow'); }); }, 2200);
      }
      function loop(now) {
        if (!s.alive) return;
        var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
        if (now - last > interval && got < NEED) { last = now; spawn(); }
        balloons.forEach(function (b) {
          if (b.dead) return;
          b.y -= b.sp * dt; b.ph += dt * 2;
          var x = b.x + Math.sin(b.ph) * 12;
          b.el.style.transform = 'translate(' + x + 'px,' + b.y + 'px) rotate(' + Math.sin(b.ph) * 6 + 'deg)';
          if (b.y < -b.size * 1.4) { b.dead = true; b.el.remove(); }
        });
        balloons = balloons.filter(function (b) { return !b.dead || b.el.isConnected; });
        s.rafs.push(requestAnimationFrame(loop));
      }
      s.setHint(function () { glow(); api.say('اصطد حرف ' + defName(L)); });
      api.say(qi === 0 ? 'اصطد حرف ' + defName(L) + '، انقر على البالونات التي تحمل الحرف' : 'اصطد حرف ' + defName(L));
      s.rafs.push(requestAnimationFrame(function (t) { lastT = t; last = t - interval + 300; loop(t); }));
    });
    return s;
  }

  /* ========== ج. طابق الصورة (سحب وإفلات) ========== */
  function match(root, L, api) {
    var s = new Session(root, L, api);
    var plan = [{ n: 2, label: true }, { n: 3, label: true }, { n: 3 }, { n: 4 }, { n: 4, hard: true }];
    var words = shuffle(L.words);
    s.begin(function (qi) {
      var p = plan[qi], target = words[qi % words.length];
      var used = [target.e], cards = [{ w: target, ok: true }];
      D.distractors(L.id, 6, p.hard).forEach(function (dl) {
        if (cards.length >= p.n) return;
        var w = D.wordFromOther(dl, used);
        if (w) { used.push(w.e); cards.push({ w: w, ok: false }); }
      });
      cards = shuffle(cards);

      var top = h('div', 'prompt small');
      top.appendChild(h('div', 'prompt-text', 'اسحب الحرف إلى الصورة التي تبدأ به'));
      root.appendChild(top);
      var tileWrap = h('div', 'tile-wrap');
      var tile = h('div', 'drag-tile', '<span>' + esc(L.display) + '</span>');
      tile.setAttribute('role', 'button'); tile.setAttribute('aria-label', 'حرف ' + L.plainName);
      tileWrap.appendChild(tile); root.appendChild(tileWrap);
      var grid = h('div', 'pics n' + cards.length); root.appendChild(grid);
      cards.forEach(function (c) {
        var el = h('div', 'pic-card', '<div class="emoji">' + c.w.e + '</div>' + (p.label ? '<div class="pic-word">' + esc(c.w.w) + '</div>' : '<div class="pic-word hidden-word">' + esc(c.w.w) + '</div>'));
        var sp = h('button', 'mini-speaker', '🔊'); sp.setAttribute('aria-label', 'استمع إلى الكلمة');
        sp.addEventListener('click', function (e) { e.stopPropagation(); api.say(c.w.w); });
        el.appendChild(sp);
        el.addEventListener('click', function () { if (tile.classList.contains('selected')) answer(c, el); else api.say(c.w.w); });
        c.el = el; grid.appendChild(el);
      });

      function answer(c, el) {
        tile.classList.remove('selected');
        if (s.locked || el.classList.contains('dim')) return;
        if (c.ok) {
          el.querySelector('.pic-word').classList.remove('hidden-word');
          el.querySelector('.pic-word').innerHTML = D.highlightWord(c.w.w, 0);
          tile.classList.add('placed');
          var r = el.getBoundingClientRect(), tr = tile.getBoundingClientRect();
          tile.style.transform = 'translate(' + (r.left + r.width / 2 - tr.left - tr.width / 2) + 'px,' + (r.top - tr.top - tr.height / 3) + 'px) scale(.6)';
          s.correct(el, c.w.w + ' تبدأ بحرف ' + defName(L) + '. أحسنت!');
        } else {
          el.querySelector('.pic-word').classList.remove('hidden-word');
          s.wrong(el, c.w.w + ' تبدأ بحرف آخر، حاول مرة أخرى');
        }
      }

      // السحب بالمؤشر (فأرة / لمس / قلم)
      var drag = null;
      tile.addEventListener('pointerdown', function (e) {
        if (s.locked) return;
        e.preventDefault();
        var r = tile.getBoundingClientRect();
        drag = { sx: e.clientX, sy: e.clientY, ox: e.clientX - r.left, oy: e.clientY - r.top, moved: false, id: e.pointerId };
        try { tile.setPointerCapture(e.pointerId); } catch (er) { }
      });
      tile.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 8) { drag.moved = true; tile.classList.add('dragging'); }
        if (drag.moved) {
          tile.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.1)';
          var over = cardAt(e.clientX, e.clientY);
          cards.forEach(function (c) { c.el.classList.toggle('over', c.el === over); });
        }
      });
      function end(e) {
        if (!drag) return;
        var d = drag; drag = null;
        tile.classList.remove('dragging');
        cards.forEach(function (c) { c.el.classList.remove('over'); });
        if (!d.moved) { tile.classList.toggle('selected'); tile.style.transform = ''; if (tile.classList.contains('selected')) api.hakeem('الآن انقر على الصورة المناسبة', false); return; }
        var over = cardAt(e.clientX, e.clientY);
        var c = cards.filter(function (c) { return c.el === over; })[0];
        if (c) { tile.classList.add('selected'); answer(c, c.el); }
        if (!c || !c.ok) { tile.style.transform = ''; }
      }
      tile.addEventListener('pointerup', end);
      tile.addEventListener('pointercancel', function () { drag = null; tile.style.transform = ''; tile.classList.remove('dragging'); });
      function cardAt(x, y) {
        tile.style.pointerEvents = 'none';
        var el = document.elementFromPoint(x, y);
        tile.style.pointerEvents = '';
        return el ? el.closest('.pic-card') : null;
      }
      s.setHint(function () {
        var c = cards.filter(function (c) { return c.ok; })[0];
        c.el.classList.remove('wiggle'); void c.el.offsetWidth; c.el.classList.add('wiggle');
        api.say(c.w.w);
      });
      if (qi === 0) api.say('اسحب حرف ' + defName(L) + ' إلى الصورة التي تبدأ به');
    });
    return s;
  }

  /* ========== د. أكمل الكلمة ========== */
  function completeGame(root, L, api) {
    var s = new Session(root, L, api);
    var words = shuffle(L.words);
    var plan = [
      { pos: 'ini', n: 2 }, { pos: 'ini', n: 3 }, { pos: 'ini', n: 4, hard: true },
      { pos: 'mid', n: 4 }, { pos: 'end', n: 4, hard: true }
    ];
    s.begin(function (qi) {
      var p = plan[qi], wobj, idx;
      if (p.pos === 'mid' && L.mid.e) { wobj = L.mid; idx = D.findIndex(wobj.w, L.ch, false); }
      else if (p.pos === 'end' && L.end.e) { wobj = L.end; idx = D.findIndex(wobj.w, L.ch, true); }
      else { wobj = words[qi % words.length]; idx = 0; }
      var parts = D.blankWord(wobj.w, idx);
      var top = h('div', 'word-card');
      top.innerHTML = '<div class="emoji big">' + wobj.e + '</div>' +
        '<div class="word-blank" dir="rtl"><span class="wpart">' + esc(parts.pre) + '</span><span class="blank">؟</span><span class="wpart">' + esc(parts.post) + '</span></div>';
      var sp = speakerBtn(function () { api.say(wobj.w); });
      top.appendChild(sp);
      root.appendChild(h('div', 'prompt-text center', 'ما الحرف الناقص؟'));
      root.appendChild(top);
      var opts = [L].concat(D.distractors(L.id, p.n - 1, p.hard));
      var items = shuffle(opts).map(function (l) { return { html: letterHtml(l), v: l.id, label: l.plainName }; });
      var isC = function (it) { return it.v === L.id; };
      var grid = optionGrid(s, items, isC, 'letters');
      root.appendChild(grid);
      var origCorrect = s.correct;
      s.correct = function (el) {
        top.querySelector('.word-blank').innerHTML = D.highlightWord(wobj.w, idx);
        top.classList.add('solved');
        api.say(wobj.w);
        s.correct = origCorrect;
        origCorrect.call(s, el, D.pick(D.PRAISE) + ' ' + wobj.w);
      };
      s.setHint(function () { removeOneWrong(items, isC); api.say(wobj.w, { rate: 0.6 }); });
      s.later(function () { api.say(qi === 0 ? 'أكمل الكلمة: ' + wobj.w : wobj.w); }, 400);
    });
    return s;
  }

  /* ========== هـ. ارسم الحرف (تتبع) ========== */
  var POS_NAME = { iso: 'الحرف منفصلاً', ini: 'في أول الكلمة', med: 'في وسط الكلمة', fin: 'في آخر الكلمة' };
  function trace(root, L, api) {
    var s = new Session(root, L, api);
    var seq = L.joins || L.id === 'ha2' ? ['iso', 'iso', 'ini', 'med', 'fin'] : ['iso', 'iso', 'fin', 'iso', 'fin'];
    var guideAlpha = [0.38, 0.26, 0.34, 0.34, 0.2];
    var fontReady = (document.fonts && document.fonts.load) ? document.fonts.load('900 120px Cairo', 'بـ') : Promise.resolve();
    s.begin(function (qi) {
      var form = L.forms[seq[qi]];
      var tries = 0;
      root.appendChild(h('div', 'prompt-text center', 'تتبّع الحرف ' + POS_NAME[seq[qi]] + ' — ابدأ من النقطة الخضراء ←'));
      var wrap = h('div', 'trace-wrap');
      var cGuide = h('canvas', 'trace-guide'), cInk = h('canvas', 'trace-ink');
      wrap.appendChild(cGuide); wrap.appendChild(cInk);
      var dot = h('div', 'start-dot'); wrap.appendChild(dot);
      root.appendChild(wrap);
      var bar = h('div', 'trace-bar');
      var bClear = h('button', 'btn ghost', '🧽 امسح'), bDone = h('button', 'btn primary', '✔️ انتهيت');
      bar.appendChild(bClear); bar.appendChild(bDone); root.appendChild(bar);

      var W, H, dpr, fs, target = [], dil, evalCanvas, ectx, strokes = [], cur = null, step, startPt, gctx, ictx, bbox;
      fontReady.then(function () { if (s.alive) setup(); });

      function setup() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = wrap.clientWidth; H = wrap.clientHeight;
        [cGuide, cInk].forEach(function (c) { c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px'; });
        gctx = cGuide.getContext('2d'); ictx = cInk.getContext('2d');
        gctx.setTransform(dpr, 0, 0, dpr, 0, 0); ictx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // مقياس الخط ليتسع الحرف
        var m = document.createElement('canvas').getContext('2d');
        fs = Math.min(H * 0.62, 360);
        m.font = '900 ' + fs + 'px Cairo';
        var tw = m.measureText(form).width;
        if (tw > W * 0.8) fs = fs * W * 0.8 / tw;
        // قناع الحرف (دقة 1x)
        var mask = document.createElement('canvas'); mask.width = W; mask.height = H;
        var mc = mask.getContext('2d');
        drawGlyph(mc, '#000', 1);
        var data = mc.getImageData(0, 0, W, H).data;
        step = Math.max(3, Math.round(fs / 45));
        target = [];
        var minX = W, maxX = 0, minY = H, maxY = 0;
        for (var y = 0; y < H; y += step) for (var x = 0; x < W; x += step) {
          if (data[(y * W + x) * 4 + 3] > 140) { target.push([x, y]); if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
        }
        bbox = { x0: minX, x1: maxX, y0: minY, y1: maxY, w: maxX - minX, h: maxY - minY };
        // القناع الموسّع لحساب الدقة
        var dm = document.createElement('canvas'); dm.width = W; dm.height = H;
        var dc = dm.getContext('2d'); drawGlyph(dc, '#000', 1, fs * 0.16);
        dil = dc.getImageData(0, 0, W, H).data;
        evalCanvas = document.createElement('canvas'); evalCanvas.width = W; evalCanvas.height = H;
        ectx = evalCanvas.getContext('2d');
        startPt = findStart();
        dot.style.left = startPt[0] + 'px'; dot.style.top = startPt[1] + 'px';
        drawGuide(guideAlpha[qi]);
      }
      function drawGlyph(c, color, alpha, strokeW) {
        c.save();
        c.globalAlpha = alpha; c.fillStyle = color; c.strokeStyle = color;
        c.font = '900 ' + fs + 'px Cairo'; c.textAlign = 'center'; c.direction = 'rtl';
        var mt = c.measureText(form);
        var asc = mt.actualBoundingBoxAscent || fs * .7, desc = mt.actualBoundingBoxDescent || fs * .2;
        var y = H / 2 + (asc - desc) / 2;
        if (strokeW) { c.lineWidth = strokeW; c.lineJoin = 'round'; c.strokeText(form, W / 2, y); }
        c.fillText(form, W / 2, y);
        c.restore();
      }
      function drawGuide(alpha) {
        gctx.clearRect(0, 0, W, H);
        // خطوط السطر
        gctx.strokeStyle = 'rgba(90,110,200,.18)'; gctx.lineWidth = 2; gctx.setLineDash([10, 10]);
        gctx.beginPath(); gctx.moveTo(10, H * .5); gctx.lineTo(W - 10, H * .5); gctx.stroke(); gctx.setLineDash([]);
        drawGlyph(gctx, '#7b61ff', alpha);
        gctx.save(); gctx.setLineDash([6, 8]); gctx.lineWidth = 3; gctx.strokeStyle = 'rgba(123,97,255,.75)';
        gctx.font = '900 ' + fs + 'px Cairo'; gctx.textAlign = 'center'; gctx.direction = 'rtl';
        var mt = gctx.measureText(form), asc = mt.actualBoundingBoxAscent || fs * .7, desc = mt.actualBoundingBoxDescent || fs * .2;
        gctx.strokeText(form, W / 2, H / 2 + (asc - desc) / 2); gctx.restore();
      }
      // نقطة البداية: على الجزء الأكبر من الحرف (دون النقاط والهمزة)
      function findStart() {
        if (!target.length) return [W / 2, H / 2];
        var key = {}; target.forEach(function (p, i) { key[p[0] + ',' + p[1]] = i; });
        var comp = new Array(target.length).fill(-1), sizes = [], c = 0;
        for (var i = 0; i < target.length; i++) {
          if (comp[i] >= 0) continue;
          var q = [i]; comp[i] = c; var n = 0;
          while (q.length) {
            var k = q.pop(); n++;
            var px = target[k][0], py = target[k][1];
            for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
              var j = key[(px + dx * step) + ',' + (py + dy * step)];
              if (j != null && comp[j] < 0) { comp[j] = c; q.push(j); }
            }
          }
          sizes.push(n); c++;
        }
        var big = sizes.indexOf(Math.max.apply(null, sizes));
        var pts = target.filter(function (p, i) { return comp[i] === big; });
        var rule = L.traceStart, best = null, bs = -Infinity;
        pts.forEach(function (p) {
          var sc = rule === 'top' ? -p[1] * 3 + p[0] * .2 : rule === 'tl' ? -p[0] - p[1] * 1.2 : p[0] - p[1] * .8;
          if (sc > bs) { bs = sc; best = p; }
        });
        return best;
      }

      function pos(e) { var r = cInk.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
      var brush = function () { return Math.max(14, fs * 0.13); };
      function seg(a, b) {
        [ictx, ectx].forEach(function (c, k) {
          c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = brush();
          c.strokeStyle = k === 0 ? '#ff5d8f' : '#000';
          c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
        });
      }
      cInk.addEventListener('pointerdown', function (e) {
        if (s.locked || !ectx) return;
        e.preventDefault(); try { cInk.setPointerCapture(e.pointerId); } catch (er) { }
        cur = [pos(e)]; seg(cur[0], cur[0]);
        dot.classList.add('hide');
      });
      cInk.addEventListener('pointermove', function (e) {
        if (!cur) return; e.preventDefault();
        var p = pos(e), l = cur[cur.length - 1];
        if (Math.abs(p[0] - l[0]) + Math.abs(p[1] - l[1]) < 2) return;
        seg(l, p); cur.push(p);
      });
      function up() {
        if (!cur) return;
        strokes.push(cur); cur = null;
        var r = evaluate();
        if (r.pass && r.cov >= 0.72) finish(r);
      }
      cInk.addEventListener('pointerup', up); cInk.addEventListener('pointercancel', up);

      function evaluate() {
        if (!target.length) return { pass: true, cov: 1, prec: 1 };
        var ink = ectx.getImageData(0, 0, W, H).data, cov = 0;
        target.forEach(function (p) { if (ink[(p[1] * W + p[0]) * 4 + 3] > 60) cov++; });
        var inkN = 0, inside = 0;
        for (var y = 0; y < H; y += step * 2) for (var x = 0; x < W; x += step * 2) {
          var i = (y * W + x) * 4 + 3;
          if (ink[i] > 60) { inkN++; if (dil[i] > 60) inside++; }
        }
        var c = cov / target.length, pr = inkN ? inside / inkN : 0;
        var th = tries >= 2 ? 0.45 : 0.58;
        return { pass: c >= th && pr >= 0.55, cov: c, prec: pr };
      }
      function directionOk() {
        var st = strokes[0]; if (!st || st.length < 3 || /[همو]/.test(L.ch)) return true;
        var a = st[0], b = st[st.length - 1];
        var dx = b[0] - a[0], dy = b[1] - a[1];
        return !(dx > bbox.w * 0.45 && dy < bbox.h * 0.25);
      }
      function finish(r) {
        if (s.locked) return;
        if (tries < 2 && !directionOk()) {
          tries++; s.wrongQ++; s.mistakes++;
          A.sfx('wrong');
          api.hakeem('تذكّر: نكتب العربية من اليمين إلى اليسار. لنبدأ من النقطة الخضراء', true);
          s.later(function () { clear(); showHint(); }, 900);
          return;
        }
        ictx.save(); ictx.globalCompositeOperation = 'source-atop'; ictx.fillStyle = '#22c55e'; ictx.fillRect(0, 0, W, H); ictx.restore();
        drawGlyph(gctx, '#22c55e', .5);
        s.correct(wrap, D.pick(D.PRAISE) + ' خطك جميل');
      }
      bDone.addEventListener('click', function () {
        if (s.locked || !ectx) return;
        if (!strokes.length) { api.hakeem('ارسم فوق الحرف بإصبعك أولاً، ابدأ من النقطة الخضراء', true); return; }
        var r = evaluate();
        if (r.pass) { finish(r); return; }
        tries++; s.wrongQ++; s.mistakes++;
        A.sfx('wrong');
        if (tries >= 3) {
          api.hakeem('محاولة جيدة! سنتدرب عليه أكثر لاحقاً', true);
          s.locked = true; s.later(function () { s.next(); }, 1600);
          return;
        }
        api.hakeem(r.cov < 0.58 ? 'أكمل رسم الحرف كله، ولا تنسَ النقاط إن وُجدت' : 'حاول أن تبقى فوق خط الحرف', true);
        showHint();
      });
      bClear.addEventListener('click', function () { clear(); });
      function clear() {
        strokes = []; cur = null;
        if (ictx) { ictx.clearRect(0, 0, W, H); ectx.clearRect(0, 0, W, H); }
        dot.classList.remove('hide');
      }
      // تلميح: إضاءة الحرف تدريجياً من اليمين إلى اليسار
      function showHint() {
        if (!gctx) return;
        var t0 = performance.now();
        function an(t) {
          if (!s.alive) return;
          var k = Math.min(1, (t - t0) / 1600);
          drawGuide(guideAlpha[qi]);
          gctx.save(); gctx.beginPath(); gctx.rect(W - W * k, 0, W * k, H); gctx.clip();
          drawGlyph(gctx, '#ffb703', .75); gctx.restore();
          if (k < 1) s.rafs.push(requestAnimationFrame(an));
          else s.later(function () { drawGuide(guideAlpha[qi]); }, 500);
        }
        s.rafs.push(requestAnimationFrame(an));
        dot.classList.remove('hide'); dot.classList.add('pulse');
      }
      s.setHint(function () { showHint(); api.say('ابدأ من النقطة الخضراء واكتب من اليمين إلى اليسار'); });
      if (qi === 0) api.say('ارسم حرف ' + defName(L) + ' بإصبعك. ابدأ من النقطة الخضراء');
    });
    return s;
  }

  function toAr(n) { return String(n).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }); }

  /* ===== الاختبار النهائي: سؤال لكل حرف بستة أنواع متناوبة ===== */
  var FINAL_TYPES = ['recognize', 'sound', 'picture', 'form', 'haraka', 'missing'];
  var FINAL_TYPE_NAMES = { recognize: 'تمييز الحرف', sound: 'سماع الصوت', picture: 'اختيار الصورة', form: 'أشكال الحروف', haraka: 'الحركات', missing: 'الكلمة الناقصة' };
  function buildFinal() {
    var order = shuffle(D.LETTERS);
    var types = [];
    while (types.length < order.length) types = types.concat(shuffle(FINAL_TYPES));
    return order.map(function (L, i) {
      var type = types[i], q = { letter: L, type: type, typeName: FINAL_TYPE_NAMES[type] };
      var ds = D.distractors(L.id, 3, i > 9);
      if (type === 'recognize') {
        q.text = 'أين حرف ' + defName(L) + '؟'; q.say = q.text;
        q.options = shuffle([L].concat(ds)).map(function (l) { return { html: letterHtml(l), ok: l.id === L.id }; });
      } else if (type === 'sound') {
        q.text = 'استمع ثم اختر الحرف'; q.say = L.name; q.audioOnly = true; q.fallback = 'الحرف: ' + L.name;
        q.options = shuffle([L].concat(ds)).map(function (l) { return { html: letterHtml(l), ok: l.id === L.id }; });
      } else if (type === 'picture') {
        var w = D.pick(L.words), used = [w.e], opts = [{ html: '<span class="emoji">' + w.e + '</span>', ok: true, w: w.w }];
        ds.concat(D.distractors(L.id, 4, false, ds.map(function (x) { return x.id; }))).forEach(function (dl) {
          if (opts.length >= 4) return; var ow = D.wordFromOther(dl, used); if (ow) { used.push(ow.e); opts.push({ html: '<span class="emoji">' + ow.e + '</span>', ok: false, w: ow.w }); }
        });
        q.text = 'اختر الصورة التي تبدأ بحرف ' + L.display; q.say = 'اختر الصورة التي تبدأ بحرف ' + defName(L);
        q.options = shuffle(opts); q.pictures = true;
      } else if (type === 'form') {
        var pos = L.joins || L.id === 'ha2' ? D.pick(['ini', 'med', 'fin']) : 'fin';
        var posName = { ini: 'أول', med: 'وسط', fin: 'آخر' }[pos];
        q.text = 'كيف يُكتب حرف ' + L.display + ' في ' + posName + ' الكلمة؟'; q.say = 'كيف يكتب حرف ' + defName(L) + ' في ' + posName + ' الكلمة؟';
        var seen = {}; seen[L.forms[pos]] = 1;
        var fo = [{ html: letterHtml(L, L.forms[pos]), ok: true }];
        ds.concat(D.distractors(L.id, 6, false)).forEach(function (dl) {
          if (fo.length >= 4 || seen[dl.forms[pos]]) return; seen[dl.forms[pos]] = 1;
          fo.push({ html: letterHtml(dl, dl.forms[pos]), ok: false });
        });
        q.options = shuffle(fo);
      } else if (type === 'haraka') {
        var hk = D.pick(L.harakat);
        q.text = 'أين حرف ' + L.display + ' مع ال' + hk.n + '؟'; q.say = 'أين حرف ' + defName(L) + ' مع ال' + hk.n + '؟';
        q.options = shuffle(L.harakat.map(function (x) { return { html: '<span class="glyph">' + esc(x.t) + '</span>', ok: x.t === hk.t }; })
          .concat([{ html: letterHtml(L, L.forms.iso), ok: false }]));
      } else {
        var mw = D.pick(L.words), parts = D.blankWord(mw.w, 0);
        q.text = 'ما الحرف الناقص؟'; q.say = mw.w; q.word = mw; q.wordHtml = '<span class="emoji big">' + mw.e + '</span><div class="word-blank"><span class="wpart">' + esc(parts.pre) + '</span><span class="blank">؟</span><span class="wpart">' + esc(parts.post) + '</span></div>';
        q.options = shuffle([L].concat(ds)).map(function (l) { return { html: letterHtml(l), ok: l.id === L.id }; });
      }
      return q;
    });
  }

  HK.games = { listen: listen, 'catch': catchGame, match: match, complete: completeGame, trace: trace, buildFinal: buildFinal, defName: defName, toAr: toAr, TOTAL: TOTAL, FINAL_TYPE_NAMES: FINAL_TYPE_NAMES };
})();
