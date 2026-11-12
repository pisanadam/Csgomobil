// Görsel efektler: parçacıklar, mermi izleri, delikler, sis, ateş, patlama
'use strict';
const FX = (function () {
  let scene;
  // --- Parçacık sistemi (tek draw call) ---
  const MAXP = 600;
  let pGeo, pPos, pCol, pSize, pAlpha, points;
  const parts = [];
  function initParticles() {
    pGeo = new THREE.BufferGeometry();
    pPos = new Float32Array(MAXP * 3); pCol = new Float32Array(MAXP * 3); pSize = new Float32Array(MAXP); pAlpha = new Float32Array(MAXP);
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    pGeo.setAttribute('size', new THREE.BufferAttribute(pSize, 1));
    pGeo.setAttribute('alpha', new THREE.BufferAttribute(pAlpha, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { tex: { value: Tex.soft(0.25) }, scale: { value: 400 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA;
        uniform float scale;
        void main(){ vC=color; vA=alpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*scale/max(0.1,-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D tex; varying vec3 vC; varying float vA;
        void main(){ vec4 t=texture2D(tex,gl_PointCoord); gl_FragColor=vec4(vC,t.a*vA); if(gl_FragColor.a<0.01) discard; }`,
      transparent: true, depthWrite: false,
    });
    points = new THREE.Points(pGeo, m); points.frustumCulled = false; scene.add(points);
    for (let i = 0; i < MAXP; i++) pAlpha[i] = 0;
  }
  function emit(p, v, color, size, life, grav, drag) {
    if (parts.length >= MAXP) parts.shift();
    parts.push({ x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z, r: color[0], g: color[1], b: color[2], s: size, life, max: life, grav: grav || 0, drag: drag || 0 });
  }
  function updateParticles(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy -= p.grav * dt; const dr = Math.max(0, 1 - p.drag * dt);
      p.vx *= dr; p.vy *= dr; p.vz *= dr;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.02) { p.y = 0.02; p.vy = 0; p.vx *= 0.5; p.vz *= 0.5; }
    }
    for (let i = 0; i < MAXP; i++) {
      const p = parts[i];
      if (p) {
        pPos[i * 3] = p.x; pPos[i * 3 + 1] = p.y; pPos[i * 3 + 2] = p.z;
        pCol[i * 3] = p.r; pCol[i * 3 + 1] = p.g; pCol[i * 3 + 2] = p.b;
        const t = p.life / p.max; pSize[i] = p.s * (p.grow ? (2 - t) : 1); pAlpha[i] = Math.min(1, t * 2);
      } else pAlpha[i] = 0;
    }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
    pGeo.attributes.size.needsUpdate = true; pGeo.attributes.alpha.needsUpdate = true;
  }
  // --- Mermi delikleri ---
  const holes = []; let holeMat, holeGeo; const MAXH = 80;
  function hole(p, n) {
    let m;
    if (holes.length >= MAXH) m = holes.shift(); else { m = new THREE.Mesh(holeGeo, holeMat); scene.add(m); }
    m.position.set(p.x + n.x * 0.01, p.y + n.y * 0.01, p.z + n.z * 0.01);
    m.lookAt(p.x + n.x, p.y + n.y, p.z + n.z);
    m.rotation.z = Math.random() * 6;
    const s = 0.7 + Math.random() * 0.6; m.scale.set(s, s, s);
    holes.push(m);
  }
  // --- Mermi izi ---
  const tracers = []; let tracerMat;
  function tracer(a, b) {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a.x, a.y, a.z), new THREE.Vector3(b.x, b.y, b.z)]);
    const l = new THREE.Line(g, tracerMat.clone()); scene.add(l);
    tracers.push({ l, t: 0.06 });
  }
  // --- Namlu ışığı ---
  let flashLight, flashT = 0;
  const flashSprites = []; let muzzleTex;
  function muzzleFlash3P(pos) {
    flashLight.position.set(pos.x, pos.y, pos.z); flashLight.intensity = 2.2; flashT = 0.05;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: muzzleTex, color: 0xffe0a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set(pos.x, pos.y, pos.z); s.scale.set(0.5, 0.5, 0.5); s.material.rotation = Math.random() * 6;
    scene.add(s); flashSprites.push({ s, t: 0.05 });
  }
  // --- Sis & ateş & patlama ---
  const smokes = []; const fires = []; const blasts = [];
  let smokeTexs = [];
  function addSmoke(p) {
    const grp = new THREE.Group(); grp.position.set(p.x, 0, p.z); scene.add(grp);
    const sprites = [];
    for (let i = 0; i < 26; i++) {
      const m = new THREE.SpriteMaterial({ map: smokeTexs[i % smokeTexs.length], color: 0xb8b8b4, transparent: true, opacity: 0, depthWrite: false, fog: true });
      const s = new THREE.Sprite(m);
      const a = Math.random() * 6.28, r = Math.random() * 2.4, h = 0.6 + Math.random() * 2.6;
      s.userData = { tx: Math.cos(a) * r, ty: h, tz: Math.sin(a) * r, sz: 2.6 + Math.random() * 2.2, rot: (Math.random() - 0.5) * 0.2 };
      s.position.set(0, 0.3, 0); s.scale.set(0.5, 0.5, 0.5);
      grp.add(s); sprites.push(s);
    }
    const sm = { grp, sprites, t: 0, life: 18, pos: { x: p.x, y: 1.6, z: p.z }, radius: 0 };
    smokes.push(sm); return sm;
  }
  function addFire(p, team) {
    const grp = new THREE.Group(); grp.position.set(p.x, 0.05, p.z); scene.add(grp);
    const sprites = [];
    for (let i = 0; i < 22; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, color: 0xffa040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 2.8;
      s.position.set(Math.cos(a) * r, 0.3, Math.sin(a) * r); s.userData.ph = Math.random() * 6;
      grp.add(s); sprites.push(s);
    }
    const light = fireLights.find(l => !l.userData.busy) || { intensity: 0, position: new THREE.Vector3(), userData: {} };
    light.userData.busy = true; light.position.set(p.x, 1, p.z);
    const f = { grp, sprites, light, t: 0, life: 7, pos: { x: p.x, y: 0, z: p.z }, radius: 3, team };
    fires.push(f); return f;
  }
  let fireTex, blastTex; const fireLights = [];
  function explosion(p, big) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: blastTex, color: 0xffc070, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set(p.x, p.y + 0.5, p.z); scene.add(s);
    blasts.push({ s, t: 0, life: big ? 0.9 : 0.5, size: big ? 22 : 7 });
    flashLight.position.set(p.x, p.y + 1, p.z); flashLight.intensity = big ? 8 : 5; flashLight.distance = big ? 60 : 25; flashT = big ? 0.5 : 0.25;
    for (let i = 0; i < (big ? 120 : 50); i++) {
      const a = Math.random() * 6.28, u = Math.random(), sp = (big ? 14 : 8) * (0.4 + Math.random());
      emit(p, { x: Math.cos(a) * sp * (1 - u * 0.5), y: u * sp, z: Math.sin(a) * sp * (1 - u * 0.5) }, Math.random() < 0.5 ? [0.35, 0.3, 0.27] : [1, 0.6, 0.2], big ? 0.9 : 0.5, 0.6 + Math.random() * (big ? 1.5 : 0.8), 4, 1.5);
    }
  }
  function flashPop(p) {
    flashLight.position.set(p.x, p.y, p.z); flashLight.intensity = 6; flashLight.distance = 30; flashT = 0.12;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: blastTex, color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set(p.x, p.y, p.z); scene.add(s); blasts.push({ s, t: 0, life: 0.25, size: 5 });
  }
  function impact(p, n, kind) {
    const col = kind === 'crate' || kind === 'crate2' ? [0.55, 0.42, 0.25] : kind === 'ground' ? [0.65, 0.55, 0.4] : [0.75, 0.66, 0.5];
    for (let i = 0; i < 6; i++)
      emit(p, { x: n.x * 2 + (Math.random() - 0.5) * 2.5, y: n.y * 2 + Math.random() * 2, z: n.z * 2 + (Math.random() - 0.5) * 2.5 }, col, 0.12 + Math.random() * 0.1, 0.3 + Math.random() * 0.4, 6, 1);
    emit(p, { x: n.x * 0.6, y: 0.4, z: n.z * 0.6 }, col, 0.5, 0.8, 0, 1.5);
    emit(p, { x: 0, y: 0, z: 0 }, [1, 0.85, 0.5], 0.07, 0.06, 0, 0);
  }
  function blood(p, d, big) {
    for (let i = 0; i < (big ? 14 : 7); i++)
      emit(p, { x: d.x * 2.5 + (Math.random() - 0.5) * 2, y: (Math.random() - 0.2) * 2, z: d.z * 2.5 + (Math.random() - 0.5) * 2 }, [0.55, 0.03, 0.03], 0.1 + Math.random() * 0.12, 0.35 + Math.random() * 0.4, 8, 0.5);
    emit(p, { x: d.x, y: 0.2, z: d.z }, [0.45, 0.02, 0.02], big ? 0.6 : 0.35, 0.4, 0, 2);
  }
  function init(sc) {
    scene = sc;
    initParticles();
    holeMat = new THREE.MeshBasicMaterial({ map: Tex.bulletHole(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    holeGeo = new THREE.PlaneGeometry(0.09, 0.09);
    tracerMat = new THREE.LineBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: 0.55 });
    flashLight = new THREE.PointLight(0xffc060, 0, 12); scene.add(flashLight);
    for (let i = 0; i < 2; i++) { const l = new THREE.PointLight(0xff7a20, 0, 10); l.userData.busy = false; scene.add(l); fireLights.push(l); }
    muzzleTex = Tex.muzzle();
    smokeTexs = [Tex.smokePuff(1), Tex.smokePuff(2), Tex.smokePuff(3)];
    fireTex = Tex.soft(0.15, 'rgba(255,230,150,1)', 'rgba(255,80,0,0)');
    blastTex = Tex.soft(0.2, 'rgba(255,250,220,1)', 'rgba(255,120,20,0)');
  }
  function update(dt, camPos) {
    updateParticles(dt);
    for (let i = tracers.length - 1; i >= 0; i--) {
      const t = tracers[i]; t.t -= dt; t.l.material.opacity = Math.max(0, t.t / 0.06) * 0.55;
      if (t.t <= 0) { scene.remove(t.l); t.l.geometry.dispose(); t.l.material.dispose(); tracers.splice(i, 1); }
    }
    for (let i = flashSprites.length - 1; i >= 0; i--) {
      const f = flashSprites[i]; f.t -= dt;
      if (f.t <= 0) { scene.remove(f.s); f.s.material.dispose(); flashSprites.splice(i, 1); }
    }
    if (flashT > 0) { flashT -= dt; if (flashT <= 0) { flashLight.intensity = 0; flashLight.distance = 12; } }
    for (let i = smokes.length - 1; i >= 0; i--) {
      const s = smokes[i]; s.t += dt;
      const grow = Math.min(1, s.t / 2.0), fade = s.t > s.life - 3 ? Math.max(0, (s.life - s.t) / 3) : 1;
      s.radius = 3.0 * grow * (fade > 0.35 ? 1 : fade / 0.35);
      for (const sp of s.sprites) {
        const u = sp.userData;
        sp.position.set(u.tx * grow, 0.3 + (u.ty - 0.3) * grow, u.tz * grow);
        const sz = u.sz * (0.3 + 0.7 * grow); sp.scale.set(sz, sz, sz);
        sp.material.opacity = 0.92 * fade * Math.min(1, s.t * 2);
        sp.material.rotation += u.rot * dt;
      }
      if (s.t >= s.life) { scene.remove(s.grp); s.sprites.forEach(x => x.material.dispose()); smokes.splice(i, 1); }
    }
    for (let i = fires.length - 1; i >= 0; i--) {
      const f = fires[i]; f.t += dt;
      // sis söndürür
      for (const s of smokes) if (s.radius > 1 && Math.hypot(s.pos.x - f.pos.x, s.pos.z - f.pos.z) < s.radius + 2) f.t = Math.max(f.t, f.life - 0.3);
      const fade = f.t > f.life - 1 ? Math.max(0, f.life - f.t) : Math.min(1, f.t * 4);
      for (const sp of f.sprites) {
        sp.userData.ph += dt * (5 + Math.random() * 4);
        const h = 0.6 + Math.sin(sp.userData.ph) * 0.3;
        sp.scale.set(0.9 * fade, (1.0 + h) * fade, 1); sp.position.y = 0.4 + h * 0.3;
      }
      f.light.intensity = (1.5 + Math.random() * 0.8) * fade;
      if (Math.random() < dt * 6) emit({ x: f.pos.x + (Math.random() - 0.5) * 4, y: 0.5, z: f.pos.z + (Math.random() - 0.5) * 4 }, { x: 0, y: 1.5, z: 0 }, [0.15, 0.13, 0.12], 0.9, 1.6, -0.5, 0.5);
      if (f.t >= f.life) { f.light.intensity = 0; f.light.userData.busy = false; scene.remove(f.grp); f.sprites.forEach(x => x.material.dispose()); fires.splice(i, 1); }
    }
    for (let i = blasts.length - 1; i >= 0; i--) {
      const b = blasts[i]; b.t += dt; const k = b.t / b.life;
      const sz = b.size * (0.4 + k * 0.8); b.s.scale.set(sz, sz, sz); b.s.material.opacity = Math.max(0, 1 - k);
      if (k >= 1) { scene.remove(b.s); b.s.material.dispose(); blasts.splice(i, 1); }
    }
  }
  function clearAll() {
    for (const s of smokes) { scene.remove(s.grp); } smokes.length = 0;
    for (const f of fires) { scene.remove(f.grp); f.light.intensity = 0; f.light.userData.busy = false; } fires.length = 0;
    for (const h of holes) scene.remove(h); holes.length = 0;
    parts.length = 0;
  }
  // görüş sisle engelleniyor mu
  function smokeBlocks(a, b) {
    for (const s of smokes) if (s.radius > 0.8 && Phys.segSphere(a, b, s.pos, s.radius)) return true;
    return false;
  }
  return { init, update, emit, hole, tracer, muzzleFlash3P, addSmoke, addFire, explosion, flashPop, impact, blood, clearAll, smokeBlocks, smokes, fires, get muzzleTex() { return muzzleTex; } };
})();
