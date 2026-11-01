/* بنك الأسئلة: الدرس ٢-٦ الانسحاب والانعكاس (الصف الخامس) */
(function () {
  const F = window.Fig, S = F.SHAPES, C = F.C;

  const SKILLS = {
    T1: 'مفهوم الانسحاب',
    T2: 'وصف الانسحاب (المسافة والاتجاه)',
    R1: 'مفهوم الانعكاس وخط المرآة',
    R2: 'رسم الانعكاس والبُعد عن خط المرآة',
    M: 'الأنماط والتمييز بين التحويلين'
  };

  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const AR = s => String(s).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const sq = n => n === 1 ? 'مربع واحد' : n === 2 ? 'مربعان' : `${n} مربعات`;
  const sqA = n => n === 1 ? 'مربعاً واحداً' : n === 2 ? 'مربعين' : `${n} مربعات`; // صيغة النصب
  const H = d => d > 0 ? 'إلى اليمين' : 'إلى اليسار';
  const V = d => d > 0 ? 'إلى الأسفل' : 'إلى الأعلى';
  const asym = ['L', 'flag', 'trap', 'rtri', 'boot', 'zig'];

  // ---------- أسئلة المرحلة الأولى (أسئلة جوية، ٣ مسارات) ----------
  const st1 = {
    a: () => ({ skill: 'T1', type: 'إكمال العمل', q: 'أكمل: الانسحاب هو تحريك الشكل في خط مستقيم ……', opts: ['دون دوران', 'مع دوران', 'مع قلبه'], a: 0,
      ex: 'الانسحاب يُزيح الشكل في خط مستقيم فقط، فلا يدور ولا ينقلب.' }),
    b: () => ({ skill: 'R1', type: 'إكمال العمل', q: 'أكمل: الانعكاس هو إنشاء صورة …… للشكل.', opts: ['مرآة', 'مكبّرة', 'مُصغّرة'], a: 0,
      ex: 'الانعكاس يشبه ما تُظهره المرآة: نقلب الشكل حول خط المرآة دون دوران.' }),
    e: () => ({ skill: 'R1', type: 'تحديد العنصر', q: 'ماذا يُسمّى الخط المنقّط الأحمر في الشكل؟',
      fig: { cols: 8, rows: 4, mirror: { x: 4 }, shapes: [{ poly: F.tr(S.flag, 1, 0.5), color: C.a }, { poly: F.rv(F.tr(S.flag, 1, 0.5), 4), color: C.b }] },
      opts: ['خط المرآة', 'خط الانسحاب', 'محور الدوران'], a: 0, ex: 'الخط الذي ينقلب حوله الشكل في الانعكاس يُسمّى خط المرآة.' }),
    f: () => ({ skill: 'T1', type: 'اختيار من متعدد', q: 'عند انسحاب الشكل، ما الذي يتغيّر فيه؟', opts: ['موقعه فقط', 'حجمه', 'شكله'], a: 0,
      ex: 'في الانسحاب يبقى الحجم والشكل والاتجاه كما هي، ويتغيّر الموقع فقط.' }),
    c: () => {
      const sh = pick(asym), A = F.tr(S[sh], 1, 1), d = rnd(3, 4);
      return { skill: 'T1', type: 'تحديد العنصر', q: 'ما نوع التحويل الذي نقل الشكل (أ) إلى الشكل (ب)؟',
        fig: { cols: 10, rows: 5, shapes: [{ poly: A, color: C.a, label: 'أ' }, { poly: F.tr(A, d + 1, 0), color: C.b, label: 'ب' }] },
        opts: ['انسحاب', 'انعكاس', 'دوران'], a: 0, ex: 'الشكل تحرّك في خط مستقيم واحتفظ باتجاهه نفسه دون قلب أو دوران، إذن هو انسحاب.' };
    },
    d: () => {
      const sh = pick(asym), A = F.tr(S[sh], 1, 0.5);
      return { skill: 'R1', type: 'تحديد العنصر', q: 'ما نوع التحويل الذي يظهر في الشكل؟',
        fig: { cols: 10, rows: 4, mirror: { x: 5 }, shapes: [{ poly: A, color: C.a, label: 'أ' }, { poly: F.rv(A, 5), color: C.b, label: 'ب' }] },
        opts: ['انعكاس', 'انسحاب', 'تكبير'], a: 0, ex: 'الشكل (ب) هو الشكل (أ) مقلوباً حول الخط المنقّط كما في المرآة، فهو انعكاس.' };
    },
    i: () => {
      const tris = [];
      for (let x = 0; x < 10; x += 2) tris.push({ poly: [[x, 2], [x + 1, 2], [x + 1, 1]], color: '#e98aa0' });
      return { skill: 'T2', type: 'اختيار من متعدد', q: 'طول ضلع كل مربع ١ سم. يُزاح كل مثلث إلى اليسار لعمل النمط. كم سنتيمتراً ينزاح كل مثلث؟',
        fig: { cols: 10, rows: 3, shapes: tris }, opts: ['2 سم', '1 سم', '3 سم'], a: 0,
        ex: 'من رأس مثلث إلى الرأس نفسه في المثلث المجاور ٢ مربع، أي أن كل مثلث ينزاح ٢ سم.' };
    },
    bookB: () => ({ skill: 'T2', type: 'اختيار من متعدد', q: 'صِف الانسحاب الذي يحرّك المثلث (أ) إلى المثلث (ب). (ضلع المربع ١ سم)',
      fig: { cols: 8, rows: 4, shapes: [{ poly: [[5, 2], [7, 2], [7, 0]], color: '#e98aa0', label: 'أ' }, { poly: [[4, 3], [6, 3], [6, 1]], color: '#f4b6c4', label: 'ب', dashed: true }] },
      opts: ['1 سم يساراً و1 سم لأسفل', '1 سم يميناً و1 سم لأسفل', '2 سم لأسفل'], a: 0,
      ex: 'تتبّع رأس المثلث: تحرّك مربعاً واحداً إلى اليسار ومربعاً واحداً إلى الأسفل.' }),
    gCount: () => {
      const sh = pick(asym), d = rnd(2, 5), dir = pick([1, -1]);
      const x0 = dir > 0 ? 1 : 1 + d + 0, A = F.tr(S[sh], x0, 1), B = F.tr(A, dir * d, 0);
      const cols = Math.ceil(Math.max(F.bbox(A).x1, F.bbox(B).x1)) + 1;
      const opts = [d, d + 1, d > 2 ? d - 1 : d + 2].map(n => sq(n));
      return { skill: 'T2', type: 'اختيار من متعدد', q: `انسحب الشكل (أ) إلى (ب). كم مربعاً انزاح ${H(dir)}؟`,
        fig: { cols, rows: 5, shapes: [{ poly: A, color: C.a, label: 'أ' }, { poly: B, color: C.b, label: 'ب', dashed: true }], arrows: [{ from: A[0], to: B[0] }] },
        opts, a: 0, ex: `اختر رأساً على الشكل (أ) وعُدّ المربعات حتى الرأس نفسه على (ب): ${sq(d)} ${H(dir)}.` };
    },
    gDist: () => {
      const d = rnd(1, 3), k = 5;
      const A = F.tr(S.rtri, k - d - 2, 1);
      return { skill: 'R2', type: 'اختيار من متعدد', q: `يبعد الشكل ${sqA(d)} عن خط المرآة. كم يبعد انعكاسه عن خط المرآة؟`,
        fig: { cols: 10, rows: 4, mirror: { x: k }, shapes: [{ poly: A, color: C.a }], arrows: [{ from: [k - d, 3.5], to: [k, 3.5], color: '#e0245e' }] },
        opts: [...new Set([d, 2 * d, d + 1, d + 2])].slice(0, 3).map(sq), a: 0, ex: `الصورة في الانعكاس تكون على البُعد نفسه من خط المرآة: ${sq(d)}، لكن في الجانب الآخر.` };
    },
    l: () => ({ skill: 'R2', type: 'اختيار من متعدد', q: 'نقطة تبعد ٣ مربعات يسار خط مرآة رأسي. أين تقع صورتها؟', opts: ['3 مربعات يمينه', '3 مربعات يساره', '6 مربعات يمينه'], a: 0,
      ex: 'الانعكاس يضع الصورة على البُعد نفسه من خط المرآة لكن في الجانب الآخر: ٣ مربعات يمين الخط.' }),
    j: () => ({ skill: 'R1', type: 'التصويب', q: 'قال سعيد: «الانعكاس يُغيّر حجم الشكل». ما التصويب الصحيح؟', opts: ['لا يغيّر الحجم', 'يُصغّر الشكل', 'يُكبّر الشكل'], a: 0,
      ex: 'الانعكاس يقلب الشكل فقط، أما حجمه وشكله فيبقيان كما هما.' }),
    k: () => ({ skill: 'T1', type: 'التصويب', q: 'قالت مريم: «الانسحاب يقلب الشكل». ما التصويب الصحيح؟', opts: ['لا يقلب الشكل', 'يُدير الشكل', 'يُكبّر الشكل'], a: 0,
      ex: 'الانسحاب ينقل الشكل في خط مستقيم دون قلب أو دوران، أما القلب فهو الانعكاس.' })
  };

  // ---------- أسئلة المرحلة الثانية (محطات التحدي) ----------
  function cellsShape(n, x0, x1, y0, y1) {
    for (let tries = 0; tries < 200; tries++) {
      const set = new Map(); const st = [rnd(x0, x1), rnd(y0, y1)]; set.set(st + '', st);
      while (set.size < n) {
        const [x, y] = pick([...set.values()]); const [dx, dy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
        const c = [x + dx, y + dy]; if (c[0] < x0 || c[0] > x1 || c[1] < y0 || c[1] > y1) continue; set.set(c + '', c);
      }
      const list = [...set.values()];
      // نريد شكلاً غير متناظر حتى يكون الانعكاس واضحاً
      const norm = l => { const b = F.bbox(l); return l.map(([x, y]) => [x - b.x0, y - b.y0] + '').sort().join('|'); };
      const mirrored = list.map(([x, y]) => [-x, y]), flipped = list.map(([x, y]) => [x, -y]);
      if (norm(list) !== norm(mirrored) && norm(list) !== norm(flipped)) return list;
    }
    return [[x0, y0], [x0 + 1, y0], [x0, y0 + 1], [x0, y0 + 2]];
  }

  const KC = ['#e8413c', '#f6c522', '#2b9fe0', '#6cc04a'];
  const st2 = {
    A: () => {
      const sh = pick(['flag', 'L', 'boot', 'trap']), base = F.tr(S[sh], 1, 1);
      const mk = poly => ({ cols: 5, rows: 5, shapes: [{ poly, color: C.b }] });
      const b = F.bbox(base);
      return { skill: 'T1', type: 'تحديد العنصر', q: 'أيّ الأشكال التالية يمثّل انسحاباً للشكل (أ)؟',
        fig: { cols: 5, rows: 5, shapes: [{ poly: base, color: C.a, label: 'أ' }] },
        opts: [{ fig: mk(F.tr(base, 0.5, 0.5)) }, { fig: mk(F.rv(base, b.cx)) }, { fig: mk(F.rot(base, b.cx, b.cy)) }], a: 0,
        ex: 'الانسحاب يحافظ على اتجاه الشكل؛ الخيار الصحيح هو الشكل الذي لم ينقلب ولم يدُر.' };
    },
    J: () => {
      const sh = pick(['L', 'flag', 'rtri', 'boot']), A = F.tr(S[sh], 1, 0.5), k = 4;
      const mk = poly => ({ cols: 8, rows: 4, mirror: { x: k }, shapes: [{ poly: A, color: C.a }, { poly, color: C.b }] });
      return { skill: 'R2', type: 'تحديد العنصر', q: 'أيّ صورة تمثّل انعكاس الشكل الأخضر في الخط المنقّط؟',
        opts: [{ fig: mk(F.rv(A, k)) }, { fig: mk(F.tr(A, 4, 0)) }, { fig: mk(F.tr(F.rv(A, k), 1, 0)) }], a: 0,
        ex: 'الصورة الصحيحة مقلوبة كالمرآة، وكل جزء منها على البُعد نفسه من خط المرآة مثل الأصل.' };
    },
    gDesc: () => {
      const dx = pick([2, 3, 4]) * pick([1, -1]), dy = pick([1, 2]) * pick([1, -1]);
      const sh = pick(['rtri', 'L', 'trap']);
      const A = F.tr(S[sh], dx > 0 ? 1 : 1 + Math.abs(dx), dy > 0 ? 0.5 : 0.5 + Math.abs(dy));
      const B = F.tr(A, dx, dy), bb = F.bbox(A.concat(B));
      const t = (x, y) => `${sq(Math.abs(x))} ${H(x)} و${sq(Math.abs(y))} ${V(y)}`;
      const opts = [...new Set([t(dx, dy), t(-dx, dy), t(dx, -dy), t(dy * Math.sign(dx), dx), t(-dx, -dy)])].slice(0, 4);
      return { skill: 'T2', type: 'اختيار من متعدد', q: 'صِف الانسحاب الذي يحرّك الشكل (أ) إلى الشكل (ب).',
        fig: { cols: Math.ceil(bb.x1) + 1, rows: Math.ceil(bb.y1) + 1, shapes: [{ poly: A, color: C.a, label: 'أ' }, { poly: B, color: C.b, label: 'ب' }] },
        opts, a: 0, ex: `تتبّع رأساً واحداً: يتحرك ${t(dx, dy)}. نصف الانسحاب دائماً بالمسافة والاتجاه.` };
    },
    I: () => {
      const A = F.tr(S.L, 1, 3);
      return { skill: 'T2', type: 'التصويب', q: 'قال علي: «انسحب الشكل (أ) مربعين إلى اليمين و٤ مربعات إلى الأعلى». ما التصويب؟',
        fig: { cols: 9, rows: 7, shapes: [{ poly: A, color: C.a, label: 'أ' }, { poly: F.tr(A, 4, -2), color: C.b, label: 'ب' }] },
        opts: ['4 مربعات إلى اليمين ومربعان إلى الأعلى', 'مربعان إلى اليسار و4 مربعات إلى الأعلى', '4 مربعات إلى اليمين ومربعان إلى الأسفل', 'قول علي صحيح'], a: 0,
        ex: 'عُدّ أفقياً أولاً: ٤ مربعات إلى اليمين، ثم رأسياً: مربعان إلى الأعلى. علي بدّل بين العددين.' };
    },
    gKite: () => {
      const c = shuffle(KC), kind = pick(['v', 'h', 'n']);
      const B = kind === 'v' ? [c[1], c[0], c[3], c[2]] : kind === 'h' ? [c[2], c[3], c[0], c[1]] : [c[3], c[0], c[1], c[2]];
      return { skill: 'R1', type: 'تحديد العنصر', q: 'الطائرة الورقية (ب) تمثّل انعكاساً للطائرة (أ) في خط مرآة:',
        fig: { cols: 6, rows: 4, kites: [{ x: 1.6, y: 1.6, cols: c, label: 'أ' }, { x: 4.4, y: 1.6, cols: B, label: 'ب' }] },
        opts: ['رأسي', 'أفقي', 'ليست انعكاساً'], a: kind === 'v' ? 0 : kind === 'h' ? 1 : 2,
        ex: kind === 'v' ? 'تبادلت ألوان اليمين واليسار، فالمرآة رأسية.' : kind === 'h' ? 'تبادلت ألوان الأعلى والأسفل، فالمرآة أفقية.' : 'الألوان دارت ولم تنقلب، فلا يوجد خط مرآة يحقّق ذلك.' };
    },
    D: () => {
      const A = F.tr(S.rtri, 2, 1), k = 5;
      const wrong = F.tr(F.rv(A, k), 2, 0);
      return { skill: 'R2', type: 'التصويب', q: 'رسم خالد انعكاس الشكل الأخضر في خط المرآة، لكنه أخطأ. ما الخطأ؟',
        fig: { cols: 11, rows: 4, mirror: { x: k }, shapes: [{ poly: A, color: C.a }, { poly: wrong, color: C.b }] },
        opts: ['الصورة ليست على البُعد نفسه من خط المرآة', 'كان يجب أن تكون الصورة أكبر', 'كان يجب تدوير الصورة', 'لا يوجد خطأ'], a: 0,
        ex: 'الشكل يبعد مربعاً واحداً عن خط المرآة، فيجب أن تبعد صورته مربعاً واحداً أيضاً، لا ٣ مربعات.' };
    },
    E: () => {
      const shapes = []; const ar = S.arrow;
      for (let i = 0; i < 4; i++) shapes.push(i === 2 ? { poly: F.tr(ar, i * 3.5 + 0.3, 0.5), ghost: true } : { poly: F.tr(ar, i * 3.5 + 0.3, 0.5), color: C.c });
      const mk = poly => ({ cols: 4, rows: 4, shapes: [{ poly: F.tr(poly, 0.5, 0.5), color: C.c }] });
      const b = F.bbox(ar);
      return { skill: 'M', type: 'إكمال العمل', q: 'هذا النمط مبنيّ بانسحاب شكل واحد. أيّ قطعة تُكمل المكان الفارغ؟',
        fig: { cols: 14, rows: 4, shapes }, opts: [{ fig: mk(ar) }, { fig: mk(F.rv(ar, b.cx)) }, { fig: mk(F.rot(ar, b.cx, b.cy)) }], a: 0,
        ex: 'في نمط الانسحاب يتكرر الشكل بالاتجاه نفسه، فالقطعة الناقصة سهمٌ يشير إلى الجهة نفسها.' };
    },
    Hq: () => ({ skill: 'M', type: 'اختيار من متعدد', q: 'ما الذي يشترك فيه الانسحاب والانعكاس؟',
      opts: ['كلاهما لا يغيّر حجم الشكل ولا شكله', 'كلاهما يقلب الشكل', 'كلاهما يُدير الشكل', 'كلاهما يُكبّر الشكل'], a: 0,
      ex: 'الانسحاب والانعكاس يحافظان على الحجم والشكل؛ الانسحاب يغيّر الموقع، والانعكاس يقلب الشكل.' }),
    gGridR: () => {
      const given = cellsShape(rnd(4, 5), 1, 4, 1, 4);
      return { kind: 'grid', skill: 'R2', type: 'إكمال العمل', q: 'ارسم انعكاس الشكل في خط المرآة: اضغط على المربعات لتلوين الصورة.',
        grid: { cols: 10, rows: 6, mirror: { x: 5 }, given, target: F.cellsRv(given, 5) },
        ex: 'كل مربع يُرسم على البُعد نفسه من خط المرآة لكن في الجانب الآخر؛ المربع الملاصق للخط تكون صورته ملاصقة له.' };
    },
    gGridT: () => {
      const given = cellsShape(4, 0, 3, 0, 3), dx = rnd(3, 5), dy = rnd(0, 2);
      return { kind: 'grid', skill: 'T2', type: 'إكمال العمل',
        q: dy ? `اسحب الشكل ${sqA(dx)} إلى اليمين و${sqA(dy)} إلى الأسفل. لوّن مربعات الصورة.` : `اسحب الشكل ${sqA(dx)} إلى اليمين. لوّن مربعات الصورة.`,
        grid: { cols: 10, rows: 6, given, target: F.cellsTr(given, dx, dy) },
        ex: 'حرّك كل مربع من مربعات الشكل المسافة نفسها وفي الاتجاه نفسه، فتبقى الصورة مطابقة تماماً للأصل.' };
    }
  };

  // ---------- سؤال الأذكياء ٢ ----------
  const smart = [
    () => {
      const given = cellsShape(4, 0, 3, 0, 2), dx = rnd(3, 4);
      const mid = F.cellsTr(given, dx, 0);
      return { kind: 'grid', skill: 'M', type: 'إكمال العمل', smart: true,
        q: `اسحب الشكل ${sqA(dx)} إلى اليمين، ثم ارسم انعكاس الصورة الناتجة في خط المرآة الأفقي. لوّن مربعات الصورة النهائية.`,
        grid: { cols: 10, rows: 8, mirror: { y: 4 }, given, target: F.cellsRh(mid, 4), hint: mid },
        ex: `الخطوة ١: نسحب الشكل ${sqA(dx)} إلى اليمين. الخطوة ٢: نعكس الناتج في الخط الأفقي، فكل مربع يبقى على البُعد نفسه من الخط في الجهة الأخرى.` };
    },
    () => {
      const given = cellsShape(4, 1, 4, 0, 2), dy = rnd(2, 3);
      const mid = F.cellsRv(given, 5);
      return { kind: 'grid', skill: 'M', type: 'إكمال العمل', smart: true,
        q: `اعكس الشكل في خط المرآة الرأسي، ثم اسحب الصورة الناتجة ${sqA(dy)} إلى الأسفل. لوّن مربعات الصورة النهائية.`,
        grid: { cols: 10, rows: 7, mirror: { x: 5 }, given, target: F.cellsTr(mid, 0, dy), hint: mid },
        ex: `الخطوة ١: نعكس الشكل في خط المرآة الرأسي. الخطوة ٢: نسحب الصورة ${sqA(dy)} إلى الأسفل دون قلب أو دوران.` };
    }
  ];

  // خلط الخيارات مع حفظ الإجابة الصحيحة
  function prep(q) {
    if (q.kind === 'grid') return q;
    const idx = shuffle(q.opts.map((_, i) => i));
    q.opts = idx.map(i => q.opts[i]); q.a = idx.indexOf(q.a); return q;
  }

  function pickSlots(slots) {
    const used = new Set();
    return slots.map(slot => {
      const free = slot.filter(s => !used.has(s)); const k = pick(free.length ? free : slot); used.add(k); return k;
    });
  }

  window.QB = {
    SKILLS, AR, shuffle, pick,
    stage1() {
      const keys = pickSlots([['a', 'b', 'f'], ['c', 'd'], ['gCount', 'i', 'bookB'], ['e', 'a', 'b', 'f'], ['gDist', 'l'], ['j', 'k']]);
      return keys.map((k, i) => Object.assign(prep(st1[k]()), { diff: i < 2 ? 1 : 2 }));
    },
    stage2() {
      const keys = pickSlots([['A', 'J'], ['gDesc', 'I'], ['gKite'], ['gGridR'], ['D', 'E', 'Hq'], ['gGridT']]);
      return keys.map((k, i) => Object.assign(prep(st2[k]()), { diff: i < 2 ? 2 : 3 }));
    },
    smart() { return Object.assign(pick(smart)(), { diff: 4 }); }
  };
})();
