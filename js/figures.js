/* رسم الأشكال التوضيحية على شبكة مربعات (للأسئلة) */
(function () {
  const C = {
    grid: '#c9d6ea', gridBg: '#ffffff', mirror: '#e0245e', ink: '#1d2340',
    a: '#7ac943', b: '#f7931e', c: '#29abe2', d: '#c65bd6', ghost: 'rgba(80,90,120,.18)'
  };

  // تحويلات على مضلّع بإحداثيات الشبكة (y للأسفل)
  const F = {
    tr: (p, dx, dy) => p.map(([x, y]) => [x + dx, y + dy]),
    rv: (p, k) => p.map(([x, y]) => [2 * k - x, y]).reverse(),
    rh: (p, k) => p.map(([x, y]) => [x, 2 * k - y]).reverse(),
    rot: (p, cx, cy) => p.map(([x, y]) => [cx - (y - cy), cy + (x - cx)]),
    cellsTr: (cs, dx, dy) => cs.map(([x, y]) => [x + dx, y + dy]),
    cellsRv: (cs, k) => cs.map(([x, y]) => [2 * k - x - 1, y]),
    cellsRh: (cs, k) => cs.map(([x, y]) => [x, 2 * k - y - 1]),
    bbox(p) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      p.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
      return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
    },
    C
  };

  // أشكال غير متناظرة حتى يظهر الانعكاس بوضوح
  F.SHAPES = {
    L: [[0, 0], [1, 0], [1, 2], [2, 2], [2, 3], [0, 3]],
    flag: [[0, 0], [2, 0], [1.2, 0.8], [2, 1.6], [0.6, 1.6], [0.6, 3], [0, 3]],
    trap: [[0, 0], [2, 0], [3, 2], [0, 2]],
    rtri: [[0, 0], [0, 2], [2, 2]],
    arrow: [[0, 1], [2, 1], [2, 0], [3, 1.5], [2, 3], [2, 2], [0, 2]],
    boot: [[0, 0], [1, 0], [1, 2], [3, 2], [3, 3], [0, 3]],
    house: [[0, 1], [1, 0], [2, 1], [2, 3], [0, 3]],
    zig: [[0, 0], [2, 0], [2, 1], [3, 1], [3, 2], [1, 2], [1, 1], [0, 1]]
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  F.roundRect = roundRect;

  function drawKite(ctx, cx, cy, w, h, cols) {
    // cols: [أعلى يسار، أعلى يمين، أسفل يسار، أسفل يمين]
    const top = [cx, cy - h * 0.5], bot = [cx, cy + h * 0.5], L = [cx - w / 2, cy], R = [cx + w / 2, cy], M = [cx, cy];
    const tri = (a, b, c, col) => { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.stroke(); };
    ctx.lineWidth = 2; ctx.strokeStyle = C.ink;
    tri(top, L, M, cols[0]); tri(top, R, M, cols[1]); tri(L, bot, M, cols[2]); tri(R, bot, M, cols[3]);
  }

  /**
   * spec: {cols, rows, shapes:[{poly, color, label, dashed, ghost}], cells:[{list, color}],
   *        mirror:{x}|{y}, arrows:[{from,to}], kites:[{x,y,cols,label}], hl:[cells] }
   */
  F.draw = function (canvas, spec, opt = {}) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = opt.w || canvas.clientWidth || 300, cssH = opt.h || canvas.clientHeight || 180;
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    const pad = opt.pad != null ? opt.pad : 8;
    const s = Math.min((cssW - pad * 2) / spec.cols, (cssH - pad * 2) / spec.rows);
    const ox = (cssW - s * spec.cols) / 2, oy = (cssH - s * spec.rows) / 2;
    const P = (x, y) => [ox + x * s, oy + y * s];
    // خلفية وشبكة
    ctx.fillStyle = C.gridBg; roundRect(ctx, ox - 4, oy - 4, s * spec.cols + 8, s * spec.rows + 8, 8); ctx.fill();
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    for (let i = 0; i <= spec.cols; i++) { ctx.beginPath(); ctx.moveTo(...P(i, 0)); ctx.lineTo(...P(i, spec.rows)); ctx.stroke(); }
    for (let j = 0; j <= spec.rows; j++) { ctx.beginPath(); ctx.moveTo(...P(0, j)); ctx.lineTo(...P(spec.cols, j)); ctx.stroke(); }
    // خلايا ملوّنة
    (spec.cells || []).forEach(g => {
      g.list.forEach(([x, y]) => {
        ctx.fillStyle = g.color; ctx.fillRect(ox + x * s + 1, oy + y * s + 1, s - 2, s - 2);
        if (g.stroke) { ctx.strokeStyle = g.stroke; ctx.lineWidth = 3; ctx.strokeRect(ox + x * s + 2.5, oy + y * s + 2.5, s - 5, s - 5); }
      });
      if (g.label) {
        const b = F.bbox(g.list.flatMap(([x, y]) => [[x, y], [x + 1, y + 1]]));
        label(ctx, g.label, ...P(b.cx, b.cy), s);
      }
    });
    // أشكال
    (spec.shapes || []).forEach(sh => {
      ctx.beginPath();
      sh.poly.forEach((pt, i) => { const [X, Y] = P(...pt); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.closePath();
      if (sh.ghost) { ctx.setLineDash([5, 4]); ctx.fillStyle = C.ghost; ctx.fill(); ctx.strokeStyle = '#6b7390'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); }
      else {
        ctx.fillStyle = sh.color || C.a; ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 2.2; if (sh.dashed) ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
      }
      if (sh.label) { const b = F.bbox(sh.poly); label(ctx, sh.label, ...P(b.cx, b.cy), s); }
    });
    // طائرات ورقية
    (spec.kites || []).forEach(k => {
      const [X, Y] = P(k.x, k.y); drawKite(ctx, X, Y, s * 1.3, s * 1.8, k.cols);
      if (k.label) label(ctx, k.label, X, Y + s * 1.25, s, true);
    });
    // خط المرآة
    if (spec.mirror) {
      ctx.strokeStyle = C.mirror; ctx.lineWidth = 3.5; ctx.setLineDash([8, 6]); ctx.beginPath();
      if (spec.mirror.x != null) { ctx.moveTo(...P(spec.mirror.x, -0.2)); ctx.lineTo(...P(spec.mirror.x, spec.rows + 0.2)); }
      else { ctx.moveTo(...P(-0.2, spec.mirror.y)); ctx.lineTo(...P(spec.cols + 0.2, spec.mirror.y)); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    // أسهم
    (spec.arrows || []).forEach(a => {
      const [x1, y1] = P(...a.from), [x2, y2] = P(...a.to);
      ctx.strokeStyle = a.color || '#3b4bd8'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const an = Math.atan2(y2 - y1, x2 - x1), h = 10;
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - h * Math.cos(an - 0.45), y2 - h * Math.sin(an - 0.45));
      ctx.lineTo(x2 - h * Math.cos(an + 0.45), y2 - h * Math.sin(an + 0.45)); ctx.closePath(); ctx.fill();
    });
    return { s, ox, oy };
  };

  function label(ctx, t, x, y, s, below) {
    const fs = Math.max(12, Math.min(22, s * 0.7));
    ctx.font = `900 ${fs}px Cairo, Tahoma, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.strokeText(t, x, y); ctx.fillStyle = C.ink; ctx.fillText(t, x, y);
  }

  window.Fig = F;
})();
