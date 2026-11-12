// Ana oyun: sahne, raunt akışı, ekonomi, mermi/bomba mantığı, kamera
'use strict';
const G = {
  entities: [], player: null, bots: [], now: 0, running: false, paused: false,
  round: { num: 0, phase: 'freeze', timer: 0, timeLeft: 115, buyLeft: 0, plan: 'A' },
  score: [0, 0], sideOfGroup: ['CT', 'T'], lossStreak: { T: 0, CT: 0 },
  bomb: { state: 'none', carrier: null, pos: { x: 0, y: 0, z: 0 }, timer: 40, defuser: null, beepT: 0, site: null },
  nades: [], pickups: [], know: { T: new Map(), CT: new Map() },
  spec: null, lookScale: 1, assist: null, fps: 60,
  FREEZE: 6, ROUND_TIME: 115, BUY_TIME: 20, BOMB_TIME: 40, END_TIME: 5,
};

// ================= KURULUM =================
G.init = function () {
  const q = S.graphics;
  const r = this.renderer = new THREE.WebGLRenderer({ antialias: q >= 1, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, [0.75, 1.25, 2][q]));
  r.setSize(window.innerWidth, window.innerHeight);
  r.outputEncoding = THREE.sRGBEncoding;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = S.shadows && q >= 1;
  r.shadowMap.type = q >= 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  r.autoClear = false;
  document.getElementById('game').appendChild(r.domElement);
  const sc = this.scene = new THREE.Scene();
  sc.fog = new THREE.Fog(0xd8c8a6, 70, 260);
  sc.background = new THREE.Color(0x9cc3ea);
  this.camera = new THREE.PerspectiveCamera(S.fov, window.innerWidth / window.innerHeight, 0.05, 900);
  this.camera.rotation.order = 'YXZ';
  // ışıklar
  sc.add(new THREE.HemisphereLight(0xcfe2ff, 0x8a6a45, 0.62));
  const sun = this.sun = new THREE.DirectionalLight(0xfff0d0, 1.25);
  sun.position.set(45, 90, 25); sun.target.position.set(0, 0, 0);
  sun.castShadow = r.shadowMap.enabled;
  const ss = q >= 2 ? 2048 : 1024;
  sun.shadow.mapSize.set(ss, ss);
  const cam = sun.shadow.camera; cam.left = -75; cam.right = 75; cam.top = 70; cam.bottom = -70; cam.near = 10; cam.far = 220;
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
  sc.add(sun); sc.add(sun.target);
  sc.add(new THREE.AmbientLight(0xffffff, 0.08));
  MAP.build(sc, q);
  FX.init(sc);
  // birinci şahıs sahnesi
  this.vmScene = new THREE.Scene();
  this.vmCamera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.01, 10);
  this.vmScene.add(new THREE.HemisphereLight(0xdde8ff, 0x5a4a35, 0.5));
  const vl = new THREE.DirectionalLight(0xfff0d8, 0.65); vl.position.set(1, 2, 1.5); this.vmScene.add(vl);
  this.vm = { root: new THREE.Group(), gun: null, arms: null, flash: null, kick: 0, bob: 0, swayX: 0, swayY: 0, team: null };
  this.vmScene.add(this.vm.root);
  const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: FX.muzzleTex, color: 0xffe0a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  fl.visible = false; fl.scale.set(0.22, 0.22, 0.22); this.vm.flash = fl;
  // bomba modeli (yerde)
  this.bombMesh = Models.gun(WEAPONS.c4); this.bombMesh.scale.set(1.6, 1.6, 1.6); this.bombMesh.visible = false;
  this.bombMesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
  sc.add(this.bombMesh);
  this.bombLight = new THREE.PointLight(0xff2020, 0, 4); sc.add(this.bombLight);
  window.addEventListener('resize', () => this.resize());
  this.resize();
};
G.resize = function () {
  const w = window.innerWidth, h = window.innerHeight;
  this.renderer.setSize(w, h);
  this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  this.vmCamera.aspect = w / h; this.vmCamera.updateProjectionMatrix();
};
G.applyGraphics = function () {
  const q = S.graphics, r = this.renderer;
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, [0.75, 1.25, 2][q]));
  this.resize();
};

// ================= MAÇ =================
G.startMatch = function () {
  // temizle
  for (const e of this.entities) if (e.model) this.scene.remove(e.model.root);
  for (const p of this.pickups) this.scene.remove(p.mesh);
  this.entities = []; this.bots = []; this.pickups = []; this.nades.forEach(n => this.scene.remove(n.mesh)); this.nades = [];
  let pt = S.playerTeam; if (pt === 'auto') pt = Math.random() < 0.5 ? 'T' : 'CT';
  this.sideOfGroup = [pt, pt === 'T' ? 'CT' : 'T'];
  this.score = [0, 0]; this.lossStreak = { T: 0, CT: 0 };
  this.dm = S.mode === 'dm';
  this.FREEZE = this.dm ? 3 : 6; this.ROUND_TIME = this.dm ? S.dmTime : 115;
  const names = BOT_NAMES.slice().sort(() => Math.random() - 0.5);
  const n = Math.max(1, Math.min(5, S.teamSize));
  const pl = this.player = new Entity('Sen', pt, true); pl.group = 0;
  this.entities.push(pl);
  for (let g = 0; g < 2; g++) {
    const cnt = g === 0 ? n - 1 : n;
    for (let i = 0; i < cnt; i++) {
      const e = new Entity(names.pop() || ('Bot' + i), this.sideOfGroup[g], false);
      e.group = g; new Bot(e); this.entities.push(e); this.bots.push(e.bot);
    }
  }
  for (const e of this.entities) this.makeModel(e);
  this.round.num = 0;
  this.running = true; this.paused = false;
  this.matchOver = false;
  UI.onMatchStart();
  this.startRound();
};
G.makeModel = function (e) {
  if (e.model) this.scene.remove(e.model.root);
  e.model = Models.character(e.team);
  e.model.root.rotation.order = 'YXZ';
  this.scene.add(e.model.root);
  Models.setCharGun(e.model, e.def);
  e.model.root.visible = !e.isPlayer;
};
G.teamOf = g => G.sideOfGroup[g];
G.halfRounds = () => Math.floor(S.maxRounds / 2);

G.startRound = function () {
  const R = this.round;
  R.num++;
  R.phase = 'freeze'; R.timer = this.FREEZE; R.timeLeft = this.ROUND_TIME; R.buyLeft = this.FREEZE + this.BUY_TIME;
  R.plan = Math.random() < 0.5 ? 'A' : 'B';
  R.endReason = null; R.winner = null;
  FX.clearAll();
  for (const p of this.pickups) this.scene.remove(p.mesh); this.pickups = [];
  for (const nd of this.nades) this.scene.remove(nd.mesh); this.nades = [];
  this.know.T.clear(); this.know.CT.clear();
  const pistolRound = R.num === 1 || R.num === this.halfRounds() + 1;
  // doğma noktaları
  const spT = MAP.POS.spawnT.slice().sort(() => Math.random() - 0.5);
  const spC = MAP.POS.spawnCT.slice().sort(() => Math.random() - 0.5);
  let iT = 0, iC = 0;
  for (const e of this.entities) {
    const sp = e.team === 'T' ? spT[iT++ % spT.length] : spC[iC++ % spC.length];
    e.pos.x = sp.x + (Math.random() - 0.5); e.pos.y = 0; e.pos.z = sp.z + (Math.random() - 0.5);
    e.vel.x = e.vel.y = e.vel.z = 0;
    e.yaw = e.team === 'T' ? 0 : Math.PI; e.pitch = 0;
    e.alive = true; e.hp = 100; e.deathT = 0; e.flashT = 0; e.crouch = 0; e.height = STAND_H;
    e.plantT = 0; e.defuseT = 0; e.recoilIdx = 0; e.fireInacc = 0; e.punch.x = e.punch.y = 0; e.scoped = 0; e.reloadT = 0;
    e.dmgBy.clear(); e.inv.bomb = false; e.trig = false;
    if (!e.inv.secondary) e.giveWeapon(e.team === 'T' ? 'glock' : 'usp');
    // eldeki silahların şarjörleri dolsun (CS: kalan cephane korunur, bu sürümde dolduruyoruz)
    for (const s of ['primary', 'secondary']) { const w = e.inv[s]; if (w) { w.mag = w.def.mag; w.reserve = w.def.reserve; } }
    if (e.model) { e.model.root.rotation.set(0, e.yaw, 0); e.model.root.visible = !e.isPlayer; }
    e.slot = e.bestSlot(); e.deployT = 0; e.onEquip();
  }
  if (this.dm) {
    this.bomb = { state: 'none', carrier: null, pos: { x: 0, y: -100, z: 0 }, timer: 0, defuser: null, beepT: 0, site: null };
    this.bombMesh.visible = false; this.bombLight.intensity = 0;
    for (const e of this.entities) { this.dmLoadout(e); e.respawnAt = 0; e.protectUntil = this.now + this.FREEZE + 1.5; }
    for (const b of this.bots) b.roundStart({});
    this.spec = null;
    UI.onRoundStart(R.num, false);
    Audio3.roundStart();
    return;
  }
  // bomba
  const Ts = this.entities.filter(e => e.team === 'T');
  const carrier = Ts[Math.floor(Math.random() * Ts.length)];
  this.bomb = { state: 'carried', carrier, pos: { x: 0, y: 0, z: 0 }, timer: this.BOMB_TIME, defuser: null, beepT: 0, site: null };
  carrier.inv.bomb = true;
  this.bombMesh.visible = false; this.bombLight.intensity = 0;
  // takım ekonomisi & bot satın alma
  const avg = t => { const a = this.entities.filter(e => e.team === t); return a.reduce((s, e) => s + e.money, 0) / a.length; };
  const avgT = avg('T'), avgC = avg('CT');
  for (const b of this.bots) botBuy(b.e, pistolRound, b.e.team === 'T' ? avgT : avgC);
  for (const b of this.bots) { b.e.slot = b.e.bestSlot(); b.e.onEquip(); }
  // roller
  this.assignRoles();
  this.spec = null;
  UI.onRoundStart(R.num, pistolRound);
  Audio3.roundStart();
};
G.assignRoles = function () {
  const P = MAP.POS, plan = this.round.plan;
  const Tbots = this.bots.filter(b => b.e.team === 'T');
  const base = this.now + this.FREEZE + 8 + Math.random() * 22;
  Tbots.forEach((b, i) => {
    // çoğunluk planlanan siteye, bazıları ayrı rotadan
    const stage = i === 0 && Tbots.length > 2 ? pick(P.tStage.mid) : pick(P.tStage[plan]);
    b.roundStart({ stage, executeAt: base + (i % 2) * 2 + Math.random() * 3 });
  });
  const CTbots = this.bots.filter(b => b.e.team === 'CT');
  const order = ['A', 'B', 'A', 'B', 'mid'];
  const used = { A: 0, B: 0, mid: 0 };
  CTbots.forEach((b, i) => {
    const site = order[i % order.length];
    const holds = P.ctHold[site];
    const hold = holds[used[site]++ % holds.length];
    b.roundStart({ site: site === 'mid' ? (Math.random() < 0.5 ? 'A' : 'B') : site, hold, rotate: site === 'mid' || i >= 3 || Math.random() < 0.5 });
  });
};

// ================= ANA DÖNGÜ =================
G.update = function (dt) {
  if (!this.running || this.paused) return;
  this.now += dt;
  const now = this.now, R = this.round;
  // raunt zamanlayıcıları
  if (R.phase === 'freeze') {
    R.timer -= dt; R.buyLeft -= dt;
    if (R.timer <= 0) { R.phase = 'live'; UI.message('', 0); }
  } else if (R.phase === 'live' || R.phase === 'planted') {
    R.buyLeft -= dt;
    if (R.phase === 'live') R.timeLeft -= dt;
  } else if (R.phase === 'end') {
    R.timer -= dt;
    if (R.timer <= 0) { this.nextRound(); return; }
  }
  const frozen = R.phase === 'freeze';
  // botlar
  for (const b of this.bots) b.update(dt, now);
  // varlıklar
  for (const e of this.entities) {
    if (!e.alive) { this.animateDeath(e, dt); if (this.dm && e.respawnAt && now >= e.respawnAt && R.phase !== 'end') this.respawn(e); continue; }
    if (frozen) { e.input.fwd = e.input.side = 0; e.input.jump = false; }
    e.updateMovement(dt);
    if (!frozen || e.def.type !== 'grenade') e.updateWeapon(dt, now);
    this.updatePlantDefuse(e, dt);
    this.updateModel(e, dt);
  }
  this.updatePlayerAssist(dt);
  this.updateNades(dt);
  this.updateBomb(dt);
  this.updatePickups();
  this.updateFireDamage(dt);
  if (R.phase === 'live' || R.phase === 'planted') this.checkWin();
  // izleyici
  if (!this.player.alive) {
    if (!this.spec || !this.spec.alive) {
      this.spec = this.entities.find(e => e.alive && e.team === this.player.team) || this.entities.find(e => e.alive) || null;
    }
  }
};
G.nextRound = function () {
  const half = this.halfRounds();
  const played = this.round.num;
  const need = half + 1;
  if (this.dm) { this.running = false; this.matchOver = true; UI.matchEnd(this.score[0], this.score[1]); return; }
  if (this.score[0] >= need || this.score[1] >= need || played >= S.maxRounds) {
    this.running = false; this.matchOver = true;
    UI.matchEnd(this.score[0], this.score[1]);
    return;
  }
  if (played === half) {
    // devre arası: taraf değiştir
    this.sideOfGroup = [this.sideOfGroup[1], this.sideOfGroup[0]];
    for (const e of this.entities) {
      e.team = this.sideOfGroup[e.group];
      e.money = ECON.start; e.resetForDeath();
      this.makeModel(e);
    }
    this.lossStreak = { T: 0, CT: 0 };
    UI.toast('DEVRE ARASI — Taraflar değişti', 3);
    if (this.player.team) this.vm.team = null;
  }
  this.startRound();
};

// ================= MODEL & ANİMASYON =================
G.updateModel = function (e, dt) {
  const m = e.model; if (!m) return;
  const root = m.root;
  root.position.set(e.pos.x, e.pos.y, e.pos.z);
  root.rotation.y = e.yaw; root.rotation.x = 0;
  const p = m.parts;
  const sp = e.hspeed();
  const frac = Math.min(1, sp / 5);
  e.animPh += dt * (4 + sp * 1.3) * (frac > 0.05 ? 1 : 0);
  const c = e.crouch;
  const sw = Math.sin(e.animPh) * 0.6 * frac;
  p.legL.position.y = 0.88 - 0.42 * c; p.legR.position.y = 0.88 - 0.42 * c;
  p.legL.rotation.x = 1.1 * c + sw; p.legR.rotation.x = 1.1 * c - sw;
  p.legL.userData.knee.rotation.x = -2.0 * c - Math.max(0, -Math.sin(e.animPh)) * 0.8 * frac;
  p.legR.userData.knee.rotation.x = -2.0 * c - Math.max(0, Math.sin(e.animPh)) * 0.8 * frac;
  p.upper.position.y = 0.92 - 0.42 * c + Math.abs(Math.cos(e.animPh)) * 0.03 * frac;
  p.upper.rotation.x = e.pitch * 0.7 + 0.12 * c;
  p.head.rotation.x = e.pitch * 0.3;
  // silah geri tepmesi
  const kick = Math.max(0, 0.08 - (this.now - e.lastShot)) * 2;
  p.gun.position.z = -0.38 + kick * 0.4;
  // planting/defusing pozu
  if (e.plantT > 0 || e.defuseT > 0) { p.upper.rotation.x = -0.6; }
};
G.animateDeath = function (e, dt) {
  if (!e.model) return;
  e.deathT += dt;
  const root = e.model.root;
  const k = Math.min(1, e.deathT / 0.45);
  root.rotation.x = -k * k * Math.PI / 2 * (e.deathDir || 1);
  root.position.y = e.pos.y + Math.sin(k * Math.PI) * 0.15;
};

// ================= ATEŞ & HASAR =================
const HIT_MULT = { head: 4, chest: 1, stomach: 1.25, legs: 0.75 };
G.hitTestEntity = function (e, o, d, maxT) {
  const h = e.height, x = e.pos.x, y = e.pos.y, z = e.pos.z;
  let best = null;
  const th = Phys.raySphere(o, d, { x, y: y + h - 0.12, z }, 0.15, maxT);
  if (th >= 0) best = { t: th, group: 'head' };
  const tests = [
    ['chest', y + h - 0.62, y + h - 0.25, 0.25],
    ['stomach', y + h - 0.9, y + h - 0.62, 0.22],
    ['legs', y, y + h - 0.9, 0.2],
  ];
  for (const [g, y0, y1, r] of tests) {
    const hit = Phys.rayAABB(o.x, o.y, o.z, d.x, d.y, d.z, { x: x - r, y: y0, z: z - r }, { x: x + r, y: y1, z: z + r }, best ? best.t : maxT);
    if (hit && (!best || hit.t < best.t)) best = { t: hit.t, group: g };
  }
  return best;
};
G.fireBullet = function (sh, o, d, def, first) {
  const range = 250;
  const hits = Phys.raycastAll(o, d, range);
  // delme: tahta kasalardan geçebilir
  let endT = range, dmgScale = 1, pens = 0, endHit = null;
  const canPen = (def.pen || 0) >= 0.7 && def.type !== 'shotgun';
  const penWalls = [];
  for (const h of hits) {
    if (h.box && h.box.pen && canPen && pens < 1) { pens++; penWalls.push(h); continue; }
    endT = h.t; endHit = h; break;
  }
  // varlık isabeti
  let victim = null, vh = null;
  for (const e of this.entities) {
    if (e === sh || !e.alive) continue;
    if (e.team === sh.team && !S.friendlyFire) continue;
    const r = this.hitTestEntity(e, o, d, endT);
    if (r && (!vh || r.t < vh.t)) { vh = r; victim = e; }
  }
  // delmeden önce mi sonra mı
  if (victim) for (const w of penWalls) if (w.t < vh.t) dmgScale *= 0.55;
  const isPl = sh.isPlayer;
  const muzzle = this.muzzleWorld(sh);
  if (victim) {
    const dist = vh.t;
    let dmg = def.damage * Math.pow(def.rangeMod || 0.9, dist / 12.7) * HIT_MULT[vh.group] * dmgScale;
    const hp = { x: o.x + d.x * dist, y: o.y + d.y * dist, z: o.z + d.z * dist };
    const wasAlive = victim.alive;
    victim.takeDamage(dmg, sh, def, vh.group, d, this.now);
    FX.blood(hp, d, vh.group === 'head');
    if (victim.bot) victim.bot.onDamaged(sh, this.now);
    if (victim.isPlayer) this.onPlayerHurt(sh, dmg);
    if (isPl) { UI.hitmarker(vh.group === 'head', !victim.alive); Audio3.hit(vh.group === 'head'); }
    if (wasAlive && !victim.alive) this.onKill(victim, sh, def, vh.group === 'head', pens > 0 && penWalls.some(w => w.t < vh.t));
    if (first && (!isPl || Math.random() < 0.4)) FX.tracer(muzzle, hp);
  } else {
    const end = endHit ? endHit.point : { x: o.x + d.x * range, y: o.y + d.y * range, z: o.z + d.z * range };
    if (endHit) {
      FX.impact(endHit.point, endHit.normal, endHit.box ? endHit.box.kind : 'ground');
      FX.hole(endHit.point, endHit.normal);
    }
    for (const w of penWalls) FX.hole(w.point, w.normal);
    if (first && (!isPl || Math.random() < 0.35)) FX.tracer(muzzle, end);
    // mermi vızıltısı -> botlar duyar
  }
};
G.muzzleWorld = function (e) {
  const eye = e.eye(); const f = dirFromAngles(e.yaw, e.pitch);
  const rx = Math.cos(e.yaw), rz = -Math.sin(e.yaw);
  return { x: eye.x + f.x * 0.7 + rx * 0.15, y: eye.y - 0.15 + f.y * 0.7, z: eye.z + f.z * 0.7 + rz * 0.15 };
};
G.knifeAttack = function (e) {
  Audio3.knife(e.pos);
  if (e.isPlayer) this.vm.kick = 1;
  const o = e.eye(), d = dirFromAngles(e.yaw, e.pitch);
  let best = null, bt = 1.7;
  for (const t of this.entities) {
    if (t === e || !t.alive || (t.team === e.team && !S.friendlyFire)) continue;
    const r = this.hitTestEntity(t, o, d, bt);
    if (r && r.t < bt) { bt = r.t; best = t; }
  }
  if (!best) {
    const w = Phys.raycast(o, d, 1.6);
    if (w) FX.impact(w.point, w.normal, w.box ? w.box.kind : 'ground');
    return;
  }
  // sırttan bıçak
  const back = Math.abs(angDiff(best.yaw, e.yaw)) < 1.0;
  const dmg = back ? 180 : 40;
  const wasAlive = best.alive;
  best.takeDamage(dmg, e, { pen: 0.85 }, 'chest', d, this.now);
  FX.blood({ x: o.x + d.x * bt, y: o.y + d.y * bt, z: o.z + d.z * bt }, d, back);
  if (best.bot) best.bot.onDamaged(e, this.now);
  if (best.isPlayer) this.onPlayerHurt(e, dmg);
  if (e.isPlayer) UI.hitmarker(false, !best.alive);
  if (wasAlive && !best.alive) this.onKill(best, e, WEAPONS.knife, false);
};
G.onShot = function (e, def) {
  Audio3.shot(def, e.isPlayer ? null : e.eye());
  if (e.isPlayer) { this.vm.kick = 1; this.vm.flashT = 0.045; }
  else FX.muzzleFlash3P(this.muzzleWorld(e));
  // botlar duyar
  const range = def.silenced ? 18 : 60;
  for (const b of this.bots) {
    if (b.e.team === e.team || !b.e.alive) continue;
    if (dist2(b.e.pos, e.pos) < range) b.hear(e.pos, this.now, 'shot');
  }
  if (!def.silenced) e.spottedUntil = Math.max(e.spottedUntil, this.now + 0.3); // radarda görünür
};
G.onFootstep = function (e) {
  if (!e.isPlayer) Audio3.footstep(e.pos, e.team === this.player.team ? 0.5 : 1);
  else Audio3.footstep(null, 0.35);
  for (const b of this.bots) {
    if (b.e.team === e.team || !b.e.alive) continue;
    if (dist2(b.e.pos, e.pos) < 20) b.hear(e.pos, this.now, 'step');
  }
};
G.onLand = function (e, vy) {
  if (vy < -11) { e.takeDamage(Math.round((-vy - 11) * 8), null, null, 'fall', null, this.now); if (!e.alive) this.onKill(e, e, null, false); }
  if (e.isPlayer) Audio3.land(null); else Audio3.land(e.pos);
};
G.onPlayerHurt = function (att, dmg) {
  Audio3.hurt();
  UI.damage(att ? att.pos : null, dmg);
  this.hurtPunch = Math.min(4, (this.hurtPunch || 0) + 1.5);
};
G.onKill = function (v, k, def, hs, wallbang) {
  v.alive = false; v.hp = 0;
  v.stats.deaths++;
  v.deathDir = Math.random() < 0.5 ? 1 : -1;
  v.plantT = 0; v.defuseT = 0;
  if (this.bomb.defuser === v) this.bomb.defuser = null;
  if (k && k !== v) {
    if (k.team !== v.team) {
      k.stats.kills++; if (hs) k.stats.hs++;
      if (this.dm) {
        this.score[k.group]++;
        if (k.isPlayer) UI.toast(`+1  ${v.name} öldürüldü`, 1.2, 'money');
      } else {
        const rew = def ? (def.reward || 300) : 300;
        this.addMoney(k, rew);
        if (k.isPlayer) UI.toast(`+$${rew}  ${v.name} öldürüldü`, 1.5, 'money');
      }
    } else { k.stats.kills--; this.addMoney(k, -300); }
  }
  // asist
  for (const [a, dmg] of v.dmgBy) if (a !== k && a.team !== v.team && dmg >= 40) a.stats.assists++;
  UI.killfeed(k && k !== v ? k : null, v, def, hs, wallbang);
  // eşyaları düşür
  const drop = v.inv.primary || v.inv.secondary;
  if (this.dm) {
    v.respawnAt = this.now + 2.5;
    if (v.isPlayer) v.dmSaved = { primary: v.inv.primary ? v.inv.primary.def.id : (v.dmSaved && v.dmSaved.primary), secondary: v.inv.secondary ? v.inv.secondary.def.id : null };
  } else if (drop) this.spawnPickup(drop, v.pos);
  if (v.inv.bomb) { v.inv.bomb = false; this.bomb.state = 'dropped'; this.bomb.carrier = null; this.bomb.pos = { x: v.pos.x, y: 0, z: v.pos.z }; this.bombMesh.visible = true; this.bombMesh.position.set(v.pos.x, 0.07, v.pos.z); if (v.team === this.player.team || true) UI.toast('Bomba düşürüldü!', 2); }
  v.resetForDeath();
  if (v.model) Models.setCharGun(v.model, null);
  if (v.isPlayer) { UI.onPlayerDeath(k); this.spec = null; }
};
G.addMoney = function (e, m) { e.money = Math.max(0, Math.min(ECON.max, e.money + m)); };

// ================= YERDEKİ SİLAHLAR =================
G.spawnPickup = function (w, pos) {
  const mesh = Models.gun(w.def);
  mesh.position.set(pos.x + (Math.random() - 0.5) * 0.6, 0.06, pos.z + (Math.random() - 0.5) * 0.6);
  mesh.rotation.set(0, Math.random() * 6, Math.PI / 2);
  mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
  this.scene.add(mesh);
  this.pickups.push({ w: { def: w.def, mag: w.mag, reserve: w.reserve }, mesh, pos: { x: mesh.position.x, z: mesh.position.z }, t: this.now });
};
G.updatePickups = function () {
  const B = this.bomb;
  for (const e of this.entities) {
    if (!e.alive) continue;
    // bomba al
    if (B.state === 'dropped' && e.team === 'T' && dist2(e.pos, B.pos) < 1.1) {
      B.state = 'carried'; B.carrier = e; e.inv.bomb = true; this.bombMesh.visible = false;
      if (e.isPlayer) UI.toast('Bombayı aldın', 1.5);
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (this.now - p.t < 0.8) continue;
      if (dist2(e.pos, p.pos) > 1.1) continue;
      const slot = p.w.def.slot;
      let take = !e.inv[slot];
      // botlar daha iyi silahı alır
      if (!take && e.bot && slot === 'primary' && e.inv.primary && p.w.def.price > e.inv.primary.def.price + 500) {
        this.spawnPickup(e.inv.primary, e.pos); take = true;
      }
      if (take) {
        e.inv[slot] = p.w; this.scene.remove(p.mesh); this.pickups.splice(i, 1);
        if (e.isPlayer) { UI.toast(p.w.def.name + ' alındı', 1.2); Audio3.click(null, 1200); }
        if (slot === 'primary' && e.slot !== 'primary') e.switchTo('primary');
      }
    }
  }
};
G.playerSwapPickup = function () {
  const e = this.player; if (!e.alive) return false;
  let best = null, bd = 1.8;
  for (const p of this.pickups) { const d = dist2(e.pos, p.pos); if (d < bd) { bd = d; best = p; } }
  if (!best) return false;
  const slot = best.w.def.slot;
  if (e.inv[slot]) this.spawnPickup(e.inv[slot], e.pos);
  e.inv[slot] = best.w; this.scene.remove(best.mesh); this.pickups.splice(this.pickups.indexOf(best), 1);
  e.switchTo(slot, true); UI.toast(best.w.def.name + ' alındı', 1.2);
  return true;
};
G.dropWeapon = function () {
  const e = this.player; if (!e.alive) return;
  if (e.slot === 'bomb' && e.inv.bomb) {
    e.inv.bomb = false; const f = dirFromAngles(e.yaw, 0);
    this.bomb.state = 'dropped'; this.bomb.carrier = null; this.bomb.pos = { x: e.pos.x + f.x * 1.5, y: 0, z: e.pos.z + f.z * 1.5 };
    this.bombMesh.visible = true; this.bombMesh.position.set(this.bomb.pos.x, 0.07, this.bomb.pos.z);
    e.switchTo(e.bestSlot(), true); return;
  }
  if (e.slot !== 'primary' && e.slot !== 'secondary') return;
  const w = e.inv[e.slot]; if (!w) return;
  const f = dirFromAngles(e.yaw, 0);
  this.spawnPickup(w, { x: e.pos.x + f.x * 1.6, z: e.pos.z + f.z * 1.6 });
  this.pickups[this.pickups.length - 1].t = this.now + 0.7;
  e.inv[e.slot] = null; e.switchTo(e.bestSlot(), true);
};

// ================= SATIN ALMA =================
G.canBuy = function (e) {
  if (this.dm) return e.alive && this.round.phase !== 'end';
  const z = MAP.zoneAt(e.pos.x, e.pos.z);
  return e.alive && this.round.buyLeft > 0 && this.round.phase !== 'end' && (z === (e.team === 'T' ? 'T' : 'C'));
};
G.buy = function (e, id, bot) {
  const def = itemDef(id); if (!def) return false;
  if (!sideOk(def, e.team)) return false;
  if (!bot && !this.canBuy(e)) return false;
  let price = this.dm ? 0 : def.price;
  if (id === 'helmet') { if (e.helmet && e.armor >= 100) return false; if (e.armor >= 100 && !this.dm) price = 350; }
  if (id === 'kevlar' && e.armor >= 100) return false;
  if (id === 'kit' && e.kit) return false;
  if (e.money < price) return false;
  if (EQUIPMENT[id]) {
    if (id === 'kevlar') e.armor = 100;
    if (id === 'helmet') { e.armor = 100; e.helmet = true; }
    if (id === 'kit') e.kit = true;
  } else if (def.slot === 'grenade') {
    if (!e.giveWeapon(id)) return false;
  } else {
    const cur = e.inv[def.slot];
    if (cur && cur.def.id === id) { if (cur.mag === def.mag && cur.reserve === def.reserve) return false; }
    if (cur && !bot && !this.dm) this.spawnPickup(cur, e.pos);
    e.giveWeapon(id);
    if (!bot) e.switchTo(def.slot, true);
  }
  e.money -= price;
  if (!bot) Audio3.click(null, 1500);
  return true;
};

// ================= BOMBA KURMA / İMHA =================
G.inBombZone = function (p) { const z = MAP.zoneAt(p.x, p.z); return (z === 'A' || z === 'B') ? z : null; };
G.updatePlantDefuse = function (e, dt) {
  const B = this.bomb, R = this.round;
  if (R.phase === 'freeze' || R.phase === 'end') { e.plantT = 0; e.defuseT = 0; return; }
  // kurma
  if (e.team === 'T' && e.inv.bomb && e.input.use && e.onGround && this.inBombZone(e.pos) && R.phase === 'live') {
    if (e.slot !== 'bomb') e.switchTo('bomb', true);
    if (e.deployT <= 0) {
      if (Math.floor(e.plantT * 3) !== Math.floor((e.plantT + dt) * 3)) Audio3.plantKey(e.pos);
      e.plantT += dt;
      if (e.plantT >= 3.2) this.plantBomb(e);
    }
  } else e.plantT = 0;
  // imha
  if (e.team === 'CT' && B.state === 'planted' && e.input.use && dist2(e.pos, B.pos) < 1.6 && (!B.defuser || B.defuser === e)) {
    if (!B.defuser) { B.defuser = e; Audio3.click(B.pos, 700); }
    e.defuseT += dt;
    if (e.defuseT >= (e.kit ? 5 : 10)) {
      B.state = 'defused'; B.defuser = null; e.defuseT = 0;
      this.addMoney(e, ECON.defuseReward);
      this.endRound('CT', 'defuse');
    }
  } else {
    if (B.defuser === e) B.defuser = null;
    e.defuseT = 0;
  }
};
G.plantBomb = function (e) {
  const B = this.bomb;
  e.inv.bomb = false; e.plantT = 0;
  B.state = 'planted'; B.carrier = null; B.pos = { x: e.pos.x, y: e.pos.y, z: e.pos.z }; B.timer = this.BOMB_TIME; B.beepT = 0;
  B.site = this.inBombZone(e.pos);
  this.bombMesh.visible = true; this.bombMesh.position.set(B.pos.x, B.pos.y + 0.07, B.pos.z); this.bombMesh.rotation.set(0, e.yaw, 0);
  this.round.phase = 'planted';
  this.addMoney(e, ECON.plantReward);
  e.switchTo(e.bestSlot(), true);
  UI.toast('BOMBA KURULDU!', 3, 'warn');
  Audio3.beep(B.pos, true);
};
G.updateBomb = function (dt) {
  const B = this.bomb;
  if (B.state !== 'planted') { this.bombLight.intensity = 0; return; }
  if (this.round.phase === 'end') return;
  B.timer -= dt;
  const iv = Math.max(0.12, Math.min(1.0, B.timer / 40));
  B.beepT -= dt;
  if (B.beepT <= 0) {
    B.beepT = iv; Audio3.beep(B.pos, B.timer < 10);
    this.bombLight.position.set(B.pos.x, B.pos.y + 0.4, B.pos.z); this.bombLight.intensity = 2;
  } else this.bombLight.intensity *= 0.85;
  if (B.timer <= 0) {
    B.state = 'exploded';
    FX.explosion(B.pos, true); Audio3.explosion(B.pos, true);
    this.bombMesh.visible = false;
    for (const e of this.entities) {
      if (!e.alive) continue;
      const d = Math.hypot(e.pos.x - B.pos.x, e.pos.y - B.pos.y, e.pos.z - B.pos.z);
      const dmg = 500 * Math.exp(-(d / 9.5) * (d / 9.5));
      if (dmg < 1) continue;
      e.takeDamage(dmg, null, null, 'blast', null, this.now);
      if (e.isPlayer) this.onPlayerHurt(null, dmg);
      if (!e.alive) this.onKill(e, null, { name: 'C4' }, false);
    }
    this.shake = 1.5;
    this.endRound('T', 'bomb');
  }
};

// ================= EL BOMBALARI =================
G.solveThrow = function (from, to, high) {
  const v = 17, g = 15;
  const dx = to.x - from.x, dz = to.z - from.z, dy = to.y - from.y;
  const x = Math.hypot(dx, dz);
  const yaw = Math.atan2(-dx, -dz);
  const v2 = v * v, disc = v2 * v2 - g * (g * x * x + 2 * dy * v2);
  let pitch;
  if (disc < 0) pitch = Math.PI / 4;
  else pitch = Math.atan((v2 + (high ? 1 : -1) * Math.sqrt(disc)) / (g * x));
  if (!high) pitch = Math.max(pitch, 0.25);
  return { yaw, pitch: pitch - 0.05, strength: 1 };
};
G.throwGrenade = function (e, def, strength) {
  const i = e.inv.grenades.indexOf(def.id); if (i < 0) return;
  e.inv.grenades.splice(i, 1);
  const d = dirFromAngles(e.yaw, e.pitch + 0.05);
  const sp = 17 * strength;
  const eye = e.eye();
  const mesh = Models.gun(def); mesh.scale.set(1.3, 1.3, 1.3);
  mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
  this.scene.add(mesh);
  const nd = {
    def, owner: e, team: e.team, t: 0, mesh, still: 0,
    pos: { x: eye.x + d.x * 0.5, y: eye.y + d.y * 0.5, z: eye.z + d.z * 0.5 },
    vel: { x: d.x * sp + e.vel.x * 0.6, y: d.y * sp + e.vel.y * 0.3, z: d.z * sp + e.vel.z * 0.6 },
  };
  this.nades.push(nd);
  Audio3.knife(e.isPlayer ? null : e.pos);
  if (e.isPlayer) this.vm.kick = 1;
  e.trigLatch = true;
  if (e.inv.grenades.length) { e.deployT = 0.6; e.onEquip(); } else e.switchTo(e.bestSlot(), true);
};
G.updateNades = function (dt) {
  const g = 15;
  for (let i = this.nades.length - 1; i >= 0; i--) {
    const n = this.nades[i]; n.t += dt;
    const steps = 3, h = dt / steps;
    let onGround = false;
    for (let s = 0; s < steps; s++) {
      n.vel.y -= g * h;
      const axes = ['x', 'y', 'z'];
      for (const a of axes) {
        const prev = n.pos[a];
        n.pos[a] += n.vel[a] * h;
        if (a === 'y' && n.pos.y < 0.06) {
          n.pos.y = 0.06;
          if (n.def.nade === 'fire') { n.detonate = true; }
          if (Math.abs(n.vel.y) > 2) Audio3.bounce(n.pos);
          n.vel.y = -n.vel.y * 0.35; n.vel.x *= 0.65; n.vel.z *= 0.65; onGround = true;
          continue;
        }
        const b = Phys.insideBox(n.pos, 0.05);
        if (b) {
          n.pos[a] = prev;
          if (a === 'y' && n.vel.y < 0) { onGround = true; if (n.def.nade === 'fire') n.detonate = true; n.vel.x *= 0.65; n.vel.z *= 0.65; }
          if (Math.abs(n.vel[a]) > 2) Audio3.bounce(n.pos);
          n.vel[a] = -n.vel[a] * 0.4;
        }
      }
    }
    n.mesh.position.set(n.pos.x, n.pos.y, n.pos.z);
    n.mesh.rotation.x += dt * 8 * Math.min(1, Math.hypot(n.vel.x, n.vel.z));
    const sp = Math.hypot(n.vel.x, n.vel.y, n.vel.z);
    if (onGround && sp < 0.6) n.still += dt; else n.still = 0;
    let boom = false;
    const k = n.def.nade;
    if ((k === 'he' || k === 'flash') && n.t >= 1.6) boom = true;
    if (k === 'smoke' && (n.still > 0.25 || n.t > 4)) boom = true;
    if (k === 'fire' && (n.detonate || n.t > 2.2)) boom = true;
    if (boom) { this.detonate(n); this.scene.remove(n.mesh); this.nades.splice(i, 1); }
  }
};
G.detonate = function (n) {
  const p = n.pos, k = n.def.nade, now = this.now;
  if (k === 'he') {
    FX.explosion(p, false); Audio3.explosion(p, false);
    for (const e of this.entities) {
      if (!e.alive) continue;
      if (e.team === n.team && e !== n.owner && !S.friendlyFire) continue;
      const c = { x: e.pos.x, y: e.pos.y + 1.0, z: e.pos.z };
      const d = Math.hypot(c.x - p.x, c.y - p.y, c.z - p.z);
      if (d > 11) continue;
      if (Phys.blocked({ x: p.x, y: p.y + 0.2, z: p.z }, c)) continue;
      const dmg = 100 * Math.pow(1 - d / 11, 1.4);
      e.takeDamage(dmg, n.owner, null, 'blast', null, now);
      if (e.isPlayer) this.onPlayerHurt(n.owner, dmg);
      if (e.bot) e.bot.onDamaged(n.owner, now);
      if (n.owner.isPlayer && e !== n.owner) UI.hitmarker(false, !e.alive);
      if (!e.alive) this.onKill(e, n.owner, n.def, false);
    }
    this.hearAll(p, 50);
  } else if (k === 'flash') {
    FX.flashPop(p); Audio3.flashBang(p);
    for (const e of this.entities) {
      if (!e.alive) continue;
      const eye = e.eye();
      const d = Math.hypot(eye.x - p.x, eye.y - p.y, eye.z - p.z);
      if (d > 45) continue;
      if (Phys.blocked(p, eye) || FX.smokeBlocks(p, eye)) continue;
      const f = dirFromAngles(e.yaw, e.pitch);
      const dot = ((p.x - eye.x) * f.x + (p.y - eye.y) * f.y + (p.z - eye.z) * f.z) / Math.max(0.01, d);
      let inten = dot > 0.6 ? 1 : dot > 0 ? 0.6 : dot > -0.4 ? 0.3 : 0.12;
      inten *= Math.max(0, 1 - d / 45) * 1.1;
      const dur = 4.8 * Math.min(1, inten);
      if (dur > e.flashT) { e.flashT = dur; e.flashMax = dur; }
      if (e.isPlayer && dur > 0.4) Audio3.ring(Math.min(1, inten));
    }
    this.hearAll(p, 40);
  } else if (k === 'smoke') {
    FX.addSmoke(p); Audio3.smokePop(p);
  } else if (k === 'fire') {
    // sis içine düşerse söner
    if (FX.smokes.some(s => s.radius > 1 && Math.hypot(s.pos.x - p.x, s.pos.z - p.z) < s.radius + 1)) { Audio3.smokePop(p); return; }
    // yere indir
    const gp = { x: p.x, y: 0, z: p.z };
    FX.addFire(gp, n.team).owner = n.owner; Audio3.fire(gp);
  }
};
G.hearAll = function (p, r) { for (const b of this.bots) if (b.e.alive && dist2(b.e.pos, p) < r) b.hear(p, this.now, 'boom'); };
G.updateFireDamage = function (dt) {
  for (const f of FX.fires) {
    if (f.t > f.life - 0.3) continue;
    for (const e of this.entities) {
      if (!e.alive) continue;
      if (e.team === f.team && e !== f.owner && !S.friendlyFire) continue;
      if (Math.hypot(e.pos.x - f.pos.x, e.pos.z - f.pos.z) > f.radius || e.pos.y > 1.2) continue;
      e.fireAcc = (e.fireAcc || 0) + dt * 40;
      if (e.fireAcc >= 8) {
        const dmg = Math.floor(e.fireAcc); e.fireAcc -= dmg;
        e.takeDamage(dmg, f.owner, null, 'fire', null, this.now);
        if (e.isPlayer) this.onPlayerHurt(f.owner, dmg);
        if (e.bot) { e.bot.noise = { x: f.pos.x, y: 0, z: f.pos.z }; }
        if (!e.alive) this.onKill(e, f.owner, WEAPONS.molotov, false);
      }
    }
  }
  // botlar ateşten kaçar: yol hedefini etkilemez ama yürürken ateş içindeyse zıpla & çık
};

// ================= TAKIM BİLGİSİ =================
G.spot = function (t, team, now) {
  this.know[team].set(t, { pos: { x: t.pos.x, z: t.pos.z }, time: now });
  if (team === this.player.team) t.spottedUntil = now + 1.2;
};
G.knownSiteThreat = function (team, now) {
  let a = 0, b = 0;
  for (const [t, k] of this.know[team]) {
    if (!t.alive || now - k.time > 6) continue;
    if (dist2(k.pos, MAP.POS.site.A) < 22) a++;
    if (dist2(k.pos, MAP.POS.site.B) < 22) b++;
  }
  if (a === 0 && b === 0) return null;
  return a >= b ? { site: 'A', count: a } : { site: 'B', count: b };
};
G.randomNear = function (p, rmin, rmax, zoneCh) {
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2, r = rmin + Math.random() * (rmax - rmin);
    const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
    const [c, rr] = MAP.w2c(x, z);
    if (!MAP.isWalk(c, rr)) continue;
    if (zoneCh && MAP.cell(c, rr) !== zoneCh) continue;
    return { x, z };
  }
  return { x: p.x, z: p.z };
};

// ================= KAZANMA KOŞULLARI =================
G.checkWin = function () {
  const R = this.round, B = this.bomb;
  if (this.dm) {
    if (R.timeLeft <= 0) {
      R.phase = 'end'; R.timer = this.END_TIME; R.endReason = 'dmtime';
      const pw = this.score[0] > this.score[1];
      Audio3.roundEnd(pw);
      UI.message(this.score[0] === this.score[1] ? 'BERABERE' : (pw ? '<span style="color:var(--ok)">TAKIMIN KAZANDI</span>' : '<span style="color:var(--danger)">TAKIMIN KAYBETTİ</span>'), 5, `Süre doldu • ${this.score[0]} - ${this.score[1]}`);
      UI.toggleBuy(false);
    }
    return;
  }
  const aliveT = this.entities.some(e => e.alive && e.team === 'T');
  const aliveC = this.entities.some(e => e.alive && e.team === 'CT');
  if (!aliveC) return this.endRound('T', 'elim');
  if (!aliveT && B.state !== 'planted') return this.endRound('CT', 'elim');
  if (R.phase === 'live' && R.timeLeft <= 0) return this.endRound('CT', 'time');
};
G.endRound = function (win, reason) {
  const R = this.round;
  if (R.phase === 'end') return;
  R.phase = 'end'; R.timer = this.END_TIME; R.winner = win; R.endReason = reason;
  const lose = win === 'T' ? 'CT' : 'T';
  const g = this.sideOfGroup.indexOf(win);
  this.score[g]++;
  const rew = { elim: ECON.winElim, bomb: ECON.winBomb, defuse: ECON.winDefuse, time: ECON.winTime }[reason];
  const lossBonus = Math.min(ECON.lossMax, ECON.lossBase + ECON.lossStep * this.lossStreak[lose]);
  for (const e of this.entities) {
    if (e.team === win) this.addMoney(e, rew);
    else {
      let m = lossBonus;
      if (lose === 'T' && this.bomb.state !== 'none' && (this.bomb.state === 'planted' || this.bomb.state === 'defused')) m += ECON.plantBonus;
      if (lose === 'T' && reason === 'time' && e.alive) m = 0;
      this.addMoney(e, m);
    }
  }
  this.lossStreak[lose] = Math.min(4, this.lossStreak[lose] + 1);
  this.lossStreak[win] = Math.max(0, this.lossStreak[win] - 1);
  // MVP
  let mvp = null, mk = -1;
  const kills = this.roundKills || new Map();
  for (const e of this.entities) if (e.team === win && e.stats.kills > mk) { mk = e.stats.kills; mvp = e; }
  const pw = win === this.player.team;
  Audio3.roundEnd(pw);
  UI.roundEnd(win, reason, pw);
  // hayatta kalan T bombayı tutar mı? (sonraki raunt yeni dağıtılır)
};

// ================= OYUNCU NİŞAN YARDIMI =================
G.updatePlayerAssist = function (dt) {
  const p = this.player;
  this.lookScale = 1; this.assist = null;
  if (!p.alive || this.round.phase === 'end') return;
  const lvl = S.aimAssist;
  const d = p.def;
  const gunOk = d.mag || d.type === 'knife';
  if ((!lvl && !S.autoFire) || !gunOk) return;
  const cone = [2.5, 4, 6, 9][lvl] * DEG * (p.scoped ? 0.35 : 1);
  const eye = p.eye();
  const f = dirFromAngles(p.yaw - p.punch.x * 0.45 * DEG, p.pitch + p.punch.y * 0.45 * DEG);
  this.assistCheckT = (this.assistCheckT || 0) - dt;
  if (this.assistCheckT <= 0) {
    this.assistCheckT = 0.08;
    this.assistVis = new Map();
    for (const e of this.entities) {
      if (!e.alive || e.team === p.team) continue;
      if (dist2(e.pos, p.pos) > 70) continue;
      const head = { x: e.pos.x, y: e.pos.y + e.height - 0.12, z: e.pos.z }, chest = { x: e.pos.x, y: e.pos.y + e.height * 0.62, z: e.pos.z };
      const vh = !Phys.blocked(eye, head) && !FX.smokeBlocks(eye, head);
      const vc = !Phys.blocked(eye, chest) && !FX.smokeBlocks(eye, chest);
      if (vh || vc) this.assistVis.set(e, vh ? 'head' : 'chest');
    }
  }
  let best = null, bestAng = 1e9, bestPt = null, bestDist = 0;
  if (this.assistVis) for (const [e, vis] of this.assistVis) {
    if (!e.alive) continue;
    const aimHigh = lvl >= 3 && vis === 'head';
    const pt = { x: e.pos.x, y: e.pos.y + (aimHigh ? e.height - 0.2 : (vis === 'head' ? e.height * 0.68 : e.height * 0.55)), z: e.pos.z };
    const dx = pt.x - eye.x, dy = pt.y - eye.y, dz = pt.z - eye.z;
    const dd = Math.hypot(dx, dy, dz);
    const ang = Math.acos(Math.max(-1, Math.min(1, (dx * f.x + dy * f.y + dz * f.z) / dd)));
    if (ang < bestAng) { bestAng = ang; best = e; bestPt = pt; bestDist = dd; }
  }
  if (!best) return;
  const bodyAng = Math.atan2(0.32, bestDist);
  // otomatik ateş
  if (S.autoFire && bestAng < bodyAng * 1.1 && (d.mag ? true : bestDist < 1.8)) {
    const w = p.weapon();
    if (w && (!w.def.mag || w.mag > 0) && p.deployT <= 0 && p.reloadT <= 0) {
      if (d.type !== 'sniper' || p.scoped || bestDist < 6) { this.autoFiring = true; }
    }
  }
  if (!lvl) return;
  if (bestAng > cone + bodyAng) return;
  this.assist = { e: best, ang: bestAng };
  // sürtünme
  const fr = [0, 0.3, 0.45, 0.6][lvl];
  this.lookScale = 1 - fr * Math.max(0, 1 - bestAng / (cone + bodyAng));
  // mıknatıs: oyuncu hareket ediyor/ateş ediyorsa hedefe çek
  const active = p.trig || this.autoFiring || Input.lookActive || Math.abs(p.input.fwd) + Math.abs(p.input.side) > 0.1;
  if (active) {
    const rate = [0, 2.2, 4.0, 7.0][lvl];
    const dx = bestPt.x - eye.x, dz = bestPt.z - eye.z, dy = bestPt.y - eye.y;
    const wy = Math.atan2(-dx, -dz) + p.punch.x * 0.45 * DEG, wp = Math.atan2(dy, Math.hypot(dx, dz)) - p.punch.y * 0.45 * DEG;
    const k = Math.min(1, rate * dt);
    p.yaw += angDiff(p.yaw, wy) * k;
    p.pitch += (wp - p.pitch) * k * 0.6;
  }
};

// ================= KAMERA & GÖRÜNTÜ =================
G.onPlayerEquip = function (e) { this.buildViewmodel(); };
G.buildViewmodel = function () {
  const vm = this.vm, p = this.player;
  if (vm.gun) vm.root.remove(vm.gun);
  if (!vm.arms || vm.team !== p.team) {
    if (vm.arms) vm.root.remove(vm.arms);
    vm.arms = Models.viewArms(p.team); vm.team = p.team; vm.root.add(vm.arms);
  }
  const def = p.def;
  const g = Models.gun(def);
  const t = def.type;
  // konum: sağ alt
  if (t === 'knife') { g.position.set(0.17, -0.19, -0.36); g.rotation.set(0.2, 0.25, -0.3); }
  else if (t === 'grenade' || t === 'bomb') { g.position.set(0.16, -0.2, -0.38); g.rotation.set(0.3, 0.3, 0); }
  else if (t === 'pistol') { g.position.set(0.15, -0.17, -0.42); g.rotation.set(0, 0.06, 0); }
  else { g.position.set(0.15, -0.165, -0.36); g.rotation.set(0.01, 0.07, 0); }
  g.scale.setScalar(t === 'pistol' ? 0.8 : 0.72);
  vm.gunBase = g.position.clone(); vm.gunRot = g.rotation.clone();
  vm.gun = g; vm.root.add(g);
  const mz = g.userData.muzzle; mz.add(vm.flash);
  vm.flash.position.set(0, 0, -0.03);
  // kollar silaha göre
  const A = vm.arms.userData;
  vm.arms.scale.setScalar(0.8);
  const sc = 0.8;
  A.R.position.set(g.position.x / sc + 0.01, g.position.y / sc - 0.06, g.position.z / sc + 0.1); A.R.rotation.set(0.25, 0.12, 0);
  const longGun = t !== 'pistol' && t !== 'knife' && t !== 'grenade' && t !== 'bomb';
  if (longGun) { A.L.visible = true; A.L.position.set(g.position.x / sc - 0.03, g.position.y / sc - 0.03, g.position.z / sc - 0.3); A.L.rotation.set(0.35, -0.75, 0); }
  else if (t === 'pistol') { A.L.visible = true; A.L.position.set(g.position.x / sc - 0.03, g.position.y / sc - 0.08, g.position.z / sc + 0.08); A.L.rotation.set(0.2, -0.35, 0); }
  else A.L.visible = false;
};
G.render = function (dt) {
  const r = this.renderer, cam = this.camera, p = this.player;
  if (!p) { r.clear(); return; }
  let viewE = p;
  const spec = !p.alive && this.spec;
  if (spec) viewE = this.spec;
  const eye = viewE.eye();
  // sarsıntı
  this.shake = Math.max(0, (this.shake || 0) - dt);
  this.hurtPunch = Math.max(0, (this.hurtPunch || 0) - dt * 8);
  const sh = this.shake * 0.05;
  cam.position.set(eye.x + (Math.random() - 0.5) * sh, eye.y + (Math.random() - 0.5) * sh, eye.z);
  cam.rotation.y = viewE.yaw - viewE.punch.x * 0.45 * DEG;
  cam.rotation.x = viewE.pitch + viewE.punch.y * 0.45 * DEG + this.hurtPunch * 0.01;
  // FOV & dürbün
  let fov = S.fov;
  const sc = viewE.scoped && viewE.def.scope ? viewE.def.scope[viewE.scoped - 1] : 0;
  if (sc) fov = 2 * Math.atan(Math.tan(S.fov * DEG / 2) * sc / 90) / DEG;
  if (Math.abs(cam.fov - fov) > 0.01) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 25); if (Math.abs(cam.fov - fov) < 0.3) cam.fov = fov; cam.updateProjectionMatrix(); }
  // dinleyici
  Audio3.listener.x = eye.x; Audio3.listener.y = eye.y; Audio3.listener.z = eye.z; Audio3.listener.yaw = viewE.yaw;
  // görünürlük: izlenen karakterin modeli gizli
  for (const e of this.entities) if (e.model) e.model.root.visible = !(e === viewE && e.alive) && !(e.isPlayer && e.alive) && (e.alive || e.deathT < 15);
  FX.update(dt, eye);
  r.clear();
  r.render(this.scene, cam);
  // viewmodel
  const showVm = p.alive && !(sc && viewE.def.type === 'sniper');
  if (showVm && this.vm.gun) {
    this.animateViewmodel(dt);
    r.clearDepth();
    r.render(this.vmScene, this.vmCamera);
  }
};
G.animateViewmodel = function (dt) {
  const vm = this.vm, p = this.player, g = vm.gun;
  const sp = p.hspeed();
  vm.bob += dt * (sp > 0.5 && p.onGround ? 4 + sp * 1.4 : 0);
  const bobA = Math.min(1, sp / 5) * (p.onGround ? 1 : 0.3);
  vm.kick = Math.max(0, vm.kick - dt * 9);
  const k = vm.kick;
  let dip = 0, rotDip = 0;
  if (p.reloadT > 0) {
    const tot = p.def.shellReload ? p.def.reload : p.def.reload;
    const f = 1 - p.reloadT / tot;
    const s = Math.sin(Math.min(1, f) * Math.PI);
    dip = s * 0.12; rotDip = s * 0.7;
  }
  if (p.deployT > 0) { dip += Math.min(1, p.deployT * 2) * 0.25; }
  if (p.plantT > 0 || p.defuseT > 0) { dip += 0.06; }
  vm.swayX += (-(Input.lastLookDX || 0) * 0.0004 - vm.swayX) * Math.min(1, dt * 8);
  vm.swayY += (-(Input.lastLookDY || 0) * 0.0004 - vm.swayY) * Math.min(1, dt * 8);
  vm.root.position.set(Math.sin(vm.bob) * 0.012 * bobA + vm.swayX, -Math.abs(Math.cos(vm.bob)) * 0.012 * bobA - dip + vm.swayY - p.crouch * 0.01, k * 0.045);
  vm.root.rotation.set(k * 0.09 + rotDip * 0.6, 0, rotDip * 0.35 + (p.def.type === 'knife' ? k * 0.6 : 0));
  vm.flashT = (vm.flashT || 0) - dt;
  vm.flash.visible = vm.flashT > 0;
  if (vm.flash.visible) vm.flash.material.rotation = Math.random() * 6;
};
G.sound = function (kind, e, f) {
  const pos = e && !e.isPlayer ? e.pos : null;
  if (kind === 'click') Audio3.click(pos, f);
  else if (kind === 'reload') Audio3.reload(pos);
};

// ================= ÖLÜM KALIM =================
const DM_BOT_GUNS = ['ak47', 'ak47', 'm4a4', 'm4a1s', 'm4a1s', 'awp', 'galil', 'famas', 'sg553', 'aug', 'mp9', 'ump45', 'p90', 'mac10', 'ssg08', 'xm1014', 'mp7'];
G.dmLoadout = function (e) {
  e.resetForDeath();
  e.armor = 100; e.helmet = true; e.money = 16000;
  if (e.isPlayer) {
    const sv = e.dmSaved || {};
    e.giveWeapon(sv.secondary || (e.team === 'T' ? 'glock' : 'usp'));
    e.giveWeapon(sv.primary || (e.team === 'T' ? 'ak47' : 'm4a4'));
  } else {
    let id = DM_BOT_GUNS[Math.floor(Math.random() * DM_BOT_GUNS.length)];
    if (!sideOk(WEAPONS[id], e.team)) id = e.team === 'T' ? 'ak47' : 'm4a1s';
    e.giveWeapon(Math.random() < 0.3 ? 'deagle' : (e.team === 'T' ? 'glock' : 'usp'));
    e.giveWeapon(id);
  }
  e.slot = e.bestSlot(); e.deployT = 0; e.onEquip();
};
G.dmSpawnPoint = function (e) {
  const enemies = this.entities.filter(o => o.alive && o.team !== e.team);
  let best = null, bestScore = -1e9;
  for (let i = 0; i < 40; i++) {
    const c = Math.floor(Math.random() * MAP.W), r = Math.floor(Math.random() * MAP.H);
    if (!MAP.isWalk(c, r)) continue;
    const p = MAP.c2w(c, r);
    let minD = 999, seen = false;
    const pe = { x: p.x, y: 1.6, z: p.z };
    for (const o of enemies) {
      const d = dist2(o.pos, p); minD = Math.min(minD, d);
      if (d < 50 && !Phys.blocked(o.eye(), pe)) seen = true;
    }
    const score = Math.min(minD, 35) - (seen ? 60 : 0) + Math.random() * 5;
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return best || MAP.POS.spawnT[0];
};
G.respawn = function (e) {
  const p = this.dmSpawnPoint(e);
  e.pos.x = p.x; e.pos.y = 0; e.pos.z = p.z;
  e.vel.x = e.vel.y = e.vel.z = 0;
  e.alive = true; e.hp = 100; e.deathT = 0; e.flashT = 0; e.crouch = 0; e.height = STAND_H; e.respawnAt = 0;
  e.recoilIdx = 0; e.fireInacc = 0; e.punch.x = e.punch.y = 0; e.scoped = 0; e.reloadT = 0; e.trig = false;
  e.dmgBy.clear(); e.protectUntil = this.now + 1.5;
  let near = null, nd = 1e9;
  for (const o of this.entities) if (o.alive && o.team !== e.team && o !== e) { const d = dist2(o.pos, e.pos); if (d < nd) { nd = d; near = o; } }
  e.yaw = near ? Math.atan2(-(near.pos.x - e.pos.x), -(near.pos.z - e.pos.z)) : Math.random() * 6.28; e.pitch = 0;
  if (e.model) { e.model.root.rotation.set(0, e.yaw, 0); }
  this.dmLoadout(e);
  if (e.bot) e.bot.roundStart({});
  if (e.isPlayer) { this.spec = null; UI.message('', 0); }
};
