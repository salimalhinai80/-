/* الرسومات: البطل، حكيم الحروف، المؤثرات الاحتفالية */
(function () {
  'use strict';
  var n = 0;

  var COLORS = ['#ff5d8f', '#4cc9f0', '#5fd35f', '#ffb703', '#ff7b54', '#9b5de5'];
  var CAPES = ['#e63946', '#3a86ff', '#06d6a0', '#ffbe0b'];
  var HATS = [
    { id: 'none', name: 'بدون' }, { id: 'cap', name: 'قبعة' }, { id: 'bow', name: 'فيونكة' }, { id: 'flower', name: 'زهرة' }, { id: 'band', name: 'عصابة' }
  ];
  var EYES = [{ id: 'round', name: 'عيون لامعة' }, { id: 'happy', name: 'عيون ضاحكة' }, { id: 'glasses', name: 'نظارة' }];

  function shade(hex, amt) {
    var c = parseInt(hex.slice(1), 16), r = (c >> 16) + amt, g = (c >> 8 & 255) + amt, b = (c & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function hatSvg(h, id) {
    switch (h) {
      case 'cap': return '<path d="M58 62 Q100 18 142 62 Z" fill="#3a86ff"/><path d="M58 62 Q100 50 142 62 L162 66 Q120 74 58 66Z" fill="#2667cc"/><circle cx="100" cy="30" r="6" fill="#ffbe0b"/>';
      case 'bow': return '<path d="M100 44 L70 26 Q62 44 70 62 Z" fill="#ff4d8d"/><path d="M100 44 L130 26 Q138 44 130 62 Z" fill="#ff4d8d"/><circle cx="100" cy="44" r="10" fill="#ff85b3"/>';
      case 'flower': return '<g transform="translate(132 46)">' + [0, 72, 144, 216, 288].map(function (a) { return '<ellipse rx="9" ry="14" fill="#ffd166" transform="rotate(' + a + ') translate(0 -11)"/>'; }).join('') + '<circle r="8" fill="#ff7b54"/></g>';
      case 'band': return '<path d="M52 70 Q100 52 148 70 L148 82 Q100 64 52 82Z" fill="#e63946"/><path d="M146 74 l20 -6 l-6 16Z" fill="#e63946"/>';
      case 'crown': return '<path d="M64 60 L70 22 L86 44 L100 14 L114 44 L130 22 L136 60 Z" fill="url(#gold' + id + ')" stroke="#c98a00" stroke-width="3"/><circle cx="100" cy="40" r="5" fill="#ff4d6d"/><circle cx="78" cy="50" r="4" fill="#4cc9f0"/><circle cx="122" cy="50" r="4" fill="#06d6a0"/>';
      case 'wizard': return '<path d="M56 66 L104 -6 L144 66 Z" fill="#5a3fd1"/><path d="M48 66 Q100 50 152 66 Q100 80 48 66Z" fill="#432ba8"/><text x="96" y="46" font-size="22" fill="#ffd166">★</text>';
      case 'astro': return '<circle cx="100" cy="98" r="76" fill="rgba(180,230,255,.25)" stroke="#dfe8f5" stroke-width="7"/><path d="M60 50 Q100 30 140 50" stroke="#fff" stroke-width="5" fill="none" opacity=".7"/>';
      default: return '';
    }
  }

  /* بطل كرتوني: opts {color, cape, hat, eyes, mood} */
  function hero(opts) {
    opts = opts || {};
    var id = ++n, c = opts.color || COLORS[0], cape = opts.cape || CAPES[0];
    var eyes = opts.eyes || 'round', hat = opts.hat || 'none';
    var eyeSvg;
    if (eyes === 'happy') eyeSvg = '<path d="M70 96 Q80 84 90 96" stroke="#2b2346" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M110 96 Q120 84 130 96" stroke="#2b2346" stroke-width="6" fill="none" stroke-linecap="round"/>';
    else {
      eyeSvg = '<ellipse cx="80" cy="94" rx="11" ry="14" fill="#2b2346"/><ellipse cx="120" cy="94" rx="11" ry="14" fill="#2b2346"/>' +
        '<circle cx="84" cy="88" r="4.5" fill="#fff"/><circle cx="124" cy="88" r="4.5" fill="#fff"/><circle cx="77" cy="99" r="2" fill="#fff"/><circle cx="117" cy="99" r="2" fill="#fff"/>';
      if (eyes === 'glasses') eyeSvg += '<circle cx="80" cy="94" r="19" fill="none" stroke="#2b2346" stroke-width="4"/><circle cx="120" cy="94" r="19" fill="none" stroke="#2b2346" stroke-width="4"/><path d="M99 92 h2" stroke="#2b2346" stroke-width="4"/>';
    }
    return '<svg class="hero-svg" viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs><radialGradient id="hb' + id + '" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="' + shade(c, 70) + '"/><stop offset=".55" stop-color="' + c + '"/><stop offset="1" stop-color="' + shade(c, -60) + '"/></radialGradient>' +
      '<linearGradient id="hc' + id + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + cape + '"/><stop offset="1" stop-color="' + shade(cape, -50) + '"/></linearGradient>' +
      '<linearGradient id="gold' + id + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#f5a700"/></linearGradient></defs>' +
      '<ellipse cx="100" cy="210" rx="56" ry="8" fill="rgba(0,0,0,.18)"/>' +
      '<path class="cape" d="M58 120 Q40 180 52 200 L148 200 Q160 180 142 120 Z" fill="url(#hc' + id + ')"/>' +
      '<ellipse cx="74" cy="198" rx="18" ry="11" fill="' + shade(c, -40) + '"/><ellipse cx="126" cy="198" rx="18" ry="11" fill="' + shade(c, -40) + '"/>' +
      '<g class="arm-l"><ellipse cx="40" cy="138" rx="12" ry="20" fill="' + shade(c, -20) + '" transform="rotate(25 40 138)"/></g>' +
      '<g class="arm-r"><ellipse cx="160" cy="138" rx="12" ry="20" fill="' + shade(c, -20) + '" transform="rotate(-25 160 138)"/></g>' +
      '<ellipse cx="100" cy="118" rx="64" ry="78" fill="url(#hb' + id + ')"/>' +
      '<ellipse cx="78" cy="70" rx="20" ry="12" fill="rgba(255,255,255,.35)" transform="rotate(-25 78 70)"/>' +
      '<ellipse cx="100" cy="150" rx="34" ry="30" fill="rgba(255,255,255,.22)"/>' +
      '<path d="M88 148 l12 -14 l12 14 l-12 14z" fill="#ffd23f" stroke="#e0a800" stroke-width="2"/>' +
      eyeSvg +
      '<ellipse cx="64" cy="116" rx="9" ry="6" fill="#ff8fab" opacity=".7"/><ellipse cx="136" cy="116" rx="9" ry="6" fill="#ff8fab" opacity=".7"/>' +
      '<path class="mouth" d="M86 118 Q100 134 114 118" stroke="#2b2346" stroke-width="5" fill="' + (opts.mood === 'wow' ? '#2b2346' : 'none') + '" stroke-linecap="round"/>' +
      hatSvg(hat, id) + '</svg>';
  }

  /* حكيم الحروف: بومة حكيمة بقبعة ونظارة */
  function hakeem() {
    var id = ++n;
    return '<svg class="hakeem-svg" viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs><radialGradient id="ob' + id + '" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#c89b6d"/><stop offset=".6" stop-color="#8d5b3a"/><stop offset="1" stop-color="#5c3720"/></radialGradient>' +
      '<radialGradient id="obl' + id + '" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#fff3dc"/><stop offset="1" stop-color="#e9c99a"/></radialGradient></defs>' +
      '<ellipse cx="100" cy="212" rx="50" ry="7" fill="rgba(0,0,0,.2)"/>' +
      '<g class="wing-l"><path d="M40 120 Q18 160 46 190 Q60 160 58 120Z" fill="#6e4429"/></g>' +
      '<g class="wing-r"><path d="M160 120 Q182 160 154 190 Q140 160 142 120Z" fill="#6e4429"/></g>' +
      '<ellipse cx="100" cy="134" rx="62" ry="74" fill="url(#ob' + id + ')"/>' +
      '<ellipse cx="100" cy="158" rx="38" ry="44" fill="url(#obl' + id + ')"/>' +
      '<path d="M84 150 q8 6 16 0 q8 6 16 0 M80 166 q10 6 20 0 q10 6 20 0 M86 182 q7 5 14 0 q7 5 14 0" stroke="#c9a273" stroke-width="3" fill="none"/>' +
      '<path d="M48 70 L60 40 L76 66Z M152 70 L140 40 L124 66Z" fill="#6e4429"/>' +
      '<circle cx="76" cy="96" r="24" fill="#fff"/><circle cx="124" cy="96" r="24" fill="#fff"/>' +
      '<g class="pupils"><circle cx="78" cy="98" r="11" fill="#2b2346"/><circle cx="122" cy="98" r="11" fill="#2b2346"/><circle cx="82" cy="93" r="4" fill="#fff"/><circle cx="126" cy="93" r="4" fill="#fff"/></g>' +
      '<g class="blink"><rect x="50" y="70" width="52" height="0" fill="#8d5b3a"/></g>' +
      '<circle cx="76" cy="96" r="27" fill="none" stroke="#d4a017" stroke-width="5"/><circle cx="124" cy="96" r="27" fill="none" stroke="#d4a017" stroke-width="5"/><path d="M103 94 h-6" stroke="#d4a017" stroke-width="5"/>' +
      '<path class="beak" d="M92 118 L100 136 L108 118 Z" fill="#ffb703" stroke="#e08e00" stroke-width="2"/>' +
      '<path d="M52 64 L104 4 L150 64 Z" fill="#3d2f9e"/><path d="M42 66 Q100 46 158 66 Q100 82 42 66Z" fill="#2c2180"/>' +
      '<text x="80" y="50" font-size="20" fill="#ffd166" font-family="Cairo">أ ب</text><circle cx="104" cy="6" r="7" fill="#ffd166"/>' +
      '<path d="M140 182 l26 -6 l4 24 l-26 6z" fill="#e63946"/><path d="M143 184 l20 -5 l3 19 l-20 5z" fill="#fff6e0"/>' +
      '</svg>';
  }

  // ===== قصاصات احتفالية =====
  var cv, cx2, parts = [], raf = 0;
  function confetti(amount, opts) {
    opts = opts || {};
    if (!cv) {
      cv = document.createElement('canvas'); cv.id = 'confetti';
      document.body.appendChild(cv); cx2 = cv.getContext('2d');
    }
    cv.width = innerWidth * 1; cv.height = innerHeight * 1;
    var cols = ['#ff5d8f', '#ffd23f', '#4cc9f0', '#06d6a0', '#9b5de5', '#ff7b54'];
    var ox = opts.x != null ? opts.x : innerWidth / 2, oy = opts.y != null ? opts.y : innerHeight * 0.35;
    for (var i = 0; i < (amount || 120); i++) {
      var a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
      parts.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, r: 4 + Math.random() * 6, c: cols[i % cols.length], rot: Math.random() * 6, vr: (Math.random() - .5) * .3, life: 1, star: Math.random() < .25 });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function drawStar(c, r) {
    c.beginPath();
    for (var i = 0; i < 10; i++) { var rr = i % 2 ? r * .45 : r; var a = i * Math.PI / 5 - Math.PI / 2; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fill();
  }
  function tick() {
    cx2.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(function (p) { return p.life > 0 && p.y < cv.height + 30; });
    parts.forEach(function (p) {
      p.vy += 0.25; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.006;
      cx2.save(); cx2.translate(p.x, p.y); cx2.rotate(p.rot); cx2.globalAlpha = Math.max(0, Math.min(1, p.life * 2)); cx2.fillStyle = p.c;
      if (p.star) drawStar(cx2, p.r * 1.4); else cx2.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      cx2.restore();
    });
    if (parts.length) raf = requestAnimationFrame(tick); else { raf = 0; cx2.clearRect(0, 0, cv.width, cv.height); }
  }

  // نجمة تطير من عنصر إلى عداد النجوم
  function flyStar(fromEl, toEl) {
    if (!fromEl || !toEl) return;
    var a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    var s = document.createElement('div'); s.className = 'fly-star'; s.textContent = '⭐';
    s.style.left = (a.left + a.width / 2 - 20) + 'px'; s.style.top = (a.top + a.height / 2 - 20) + 'px';
    document.body.appendChild(s);
    requestAnimationFrame(function () {
      s.style.transform = 'translate(' + (b.left + b.width / 2 - a.left - a.width / 2) + 'px,' + (b.top + b.height / 2 - a.top - a.height / 2) + 'px) scale(.6) rotate(360deg)';
      s.style.opacity = '0.3';
    });
    setTimeout(function () { s.remove(); toEl.classList.remove('bump'); void toEl.offsetWidth; toEl.classList.add('bump'); }, 750);
  }

  HK.art = { hero: hero, hakeem: hakeem, confetti: confetti, flyStar: flyStar, COLORS: COLORS, CAPES: CAPES, HATS: HATS, EYES: EYES, shade: shade };
})();
