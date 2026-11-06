/* خريطة المملكة ثلاثية الأبعاد (Three.js) — جزر كرتونية لكل عالم وقلعة المملكة في النهاية */
(function () {
  'use strict';
  var T = window.THREE;
  var D = HK.data;
  var GAP = 9;
  var M = { supported: false };

  var SPREAD = 5.5;
  function islandPos(i) { return new T.Vector3(Math.sin(i * 1.25) * SPREAD, 0, -i * GAP); }

  function webglOk() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); }
    catch (e) { return false; }
  }

  var renderer, scene, camera, container, labelsEl, islands = [], castle, water, clock, raf = 0, running = false;
  var stoneGroup = null, camZ = 6, camZTarget = 6, opts = {}, toonMap, ray, ptr;
  var GREY = new T.Color('#9aa3ad');

  function toon(color) {
    var m = new T.MeshToonMaterial({ color: color, gradientMap: toonMap });
    m.userData.base = new T.Color(color);
    return m;
  }
  function mesh(geo, color, x, y, z) { var o = new T.Mesh(geo, toon(color)); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; return o; }

  function tree(g, x, z, s, c) {
    var t = new T.Group();
    t.add(mesh(new T.CylinderGeometry(.15 * s, .2 * s, .8 * s, 8), '#8d5524', 0, .4 * s, 0));
    t.add(mesh(new T.ConeGeometry(.7 * s, 1.4 * s, 10), c || '#2fa84f', 0, 1.3 * s, 0));
    t.add(mesh(new T.ConeGeometry(.55 * s, 1.1 * s, 10), c ? new T.Color(c).offsetHSL(0, 0, .08) : '#45c464', 0, 1.9 * s, 0));
    t.position.set(x, .8, z); g.add(t);
  }

  function decorate(g, theme) {
    var i;
    switch (theme) {
      case 'forest':
        tree(g, -1.6, -.6, 1.1); tree(g, 1.5, -1, 1.3); tree(g, .3, -1.9, .9); tree(g, 1.9, .9, .8);
        g.add(mesh(new T.SphereGeometry(.35, 12, 10), '#ff5d5d', -1.4, 1, 1.4)); // فطر
        g.add(mesh(new T.CylinderGeometry(.12, .14, .3, 8), '#fff', -1.4, .85, 1.4));
        break;
      case 'desert':
        g.add(mesh(new T.SphereGeometry(1.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#f2c062', .6, .8, -1));
        var cac = new T.Group();
        cac.add(mesh(new T.CapsuleGeometry ? new T.CapsuleGeometry(.25, 1.2, 4, 8) : new T.CylinderGeometry(.25, .25, 1.6, 8), '#3aa655', 0, .9, 0));
        cac.add(mesh(new T.CapsuleGeometry ? new T.CapsuleGeometry(.15, .5, 4, 8) : new T.CylinderGeometry(.15, .15, .7, 8), '#3aa655', .4, 1.1, 0));
        cac.position.set(-1.5, .8, .2); g.add(cac);
        g.add(mesh(new T.ConeGeometry(.9, 1.3, 4), '#e8b04a', -.6, 1.4, -1.8));
        break;
      case 'sea':
        var palm = new T.Group();
        palm.add(mesh(new T.CylinderGeometry(.15, .22, 2.2, 8), '#a0682c', 0, 1.1, 0));
        for (i = 0; i < 5; i++) { var leaf = mesh(new T.ConeGeometry(.25, 1.4, 6), '#2fbf71', 0, 2.2, 0); leaf.rotation.z = Math.PI / 2.4; leaf.rotation.y = i * 1.25; leaf.position.x = Math.cos(i * 1.25) * .5; leaf.position.z = -Math.sin(i * 1.25) * .5; palm.add(leaf); }
        palm.position.set(1.4, .8, -.8); g.add(palm);
        var lh = new T.Group();
        lh.add(mesh(new T.CylinderGeometry(.4, .6, 2.4, 12), '#ffffff', 0, 1.2, 0));
        lh.add(mesh(new T.CylinderGeometry(.42, .5, .5, 12), '#ff4d4d', 0, 1.6, 0));
        lh.add(mesh(new T.ConeGeometry(.55, .7, 12), '#ff4d4d', 0, 2.8, 0));
        lh.position.set(-1.3, .8, -1.2); g.add(lh);
        break;
      case 'snow':
        g.add(mesh(new T.ConeGeometry(1.5, 2.8, 8), '#cfe3f7', -.4, 2.2, -1.2));
        g.add(mesh(new T.ConeGeometry(.6, 1, 8), '#ffffff', -.4, 3.2, -1.2));
        g.add(mesh(new T.ConeGeometry(1, 1.8, 8), '#b9d4ef', 1.5, 1.7, -.6));
        var sm = new T.Group();
        sm.add(mesh(new T.SphereGeometry(.45, 14, 12), '#fff', 0, .45, 0)); sm.add(mesh(new T.SphereGeometry(.32, 14, 12), '#fff', 0, 1.05, 0));
        var nose = mesh(new T.ConeGeometry(.07, .3, 6), '#ff8c1a', 0, 1.05, .35); nose.rotation.x = Math.PI / 2; sm.add(nose);
        sm.position.set(-1.6, .8, 1); g.add(sm);
        break;
      case 'candy':
        ['#ff5d8f', '#ffd23f', '#4cc9f0'].forEach(function (c, k) {
          var lp = new T.Group();
          lp.add(mesh(new T.CylinderGeometry(.06, .06, 1.6, 6), '#fff', 0, .8, 0));
          lp.add(mesh(new T.SphereGeometry(.5, 16, 12), c, 0, 1.7, 0));
          lp.position.set(-1.5 + k * 1.5, .8, -1 + (k % 2) * .6); g.add(lp);
        });
        g.add(mesh(new T.TorusGeometry(.4, .18, 10, 20), '#9b5de5', 1.6, 1.1, 1));
        break;
      case 'space':
        g.add(mesh(new T.SphereGeometry(.8, 18, 14), '#ffe066', -1, 2.4, -1.2));
        var ring = mesh(new T.TorusGeometry(1.2, .08, 8, 40), '#ff9de2', 1.2, 2, -.6); ring.rotation.x = 1.2; g.add(ring);
        g.add(mesh(new T.SphereGeometry(.45, 14, 12), '#7b61ff', 1.2, 2, -.6));
        for (i = 0; i < 4; i++) g.add(mesh(new T.OctahedronGeometry(.18), '#fff6a5', Math.cos(i * 1.6) * 2, 1.4 + i * .3, Math.sin(i * 1.6) * 1.6));
        break;
      case 'rainbow':
        ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'].forEach(function (c, k) {
          var r = mesh(new T.TorusGeometry(2.2 - k * .22, .11, 8, 30, Math.PI), c, 0, .8, -1.4); g.add(r);
        });
        g.add(mesh(new T.CylinderGeometry(.5, .5, 1.6, 10), '#ffd6e8', 0, 1.6, .2));
        g.add(mesh(new T.ConeGeometry(.65, .9, 10), '#ff5d8f', 0, 2.8, .2));
        break;
    }
  }

  function makeIsland(i, w) {
    var g = new T.Group();
    var top = mesh(new T.CylinderGeometry(3.2, 3.4, .5, 28), w.c1, 0, .55, 0);
    var body = mesh(new T.CylinderGeometry(3.4, 2.2, 1.8, 28), '#a86b3c', 0, -.6, 0);
    var rim = mesh(new T.TorusGeometry(3.3, .14, 8, 40), new T.Color(w.c1).offsetHSL(0, 0, -.12), 0, .55, 0); rim.rotation.x = Math.PI / 2;
    g.add(body); g.add(top); g.add(rim);
    decorate(g, w.theme);
    // قاعدة رقم العالم
    var ped = mesh(new T.CylinderGeometry(.9, 1, .3, 20), '#fff4d6', 1.7, .95, 1.6); g.add(ped);
    // سحابة الإغلاق
    var cloud = new T.Group();
    [[0, 0, 0, 1.4], [1.2, -.2, .3, 1.1], [-1.2, -.1, .2, 1.1], [.5, .5, -.3, 1], [-.6, .4, .4, .9]].forEach(function (p) {
      var s = new T.Mesh(new T.SphereGeometry(p[3], 16, 12), new T.MeshToonMaterial({ color: '#ffffff', gradientMap: toonMap, transparent: true, opacity: .92 }));
      s.position.set(p[0], p[1], p[2]); cloud.add(s);
    });
    cloud.position.y = 2.4; cloud.scale.set(1.5, 1.2, 1.5); g.add(cloud);
    g.userData = { idx: i, cloud: cloud, phase: i * .7 };
    g.position.copy(islandPos(i));
    g.traverse(function (o) { if (o.isMesh) o.userData.island = i; });
    return g;
  }

  function makeCastle() {
    var g = new T.Group();
    g.add(mesh(new T.CylinderGeometry(4.2, 3, 2, 30), '#a86b3c', 0, -.6, 0));
    g.add(mesh(new T.CylinderGeometry(4, 4.2, .5, 30), '#7ee081', 0, .6, 0));
    g.add(mesh(new T.BoxGeometry(3.6, 2.4, 2.4), '#f4e1c1', 0, 2, -.4));
    [[-1.9, -1.5], [1.9, -1.5], [-1.9, .8], [1.9, .8]].forEach(function (p) {
      g.add(mesh(new T.CylinderGeometry(.6, .65, 3.4, 14), '#f7e8cf', p[0], 2.5, p[1]));
      g.add(mesh(new T.ConeGeometry(.85, 1.4, 14), '#7a5cff', p[0], 4.9, p[1]));
    });
    g.add(mesh(new T.CylinderGeometry(.8, .85, 4.6, 16), '#fff2dc', 0, 3.3, -.6));
    g.add(mesh(new T.ConeGeometry(1.1, 1.8, 16), '#ff5d8f', 0, 6.5, -.6));
    var flag = mesh(new T.BoxGeometry(.9, .5, .05), '#ffd23f', .45, 7.6, -.6); g.add(flag);
    g.add(mesh(new T.CylinderGeometry(.04, .04, 1.2, 6), '#fff', 0, 7.5, -.6));
    var door = mesh(new T.CylinderGeometry(.6, .6, .1, 20, 1, false, 0, Math.PI), '#8d5524', 0, 1.3, .82); door.rotation.x = Math.PI / 2; door.rotation.z = Math.PI / 2; g.add(door);
    var glow = new T.PointLight('#ffd23f', 0, 18); glow.position.set(0, 5, 2); g.add(glow);
    g.userData = { idx: 7, glow: glow, flag: flag };
    g.position.copy(islandPos(7)); g.position.x = 0;
    g.traverse(function (o) { if (o.isMesh) o.userData.island = 7; });
    return g;
  }

  function stones() {
    var g = new T.Group();
    for (var i = 0; i < 7; i++) {
      var a = islandPos(i), b = i === 6 ? new T.Vector3(0, 0, -7 * GAP) : islandPos(i + 1);
      for (var k = 1; k <= 4; k++) {
        var t = k / 5, p = a.clone().lerp(b, t);
        p.x += Math.sin(t * Math.PI) * (i % 2 ? 1.2 : -1.2);
        var s = mesh(new T.CylinderGeometry(.55, .65, .3, 14), '#ffe7b3', p.x, .05, p.z);
        g.add(s);
      }
    }
    return g;
  }

  function mount(el, o) {
    opts = o || {};
    if (!T || !webglOk()) { M.supported = false; return false; }
    try {
      container = el;
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = false;
      el.appendChild(renderer.domElement);
      renderer.domElement.className = 'map-canvas';
      labelsEl = document.createElement('div'); labelsEl.className = 'map-labels'; el.appendChild(labelsEl);

      var tm = new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
      toonMap = new T.DataTexture(tm, 3, 1, T.RGBAFormat); toonMap.minFilter = toonMap.magFilter = T.NearestFilter; toonMap.needsUpdate = true;

      scene = new T.Scene();
      scene.fog = new T.Fog('#bfe6ff', 34, 75);
      camera = new T.PerspectiveCamera(50, 1, .1, 200);
      scene.add(new T.HemisphereLight('#ffffff', '#7fb0ff', .9));
      var sun = new T.DirectionalLight('#fff6e0', 1.1); sun.position.set(6, 14, 8); scene.add(sun);

      var wg = new T.PlaneGeometry(120, 160, 60, 80);
      water = new T.Mesh(wg, new T.MeshToonMaterial({ color: '#3fb4f0', gradientMap: toonMap }));
      water.rotation.x = -Math.PI / 2; water.position.set(0, -.9, -30); scene.add(water);
      water.userData.base = wg.attributes.position.array.slice();

      D.WORLDS.forEach(function (w, i) { var isl = makeIsland(i, w); islands.push(isl); scene.add(isl); });
      castle = makeCastle(); scene.add(castle);
      stoneGroup = stones(); scene.add(stoneGroup);

      // الملصقات
      for (var i = 0; i <= 7; i++) {
        var b = document.createElement('button'); b.className = 'map-label'; b.dataset.idx = i;
        b.addEventListener('click', onLabel);
        labelsEl.appendChild(b);
      }
      var heroEl = document.createElement('div'); heroEl.className = 'map-hero'; labelsEl.appendChild(heroEl);

      ray = new T.Raycaster(); ptr = new T.Vector2();
      bindControls(el);
      window.addEventListener('resize', resize);
      clock = new T.Clock();
      M.supported = true;
      resize();
      return true;
    } catch (e) {
      console.warn('3D map failed', e);
      M.supported = false; return false;
    }
  }

  function onLabel(e) { var i = +e.currentTarget.dataset.idx; if (opts.onSelect) opts.onSelect(i); }

  function bindControls(el) {
    var dragging = false, startY = 0, startZ = 0, moved = 0;
    el.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.map-label')) return;
      dragging = true; startY = e.clientY; startZ = camZTarget; moved = 0;
    });
    window.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dy = e.clientY - startY; moved = Math.max(moved, Math.abs(dy));
      camZTarget = clampZ(startZ + dy * 0.06);
    });
    window.addEventListener('pointerup', function (e) {
      if (!dragging) return; dragging = false;
      if (moved < 8 && e.target === renderer.domElement) pickAt(e);
    });
    el.addEventListener('wheel', function (e) { e.preventDefault(); camZTarget = clampZ(camZTarget - e.deltaY * 0.02); }, { passive: false });
  }
  function clampZ(z) { return Math.max(-7 * GAP + 4, Math.min(4, z)); }

  function pickAt(e) {
    var r = renderer.domElement.getBoundingClientRect();
    ptr.x = (e.clientX - r.left) / r.width * 2 - 1; ptr.y = -(e.clientY - r.top) / r.height * 2 + 1;
    ray.setFromCamera(ptr, camera);
    var hits = ray.intersectObjects(islands.concat([castle]), true);
    if (hits.length && hits[0].object.userData.island != null && opts.onSelect) opts.onSelect(hits[0].object.userData.island);
  }

  function resize() {
    if (!renderer || !container) return;
    var w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    var sp = w < h ? 2.6 : 5.5;
    if (sp !== SPREAD) {
      SPREAD = sp;
      islands.forEach(function (g, i) { g.position.x = islandPos(i).x; });
      if (stoneGroup) { scene.remove(stoneGroup); stoneGroup = stones(); scene.add(stoneGroup); }
    }
    camera.fov = w < h ? 58 : 45; camera.updateProjectionMatrix();
  }

  function setStatus(i, st) {
    var g = i === 7 ? castle : islands[i];
    var locked = st === 'locked';
    g.traverse(function (o) {
      if (o.isMesh && o.material.userData.base) {
        o.material.color.copy(o.material.userData.base);
        if (locked) o.material.color.lerp(GREY, .55);
      }
    });
    if (g.userData.cloud) g.userData.cloud.visible = locked;
    if (g.userData.glow) g.userData.glow.intensity = st === 'restored' ? 2.2 : 0;
    g.userData.status = st;
  }

  function update(statuses, labelsHtml, heroHtml, current) {
    if (!M.supported) return;
    statuses.forEach(function (s, i) { setStatus(i, s); });
    var ls = labelsEl.querySelectorAll('.map-label');
    labelsHtml.forEach(function (h, i) { ls[i].innerHTML = h; ls[i].className = 'map-label st-' + statuses[i]; });
    labelsEl.querySelector('.map-hero').innerHTML = heroHtml || '';
    M.current = current;
  }

  function focus(i, instant) {
    var z = (i === 7 ? -7 * GAP : islandPos(i).z) + 4;
    camZTarget = clampZ(z); if (instant) camZ = camZTarget;
  }

  var v = T ? new T.Vector3() : null;
  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    var t = clock.getElapsedTime(), dt = Math.min(clock.getDelta(), .05);
    camZ += (camZTarget - camZ) * .08;
    var portrait = camera.aspect < 1;
    camera.position.set(0, portrait ? 20 : 14, camZ + (portrait ? 10 : 13));
    camera.lookAt(0, 0, camZ - (portrait ? 6 : 7));
    // أمواج
    var p = water.geometry.attributes.position, base = water.userData.base;
    for (var k = 0; k < p.count; k++) {
      var x = base[k * 3], y = base[k * 3 + 1];
      p.array[k * 3 + 2] = Math.sin(x * .35 + t * 1.4) * .18 + Math.cos(y * .3 + t) * .18;
    }
    p.needsUpdate = true;
    islands.forEach(function (g, i) {
      var st = g.userData.status;
      g.position.y = st === 'locked' ? 0 : Math.sin(t * 1.3 + g.userData.phase) * .18;
      if (g.userData.cloud) g.userData.cloud.rotation.y = t * .2;
      if (st === 'open') g.rotation.y = Math.sin(t * .6 + i) * .08;
    });
    if (castle.userData.flag) castle.userData.flag.rotation.y = Math.sin(t * 3) * .4;
    if (castle.userData.status === 'restored') castle.rotation.y = Math.sin(t * .4) * .12;
    renderer.render(scene, camera);
    placeLabels();
  }

  function placeLabels() {
    var w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    var ls = labelsEl.querySelectorAll('.map-label');
    for (var i = 0; i <= 7; i++) {
      var g = i === 7 ? castle : islands[i];
      v.copy(g.position); v.y += i === 7 ? 4.2 : 3.4; v.project(camera);
      var el = ls[i];
      if (v.z > 1 || v.y < -1.3 || v.y > 1.6) { el.style.visibility = 'hidden'; continue; }
      el.style.visibility = 'visible';
      var sx = Math.max(60, Math.min(w - 60, (v.x * .5 + .5) * w)), sy = Math.max(190, (-v.y * .5 + .5) * h);
      el.style.transform = 'translate(' + sx + 'px,' + sy + 'px) translate(-50%,-100%)';
      el.style.zIndex = String(100 - i);
    }
    var hero = labelsEl.querySelector('.map-hero');
    var cur = M.current != null ? M.current : 0;
    var cg = cur === 7 ? castle : islands[cur];
    v.copy(cg.position); v.x += cur === 7 ? 3 : 1.7; v.y += 1; v.z += cur === 7 ? 2.5 : 1.6; v.project(camera);
    hero.style.visibility = v.z > 1 ? 'hidden' : 'visible';
    hero.style.transform = 'translate(' + ((v.x * .5 + .5) * w) + 'px,' + ((-v.y * .5 + .5) * h) + 'px) translate(-50%,-90%)';
  }

  function start() { if (!M.supported || running) return; running = true; resize(); clock.getDelta(); frame(); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  M.mount = mount; M.update = update; M.focus = focus; M.start = start; M.stop = stop; M.resize = resize;
  HK.map3d = M;
})();
