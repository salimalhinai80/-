/* بناء العالم ثلاثي الأبعاد: الطرق والبيئات والعناصر */
(function () {
  const T = THREE, { toon, M, OUT } = window.Hero;
  const ROAD_W = 10, LANES = [-3.2, 0, 3.2];

  // ---------- المسار ----------
  class Track {
    constructor(fx, len) {
      this.fx = fx; this.len = len; this.N = Math.ceil(len + 260);
      this.x = new Float32Array(this.N + 1); this.dx = new Float32Array(this.N + 1);
      for (let i = 0; i <= this.N; i++) { this.x[i] = fx(i); this.dx[i] = (fx(i + 0.5) - fx(i - 0.5)); }
    }
    sample(s) { s = Math.max(0, Math.min(this.N - 1, s)); const i = Math.floor(s), f = s - i; return [this.x[i] + (this.x[i + 1] - this.x[i]) * f, this.dx[i] + (this.dx[i + 1] - this.dx[i]) * f]; }
    pos(s, u, y = 0, out = new T.Vector3()) {
      const [x, d] = this.sample(s), n = Math.hypot(d, 1);
      // المتجه الأيمن = (1, 0, d)/n
      return out.set(x + u / n, y, -s + u * d / n);
    }
    yaw(s) { return Math.atan2(-this.sample(s)[1], 1); }
    curvature(s) { return (this.sample(s + 2)[1] - this.sample(s - 2)[1]) / 4; }
    distToRoad(px, pz) {
      const s0 = -pz; let best = 1e9;
      for (let s = Math.max(0, s0 - 70); s < Math.min(this.N, s0 + 70); s += 2) {
        const dx = px - this.x[Math.floor(s)], dz = pz + s; const d = dx * dx + dz * dz; if (d < best) best = d;
      }
      return Math.sqrt(best);
    }
  }

  // ---------- قوام مرسوم ----------
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; }
    return t;
  }
  function roadTex(th) {
    return canvasTex(256, 512, (g, w, h) => {
      g.fillStyle = th.road; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
      g.fillStyle = th.edge; g.fillRect(6, 0, 10, h); g.fillRect(w - 16, 0, 10, h);
      g.fillStyle = 'rgba(255,255,255,.85)';
      [w * 0.34, w * 0.66].forEach(x => { g.fillRect(x - 4, 20, 8, 200); g.fillRect(x - 4, 276, 8, 200); });
    }, true);
  }
  function curbTex() { return canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#e8413c'; g.fillRect(0, 0, w, h / 2); g.fillStyle = '#fff'; g.fillRect(0, h / 2, w, h / 2); }, true); }
  function grassTex(base) {
    return canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 500; i++) { const l = Math.random() < 0.5; g.fillStyle = l ? 'rgba(255,255,220,.10)' : 'rgba(0,40,0,.10)'; const r = 2 + Math.random() * 7; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, r, 0, 7); g.fill(); }
    }, true);
  }
  function textTex(text, opt = {}) {
    const w = opt.w || 512, h = opt.h || 256;
    return canvasTex(w, h, (g) => {
      const r = 34;
      g.fillStyle = opt.bg || '#2f80ff';
      g.beginPath(); g.moveTo(r, 6); g.arcTo(w - 6, 6, w - 6, h - 6, r); g.arcTo(w - 6, h - 6, 6, h - 6, r); g.arcTo(6, h - 6, 6, 6, r); g.arcTo(6, 6, w - 6, 6, r); g.closePath(); g.fill();
      g.lineWidth = 10; g.strokeStyle = opt.border || '#fff'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(16, 16, w - 32, h * 0.32);
      g.fillStyle = opt.color || '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
      let fs = opt.fs || 64; const maxW = w - 60;
      const lines = () => { g.font = `900 ${fs}px Cairo, Tahoma, sans-serif`; const words = text.split(' '); const out = []; let cur = ''; words.forEach(wd => { const t = cur ? cur + ' ' + wd : wd; if (g.measureText(t).width > maxW && cur) { out.push(cur); cur = wd; } else cur = t; }); out.push(cur); return out; };
      let ls = lines(); while ((ls.length * fs * 1.15 > h - 40 || ls.some(l => g.measureText(l).width > maxW)) && fs > 22) { fs -= 4; ls = lines(); }
      g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,.35)';
      ls.forEach((l, i) => { const y = h / 2 + (i - (ls.length - 1) / 2) * fs * 1.15 + (opt.dy || 0); g.strokeText(l, w / 2, y); g.fillText(l, w / 2, y); });
    });
  }

  // ---------- مثيلات متعددة ----------
  const dummy = new T.Object3D();
  function instanced(scene, geo, mat, list, { outline = 0.07, colors = null, shadow = true } = {}) {
    if (!list.length) return null;
    const im = new T.InstancedMesh(geo, mat, list.length); im.castShadow = shadow; im.receiveShadow = false;
    const om = outline ? new T.InstancedMesh(geo, OUT, list.length) : null;
    list.forEach((p, i) => {
      dummy.position.set(p.x, p.y || 0, p.z); dummy.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
      const sc = p.s || 1; dummy.scale.set(sc * (p.sx || 1), sc * (p.sy || 1), sc * (p.sz || 1)); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
      if (om) { dummy.scale.multiplyScalar(1 + outline); dummy.updateMatrix(); om.setMatrixAt(i, dummy.matrix); }
      if (colors) im.setColorAt(i, new T.Color(colors[i % colors.length] ?? p.c));
      if (p.c != null && !colors) im.setColorAt(i, new T.Color(p.c));
    });
    scene.add(im); if (om) scene.add(om); return im;
  }

  // ---------- السماء ----------
  function sky(scene, th) {
    const g = new T.SphereGeometry(900, 32, 16);
    const m = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new T.Color(th.skyTop) }, hor: { value: new T.Color(th.skyHor) }, bot: { value: new T.Color(th.skyBot || th.skyHor) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(hor, top, pow(clamp(h,0.0,1.0), 0.55)) : mix(hor, bot, clamp(-h*4.0,0.0,1.0)); gl_FragColor = vec4(c,1.0); }'
    });
    const mesh = new T.Mesh(g, m); mesh.renderOrder = -10; scene.add(mesh);
    const sunTex = canvasTex(256, 256, (c) => { const gr = c.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, th.sun); gr.addColorStop(0.28, th.sun); gr.addColorStop(0.32, th.sunGlow); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 256, 256); });
    const sun = new T.Sprite(new T.SpriteMaterial({ map: sunTex, fog: false, depthWrite: false, transparent: true }));
    sun.scale.set(th.sunSize || 220, th.sunSize || 220, 1); mesh.add(sun); sun.position.set(th.sunDir[0] * 800, th.sunDir[1] * 800, th.sunDir[2] * 800);
    if (th.stars) {
      const pts = []; for (let i = 0; i < 500; i++) { const a = Math.random() * Math.PI * 2, e = Math.random() * 0.9 + 0.12; pts.push(Math.cos(a) * Math.cos(e) * 850, Math.sin(e) * 850, Math.sin(a) * Math.cos(e) * 850); }
      const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      mesh.add(new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })));
    }
    return mesh;
  }

  const THEMES = [
    { name: 'meadow', skyTop: 0x2f86ff, skyHor: 0xcdeeff, skyBot: 0x9fd88a, fog: 0xcdeeff, fogN: 90, fogF: 420, ground: '#86d46a', road: '#8e8fa3', edge: '#ffffff', sun: '#fffbe0', sunGlow: 'rgba(255,240,170,.5)', sunDir: [0.4, 0.55, -0.73], hemi: [0xdff3ff, 0x6aa84f, 0.95], dir: [0xfff4dd, 1.35], fx: s => 7 * Math.sin(s / 95) + 3 * Math.sin(s / 41), music: 0 },
    { name: 'seaside', skyTop: 0x3b7dff, skyHor: 0xffd8a8, skyBot: 0x3fa3d8, fog: 0xffe0bd, fogN: 90, fogF: 430, ground: '#9ad66f', road: '#7c7f96', edge: '#ffd23f', sun: '#fff1c2', sunGlow: 'rgba(255,190,120,.55)', sunDir: [-0.6, 0.32, -0.73], hemi: [0xffe9d0, 0x5f9f60, 0.9], dir: [0xffe2b8, 1.3], fx: s => 9 * Math.sin(s / 120), music: 1 },
    { name: 'sunset', skyTop: 0x2a2470, skyHor: 0xff9466, skyBot: 0x6b3f6e, fog: 0xf0a07c, fogN: 70, fogF: 380, ground: '#5fa04e', road: '#6e5b6e', edge: '#ffb03b', sun: '#ffe6a0', sunGlow: 'rgba(255,130,90,.6)', sunDir: [0.1, 0.12, -0.99], sunSize: 300, stars: true, hemi: [0xffc6a8, 0x3b5a3b, 0.85], dir: [0xffc08a, 1.25], fx: s => 12 * Math.sin(s / 52) + 5 * Math.sin(s / 23 + 1), music: 2 }
  ];

  // ---------- بناء مرحلة ----------
  function buildStage(scene, idx, len) {
    const th = THEMES[idx];
    const group = new T.Group(); scene.add(group);
    const track = new Track(th.fx, len);
    scene.fog = new T.Fog(th.fog, th.fogN, th.fogF);
    const skyMesh = sky(group, th);

    // أرض
    const gTex = grassTex(th.ground); gTex.repeat.set(60, (len + 600) / 10);
    const ground = new T.Mesh(new T.PlaneGeometry(600, len + 600), toon(0xffffff, { map: gTex }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.02, -(len / 2)); ground.receiveShadow = true; group.add(ground);

    // الطريق: شريط يتبع المنحنى
    const step = 2, segs = Math.ceil((len + 220) / step), pos = [], uv = [], idxs = [], cpos = [[], []], cuv = [[], []];
    const v = new T.Vector3();
    for (let i = 0; i <= segs; i++) {
      const s = i * step - 20;
      [-ROAD_W / 2, ROAD_W / 2].forEach((u, k) => { track.pos(Math.max(0, s), u, 0.01, v); pos.push(v.x, 0.01, s < 0 ? -s : v.z); uv.push(k, s / 10); });
      [-1, 1].forEach((sd, k) => {
        track.pos(Math.max(0, s), sd * (ROAD_W / 2 + 0.05), 0, v); cpos[k].push(v.x, 0.12, s < 0 ? -s : v.z);
        track.pos(Math.max(0, s), sd * (ROAD_W / 2 + 0.75), 0, v); cpos[k].push(v.x, 0.02, s < 0 ? -s : v.z);
        cuv[k].push(0, s / 3, 1, s / 3);
      });
      if (i < segs) { const a = i * 2; idxs.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); rg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); rg.setIndex(idxs); rg.computeVertexNormals();
    const rTex = roadTex(th); const road = new T.Mesh(rg, toon(0xffffff, { map: rTex })); road.receiveShadow = true; group.add(road);
    const cTex = curbTex();
    [0, 1].forEach(k => {
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(cpos[k], 3)); g.setAttribute('uv', new T.Float32BufferAttribute(cuv[k], 2));
      g.setIndex(idxs); g.computeVertexNormals();
      const m = new T.Mesh(g, toon(0xffffff, { map: cTex, side: T.DoubleSide })); m.receiveShadow = true; group.add(m);
    });

    // ---------- الديكور ----------
    const rand = (a, b) => a + Math.random() * (b - a);
    const props = { trees: [], foliage: [], pines: [], pineT: [], rocks: [], bushes: [], flowers: [], houses: [], roofs: [], clouds: [], palms: [], crowns: [], mountains: [], snow: [], lamps: [], lampL: [] };
    const free = (x, z, m) => track.distToRoad(x, z) > ROAD_W / 2 + m;
    const seaEdge = s => track.x[Math.min(track.N, Math.max(0, Math.floor(s)))] - 34;
    for (let s = -30; s < len + 200; s += idx === 2 ? 5 : 6) {
      for (let k = 0; k < 3; k++) {
        const side = Math.random() < 0.5 ? -1 : 1, off = rand(8, 70) * side;
        const ss = Math.max(0, s), p = track.pos(ss, off); if (s < 0) p.z = -s;
        if (!free(p.x, p.z, 3)) continue;
        if (idx === 1 && p.x < seaEdge(ss)) continue;
        const r = Math.random();
        if (idx === 0) {
          if (r < 0.45) { const sc = rand(0.8, 1.5); props.trees.push({ x: p.x, z: p.z, y: 1.2 * sc, s: sc }); props.foliage.push({ x: p.x, z: p.z, y: 3.1 * sc, s: sc * rand(1.6, 2.1), c: Math.random() < 0.45 ? 0xffa8cf : (Math.random() < 0.5 ? 0x5fc24f : 0x7bd65a), ry: rand(0, 6) }); }
          else if (r < 0.65) props.bushes.push({ x: p.x, z: p.z, y: 0.4, s: rand(0.7, 1.3), c: 0x4fb84a });
          else if (r < 0.92) for (let f = 0; f < 6; f++) props.flowers.push({ x: p.x + rand(-2, 2), z: p.z + rand(-2, 2), y: 0.2, s: rand(0.8, 1.2), c: [0xff5c8a, 0xffd23f, 0xffffff, 0xb37bff][f % 4] });
          else if (Math.abs(off) > 20) { const sc = rand(1, 1.4), c = [0xfff1d6, 0xd6f0ff, 0xffe0e6][Math.floor(rand(0, 3))]; props.houses.push({ x: p.x, z: p.z, y: 1.5 * sc, s: sc, sx: 3, sy: 3, sz: 3, ry: track.yaw(ss), c }); props.roofs.push({ x: p.x, z: p.z, y: 4.1 * sc, s: sc, sx: 2.7, sy: 1.6, sz: 2.7, ry: track.yaw(ss) + Math.PI / 4, c: [0xe8413c, 0x2f80ff, 0xff8a1f][Math.floor(rand(0, 3))] }); }
        } else if (idx === 1) {
          if (p.x < seaEdge(ss) + 14) { if (r < 0.5) { const sc = rand(0.9, 1.3), lean = rand(-0.25, 0.25); props.palms.push({ x: p.x, z: p.z, y: 2.4 * sc, s: sc, rz: lean }); props.crowns.push({ x: p.x - Math.sin(lean) * 4.8 * sc, z: p.z, y: 4.9 * sc, s: sc, ry: rand(0, 6) }); } }
          else if (r < 0.35) { const sc = rand(0.9, 1.4), lean = rand(-0.2, 0.2); props.palms.push({ x: p.x, z: p.z, y: 2.4 * sc, s: sc, rz: lean }); props.crowns.push({ x: p.x - Math.sin(lean) * 4.8 * sc, z: p.z, y: 4.9 * sc, s: sc, ry: rand(0, 6) }); }
          else if (r < 0.6) props.bushes.push({ x: p.x, z: p.z, y: 0.4, s: rand(0.7, 1.4), c: 0x52b04a });
          else if (r < 0.85) for (let f = 0; f < 5; f++) props.flowers.push({ x: p.x + rand(-2, 2), z: p.z + rand(-2, 2), y: 0.2, s: 1, c: [0xff5c8a, 0xffd23f, 0xff8a1f][f % 3] });
          else props.rocks.push({ x: p.x, z: p.z, y: 0.3, s: rand(0.6, 1.4), ry: rand(0, 6), c: 0xb8b2a8 });
        } else {
          if (r < 0.5) { const sc = rand(0.9, 1.6); props.pineT.push({ x: p.x, z: p.z, y: 0.8 * sc, s: sc }); props.pines.push({ x: p.x, z: p.z, y: 3 * sc, s: sc, c: Math.random() < 0.5 ? 0x2f7d4a : 0x3d9a55 }); }
          else if (r < 0.75) props.rocks.push({ x: p.x, z: p.z, y: 0.4, s: rand(0.7, 2.2), ry: rand(0, 6), c: 0x9a8a8f });
          else props.bushes.push({ x: p.x, z: p.z, y: 0.4, s: rand(0.7, 1.2), c: 0x3f8f45 });
        }
      }
    }
    // جبال بعيدة
    for (let s = -200; s < len + 400; s += 70) {
      [-1, 1].forEach(sd => {
        if (idx === 1 && sd < 0) return;
        const h = rand(60, idx === 2 ? 170 : 110), x = sd * rand(170, 260), z = -s + rand(-30, 30);
        props.mountains.push({ x, z, y: h / 2 - 2, s: 1, sx: h * 0.9, sy: h, sz: h * 0.9, ry: rand(0, 6), c: idx === 2 ? 0x6a4f7a : 0x6f9fd0 });
        props.snow.push({ x, z, y: h * 0.86, s: 1, sx: h * 0.27, sy: h * 0.3, sz: h * 0.27, ry: 0 });
      });
    }
    // سحب
    for (let i = 0; i < 40; i++) {
      const s = rand(-100, len + 300), x = rand(-260, 260), y = rand(45, 90), z = -s;
      for (let j = 0; j < 4; j++) props.clouds.push({ x: x + j * rand(5, 8), z: z + rand(-3, 3), y: y + rand(-2, 3), s: rand(5, 9) });
    }
    // أعمدة إنارة على الطريق في المرحلة الثالثة والثانية
    if (idx >= 1) for (let s = 10; s < len + 100; s += 34) [-1, 1].forEach(sd => { const p = track.pos(s, sd * (ROAD_W / 2 + 1.6)); props.lamps.push({ x: p.x, z: p.z, y: 1.8, s: 1 }); props.lampL.push({ x: p.x, z: p.z, y: 3.7, s: 1 }); });

    const G = {
      trunk: new T.CylinderGeometry(0.22, 0.32, 2.4, 7), ball: new T.IcosahedronGeometry(1, 1), cone: new T.ConeGeometry(1.6, 4.2, 8),
      rock: new T.DodecahedronGeometry(1, 0), flower: new T.SphereGeometry(0.22, 6, 5), box: new T.BoxGeometry(1, 1, 1), roof: new T.ConeGeometry(1, 1, 4),
      palm: new T.CylinderGeometry(0.18, 0.32, 4.8, 7), crown: new T.ConeGeometry(2.6, 1.1, 8, 1, true), mount: new T.ConeGeometry(1, 1, 7), lamp: new T.CylinderGeometry(0.07, 0.1, 3.6, 6), bulb: new T.SphereGeometry(0.28, 10, 8)
    };
    const white = toon(0xffffff);
    instanced(group, G.trunk, toon(0x8a5a3b), props.trees);
    instanced(group, G.ball, white, props.foliage, { outline: 0.05 });
    instanced(group, G.trunk, toon(0x6e4a33), props.pineT);
    instanced(group, G.cone, white, props.pines, { outline: 0.05 });
    instanced(group, G.ball, white, props.bushes, { outline: 0.06 });
    instanced(group, G.flower, white, props.flowers, { outline: 0, shadow: false });
    instanced(group, G.rock, white, props.rocks);
    instanced(group, G.box, white, props.houses, { outline: 0.03 });
    instanced(group, G.roof, white, props.roofs, { outline: 0.04 });
    instanced(group, G.palm, toon(0xa87a4f), props.palms);
    const cr = instanced(group, G.crown, toon(0x3dbb5a, { side: T.DoubleSide }), props.crowns, { outline: 0 });
    instanced(group, G.mount, white, props.mountains, { outline: 0, shadow: false });
    instanced(group, G.mount, toon(0xffffff), props.snow, { outline: 0, shadow: false });
    instanced(group, G.ball, toon(0xffffff), props.clouds, { outline: 0, shadow: false });
    instanced(group, G.lamp, toon(0x3a3550), props.lamps, { outline: 0.1 });
    instanced(group, G.bulb, new T.MeshBasicMaterial({ color: idx === 2 ? 0xffd27a : 0xfff6d0 }), props.lampL, { outline: 0, shadow: false });

    // البحر والشاطئ في المرحلة الثانية
    let sea = null;
    if (idx === 1) {
      const sTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2aa7e0'; g.fillRect(0, 0, w, h); for (let i = 0; i < 120; i++) { g.strokeStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.35})`; g.lineWidth = 3; const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 5, x + 22, y); g.stroke(); } }, true);
      sTex.repeat.set(40, 80);
      sea = new T.Mesh(new T.PlaneGeometry(800, len + 900), new T.MeshPhongMaterial({ color: 0xffffff, map: sTex, shininess: 90, specular: 0x88ccff }));
      sea.rotation.x = -Math.PI / 2; sea.position.set(-34 - 400 - 12, 0.05, -len / 2); group.add(sea);
      // شريط الرمل يتبع الطريق
      const sp = [], si = [];
      for (let i = 0; i <= segs; i++) { const s = i * step - 20, cx = track.x[Math.max(0, Math.min(track.N, Math.floor(Math.max(0, s))))]; sp.push(cx - 50, 0.03, -s, cx - 30, 0.03, -s); if (i < segs) { const a = i * 2; si.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
      const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3)); sg.setIndex(si); sg.computeVertexNormals();
      const sand = new T.Mesh(sg, toon(0xf3dfa2, { side: T.DoubleSide })); sand.receiveShadow = true; group.add(sand);
      // منارة
      const lh = new T.Group(); const lp = track.pos(len * 0.55, -26);
      for (let i = 0; i < 5; i++) { const m = M(new T.CylinderGeometry(1.6 - i * 0.18, 1.75 - i * 0.18, 2.4, 14), toon(i % 2 ? 0xffffff : 0xe8413c), 0.03); m.position.y = 1.2 + i * 2.4; lh.add(m); }
      const top = M(new T.CylinderGeometry(0.9, 0.9, 1.2, 10), new T.MeshBasicMaterial({ color: 0xfff2a0 }), 0.05); top.position.y = 12.8; lh.add(top);
      const rf = M(new T.ConeGeometry(1.2, 1.4, 10), toon(0xe8413c)); rf.position.y = 14.1; lh.add(rf);
      lh.position.copy(lp); group.add(lh);
    }
    return { group, track, theme: th, sky: skyMesh, sea, crowns: cr };
  }

  // ---------- النجوم ----------
  const starShape = (() => { const sh = new T.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.22 : 0.5, a = i / 10 * Math.PI * 2 + Math.PI / 2; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? sh.lineTo(x, y) : sh.moveTo(x, y); } sh.closePath(); return sh; })();
  const starGeo = new T.ExtrudeGeometry(starShape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2 }); starGeo.center();

  class Stars {
    constructor(scene, track, list) {
      this.track = track; this.list = list.map(p => ({ s: p.s, u: p.u, y: p.y || 1.1, got: false }));
      this.mesh = new T.InstancedMesh(starGeo, toon(0xffd23f, { emissive: 0x7a4a00 }), Math.max(1, this.list.length));
      this.out = new T.InstancedMesh(starGeo, OUT, Math.max(1, this.list.length));
      this.mesh.castShadow = true; scene.add(this.mesh); scene.add(this.out); this.t = 0; this.v = new T.Vector3();
      this.update(0);
    }
    update(dt) {
      this.t += dt;
      this.list.forEach((p, i) => {
        if (p.got) { dummy.scale.setScalar(0); }
        else { this.track.pos(p.s, p.u, p.y + Math.sin(this.t * 3 + i) * 0.12, this.v); dummy.position.copy(this.v); dummy.rotation.set(0, this.t * 2.5 + i, 0); dummy.scale.setScalar(1.15); }
        dummy.updateMatrix(); this.mesh.setMatrixAt(i, dummy.matrix);
        if (!p.got) dummy.scale.setScalar(1.24); dummy.updateMatrix(); this.out.setMatrixAt(i, dummy.matrix);
      });
      this.mesh.instanceMatrix.needsUpdate = true; this.out.instanceMatrix.needsUpdate = true;
    }
    collect(s, u, r = 1.1) {
      const got = [];
      this.list.forEach(p => { if (!p.got && Math.abs(p.s - s) < 1.2 && Math.abs(p.u - u) < r) { p.got = true; got.push(p); } });
      return got;
    }
  }

  // ---------- جسيمات ----------
  class Particles {
    constructor(scene, n = 900) {
      this.n = n; this.i = 0;
      this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.g = new Float32Array(n);
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(this.pos, 3)); geo.setAttribute('color', new T.BufferAttribute(this.col, 3));
      const tex = canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
      this.pts = new T.Points(geo, new T.PointsMaterial({ size: 0.35, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      this.pts.frustumCulled = false; scene.add(this.pts); this.geo = geo;
      for (let i = 0; i < n; i++) this.pos[i * 3 + 1] = -999;
    }
    burst(p, count, colors, speed = 6, up = 4, grav = 9) {
      const c = new T.Color();
      for (let k = 0; k < count; k++) {
        const i = this.i = (this.i + 1) % this.n;
        this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
        const a = Math.random() * Math.PI * 2, e = Math.random() * 2 - 1, sp = speed * (0.3 + Math.random() * 0.7);
        this.vel[i * 3] = Math.cos(a) * Math.sqrt(1 - e * e) * sp; this.vel[i * 3 + 1] = Math.abs(e) * sp + up * Math.random(); this.vel[i * 3 + 2] = Math.sin(a) * Math.sqrt(1 - e * e) * sp;
        c.set(colors[k % colors.length]); this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
        this.life[i] = 0.8 + Math.random() * 0.9; this.g[i] = grav;
      }
    }
    update(dt) {
      for (let i = 0; i < this.n; i++) {
        if (this.life[i] <= 0) continue;
        this.life[i] -= dt;
        if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -999; continue; }
        this.vel[i * 3 + 1] -= this.g[i] * dt;
        this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
        const f = Math.min(1, this.life[i]); this.col[i * 3] *= 0.995 + 0.005 * f;
      }
      this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
    }
  }

  // ---------- بوابة سؤال (المرحلة الأولى) ----------
  const LANE_COLORS = ['#2f80ff', '#9b51e0', '#ff7a1a'];
  function buildGate(scene, track, s, opts, num) {
    const g = new T.Group(); scene.add(g);
    const yaw = track.yaw(s), P = track.pos(s, 0);
    const posts = [-1, 1].map(sd => { const m = M(new T.CylinderGeometry(0.28, 0.32, 6, 10), toon(0xffffff)); const p = track.pos(s, sd * (ROAD_W / 2 + 0.8), 3); m.position.copy(p); g.add(m); return m; });
    const beam = M(new T.BoxGeometry(ROAD_W + 2.4, 0.9, 0.5), toon(0x2b2f5a)); beam.position.copy(track.pos(s, 0, 6.2)); beam.rotation.y = yaw; g.add(beam);
    const ban = new T.Mesh(new T.PlaneGeometry(5.5, 1.3), new T.MeshBasicMaterial({ map: textTex(`سؤال جوي ${QB.AR(num)}`, { bg: '#ffcf33', color: '#2b2f5a', w: 512, h: 128, fs: 70 }), transparent: true }));
    ban.position.copy(track.pos(s, 0, 7.2)); ban.rotation.y = yaw; g.add(ban);
    const panels = opts.map((t, i) => {
      const tex = textTex(t, { bg: LANE_COLORS[i], fs: 74 });
      const m = new T.Mesh(new T.PlaneGeometry(3.0, 1.5), new T.MeshBasicMaterial({ map: tex, transparent: true, side: T.DoubleSide }));
      m.position.copy(track.pos(s, LANES[i], 3.9)); m.rotation.y = yaw; g.add(m);
      // مسار ملوّن على الأرض قبل البوابة
      const pad = new T.Mesh(new T.PlaneGeometry(2.6, 16), new T.MeshBasicMaterial({ color: LANE_COLORS[i], transparent: true, opacity: 0.45, depthWrite: false }));
      pad.rotation.order = 'YXZ'; pad.rotation.set(-Math.PI / 2, yaw, 0); pad.position.copy(track.pos(s - 8, LANES[i], 0.04)); g.add(pad);
      return { m, pad, base: m.position.clone() };
    });
    const q = M(new T.TorusKnotGeometry(0.35, 0.1, 48, 8), toon(0xffcf33, { emissive: 0x553300 }), 0.08); q.position.copy(track.pos(s, 0, 8.6)); g.add(q);
    return { g, s, panels, q, done: false };
  }

  // ---------- محطة تحدّي (المرحلة الثانية) ----------
  function buildStation(scene, track, s, num) {
    const g = new T.Group(); scene.add(g); const yaw = track.yaw(s);
    const base = track.pos(s, ROAD_W / 2 + 4.5);
    const plat = M(new T.CylinderGeometry(3.2, 3.4, 0.4, 20), toon(0xf1e3c4)); plat.position.copy(base).setY(0.2); g.add(plat);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; const p = M(new T.CylinderGeometry(0.15, 0.15, 3.4, 8), toon(0xffffff)); p.position.set(base.x + Math.cos(a) * 2.3, 2, base.z + Math.sin(a) * 2.3); g.add(p); }
    const roof = M(new T.ConeGeometry(3.6, 1.8, 4), toon(0x2f80ff)); roof.position.copy(base).setY(4.5); roof.rotation.y = Math.PI / 4 + yaw; g.add(roof);
    const orb = M(new T.IcosahedronGeometry(0.5, 1), toon(0xffcf33, { emissive: 0x664400 }), 0.07); orb.position.copy(base).setY(6); g.add(orb);
    const sign = new T.Mesh(new T.PlaneGeometry(4.2, 1.3), new T.MeshBasicMaterial({ map: textTex(`محطة التحدي ${QB.AR(num)}`, { bg: '#e8413c', w: 512, h: 160, fs: 64 }), transparent: true, side: T.DoubleSide }));
    sign.position.copy(track.pos(s + 1, 0, 6.4)); sign.rotation.y = yaw; g.add(sign);
    [-1, 1].forEach(sd => { const p = M(new T.CylinderGeometry(0.15, 0.18, 6.6, 8), toon(0xffffff)); p.position.copy(track.pos(s + 1, sd * (ROAD_W / 2 + 0.5), 3.3)); g.add(p); });
    // خط التوقف المربّع
    const chk = canvasTex(256, 32, (c, w, h) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#fff' : '#222'; c.fillRect(i * 16, j * 16, 16, 16); } });
    const line = new T.Mesh(new T.PlaneGeometry(ROAD_W, 1.2), new T.MeshBasicMaterial({ map: chk })); line.rotation.order = 'YXZ'; line.rotation.set(-Math.PI / 2, yaw, 0); line.position.copy(track.pos(s, 0, 0.05)); g.add(line);
    return { g, s, orb, done: false };
  }

  // ---------- العقبات (المرحلة الثالثة) ----------
  function buildObstacles(scene, track, list) {
    const g = new T.Group(); scene.add(g);
    const stripe = canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8413c'; for (let i = -2; i < 10; i++) { c.beginPath(); c.moveTo(i * 40, h); c.lineTo(i * 40 + 20, h); c.lineTo(i * 40 + 44, 0); c.lineTo(i * 40 + 24, 0); c.fill(); } });
    const bMat = toon(0xffffff, { map: stripe }), cone = toon(0xff7a1a), rock = toon(0x8f7f86), log = toon(0x9a6a43);
    list.forEach(o => {
      const yaw = track.yaw(o.s); let m;
      if (o.type === 'barrier') { m = new T.Group(); const b = M(new T.BoxGeometry(2.6, 0.7, 0.3), bMat); b.position.y = 0.95; m.add(b); [-1, 1].forEach(sd => { const l = M(new T.BoxGeometry(0.15, 1.2, 0.5), toon(0x333344)); l.position.set(sd * 1.1, 0.6, 0); m.add(l); }); o.r = 1.55; }
      else if (o.type === 'cones') { m = new T.Group(); [-0.8, 0, 0.8].forEach(x => { const c = M(new T.ConeGeometry(0.32, 0.9, 10), cone); c.position.set(x, 0.45, 0); m.add(c); const w = new T.Mesh(new T.CylinderGeometry(0.2, 0.25, 0.14, 10), toon(0xffffff)); w.position.set(x, 0.5, 0); m.add(w); }); o.r = 1.35; }
      else if (o.type === 'rock') { m = M(new T.DodecahedronGeometry(0.95, 0), rock); m.position.y = 0.6; m.rotation.set(Math.random(), Math.random(), 0); const gg = new T.Group(); gg.add(m); m = gg; o.r = 1.2; }
      else { m = new T.Group(); const l = M(new T.CylinderGeometry(0.35, 0.35, 2.8, 12), log); l.rotation.z = Math.PI / 2; l.position.y = 0.35; m.add(l); o.r = 1.6; }
      m.position.copy(track.pos(o.s, o.u)); m.rotation.y = yaw; g.add(m); o.mesh = m;
    });
    return g;
  }

  // ---------- قوس النهاية ----------
  function buildFinish(scene, track, s, label) {
    const g = new T.Group(); scene.add(g); const yaw = track.yaw(s);
    const gold = toon(0xffc93c, { emissive: 0x4a3000 });
    [-1, 1].forEach(sd => { const p = M(new T.CylinderGeometry(0.45, 0.55, 8, 12), gold); p.position.copy(track.pos(s, sd * (ROAD_W / 2 + 1), 4)); g.add(p); const b = M(new T.SphereGeometry(0.7, 12, 10), toon(0xe8413c)); b.position.copy(track.pos(s, sd * (ROAD_W / 2 + 1), 8.4)); g.add(b); });
    const arc = M(new T.TorusGeometry(ROAD_W / 2 + 1, 0.4, 10, 40, Math.PI), gold); arc.position.copy(track.pos(s, 0, 8)); arc.rotation.y = yaw; g.add(arc);
    const ban = new T.Mesh(new T.PlaneGeometry(9, 1.8), new T.MeshBasicMaterial({ map: textTex(label, { bg: '#7b2ff7', w: 1024, h: 200, fs: 110 }), transparent: true, side: T.DoubleSide }));
    ban.position.copy(track.pos(s, 0, 9.5)); ban.rotation.y = yaw; g.add(ban);
    const chk = canvasTex(256, 32, (c) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#fff' : '#222'; c.fillRect(i * 16, j * 16, 16, 16); } });
    const line = new T.Mesh(new T.PlaneGeometry(ROAD_W, 1.6), new T.MeshBasicMaterial({ map: chk })); line.rotation.order = 'YXZ'; line.rotation.set(-Math.PI / 2, yaw, 0); line.position.copy(track.pos(s, 0, 0.05)); g.add(line);
    return g;
  }

  // ---------- كأس البطل الذهبي ----------
  function buildTrophy() {
    const g = new T.Group();
    const gold = new T.MeshPhongMaterial({ color: 0xffc83a, emissive: 0x5a3a00, specular: 0xffffff, shininess: 120 });
    const prof = [[0, 0], [0.55, 0], [0.55, 0.12], [0.3, 0.2], [0.14, 0.32], [0.12, 0.7], [0.2, 0.8], [0.55, 1.0], [0.68, 1.5], [0.7, 1.75], [0.64, 1.78], [0.55, 1.5], [0.3, 1.2], [0, 1.15]].map(([x, y]) => new T.Vector2(x, y));
    const cup = M(new T.LatheGeometry(prof, 32), gold, 0.03); g.add(cup);
    [-1, 1].forEach(sd => { const h = M(new T.TorusGeometry(0.28, 0.06, 8, 20, Math.PI * 1.2), gold, 0.08); h.position.set(sd * 0.68, 1.35, 0); h.rotation.z = sd > 0 ? -Math.PI * 0.6 : Math.PI * 1.6; g.add(h); });
    const base = M(new T.BoxGeometry(0.9, 0.3, 0.9), toon(0x3a2a5a)); base.position.y = -0.15; g.add(base);
    const plate = new T.Mesh(new T.PlaneGeometry(0.7, 0.2), new T.MeshBasicMaterial({ map: textTex('البطل', { bg: '#ffc83a', color: '#3a2a5a', w: 256, h: 72, fs: 50 }), transparent: true })); plate.position.set(0, -0.15, 0.452); g.add(plate);
    const st = M(starGeo, gold, 0.06); st.position.y = 2.15; st.scale.setScalar(0.7); g.add(st); g.userData.star = st;
    return g;
  }

  window.World = { Track, buildStage, Stars, Particles, buildGate, buildStation, buildObstacles, buildFinish, buildTrophy, textTex, LANES, ROAD_W, LANE_COLORS, THEMES };
})();
