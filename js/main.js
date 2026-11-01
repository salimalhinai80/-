/* المحرك الرئيسي للعبة: المراحل، التحكم، الكاميرا، الأسئلة، النتائج */
(function () {
  const T = THREE, $ = id => document.getElementById(id), AR = QB.AR;
  const W = window.World, LANES = W.LANES, ROAD_W = W.ROAD_W;
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const lowEnd = isTouch && Math.min(screen.width, screen.height) < 500;

  // ---------- المشهد ----------
  const canvas = $('c');
  const renderer = new T.WebGLRenderer({ canvas, antialias: !lowEnd, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 1300);
  const hemi = new T.HemisphereLight(0xffffff, 0x557744, 0.9); scene.add(hemi);
  const sun = new T.DirectionalLight(0xffffff, 1.3); sun.castShadow = true;
  sun.shadow.mapSize.set(lowEnd ? 512 : 1024, lowEnd ? 512 : 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 80 }); sun.shadow.bias = -0.0015;
  scene.add(sun, sun.target);
  const particles = new W.Particles(scene);

  // ---------- الحالة ----------
  const G = {
    mode: 'loading', heroKind: 'boy', name: '', stage: 0, s: 0, u: 0, lane: 1, speed: 0, score: 0, stars: 0, totalStars: 0, time: 0,
    streak: 0, bestStreak: 0, log: [], paused: false, boostT: 0, slowT: 0, invT: 0, crashes: 0, shake: 0, hintUsed: false, steerHold: 0, touchSteer: 0
  };
  let hero = null, world = null, stars = null, gates = [], stations = [], obstacles = [], qList = [], qi = 0, stageLen = 1000, finishS = 0, trophy = null;
  let feedbackUntil = 0, stageDone = false, camMode = 'menu', menuAng = 0, endT = 0;

  const STAGES = [
    { title: 'الاختيار دون توقف', desc: 'تظهر الأسئلة الجوية وأنت تقود! اقرأ السؤال ثم وجّه الدراجة إلى المسار الملوّن الذي يحمل الإجابة الصحيحة قبل أن تعبر البوابة.', goal: '🎯 أجب عن ٦ أسئلة جوية واجمع النجوم في الطريق' },
    { title: 'محطات التحدي', desc: 'ستتوقف الدراجة عند كل محطة ليظهر سؤال تحدٍّ. الإجابة الصحيحة تطلقك بسرعة الصاروخ ⚡ والخطأ يبطئك مع شرح يساعدك على الفهم.', goal: '🎯 اجتز ٦ محطات تحدٍّ على طريق الشاطئ' },
    { title: 'منعطفات الأبطال', desc: 'طريق جبلي مليء بالمنعطفات والحواجز! تحكّم بالدراجة يميناً ويساراً، اجمع النجوم وتجنّب العقبات، وفي النهاية يواجهك تحدٍّ خاص: سؤال الأذكياء ٢.', goal: '🎯 اجمع أكبر عدد من النجوم ثم أجب عن سؤال الأذكياء ٢' }
  ];
  const STAGE_NAMES = ['المرحلة الأولى', 'المرحلة الثانية', 'المرحلة النهائية'];

  // ---------- أدوات الواجهة ----------
  const fmtTime = t => { const m = Math.floor(t / 60), s = Math.floor(t % 60); return AR(String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')); };
  function show(id, on = true) { $(id).classList.toggle('hidden', !on); }
  function popup(text, cls = '') { const d = document.createElement('div'); d.className = 'popup ' + cls; d.textContent = text; $('popups').appendChild(d); setTimeout(() => d.remove(), 1400); }
  let toastTimer = 0;
  function toast(html, cls, dur = 3) { const t = $('toast'); t.className = cls; t.innerHTML = html; clearTimeout(toastTimer); toastTimer = setTimeout(() => show('toast', false), dur * 1000); }
  function flash(color) { const f = $('flash'); f.style.background = color; f.style.transition = 'none'; f.style.opacity = 0.55; requestAnimationFrame(() => { f.style.transition = 'opacity .6s'; f.style.opacity = 0; }); }
  function hudUpdate() {
    $('score').textContent = AR(G.score); $('stars').textContent = AR(G.stars); $('time').textContent = fmtTime(G.time); $('streak').textContent = AR(G.streak);
    $('streakBox').classList.toggle('on', G.streak >= 2);
    const p = Math.min(1, (G.stage + Math.min(1, G.s / stageLen)) / 3) * 100;
    $('pfill').style.width = p + '%'; $('prider').style.right = p + '%';
  }
  function addScore(n) { G.score = Math.max(0, G.score + n); }

  // ---------- البطل ----------
  function setHero(kind) {
    if (hero) scene.remove(hero.root);
    hero = Hero.buildHero(kind); scene.add(hero.root); G.heroKind = kind;
  }

  // ---------- تنظيف ----------
  function disposeGroup(g) {
    scene.remove(g);
    g.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); if (m !== Hero.OUT) m.dispose(); });
    });
  }

  // ---------- بناء المراحل ----------
  function buildStage(i) {
    if (world) disposeGroup(world.group);
    gates = []; stations = []; obstacles = []; qList = []; qi = 0; stageDone = false; feedbackUntil = 0;
    const R = (a, b) => a + Math.random() * (b - a), starList = [];
    if (i === 0) {
      qList = QB.stage1(); const gap = 240, first = 160;
      stageLen = first + gap * (qList.length - 1) + 140;
    } else if (i === 1) {
      qList = QB.stage2(); stageLen = 130 + 190 * (qList.length - 1) + 150;
    } else { stageLen = 1450; }
    world = W.buildStage(scene, i, stageLen);
    const th = world.theme;
    hemi.color.set(th.hemi[0]); hemi.groundColor.set(th.hemi[1]); hemi.intensity = th.hemi[2];
    sun.color.set(th.dir[0]); sun.intensity = th.dir[1];
    const tr = world.track, grp = world.group;
    const starRow = (s0, lane, n = 6, step = 4) => { for (let k = 0; k < n; k++) starList.push({ s: s0 + k * step, u: LANES[lane] }); };

    if (i === 0) {
      qList.forEach((q, k) => { const s = 160 + k * 240; gates.push(W.buildGate(grp, tr, s, q.opts.map(o => typeof o === 'string' ? AR(o) : '؟'), k + 1)); });
      let prev = 15; gates.forEach(g => { starRow(prev + R(10, 25), Math.floor(R(0, 3))); starRow(g.s - R(95, 110), Math.floor(R(0, 3)), 5); prev = g.s + 10; });
      starRow(prev + 20, 1, 8);
      finishS = stageLen - 20;
    } else if (i === 1) {
      qList.forEach((q, k) => stations.push(W.buildStation(grp, tr, 130 + k * 190, k + 1)));
      let prev = 15; stations.forEach(st => { starRow(prev + R(15, 30), Math.floor(R(0, 3))); starRow(st.s - R(80, 95), Math.floor(R(0, 3)), 5); prev = st.s + 10; });
      starRow(prev + 30, Math.floor(R(0, 3)), 8);
      finishS = stageLen - 20;
    } else {
      for (let s = 90; s < stageLen - 90; s += R(24, 32)) {
        const blocked = QB.shuffle([0, 1, 2]).slice(0, Math.random() < 0.45 ? 2 : 1);
        blocked.forEach(l => obstacles.push({ s, u: LANES[l] + R(-0.5, 0.5), type: QB.pick(['barrier', 'cones', 'rock', 'log']) }));
        const freeL = [0, 1, 2].filter(l => !blocked.includes(l));
        const fl = QB.pick(freeL); [-5, 0, 5].forEach(d => starList.push({ s: s + d, u: LANES[fl] }));
      }
      for (let s = 40; s < 80; s += 4) starList.push({ s, u: Math.sin(s / 6) * 3 });
      W.buildObstacles(grp, tr, obstacles);
      finishS = stageLen - 30;
      W.buildFinish(grp, tr, finishS, 'سؤال الأذكياء ٢');
    }
    // خط البداية
    stars = new W.Stars(grp, tr, starList); G.totalStars += starList.length;
    G.s = 0; G.u = 0; G.lane = 1; G.speed = 0; G.boostT = G.slowT = G.invT = 0;
    $('stageName').textContent = STAGE_NAMES[i];
    placeHero(0);
  }

  function placeHero(dt) {
    const tr = world.track; tr.pos(G.s, G.u, 0, hero.root.position);
    hero.root.rotation.y = tr.yaw(G.s) - G.steerVis * 0.15;
  }
  G.steerVis = 0;

  // ---------- الإدخال ----------
  const keys = { l: false, r: false };
  function laneMode() { return G.stage < 2; }
  function nudge(dir) {
    if (G.mode !== 'ride' || G.paused) return;
    if (laneMode()) { const nl = Math.max(0, Math.min(2, G.lane + dir)); if (nl !== G.lane) { G.lane = nl; Sfx.whoosh(); } }
  }
  addEventListener('keydown', e => {
    if (e.repeat && laneMode()) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') { keys.l = true; nudge(-1); e.preventDefault(); }
    if (k === 'arrowright' || k === 'd') { keys.r = true; nudge(1); e.preventDefault(); }
    if ((k === 'escape' || k === 'p' || k === ' ') && (G.mode === 'ride')) { togglePause(); e.preventDefault(); }
  });
  addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (k === 'arrowleft' || k === 'a') keys.l = false; if (k === 'arrowright' || k === 'd') keys.r = false; });
  function bindSteer(btn, dir) {
    const on = e => { e.preventDefault(); btn.classList.add('on'); if (dir < 0) keys.l = true; else keys.r = true; nudge(dir); try { btn.setPointerCapture(e.pointerId); } catch (_) { } };
    const off = () => { btn.classList.remove('on'); if (dir < 0) keys.l = false; else keys.r = false; };
    btn.addEventListener('pointerdown', on); btn.addEventListener('pointerup', off); btn.addEventListener('pointercancel', off); btn.addEventListener('lostpointercapture', off);
  }
  bindSteer($('btnLeft'), -1); bindSteer($('btnRight'), 1);
  let tStart = null;
  canvas.addEventListener('pointerdown', e => {
    if (G.mode !== 'ride') return;
    tStart = { x: e.clientX, y: e.clientY, moved: false };
    if (!laneMode()) G.touchSteer = e.clientX < innerWidth / 2 ? -1 : 1;
  });
  canvas.addEventListener('pointermove', e => {
    if (!tStart || G.mode !== 'ride') return;
    const dx = e.clientX - tStart.x;
    if (laneMode() && Math.abs(dx) > 40 && !tStart.moved) { nudge(Math.sign(dx)); tStart.moved = true; }
    if (!laneMode()) G.touchSteer = Math.max(-1, Math.min(1, dx / 60)) || (e.clientX < innerWidth / 2 ? -1 : 1);
  });
  const endTouch = e => {
    if (tStart && laneMode() && !tStart.moved && G.mode === 'ride') nudge(e.clientX < innerWidth / 2 ? -1 : 1);
    tStart = null; G.touchSteer = 0;
  };
  canvas.addEventListener('pointerup', endTouch); canvas.addEventListener('pointercancel', () => { tStart = null; G.touchSteer = 0; });

  // ---------- المرحلة الأولى: الأسئلة الجوية ----------
  const LANE_NAMES = ['⬅ المسار الأيسر', '⬆ المسار الأوسط', 'المسار الأيمن ➡'];
  function showSky(k) {
    const q = qList[k];
    $('qnum').textContent = `سؤال جوي ${AR(k + 1)} من ${AR(qList.length)}`;
    $('qtype').textContent = q.type; $('qtext').textContent = AR(q.q);
    const lanes = $('qlanes'); lanes.innerHTML = '';
    q.opts.forEach((o, i) => { const d = document.createElement('div'); d.className = 'lane'; d.style.background = W.LANE_COLORS[i]; d.innerHTML = `<span class="ar">${LANE_NAMES[i]}</span>${AR(o)}`; lanes.appendChild(d); });
    $('qpanel').style.top = Math.round($('hud').getBoundingClientRect().bottom + 8) + 'px';
    show('qpanel'); $('qpanel').style.animation = 'none'; void $('qpanel').offsetWidth; $('qpanel').style.animation = '';
    const fc = $('qfig');
    if (q.fig) { fc.style.display = 'block'; requestAnimationFrame(() => Fig.draw(fc, q.fig)); } else fc.style.display = 'none';
    Sfx.pop(); hero.surprise();
    q.shown = true;
  }
  function resolveGate(g, k) {
    const q = qList[k]; g.done = true;
    let lane = 0, best = 1e9; LANES.forEach((u, i) => { const d = Math.abs(u - G.u); if (d < best) { best = d; lane = i; } });
    const ok = lane === q.a;
    G.log.push({ skill: q.skill, ok, stage: 0 });
    show('qpanel', false);
    const P = g.panels[q.a].m.position;
    g.panels.forEach((p, i) => { if (i !== q.a) p.m.visible = false; p.pad.visible = false; });
    g.correctPanel = g.panels[q.a];
    if (ok) {
      G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak);
      const pts = 100 + (G.streak - 1) * 20; addScore(pts);
      Sfx.correct(); hero.cheer(); flash('rgba(80,255,140,.5)');
      popup('+' + AR(pts), 'gold'); setTimeout(() => popup(QB.pick(['أحسنت! 🌟', 'رائع! 🎉', 'ممتاز! 👏', 'إجابة بطل! 🏆']), 'small green'), 250);
      particles.burst(P, 70, ['#ffd23f', '#6dff9b', '#ffffff', '#5cc8ff'], 7, 3);
      if (G.streak > 0 && G.streak % 3 === 0) { addScore(50); setTimeout(() => popup(`🔥 سلسلة ${AR(G.streak)}! +٥٠`, 'small gold'), 700); }
      toast(`✔ إجابة صحيحة!<span class="ex">${AR(q.ex)}</span>`, 'ok', 3.6); feedbackUntil = G.time + 3.2;
    } else {
      G.streak = 0; Sfx.wrong(); hero.oops(); flash('rgba(255,70,70,.45)'); G.slowT = 2.2; G.shake = 0.3;
      toast(`✘ الإجابة الصحيحة: «${AR(q.opts[q.a])}»<span class="ex">💡 ${AR(q.ex)}</span>`, 'bad', 6.5); feedbackUntil = G.time + 5.5;
      particles.burst(P, 40, ['#6dff9b', '#ffffff'], 4, 2);
    }
  }

  // ---------- نافذة الأسئلة (المحطات وسؤال الأذكياء) ----------
  let curQ = null, curDone = null, gridSel = new Set(), gridReveal = false, gridLayout = null, hintOn = false;
  function openQuestion(q, title, done) {
    curQ = q; curDone = done; gridSel = new Set(); gridReveal = false; hintOn = false; G.hintUsed = false;
    $('mtitle').textContent = title; $('mtitle').parentElement.classList.toggle('smart', !!q.smart);
    $('mtype').textContent = q.type; $('mskill').textContent = 'المهارة: ' + QB.SKILLS[q.skill];
    $('mtext').textContent = AR(q.q);
    show('mfb', false); show('mNext', false);
    const mf = $('mfig'); mf.style.display = q.fig ? 'block' : 'none';
    const box = $('mopts'); box.innerHTML = '';
    if (q.kind === 'grid') {
      show('mopts', false); show('mgrid'); show('gHint', true); $('gCheck').disabled = false;
    } else {
      show('mopts'); show('mgrid', false);
      const figOpts = q.opts.some(o => typeof o !== 'string');
      box.style.gridTemplateColumns = figOpts ? `repeat(${q.opts.length}, 1fr)` : (q.opts.some(o => o.length > 22) ? '1fr' : '1fr 1fr');
      q.opts.forEach((o, i) => {
        const b = document.createElement('button'); b.className = 'opt';
        if (typeof o === 'string') b.innerHTML = `<span>${AR(o)}</span>`;
        else { b.innerHTML = `<span class="ol">${'أبجد'[i]}</span>`; const c = document.createElement('canvas'); b.appendChild(c); o._c = c; }
        b.onclick = () => answerOpt(i, b);
        box.appendChild(b);
      });
    }
    show('modal');
    requestAnimationFrame(() => {
      if (q.fig) Fig.draw(mf, q.fig);
      if (q.kind === 'grid') drawGrid();
      else q.opts.forEach(o => { if (o && o._c) Fig.draw(o._c, o.fig, { pad: 4 }); });
    });
    Sfx.bell();
  }
  function finishAnswer(ok) {
    const q = curQ;
    G.log.push({ skill: q.skill, ok, stage: G.stage, smart: !!q.smart });
    const fb = $('mfb'); show('mfb');
    if (ok) {
      G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak);
      const pts = (q.smart ? 300 : 150) + (G.streak - 1) * 20 - (G.hintUsed ? 40 : 0); addScore(pts);
      fb.className = 'fb ok'; fb.innerHTML = `<b>✔ إجابة صحيحة! +${AR(pts)} نقطة</b><br>${AR(q.ex)}` + (q.smart ? '' : '<br><b>⚡ استعد لانطلاقة سريعة!</b>');
      Sfx.correct(); hero.cheer(); popup('+' + AR(pts), 'gold');
      particles.burst(hero.root.position.clone().setY(2), 80, ['#ffd23f', '#6dff9b', '#fff', '#ff6bd5'], 7, 4);
    } else {
      G.streak = 0;
      fb.className = 'fb bad'; fb.innerHTML = `<b>✘ ليست صحيحة هذه المرة.</b><br>💡 التفسير: ${AR(q.ex)}` + (q.smart ? '' : '<br><b>🐢 ستتباطأ الدراجة قليلاً… ركّز في المحطة القادمة!</b>');
      Sfx.wrong(); hero.oops();
    }
    $('mNext').textContent = q.smart ? 'استلم كأسك 🏆' : 'تابع الانطلاق 🚴';
    show('mNext'); curQ.result = ok;
    setTimeout(() => $('mNext').scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }
  function answerOpt(i, btn) {
    if (curQ.result != null) return;
    const ok = i === curQ.a, btns = [...$('mopts').children];
    btns.forEach((b, k) => { b.disabled = true; if (k === curQ.a) b.classList.add('right'); });
    if (!ok) btn.classList.add('wrong');
    finishAnswer(ok);
  }
  function drawGrid() {
    const q = curQ, g = q.grid, c = $('gridc');
    const cells = [{ list: g.given, color: '#7ac943' }];
    if (hintOn && g.hint) cells.push({ list: g.hint, color: 'rgba(120,130,170,.28)' });
    const sel = [...gridSel].map(k => k.split(',').map(Number));
    if (gridReveal) {
      const tset = new Set(g.target.map(c => c + ''));
      cells.push({ list: sel.filter(c => tset.has(c + '')), color: '#ffb02e' });
      cells.push({ list: sel.filter(c => !tset.has(c + '')), color: '#ff7a7a' });
      cells.push({ list: g.target, color: 'rgba(34,197,94,.15)', stroke: '#16a34a' });
    } else cells.push({ list: sel, color: '#ffb02e' });
    gridLayout = Fig.draw(c, { cols: g.cols, rows: g.rows, mirror: g.mirror, cells });
  }
  $('gridc').addEventListener('pointerdown', e => {
    if (!curQ || curQ.kind !== 'grid' || curQ.result != null || !gridLayout) return;
    const r = $('gridc').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const cx = Math.floor((x - gridLayout.ox) / gridLayout.s), cy = Math.floor((y - gridLayout.oy) / gridLayout.s);
    if (cx < 0 || cy < 0 || cx >= curQ.grid.cols || cy >= curQ.grid.rows) return;
    if (curQ.grid.given.some(([a, b]) => a === cx && b === cy)) { Sfx.wrong(); return; }
    const k = cx + ',' + cy; gridSel.has(k) ? gridSel.delete(k) : gridSel.add(k); Sfx.click(); drawGrid();
  });
  $('gCheck').onclick = () => {
    if (!curQ || curQ.result != null) return;
    if (!gridSel.size) { toast('لوّن مربعات الصورة أولاً ثم اضغط «تحقّق» 🙂', 'info', 2.5); return; }
    const t = new Set(curQ.grid.target.map(c => c + ''));
    const ok = t.size === gridSel.size && [...gridSel].every(k => t.has(k));
    gridReveal = true; drawGrid(); $('gCheck').disabled = true; show('gHint', false);
    finishAnswer(ok);
  };
  $('gClear').onclick = () => { if (curQ && curQ.result == null) { gridSel.clear(); drawGrid(); Sfx.click(); } };
  $('gHint').onclick = () => {
    if (!curQ || curQ.result != null) return;
    G.hintUsed = true; Sfx.pop();
    if (curQ.grid.hint) { hintOn = true; drawGrid(); toast('💡 المربعات الرمادية تمثّل نتيجة الخطوة الأولى، أكمل الخطوة الثانية!', 'info', 4); }
    else toast(curQ.grid.mirror ? '💡 عُدّ المربعات من خط المرآة لكل مربع، وارسم صورته على البُعد نفسه في الجهة الأخرى.' : '💡 حرّك كل مربع العدد نفسه من المربعات إلى اليمين ثم إلى الأسفل.', 'info', 4.5);
  };
  $('mNext').onclick = () => { Sfx.click(); show('modal', false); const d = curDone, r = curQ.result; curQ = null; d && d(r); };

  // ---------- المحطات ----------
  function arriveStation(k) {
    const st = stations[k]; st.done = true; G.mode = 'question'; camMode = 'station'; G.speed = 0; show('controls', false);
    hero.determined(2);
    setTimeout(() => openQuestion(qList[k], `محطة التحدي ${AR(k + 1)} من ${AR(qList.length)}`, ok => {
      G.mode = 'ride'; camMode = 'ride'; show('controls');
      if (ok) { G.boostT = 4.5; G.speed = 18; Sfx.boost(); popup('⚡ انطلاقة سريعة!', 'small gold'); hero.hop(4); }
      else { G.slowT = 4; Sfx.slow(); popup('🐢 تباطؤ…', 'small red'); }
      st.orb.visible = false;
    }), 700);
  }

  // ---------- تدفق اللعبة ----------
  function startGame() {
    Sfx.init();
    G.name = $('pname').value.trim(); G.score = 0; G.stars = 0; G.totalStars = 0; G.time = 0; G.streak = 0; G.bestStreak = 0; G.log = []; G.crashes = 0;
    if (trophy) { hero.body.remove(trophy); trophy = null; }
    hero.celebrate(false);
    show('menu', false); show('results', false); show('hud'); hudUpdate();
    beginStage(0);
  }
  function beginStage(i) {
    G.stage = i; buildStage(i); G.mode = 'card'; camMode = 'card';
    $('scNum').textContent = STAGE_NAMES[i]; $('scTitle').textContent = STAGES[i].title; $('scDesc').textContent = STAGES[i].desc; $('scGoal').textContent = STAGES[i].goal;
    show('stageCard'); show('qpanel', false); show('controls', false);
    Sfx.music(false);
    hudUpdate();
  }
  $('scGo').onclick = () => {
    Sfx.init(); Sfx.click(); show('stageCard', false); camMode = 'ride';
    $('ctrlHint').textContent = laneMode() ? 'اضغط لتغيير المسار' : 'استمر بالضغط للتوجيه';
    countdown(() => { G.mode = 'ride'; show('controls'); Sfx.music(true, world.theme.music); Sfx.bell(); hero.determined(); });
  };
  function countdown(done) {
    const el = $('countdown'); show('countdown'); const seq = ['٣', '٢', '١', 'انطلق!']; let i = 0;
    const tick = () => {
      if (i >= seq.length) { show('countdown', false); done(); return; }
      el.innerHTML = `<span>${seq[i]}</span>`; i < 3 ? Sfx.click() : Sfx.correct(); i++; setTimeout(tick, i === 4 ? 700 : 800);
    };
    tick();
  }
  function stageComplete() {
    if (stageDone) return; stageDone = true; G.mode = 'transition';
    show('qpanel', false); show('controls', false);
    Sfx.win(); popup(`🎉 أنهيت ${STAGE_NAMES[G.stage]}!`, 'gold'); hero.cheer();
    particles.burst(hero.root.position.clone().setY(2.5), 120, ['#ffd23f', '#ff6bd5', '#5cc8ff', '#6dff9b'], 9, 5);
    setTimeout(() => beginStage(G.stage + 1), 2600);
  }
  function arriveFinal() {
    G.mode = 'question'; camMode = 'station'; G.speed = 0; show('controls', false);
    hero.determined(3); Sfx.bell();
    toast('🧠 وصلت إلى التحدي الخاص! سؤال يجمع بين الانسحاب والانعكاس معاً.', 'info', 3);
    setTimeout(() => openQuestion(QB.smart(), '🧠 سؤال الأذكياء ٢', () => finishGame()), 1300);
  }

  function finishGame() {
    G.mode = 'results'; camMode = 'results'; Sfx.music(false); Sfx.win(); show('controls', false);
    hero.celebrate(true);
    trophy = W.buildTrophy(); trophy.scale.setScalar(0.42); trophy.position.set(0, 2.2 + 0.063, 0.16); hero.body.add(trophy);
    // الإتقان لكل مهارة
    const by = {}; Object.keys(QB.SKILLS).forEach(k => by[k] = { ok: 0, n: 0 });
    G.log.forEach(l => { by[l.skill].n++; if (l.ok) by[l.skill].ok++; });
    const total = G.log.length, okN = G.log.filter(l => l.ok).length, acc = total ? Math.round(okN / total * 100) : 0;
    $('rName').textContent = G.name ? `مبروك يا ${G.name}! 🎉` : 'مبروك أيها البطل! 🎉';
    $('rRank').textContent = acc >= 90 ? '🥇 بطل التحويلات الأسطوري' : acc >= 75 ? '🥈 فارس الانسحاب والانعكاس' : acc >= 50 ? '🥉 متسابق واعد' : '🚲 مغامر مبتدئ — تدرّب أكثر!';
    $('rScore').textContent = AR(G.score); $('rStars').textContent = `${AR(G.stars)}/${AR(G.totalStars)}`; $('rTime').textContent = fmtTime(G.time); $('rAcc').textContent = AR(acc) + '٪';
    const m = $('mastery'); m.innerHTML = '';
    Object.entries(QB.SKILLS).forEach(([k, name]) => {
      const b = by[k]; if (!b.n) return; const p = Math.round(b.ok / b.n * 100);
      const lvl = p >= 85 ? ['متقن ⭐⭐⭐', '#22c55e'] : p >= 60 ? ['جيد ⭐⭐', '#f59e0b'] : ['يحتاج تدريباً ⭐', '#ef4444'];
      const d = document.createElement('div'); d.className = 'mrow';
      d.innerHTML = `<div class="top"><span>${name}</span><span class="lvl" style="color:${lvl[1]}">${AR(p)}٪ · ${lvl[0]}</span></div><div class="mbar"><div style="background:${lvl[1]}"></div></div><small style="color:#6a5aa0;font-weight:700">${AR(b.ok)} صحيحة من ${AR(b.n)}</small>`;
      m.appendChild(d); setTimeout(() => d.querySelector('.mbar div').style.width = Math.max(4, p) + '%', 300);
    });
    const badges = [];
    if (G.stars >= G.totalStars * 0.6) badges.push('⭐ جامع النجوم');
    if (G.bestStreak >= 3) badges.push(`🔥 سلسلة ${AR(G.bestStreak)} إجابات`);
    if (G.log.some(l => l.smart && l.ok)) badges.push('🧠 عبقري سؤال الأذكياء');
    const sk = k => by[k].n && by[k].ok === by[k].n;
    if (sk('R1') && sk('R2')) badges.push('🪞 سيّد المرآة');
    if (sk('T1') && sk('T2')) badges.push('➡️ ملك الانسحاب');
    if (G.crashes <= 1) badges.push('🛡️ قائد ماهر');
    $('badges').innerHTML = badges.map(b => `<span class="badge">${b}</span>`).join('');
    setTimeout(() => { show('results'); show('hud', false); }, 1600);
    endT = 0;
  }

  function togglePause(force) {
    const p = force != null ? force : !G.paused;
    if (p === G.paused) return; G.paused = p; show('pause', p);
    Sfx.music(!p && G.mode === 'ride', world ? world.theme.music : 0);
  }
  $('btnPause').onclick = () => { if (G.mode === 'ride' || G.mode === 'question') togglePause(); };
  $('pResume').onclick = () => togglePause(false);
  $('pRestart').onclick = () => { togglePause(false); show('modal', false); curQ = null; startGame(); };
  $('pMenu').onclick = () => { togglePause(false); show('modal', false); curQ = null; toMenu(); };
  $('btnSound').onclick = () => { Sfx.init(); Sfx.setMuted(!Sfx.muted); $('btnSound').textContent = Sfx.muted ? '🔇' : '🔊'; };
  $('btnFull').onclick = () => { const d = document; if (!d.fullscreenElement) (d.documentElement.requestFullscreen || d.documentElement.webkitRequestFullscreen || (() => { })).call(d.documentElement); else (d.exitFullscreen || d.webkitExitFullscreen).call(d); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'ride') togglePause(true); });

  document.querySelectorAll('.hero-btn').forEach(b => b.onclick = () => {
    document.querySelectorAll('.hero-btn').forEach(x => x.classList.remove('sel')); b.classList.add('sel');
    setHero(b.dataset.hero); placeHero(0); Sfx.init(); Sfx.pop(); hero.cheer();
  });
  $('btnStart').onclick = () => { Sfx.init(); Sfx.click(); startGame(); };
  $('btnHow').onclick = () => { Sfx.init(); Sfx.click(); show('how'); };
  $('btnHowOk').onclick = () => { Sfx.click(); show('how', false); };
  $('rAgain').onclick = () => { Sfx.click(); toMenu(); };

  function toMenu() {
    if (trophy) { hero.body.remove(trophy); trophy = null; }
    hero.celebrate(false);
    G.mode = 'menu'; camMode = 'menu'; Sfx.music(false);
    ['hud', 'qpanel', 'controls', 'results', 'stageCard', 'modal', 'toast'].forEach(id => show(id, false)); show('menu');
    G.stage = 0; buildStage(0); G.s = 14; placeHero(0);
  }

  // ---------- الكاميرا ----------
  const vShift = { x: 0, y: 0 }, camPos = new T.Vector3(0, 3, 8), camLook = new T.Vector3(), tmp = new T.Vector3(), tmp2 = new T.Vector3();
  function updateCamera(dt) {
    const tr = world.track, hp = hero.root.position, yaw = hero.root.rotation.y;
    const fwd = tmp.set(-Math.sin(yaw), 0, -Math.cos(yaw)), right = tmp2.set(Math.cos(yaw), 0, -Math.sin(yaw));
    let want, look, k = 4;
    if (camMode === 'ride' || camMode === 'card') {
      const back = 5.6 + Math.min(2, G.speed * 0.06), up = 2.7;
      want = hp.clone().addScaledVector(fwd, -back).add(new T.Vector3(0, up, 0)).addScaledVector(right, -G.u * 0.15);
      const ahead = tr.pos(G.s + 10, G.u * 0.6, 1.3);
      look = ahead; k = 5;
    } else if (camMode === 'station') {
      want = hp.clone().addScaledVector(fwd, 3.4).addScaledVector(right, 2.6).add(new T.Vector3(0, 1.9, 0));
      look = hp.clone().add(new T.Vector3(0, 1.5, 0)); k = 2.5;
    } else if (camMode === 'menu' || camMode === 'results') {
      menuAng += dt * (camMode === 'menu' ? 0.25 : 0.35);
      const a = Math.sin(menuAng) * 0.9, r = camMode === 'results' ? (innerWidth < innerHeight ? 6.2 : 5) : 4.2;
      want = hp.clone().addScaledVector(fwd, Math.cos(a) * r).addScaledVector(right, Math.sin(a) * r).add(new T.Vector3(0, camMode === 'results' ? 2.2 : 1.7, 0));
      look = hp.clone().add(new T.Vector3(0, camMode === 'results' ? 1.9 : 1.25, 0));
      k = 2;
    }
    camPos.lerp(want, 1 - Math.exp(-k * dt)); camLook.lerp(look, 1 - Math.exp(-k * 1.4 * dt));
    camera.position.copy(camPos);
    if (G.shake > 0) { camera.position.x += (Math.random() - .5) * G.shake; camera.position.y += (Math.random() - .5) * G.shake; G.shake = Math.max(0, G.shake - dt * 1.2); }
    camera.lookAt(camLook);
    const fov = camMode === 'ride' ? 60 + Math.max(0, G.speed - 12) * 0.9 : 55;
    camera.fov += (Math.min(82, fov) - camera.fov) * Math.min(1, dt * 3);
    // إزاحة إطار الكاميرا حتى لا تغطي البطاقات البطل
    const w = innerWidth, h = innerHeight, wide = w >= 900 && w > h; let tx = 0, ty = 0;
    if (camMode === 'menu' || camMode === 'results') { if (wide) tx = w * 0.2; else ty = h * (camMode === 'results' ? 0.2 : 0.1); }
    vShift.x += (tx - vShift.x) * Math.min(1, dt * 3); vShift.y += (ty - vShift.y) * Math.min(1, dt * 3);
    if (Math.abs(vShift.x) + Math.abs(vShift.y) < 0.5) camera.clearViewOffset(); else camera.setViewOffset(w, h, vShift.x, vShift.y, w, h);
    camera.updateProjectionMatrix();
    world.sky.position.copy(camera.position);
    sun.position.copy(hp).add(new T.Vector3(world.theme.sunDir[0] * 30, 35, world.theme.sunDir[2] * 30 + 10)); sun.target.position.copy(hp);
  }

  // ---------- الحلقة الرئيسية ----------
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (G.mode === 'loading') return;
    const paused = G.paused;
    if (paused) dt = 0;
    if (!paused && (G.mode === 'ride' || G.mode === 'question' || G.mode === 'transition')) G.time += dt;

    let steerIn = 0;
    if (G.mode === 'ride' && !paused) ride(dt);
    else if (G.mode === 'transition') { G.speed = Math.max(0, G.speed - 8 * dt); G.s += G.speed * dt; }
    else if (G.mode === 'menu' || G.mode === 'card') { G.speed = 0; }
    if (G.mode === 'ride') {
      if (laneMode()) steerIn = Math.max(-1, Math.min(1, (LANES[G.lane] - G.u) / 2));
      else steerIn = G.steerHold;
    }
    G.steerVis += (steerIn - G.steerVis) * Math.min(1, dt * 6);
    placeHero(dt);
    hero.update(dt, G.speed, steerIn);
    if (stars) stars.update(dt);
    // تأثيرات البوابات والمحطات
    gates.forEach(g => { g.q.rotation.y += dt * 2; if (g.correctPanel) { g.correctPanel.m.scale.setScalar(1 + Math.sin(now / 120) * 0.06); } });
    stations.forEach(s => { s.orb.rotation.y += dt * 1.5; s.orb.position.y = 6 + Math.sin(now / 400) * 0.25; });
    if (world.sea && world.sea.material.map) world.sea.material.map.offset.y += dt * 0.02;
    if (trophy) { trophy.userData.star.rotation.y += dt * 2.5; endT += dt; if (endT > 1.1) { endT = 0; const p = hero.root.position.clone(); p.y += 3; particles.burst(p, 60, ['#ffd23f', '#ff6bd5', '#5cc8ff', '#6dff9b', '#ffffff'], 8, 5, 6); } }
    particles.update(dt);
    $('speedlines').style.opacity = G.mode === 'ride' && G.boostT > 0 ? 0.9 : (G.mode === 'ride' && G.speed > 17 ? 0.35 : 0);
    Sfx.wind(G.mode === 'ride' && !paused ? G.speed : 0);
    updateCamera(dt);
    renderer.render(scene, camera);
    if (G.mode !== 'menu') hudUpdate();
  }

  function ride(dt) {
    const tr = world.track;
    // السرعة المستهدفة
    let target = G.stage === 0 ? 13 : G.stage === 1 ? 14 : 15.5;
    if (G.stage === 0 && qList[qi] && qList[qi].shown && !gates[qi].done) target = 10.5;
    if (G.boostT > 0) { G.boostT -= dt; target = 24; }
    if (G.slowT > 0) { G.slowT -= dt; target = 7; }
    if (G.invT > 0) G.invT -= dt;
    // التوقف عند المحطات/النهاية
    let stopAt = null;
    if (G.stage === 1) { const st = stations.find(s => !s.done); if (st) stopAt = st.s - 1.5; }
    if (G.stage === 2) stopAt = finishS - 2;
    if (stopAt != null) {
      const d = stopAt - G.s;
      if (d < 70) target = Math.min(target, Math.sqrt(Math.max(0, 2 * 5 * d)));
      if (d < 0.35 || (d < 3 && G.speed < 0.6)) {
        G.speed = 0; if (G.s > stopAt) G.s = stopAt;
        if (G.stage === 1) { const k = stations.findIndex(s => !s.done); arriveStation(k); }
        else arriveFinal();
        return;
      }
    }
    const acc = target > G.speed ? (G.boostT > 0 ? 14 : 5) : 9;
    G.speed += Math.sign(target - G.speed) * Math.min(Math.abs(target - G.speed), acc * dt);
    G.s += G.speed * dt;

    // التوجيه
    const half = ROAD_W / 2;
    if (laneMode()) {
      const tu = LANES[G.lane], d = tu - G.u; G.u += Math.sign(d) * Math.min(Math.abs(d), 10 * dt);
    } else {
      let inp = (keys.r ? 1 : 0) - (keys.l ? 1 : 0); if (G.touchSteer) inp = G.touchSteer;
      G.steerHold += (inp - G.steerHold) * Math.min(1, dt * 10);
      G.u += G.steerHold * 8.5 * dt;
      G.u -= tr.curvature(G.s) * G.speed * G.speed * 0.45 * dt; // قوة الطرد في المنعطفات
      if (Math.abs(G.u) > half - 0.4) {
        G.u = Math.max(-(half + 0.6), Math.min(half + 0.6, G.u));
        if (G.speed > 8) { G.speed -= 10 * dt; if (Math.random() < 0.3) particles.burst(hero.root.position.clone().setY(0.2), 2, ['#c9a26b', '#e8d3a8'], 2, 1.5, 6); }
      }
    }
    // النجوم
    stars.collect(G.s, G.u, 1.15).forEach(p => {
      G.stars++; addScore(10); Sfx.star();
      particles.burst(tr.pos(p.s, p.u, p.y), 14, ['#ffd23f', '#fff6a0', '#ffffff'], 3.5, 2, 4);
    });
    // العقبات
    if (G.stage === 2 && G.invT <= 0) {
      for (const o of obstacles) {
        if (!o.hit && Math.abs(o.s - G.s) < 0.9 && Math.abs(o.u - G.u) < o.r) {
          o.hit = true; G.invT = 1.4; G.speed *= 0.3; G.shake = 0.5; G.crashes++; addScore(-20); G.streak = 0;
          Sfx.crash(); hero.oops(); flash('rgba(255,70,70,.45)'); popup('💥 -٢٠', 'small red');
          particles.burst(o.mesh.position.clone().setY(1), 40, ['#ff8a1f', '#ffffff', '#ffd23f'], 6, 4);
          o.fly = 1; break;
        }
      }
    }
    obstacles.forEach(o => { if (o.fly > 0) { o.fly -= 0.016; o.mesh.position.y += 0.12; o.mesh.rotation.x += 0.2; o.mesh.scale.setScalar(Math.max(0.01, o.fly)); } });
    // اقتراب الأسئلة الجوية
    if (G.stage === 0 && qi < qList.length) {
      const g = gates[qi], q = qList[qi];
      if (!q.shown && G.s > g.s - 215 && G.time >= feedbackUntil) showSky(qi);
      if (q.shown && !g.done) {
        const rem = Math.max(0, (g.s - G.s) / 215); $('qdist').style.width = (rem * 100) + '%';
        [...$('qlanes').children].forEach((d, i) => d.classList.toggle('sel', i === G.lane));
      }
      if (G.s >= g.s) { if (!q.shown) showSky(qi); resolveGate(g, qi); qi++; }
    }
    // نهاية المرحلة
    if (G.stage < 2 && G.s >= finishS && !stageDone && (G.stage === 0 ? qi >= qList.length : stations.every(s => s.done))) stageComplete();
  }

  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); if (curQ) requestAnimationFrame(() => { if (curQ.kind === 'grid') drawGrid(); else if (curQ.fig) Fig.draw($('mfig'), curQ.fig); }); });

  // ---------- البدء ----------
  async function boot() {
    try { await Promise.race([Promise.all(['400', '700', '900'].map(w => document.fonts.load(`${w} 40px Cairo`, 'أبجد'))), new Promise(r => setTimeout(r, 2500))]); } catch (e) { }
    setHero('boy');
    G.stage = 0; buildStage(0); G.s = 14; placeHero(0);
    camPos.copy(hero.root.position).add(new T.Vector3(0, 2, -5));
    G.mode = 'menu'; camMode = 'menu';
    show('loading', false);
    window.__game = { G, scene, camera, renderer, beginStage, get gates() { return gates; }, get stations() { return stations; }, get world() { return world; }, finishGame };
  }
  requestAnimationFrame(loop);
  boot();
})();
