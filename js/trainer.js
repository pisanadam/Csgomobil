// Nişan Antrenmanı (Aim Trainer): Grid Shot, Flick, Tracking ve Hareketli Manken senaryoları
'use strict';
const Trainer = {
  SCEN: {
    grid: { name: 'Grid Shot', desc: 'Duvardaki 3 hedefi olabildiğince hızlı vur' },
    flick: { name: 'Flick', desc: 'Her yerde beliren tek hedefe hızlıca dön ve vur' },
    track: { name: 'Tracking', desc: 'Hareket eden hedefi sürekli ateş ederek takip et' },
    strafe: { name: 'Hareketli Manken', desc: 'Sağa sola kaçan mankeni vur, kafa vuruşu daha çok puan' },
  },
  SIZES: [0.2, 0.32, 0.5], SIZE_NAMES: ['Küçük', 'Orta', 'Büyük'], SPEEDS: [0.6, 1, 1.5], SPEED_NAMES: ['Yavaş', 'Normal', 'Hızlı'],
  targets: [], meshes: [], origin: null, dummy: null,
  score: 0, best: 0, hits: 0, shots: 0, kills: 0, heads: 0, missed: 0, reactions: [], spawned: 0,
  dirT: 0, dir: 1, reviveAt: 0, trk: null, ended: false, lastFlickYaw: 0,
  get scen() { return S.aimScenario || 'grid'; },
  get size() { return this.SIZES[S.aimSize === undefined ? 1 : S.aimSize]; },
  get speed() { return this.SPEEDS[S.aimSpeed === undefined ? 1 : S.aimSpeed]; },
  key() { return [this.scen, S.aimSize === undefined ? 1 : S.aimSize, S.aimTime || 60, S.aimSpeed === undefined ? 1 : S.aimSpeed].join('_'); },
  loadBest() { try { const d = JSON.parse(localStorage.getItem('taktikops_aimbest') || '{}'); return d[this.key()] || 0; } catch (e) { return 0; } },
  saveBest(v) { try { const d = JSON.parse(localStorage.getItem('taktikops_aimbest') || '{}'); d[this.key()] = v; localStorage.setItem('taktikops_aimbest', JSON.stringify(d)); } catch (e) {} },

  cleanup() {
    for (const t of this.targets) { G.scene.remove(t.mesh); t.mesh.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); }
    this.targets = []; this.dummy = null; this.ended = false;
  },
  // her raunt başında (hazırlık süresi) çağrılır
  roundSetup() {
    this.cleanup();
    const p = G.player, eye = p.eye();
    this.origin = { x: p.pos.x, z: p.pos.z, ey: eye.y, yaw: p.yaw };
    this.score = 0; this.hits = 0; this.shots = 0; this.kills = 0; this.heads = 0; this.missed = 0; this.reactions = []; this.spawned = 0;
    this.best = this.loadBest(); this.trk = null; this.reviveAt = 0; this.dirT = 0;
    const o = this.origin;
    this.fwd = { x: -Math.sin(o.yaw), z: -Math.cos(o.yaw) }; this.right = { x: Math.cos(o.yaw), z: -Math.sin(o.yaw) };
    if (this.scen === 'strafe') {
      const e = this.dummy = G.entities.find(x => !x.isPlayer);
      if (e) {
        e.resetForDeath(); e.armor = 0; e.helmet = false; e.hp = 100; e.alive = true; e.respawnAt = 0;
        e.bot.update = (dt, now) => this.dummyAI(dt, now);
        this.placeDummy(); Models.setCharGun(e.model, WEAPONS.ak47);
      }
    } else if (this.scen === 'grid') { for (let i = 0; i < 3; i++) this.spawnGrid(); }
    else if (this.scen === 'flick') this.spawnFlick();
    else if (this.scen === 'track') this.spawnTrack();
  },
  at(fwdD, lat, y) { const o = this.origin; return { x: o.x + this.fwd.x * fwdD + this.right.x * lat, y, z: o.z + this.fwd.z * fwdD + this.right.z * lat }; },
  makeTarget(pos, r, color) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), new THREE.MeshBasicMaterial({ color }));
    const ring = new THREE.Mesh(new THREE.SphereGeometry(1.1, 14, 10), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }));
    g.add(ring); g.add(m);
    g.position.set(pos.x, pos.y, pos.z); g.scale.setScalar(0.01);
    G.scene.add(g);
    const t = { mesh: g, pos: { x: pos.x, y: pos.y, z: pos.z }, r, born: G.now, color, vx: 0, vy: 0, tx: 0, ty: 0 };
    this.targets.push(t); this.spawned++; return t;
  },
  remove(t) { const i = this.targets.indexOf(t); if (i >= 0) this.targets.splice(i, 1); G.scene.remove(t.mesh); t.mesh.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); },
  // ---- senaryolar ----
  spawnGrid() {
    const xs = [-4.4, -2.2, 0, 2.2, 4.4], ys = [0.9, 1.8, 2.7];
    for (let k = 0; k < 40; k++) {
      const x = xs[Math.floor(Math.random() * xs.length)], y = ys[Math.floor(Math.random() * ys.length)];
      const pos = this.at(16, x, y);
      if (this.targets.some(t => Math.hypot(t.pos.x - pos.x, t.pos.z - pos.z, t.pos.y - pos.y) < 1.6)) continue;
      return this.makeTarget(pos, this.size, 0x2ee6ff);
    }
  },
  spawnFlick() {
    const o = this.origin; let yo, po;
    for (let k = 0; k < 20; k++) { yo = (Math.random() * 2 - 1) * 58; if (Math.abs(yo - this.lastFlickYaw) > 28) break; }
    this.lastFlickYaw = yo; po = -6 + Math.random() * 22;
    const d = dirFromAngles(o.yaw - yo * DEG, po * DEG), dist = 12 + Math.random() * 10;
    const pos = { x: o.x + d.x * dist, y: Math.max(0.45, o.ey + d.y * dist), z: o.z + d.z * dist };
    this.makeTarget(pos, this.size, 0xff5a3c);
  },
  spawnTrack() {
    const t = this.makeTarget(this.at(15, 0, 1.7), this.size * 1.35, 0xffd23a);
    t.vx = 0; t.vy = 0; t.tx = 3; t.ty = 0; this.trk = { change: 0 };
  },
  placeDummy() {
    const e = this.dummy; if (!e) return;
    const lat = (Math.random() * 2 - 1) * 5, p = this.at(20, lat, 0);
    e.pos.x = p.x; e.pos.y = 0; e.pos.z = p.z; e.vel.x = e.vel.y = e.vel.z = 0;
  },
  dummyAI(dt, now) {
    const e = this.dummy; if (!e || !e.alive) return;
    const inp = e.input; inp.fwd = 0; inp.side = 0; inp.walk = false; inp.crouch = false; inp.use = false; e.trig = false;
    const p = G.player;
    e.yaw = Math.atan2(-(p.pos.x - e.pos.x), -(p.pos.z - e.pos.z)); e.pitch = 0;
    const sp = this.speed;
    this.dirT -= dt;
    if (this.dirT <= 0) {
      const r = Math.random();
      if (r < 0.22) { this.dir = 0; this.dirT = 0.12 + Math.random() * 0.3; }            // karşı-strafe (durma anı)
      else { this.dir = Math.random() < 0.5 ? -1 : 1; this.dirT = (0.35 + Math.random() * 0.9) / sp; }
      if (sp > 1.2 && Math.random() < 0.08) inp.jump = true;
    }
    const lat = (e.pos.x - this.origin.x) * this.right.x + (e.pos.z - this.origin.z) * this.right.z;
    if (lat > 7 && this.dir > 0) this.dir = -1; if (lat < -7 && this.dir < 0) this.dir = 1;
    // dünya yönü -> yerel giriş
    const wx = this.right.x * this.dir, wz = this.right.z * this.dir;
    const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw), rx = Math.cos(e.yaw), rz = -Math.sin(e.yaw);
    inp.fwd = wx * fx + wz * fz; inp.side = wx * rx + wz * rz;
    if (sp < 0.8) inp.walk = true;
  },
  // ---- vuruş ----
  rayHit(o, d, maxT) {
    let best = null;
    for (const t of this.targets) {
      if (G.now - t.born < 0.08) continue;                             // yeni beliren hedef ~0.08 sn vurulamaz
      const tt = Phys.raySphere(o, d, t.pos, t.r, maxT);
      if (tt >= 0 && (!best || tt < best.t)) best = { target: t, t: tt, point: { x: o.x + d.x * tt, y: o.y + d.y * tt, z: o.z + d.z * tt } };
    }
    return best;
  },
  burst(p, color, n) {
    const c = [((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255];
    for (let i = 0; i < (n || 10); i++) FX.emit(p, { x: (Math.random() - 0.5) * 5, y: Math.random() * 4, z: (Math.random() - 0.5) * 5 }, c, 0.18, 0.5, 6, 1);
  },
  hit(h) {
    const t = h.target, dx = h.point.x - t.pos.x, dy = h.point.y - t.pos.y, dz = h.point.z - t.pos.z;
    const center = Math.hypot(dx, dy, dz) / t.r < 0.42;
    this.hits++;
    Audio3.hit(center); UI.hitmarker(center, false);
    if (this.scen === 'track') {
      this.score += 10; t.mesh.scale.setScalar(t.r * 1.12); this.burst(h.point, t.color, 2); return;
    }
    this.burst(t.pos, t.color, 12);
    if (this.scen === 'flick') {
      const ms = (G.now - t.born) * 1000; this.reactions.push(ms);
      this.score += 100 + Math.max(0, Math.round(220 - ms / 8)) + (center ? 25 : 0);
      this.remove(t); this.spawnFlick();
    } else {
      this.score += 100 + (center ? 25 : 0);
      this.remove(t); this.spawnGrid();
    }
  },
  onShot() { if (G.round.phase === 'live') this.shots++; },
  onDummyHit(head) { this.hits++; this.score += head ? 20 : 10; },
  onDummyKill(head) { this.kills++; this.score += 100 + (head ? 50 : 0); if (head) this.heads++; this.reviveAt = G.now + 0.8; },
  // ---- her kare ----
  update(dt) {
    if (this.ended) return;
    const p = G.player;
    // sınırsız mermi
    for (const s of ['primary', 'secondary']) { const w = p.inv[s]; if (w && w.def.mag) { if (w.reserve < w.def.reserve) w.reserve = w.def.reserve; } }
    for (const t of this.targets) {                                    // beliş animasyonu
      const age = G.now - t.born; const k = Math.min(1, age / 0.1);
      if (this.scen !== 'track' || age < 0.1) t.mesh.scale.setScalar(Math.max(0.01, t.r * k));
      else { const cur = t.mesh.scale.x; t.mesh.scale.setScalar(cur + (t.r - cur) * Math.min(1, dt * 14)); }
    }
    if (G.round.phase !== 'live') return;
    if (this.scen === 'flick') {
      const t = this.targets[0];
      if (t && G.now - t.born > 2.6) { this.missed++; this.remove(t); this.spawnFlick(); }
    } else if (this.scen === 'track') {
      const t = this.targets[0]; if (!t) return;
      const sp = this.speed, o = this.origin;
      this.trk.change -= dt;
      if (this.trk.change <= 0) {
        this.trk.change = 0.5 + Math.random() * 1.1;
        t.tx = (Math.random() * 2 - 1) * 5.5 * sp; t.ty = (Math.random() * 2 - 1) * 1.6 * sp;
      }
      t.vx += (t.tx - t.vx) * Math.min(1, dt * 3); t.vy += (t.ty - t.vy) * Math.min(1, dt * 3);
      t.pos.x += this.right.x * t.vx * dt; t.pos.z += this.right.z * t.vx * dt; t.pos.y += t.vy * dt;
      const lat = (t.pos.x - o.x) * this.right.x + (t.pos.z - o.z) * this.right.z;
      if (lat > 6.5) t.tx = -Math.abs(t.tx) - 1; if (lat < -6.5) t.tx = Math.abs(t.tx) + 1;
      if (t.pos.y > 2.9) t.ty = -Math.abs(t.ty) - 0.5; if (t.pos.y < 0.8) t.ty = Math.abs(t.ty) + 0.5;
      t.mesh.position.set(t.pos.x, t.pos.y, t.pos.z);
    } else if (this.scen === 'strafe') {
      const e = this.dummy;
      if (e && !e.alive) {
        e.respawnAt = 0;                                               // genel yeniden doğmayı engelle
        if (this.reviveAt && G.now >= this.reviveAt) {
          this.reviveAt = 0; e.alive = true; e.hp = 100; e.deathT = 0; e.crouch = 0; e.height = STAND_H; e.armor = 0; e.helmet = false;
          this.placeDummy(); Models.setCharGun(e.model, WEAPONS.ak47);
        }
      }
    }
  },
  acc() { return this.shots > 0 ? Math.min(100, Math.round(this.hits / this.shots * 100)) : 0; },
  hudText() {
    const a = this.acc(), s = this.scen;
    if (s === 'strafe') return `${this.SCEN[s].name} • Öldürme ${this.kills} • Kafa ${this.heads} • Doğruluk %${a}`;
    if (s === 'flick') { const m = this.reactions.length ? Math.round(this.reactions.reduce((x, y) => x + y, 0) / this.reactions.length) : 0; return `${this.SCEN[s].name} • Hedef ${this.reactions.length} • Ort. ${m || '-'} ms • Doğruluk %${a}`; }
    if (s === 'track') return `${this.SCEN[s].name} • İsabet ${this.hits} • Doğruluk %${a}`;
    return `${this.SCEN[s].name} • Hedef ${this.hits} • Doğruluk %${a}`;
  },
  finish() {
    if (this.ended) return; this.ended = true;
    const R = G.round; R.phase = 'end';
    const mins = Math.max(1 / 60, ((S.aimTime || 60)) / 60);
    const isBest = this.score > this.best && this.score > 0;
    if (isBest) this.saveBest(this.score);
    const rows = [['Puan', this.score], ['Rekor', Math.max(this.best, this.score)], ['Doğruluk', '%' + this.acc()], ['Atış / İsabet', `${this.shots} / ${this.hits}`]];
    if (this.scen === 'flick') { const rt = this.reactions; rows.push(['Vurulan hedef', rt.length], ['Ortalama tepki', rt.length ? Math.round(rt.reduce((a, b) => a + b, 0) / rt.length) + ' ms' : '-'], ['En hızlı', rt.length ? Math.round(Math.min(...rt)) + ' ms' : '-'], ['Kaçırılan hedef', this.missed]); }
    else if (this.scen === 'strafe') rows.push(['Öldürme', this.kills], ['Kafadan', this.kills ? Math.round(this.heads / this.kills * 100) + '%' : '-'], ['Dakikada öldürme', Math.round(this.kills / mins)]);
    else rows.push(['Hedef / dk', Math.round(this.hits / mins)]);
    const cfg = `${this.SCEN[this.scen].name} • ${S.aimTime || 60} sn • Boyut: ${this.SIZE_NAMES[S.aimSize === undefined ? 1 : S.aimSize]} • Hız: ${this.SPEED_NAMES[S.aimSpeed === undefined ? 1 : S.aimSpeed]}`;
    UI.aimEnd(rows, cfg, isBest);
    for (const t of this.targets) t.mesh.visible = false;
  },
};
