/* الشخصية الأنيمي ثلاثية الأبعاد والدراجة: تظليل كرتوني، حدود، تعابير وجه، حركة دوّاسات واقعية */
(function () {
  const T = THREE;
  const grad = new T.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, T.RedFormat);
  grad.minFilter = grad.magFilter = T.NearestFilter; grad.needsUpdate = true;
  const toon = (color, extra = {}) => new T.MeshToonMaterial(Object.assign({ color, gradientMap: grad }, extra));
  const OUT = new T.MeshBasicMaterial({ color: 0x1b1430, side: T.BackSide });

  function outline(mesh, k = 0.06) {
    const o = new T.Mesh(mesh.geometry, OUT); o.scale.setScalar(1 + k); o.raycast = () => {}; mesh.add(o); return mesh;
  }
  function M(geo, mat, k) { const m = new T.Mesh(geo, mat); m.castShadow = true; if (k !== 0) outline(m, k == null ? 0.06 : k); return m; }

  // أسطوانة موجهة بين نقطتين (للأطراف وأنابيب الإطار)
  const UP = new T.Vector3(0, 1, 0), tmpV = new T.Vector3();
  function placeBetween(mesh, a, b) {
    tmpV.subVectors(b, a); const len = tmpV.length();
    mesh.position.copy(a).addScaledVector(tmpV, 0.5);
    mesh.quaternion.setFromUnitVectors(UP, tmpV.normalize());
    mesh.scale.set(1, len, 1);
  }
  function tube(a, b, r, mat, k) { const m = M(new T.CylinderGeometry(r, r, 1, 10), mat, k); placeBetween(m, a, b); return m; }
  const V3 = (x, y, z) => new T.Vector3(x, y, z);

  // ---------- رسم الوجه (أعين أنيمي كبيرة) ----------
  function faceTexture(expr, P) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = P.skin; g.fillRect(0, 0, 1024, 512);
    const cx = 768, ey = 262;
    // خدود
    g.fillStyle = 'rgba(255,120,140,.45)';
    [[-62, 300], [62, 300]].forEach(([dx, y]) => { g.beginPath(); g.ellipse(cx + dx, y, 20, 9, 0, 0, Math.PI * 2); g.fill(); });
    g.strokeStyle = '#2a1830'; g.lineCap = 'round'; g.lineJoin = 'round';
    const eye = (dx, side) => {
      const x = cx + dx;
      if (expr === 'happy') { // عيون مغمضة مبتسمة ^ ^
        g.lineWidth = 7; g.beginPath(); g.arc(x, ey + 10, 20, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); return;
      }
      const h = expr === 'surprised' ? 46 : 42, w = 28;
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, ey, w, h, 0, 0, Math.PI * 2); g.fill();
      const ir = expr === 'surprised' ? 15 : 22, iy = ey + 5;
      const gr = g.createLinearGradient(0, iy - ir, 0, iy + ir); gr.addColorStop(0, P.eyeDark); gr.addColorStop(1, P.eye);
      g.fillStyle = gr; g.beginPath(); g.ellipse(x + side * 2, iy, ir * 0.85, ir * 1.25, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#120a1e'; g.beginPath(); g.ellipse(x + side * 2, iy + 2, ir * 0.4, ir * 0.6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x + side * 2 - 7, iy - 10, 7, 9, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(x + side * 2 + 6, iy + 9, 3.5, 0, Math.PI * 2); g.fill();
      // رموش علوية سميكة
      g.lineWidth = 7; g.beginPath(); g.ellipse(x, ey + 2, w + 3, h + 1, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
      g.lineWidth = 5; g.beginPath(); g.moveTo(x + side * (w + 1), ey - h * 0.55); g.lineTo(x + side * (w + 10), ey - h * 0.8); g.stroke();
      if (expr === 'sad') { g.fillStyle = 'rgba(120,190,255,.9)'; g.beginPath(); g.ellipse(x - side * 4, ey + h + 10, 5, 8, 0, 0, Math.PI * 2); g.fill(); }
    };
    eye(-48, -1); eye(48, 1);
    // حواجب
    g.lineWidth = 7; g.strokeStyle = P.brow;
    const brow = (dx, side) => {
      const x = cx + dx; let a = 0, y = ey - 52;
      if (expr === 'sad') a = side * 0.35; if (expr === 'determined') a = -side * 0.35; if (expr === 'surprised') y -= 10;
      g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(-20, 3); g.quadraticCurveTo(0, -6, 20, 3); g.stroke(); g.restore();
    };
    brow(-48, -1); brow(48, 1);
    // فم
    g.lineWidth = 6; g.strokeStyle = '#4a1a2a'; const my = 330;
    if (expr === 'happy' || expr === 'determined') {
      g.fillStyle = '#7a2036'; g.beginPath(); g.moveTo(cx - 24, my - 4); g.quadraticCurveTo(cx, my + 34, cx + 24, my - 4); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ff7f96'; g.beginPath(); g.ellipse(cx, my + 12, 10, 5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.fillRect(cx - 16, my - 3, 32, 6);
    } else if (expr === 'sad') { g.beginPath(); g.moveTo(cx - 16, my + 10); g.quadraticCurveTo(cx, my - 4, cx + 16, my + 10); g.stroke(); }
    else if (expr === 'surprised') { g.fillStyle = '#7a2036'; g.beginPath(); g.ellipse(cx, my + 6, 10, 14, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
    else { g.beginPath(); g.moveTo(cx - 14, my + 2); g.quadraticCurveTo(cx, my + 14, cx + 14, my + 2); g.stroke(); }
    // أنف صغير
    g.strokeStyle = 'rgba(160,80,70,.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 2, 300); g.lineTo(cx + 3, 304); g.stroke();
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
  }

  const PALETTES = {
    boy: { skin: '#ffd9bf', hair: 0x2a3a8f, hair2: 0x4058c8, eye: '#3fa0ff', eyeDark: '#123a7a', brow: '#1b2560', top: 0xff5a3c, top2: 0xffffff, pants: 0x2b3550, scarf: 0xffd23f, bike: 0x16c2b6, helmet: null },
    girl: { skin: '#ffe0cc', hair: 0xd6457a, hair2: 0xff7aa8, eye: '#c25bff', eyeDark: '#4a1477', brow: '#7a1f45', top: 0x6a5cff, top2: 0xffffff, pants: 0x30284f, scarf: 0x38e0a0, bike: 0xff8a1f, helmet: null }
  };

  function buildHero(kind = 'boy') {
    const P = PALETTES[kind];
    const root = new T.Group();   // يُوضع على الطريق ويتجه نحو -z
    const lean = new T.Group(); root.add(lean); // للميلان في المنعطفات
    const hop = new T.Group(); lean.add(hop);   // للقفزات

    // ---------- الدراجة ----------
    const frameMat = toon(P.bike), dark = toon(0x262a36), metal = toon(0xd8dde6), tireMat = toon(0x1e1e24);
    const R = 0.36, rearZ = 0.55, frontZ = -0.58;
    function wheel() {
      const w = new T.Group();
      const tire = M(new T.TorusGeometry(R, 0.045, 10, 36), tireMat, 0.04); w.add(tire);
      const rim = new T.Mesh(new T.TorusGeometry(R - 0.05, 0.015, 6, 36), metal); w.add(rim);
      for (let i = 0; i < 8; i++) { const s = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, R * 2 - 0.1, 4), metal); s.rotation.z = i * Math.PI / 8; w.add(s); }
      const hub = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.1, 10), dark); hub.rotation.x = Math.PI / 2; w.add(hub);
      const disc = new T.Mesh(new T.CircleGeometry(R - 0.06, 24), new T.MeshBasicMaterial({ color: P.bike, transparent: true, opacity: 0.18, side: T.DoubleSide })); w.add(disc);
      const holder = new T.Group(); w.rotation.y = Math.PI / 2; holder.add(w); return { holder, spin: w };
    }
    const bike = new T.Group(); hop.add(bike);
    const rw = wheel(); rw.holder.position.set(0, R, rearZ); bike.add(rw.holder);
    const BB = V3(0, 0.32, 0.04), ST = V3(0, 0.98, 0.26), HT = V3(0, 0.98, -0.42), HB = V3(0, 0.74, -0.47), RH = V3(0, R, rearZ);
    bike.add(tube(BB, ST, 0.03, frameMat), tube(ST, HT, 0.028, frameMat), tube(BB, HB, 0.034, frameMat), tube(RH, BB, 0.02, frameMat), tube(RH, ST.clone().add(V3(0, -0.06, 0.02)), 0.018, frameMat), tube(HB, HT, 0.036, frameMat));
    const seat = M(new T.BoxGeometry(0.14, 0.05, 0.26), dark); seat.position.set(0, 1.02, 0.3); bike.add(seat);
    // جزء أمامي قابل للتوجيه
    const steer = new T.Group(); steer.position.copy(HB); bike.add(steer);
    const fw = wheel(); fw.holder.position.set(0, R - HB.y, frontZ - HB.z); steer.add(fw.holder);
    steer.add(tube(V3(0.05, 0, 0), V3(0.05, R - HB.y, frontZ - HB.z), 0.016, metal), tube(V3(-0.05, 0, 0), V3(-0.05, R - HB.y, frontZ - HB.z), 0.016, metal));
    steer.add(tube(V3(0, 0.24, 0.02), V3(0, 0.36, 0.08), 0.022, dark));
    const bar = tube(V3(-0.3, 0.36, 0.1), V3(0.3, 0.36, 0.1), 0.02, dark); steer.add(bar);
    [-1, 1].forEach(s => { const gr = M(new T.CylinderGeometry(0.028, 0.028, 0.1, 8), toon(0xff3b6b)); gr.rotation.z = Math.PI / 2; gr.position.set(s * 0.27, 0.36, 0.1); steer.add(gr); });
    const lamp = M(new T.SphereGeometry(0.05, 10, 8), toon(0xfff2a0, { emissive: 0x665500 })); lamp.position.set(0, 0.22, -0.06); steer.add(lamp);
    const basket = M(new T.BoxGeometry(0.3, 0.16, 0.2), toon(0xc9884a)); basket.position.set(0, 0.26, -0.2); steer.add(basket);
    // مجموعة الدوّاسات
    const crank = new T.Group(); crank.position.copy(BB); bike.add(crank);
    const ring = M(new T.TorusGeometry(0.1, 0.012, 6, 24), metal, 0.03); ring.rotation.y = Math.PI / 2; ring.position.x = 0.06; crank.add(ring);
    const armL = M(new T.BoxGeometry(0.02, 0.17, 0.03), metal, 0.03), armR = armL.clone();
    armL.position.set(-0.08, -0.085, 0); armR.position.set(0.08, 0.085, 0); crank.add(armL, armR);

    // ---------- الشخصية ----------
    const skinM = toon(new T.Color(P.skin)), topM = toon(P.top), top2M = toon(P.top2), pantsM = toon(P.pants), hairM = toon(P.hair), hair2M = toon(P.hair2), shoeM = toon(0xffffff), soleM = toon(0xff3b6b), scarfM = toon(P.scarf);
    const body = new T.Group(); hop.add(body);
    const HIP = V3(0, 1.08, 0.24);
    const pelvis = M(new T.SphereGeometry(0.15, 14, 10), pantsM); pelvis.scale.set(1.15, 0.8, 1); pelvis.position.copy(HIP); body.add(pelvis);
    const torso = new T.Group(); torso.position.copy(HIP); torso.rotation.x = -0.55; body.add(torso);
    const chest = M(new T.CapsuleGeometry(0.17, 0.26, 6, 14), topM); chest.position.y = 0.28; chest.scale.set(1.1, 1, 0.85); torso.add(chest);
    const stripe = M(new T.CylinderGeometry(0.188, 0.188, 0.06, 16), top2M, 0); stripe.position.y = 0.2; stripe.scale.set(1.1, 1, 0.86); torso.add(stripe);
    const numTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.fillStyle = '#222'; g.font = '900 80px Cairo, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('٥', 64, 70); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; })();
    const bib = new T.Mesh(new T.CircleGeometry(0.09, 20), new T.MeshBasicMaterial({ map: numTex, transparent: true })); bib.position.set(0, 0.3, 0.165); torso.add(bib); // على الظهر
    // وشاح متطاير
    const scarf = M(new T.TorusGeometry(0.13, 0.045, 8, 18), scarfM); scarf.rotation.x = Math.PI / 2; scarf.position.y = 0.55; torso.add(scarf);
    const tail = []; let prev = torso; const tailRoot = new T.Group(); tailRoot.position.set(0.05, 0.55, 0.13); torso.add(tailRoot); prev = tailRoot;
    for (let i = 0; i < 5; i++) { const seg = new T.Group(); seg.position.z = i ? 0.12 : 0; const m = M(new T.BoxGeometry(0.09, 0.02, 0.13), scarfM, 0.08); m.position.z = 0.06; seg.add(m); prev.add(seg); tail.push(seg); prev = seg; }

    // الرأس
    const neck = new T.Group(); neck.position.y = 0.58; torso.add(neck);
    const headG = new T.Group(); headG.rotation.x = 0.5; neck.add(headG); // يعوّض ميلان الجذع
    const faces = { normal: faceTexture('normal', P), happy: faceTexture('happy', P), sad: faceTexture('sad', P), surprised: faceTexture('surprised', P), determined: faceTexture('determined', P) };
    const headMat = toon(0xffffff, { map: faces.normal });
    const head = M(new T.SphereGeometry(0.27, 32, 24), headMat, 0.04); head.position.y = 0.24; head.scale.set(1, 1.02, 0.98); headG.add(head);
    [-1, 1].forEach(s => { const e = M(new T.SphereGeometry(0.06, 10, 8), skinM, 0.08); e.position.set(s * 0.26, 0.22, 0.02); e.scale.set(0.5, 1, 0.8); headG.add(e); });
    // شعر أنيمي مدبّب
    const hair = new T.Group(); hair.position.y = 0.24; headG.add(hair);
    const cap = M(new T.SphereGeometry(0.29, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0.04); cap.rotation.x = 0.3; cap.position.z = 0.02; hair.add(cap);
    const spike = (x, y, z, rx, rz, len, r, mat = hairM) => { const s = M(new T.ConeGeometry(r, len, 6), mat, 0.07); s.position.set(x, y, z); s.rotation.set(rx, 0, rz); hair.add(s); return s; };
    // خصلات خلفية وعلوية
    for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 2.2; spike(Math.sin(a) * 0.18, 0.12 + Math.cos(a) * 0.05, 0.16, 1.9, -a * 0.6, 0.34, 0.09, i % 2 ? hairM : hair2M); }
    for (let i = 0; i < 5; i++) { const a = (i / 4 - 0.5) * 1.8; spike(Math.sin(a) * 0.15, 0.26, 0.02, 0.9, -a * 0.7, 0.3, 0.1); }
    // غرّة أمامية
    for (let i = 0; i < 5; i++) { const x = (i - 2) * 0.085; spike(x, 0.1, -0.22, -2.6 + Math.abs(x) * 0.6, -x * 1.8, 0.2, 0.06, i % 2 ? hair2M : hairM); }
    // ذيول الشعر للبنت
    const tails = [];
    if (kind === 'girl') {
      [-1, 1].forEach(s => { const g = new T.Group(); g.position.set(s * 0.25, 0.12, 0.1); const m = M(new T.CapsuleGeometry(0.07, 0.3, 4, 10), hair2M); m.position.y = -0.2; g.add(m); const b = M(new T.SphereGeometry(0.05, 8, 6), toon(0xffd23f)); g.add(b); hair.add(g); tails.push(g); });
    } else {
      // عصابة رأس
      const band = M(new T.TorusGeometry(0.275, 0.025, 6, 30), toon(0xff3b6b), 0.04); band.rotation.x = Math.PI / 2 - 0.45; band.position.set(0, 0.13, 0.03); hair.add(band);
    }

    // الأذرع (كتف ← كوع ← يد على المقود)
    const arms = [-1, 1].map(s => {
      const sh = M(new T.SphereGeometry(0.075, 10, 8), topM); body.add(sh);
      const up = M(new T.CylinderGeometry(0.055, 0.05, 1, 10), topM); body.add(up);
      const lo = M(new T.CylinderGeometry(0.048, 0.04, 1, 10), skinM); body.add(lo);
      const hand = M(new T.SphereGeometry(0.055, 10, 8), skinM); body.add(hand);
      const cuff = M(new T.TorusGeometry(0.05, 0.015, 6, 12), top2M, 0); body.add(cuff);
      return { s, sh, up, lo, hand, cuff, raise: 0 };
    });
    // الأرجل
    const legs = [-1, 1].map(s => {
      const th = M(new T.CylinderGeometry(0.075, 0.065, 1, 10), pantsM); body.add(th);
      const sn = M(new T.CylinderGeometry(0.058, 0.045, 1, 10), skinM); body.add(sn);
      const knee = M(new T.SphereGeometry(0.066, 10, 8), pantsM, 0.04); body.add(knee);
      const shoe = new T.Group(); body.add(shoe);
      const sm = M(new T.CapsuleGeometry(0.06, 0.1, 4, 8), shoeM); sm.rotation.x = Math.PI / 2; sm.position.set(0, 0.02, -0.03); shoe.add(sm);
      const so = M(new T.BoxGeometry(0.1, 0.03, 0.2), soleM, 0); so.position.set(0, -0.03, -0.03); shoe.add(so);
      const sock = M(new T.CylinderGeometry(0.048, 0.05, 0.06, 10), top2M, 0); body.add(sock);
      return { s, th, sn, knee, shoe, sock };
    });

    // ظل دائري ناعم أسفل الدراجة
    const blob = new T.Mesh(new T.CircleGeometry(0.9, 24), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; blob.scale.set(0.45, 1.3, 1); root.add(blob);

    // ---------- التحريك ----------
    const st = { crankA: 0, wheelA: 0, t: 0, expr: 'normal', exprT: 0, cheer: 0, shake: 0, hopV: 0, hopY: 0, celebrate: false, stopped: false, lean: 0, steer: 0 };
    const hipW = new T.Vector3(), tmpA = new T.Vector3(), tmpB = new T.Vector3(), tmpK = new T.Vector3();
    const L1 = 0.47, L2 = 0.47;

    function setExpr(e, dur = 0) { st.expr = e; st.exprT = dur; headMat.map = faces[e]; headMat.needsUpdate = true; }

    function update(dt, speed, steerIn) {
      st.t += dt;
      const pedal = st.celebrate ? 0 : speed;
      st.crankA += pedal * dt * 1.15; st.wheelA += speed * dt / R;
      rw.spin.rotation.z = -st.wheelA; fw.spin.rotation.z = -st.wheelA;
      crank.rotation.x = -st.crankA;
      st.steer += (steerIn - st.steer) * Math.min(1, dt * 6);
      steer.rotation.y = -st.steer * 0.35;
      st.lean += (-st.steer * Math.min(1, speed / 10) * 0.32 - st.lean) * Math.min(1, dt * 5);
      lean.rotation.z = st.lean;
      // قفزة
      if (st.hopY > 0 || st.hopV > 0) { st.hopV -= 14 * dt; st.hopY = Math.max(0, st.hopY + st.hopV * dt); if (st.hopY === 0) st.hopV = 0; }
      hop.position.y = st.hopY;
      // اهتزاز الجسم مع التبديل
      const bob = Math.sin(st.crankA * 2) * 0.012 * Math.min(1, speed / 6);
      body.position.y = bob; body.rotation.z = Math.sin(st.crankA) * 0.025 * Math.min(1, speed / 6);
      torso.rotation.x = -0.55 - Math.min(0.15, speed * 0.006) + (st.celebrate ? 0.45 : 0);
      // رأس ينظر نحو الاتجاه + هز الرأس عند الخطأ
      st.shake = Math.max(0, st.shake - dt);
      neck.rotation.y = -st.steer * 0.35 + (st.shake > 0 ? Math.sin(st.t * 30) * 0.3 * st.shake : 0);
      neck.rotation.z = Math.sin(st.t * 2) * 0.03;
      // الوشاح يرفرف
      tail.forEach((s, i) => { s.rotation.x = 0.25 + Math.sin(st.t * 12 - i * 0.9) * (0.12 + speed * 0.012); s.rotation.y = Math.sin(st.t * 7 - i) * 0.12 + st.steer * 0.2; });
      tails.forEach((g, i) => { g.rotation.x = 0.6 + Math.sin(st.t * 9 + i) * 0.15 + speed * 0.02; g.rotation.z = (i ? 1 : -1) * 0.2; });
      // تعبير مؤقت
      if (st.exprT > 0) { st.exprT -= dt; if (st.exprT <= 0) setExpr(st.celebrate ? 'happy' : 'normal'); }
      st.cheer = Math.max(0, st.cheer - dt);

      body.updateMatrixWorld(true);
      // الأرجل: حل حركي عكسي لعظمتين في المستوى الجانبي
      legs.forEach((L, i) => {
        const ang = -st.crankA + (i ? Math.PI : 0);
        const fy = BB.y + Math.cos(ang) * 0.17, fz = BB.z - Math.sin(ang) * 0.17;
        const x = L.s * 0.12;
        let footY = fy, footZ = fz;
        if (st.celebrate) { footY = 0.08; footZ = 0.05; }
        footY -= body.position.y;
        const hy = HIP.y, hz = HIP.z;
        const dy = footY - hy, dz = footZ - hz, d = Math.hypot(dy, dz);
        const dc = Math.min(d, L1 + L2 - 0.005);
        const base = Math.atan2(dy, dz);
        const off = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + dc * dc - L2 * L2) / (2 * L1 * dc))));
        // نختار حل الركبة الأمامي (الأصغر في z)
        const k1z = hz + Math.cos(base + off) * L1, k2z = hz + Math.cos(base - off) * L1;
        const ka = k1z < k2z ? base + off : base - off;
        const ky = hy + Math.sin(ka) * L1, kz = hz + Math.cos(ka) * L1;
        tmpA.set(x, hy, hz); tmpK.set(x, ky, kz); tmpB.set(x, footY, footZ);
        if (d > dc) tmpB.set(x, hy + Math.sin(base) * dc, hz + Math.cos(base) * dc);
        placeBetween(L.th, tmpA, tmpK); placeBetween(L.sn, tmpK, tmpB);
        L.knee.position.copy(tmpK); L.shoe.position.copy(tmpB); L.sock.position.copy(tmpB).add(V3(0, 0.05, 0.01));
      });
      // الأذرع: الكتف من الجذع واليد على المقود (أو مرفوعة للاحتفال)
      arms.forEach(A => {
        tmpA.set(A.s * 0.21, 0.5, 0.02); torso.localToWorld(tmpA); body.worldToLocal(tmpA);
        let hand;
        const raise = st.celebrate || (st.cheer > 0 && A.s > 0);
        if (st.celebrate) hand = V3(A.s * 0.22, 2.13 + Math.sin(st.t * 4) * 0.03, 0.16);
        else if (raise) hand = V3(A.s * 0.32, tmpA.y + 0.5 + Math.sin(st.t * 10) * 0.04, tmpA.z - 0.05);
        else { hand = V3(A.s * 0.27, 0.36, 0.1).applyEuler(steer.rotation).add(HB); hand.y += 0.02; }
        const mid = tmpA.clone().lerp(hand, 0.5); mid.x += A.s * 0.1; mid.y += raise ? 0 : 0.06; mid.z += raise ? 0.05 : 0.06;
        A.sh.position.copy(tmpA); placeBetween(A.up, tmpA, mid); placeBetween(A.lo, mid, hand);
        A.hand.position.copy(hand); A.cuff.position.copy(mid.clone().lerp(hand, 0.85)); A.cuff.quaternion.copy(A.lo.quaternion); A.cuff.rotateX(Math.PI / 2);
      });
    }

    root.traverse(o => { if (o.isMesh && o.material !== OUT) o.castShadow = true; });
    return {
      root, update, setExpr, palette: P,
      cheer() { st.cheer = 1.2; setExpr('happy', 1.6); st.hopV = 3.2; st.hopY = 0.001; },
      oops() { st.shake = 0.8; setExpr('sad', 1.8); },
      surprise() { setExpr('surprised', 1); },
      determined(d = 1.5) { setExpr('determined', d); },
      hop(v = 3.5) { if (st.hopY === 0) { st.hopV = v; st.hopY = 0.001; } },
      celebrate(on) { st.celebrate = on; setExpr(on ? 'happy' : 'normal'); },
      handPos(s = 1) { return arms[s > 0 ? 1 : 0].hand; },
      body
    };
  }

  window.Hero = { buildHero, toon, outline, M, tube, grad, OUT, PALETTES };
})();
