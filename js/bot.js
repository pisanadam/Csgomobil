// Bot yapay zekası: algı, nişan, takım taktikleri, bomba, ekonomi
'use strict';
const BOT_DIFF = [
  { name: 'Kolay', react: [0.5, 0.85], turn: 150, err: 5.5, settle: 0.75, hs: 0.12, spray: 0.15, counter: 0.1, fov: 110, tapDist: 30, burstPause: [0.5, 0.9], jitter: 0.7, nade: 0.2 },
  { name: 'Normal', react: [0.3, 0.5], turn: 270, err: 3.2, settle: 0.45, hs: 0.3, spray: 0.5, counter: 0.5, fov: 130, tapDist: 25, burstPause: [0.35, 0.6], jitter: 0.35, nade: 0.5 },
  { name: 'Zor', react: [0.19, 0.32], turn: 420, err: 1.9, settle: 0.3, hs: 0.5, spray: 0.78, counter: 0.85, fov: 140, tapDist: 22, burstPause: [0.25, 0.45], jitter: 0.18, nade: 0.75 },
  { name: 'Uzman', react: [0.13, 0.22], turn: 620, err: 1.1, settle: 0.2, hs: 0.68, spray: 0.93, counter: 1, fov: 150, tapDist: 20, burstPause: [0.18, 0.32], jitter: 0.08, nade: 0.9 },
];
const BOT_NAMES = ['Ahmet', 'Burak', 'Can', 'Deniz', 'Emre', 'Ferhat', 'Gökhan', 'Hakan', 'İlker', 'Kaan', 'Levent', 'Mert', 'Onur', 'Ozan', 'Serkan', 'Tolga', 'Umut', 'Volkan', 'Yiğit', 'Baran', 'Arda', 'Efe', 'Barış', 'Cem'];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

class Bot {
  constructor(e) {
    this.e = e; e.bot = this;
    this.path = null; this.pi = 0; this.goal = null; this.goalKey = ''; this.repathAt = 0;
    this.target = null; this.reactAt = 0; this.lastSeen = null; this.lastSeenT = -10;
    this.errX = 0; this.errY = 0; this.aimHead = false;
    this.nextThink = Math.random() * 0.1; this.burst = 0; this.burstMax = 30; this.pauseUntil = 0;
    this.strafeDir = 1; this.strafeT = 0; this.crouchSpray = false;
    this.noise = null; this.noiseT = -10;
    this.look = null; this.role = null;
    this.stuckT = 0; this.lastPos = { x: 0, z: 0 };
    this.pendingNade = null; this.semiToggle = false;
  }
  get D() { return BOT_DIFF[S.botDifficulty] || BOT_DIFF[1]; }
  // ----- Tur başı -----
  roundStart(role) {
    this.role = role; this.path = null; this.goal = null; this.goalKey = '';
    this.target = null; this.lastSeen = null; this.noise = null; this.pendingNade = null;
    this.guardSpot = null; this.executed = false; this.siteSpot = null; this.saving = false;
    this.holdUntil = 0;
  }
  // ----- Algı -----
  canSee(t, now) {
    const e = this.e;
    if (!t.alive) return false;
    const d = dist2(e.pos, t.pos); if (d > 95) return false;
    if (e.flashT > 0.4) return false;
    const eye = e.eye();
    const dx = t.pos.x - eye.x, dz = t.pos.z - eye.z;
    const ang = Math.abs(angDiff(e.yaw, Math.atan2(-dx, -dz)));
    const fov = this.D.fov * DEG / 2;
    const recentlyHurt = now - e.lastHurt < 1.0;
    if (ang > fov && d > 2.5 && !recentlyHurt) return false;
    const head = { x: t.pos.x, y: t.pos.y + t.height - 0.12, z: t.pos.z };
    const chest = { x: t.pos.x, y: t.pos.y + t.height * 0.62, z: t.pos.z };
    const ok = p => !Phys.blocked(eye, p) && !FX.smokeBlocks(eye, p);
    if (ok(head)) return 'head';
    if (ok(chest)) return 'chest';
    return false;
  }
  perceive(now) {
    const e = this.e;
    let best = null, bestScore = 1e9, bestVis = false;
    for (const t of G.entities) {
      if (!t.alive || t.team === e.team) continue;
      const vis = this.canSee(t, now);
      if (!vis) continue;
      const d = dist2(e.pos, t.pos);
      const ang = Math.abs(angDiff(e.yaw, Math.atan2(-(t.pos.x - e.pos.x), -(t.pos.z - e.pos.z))));
      const score = d + ang * 25 + (t === this.target ? -15 : 0);
      if (score < bestScore) { bestScore = score; best = t; bestVis = vis; }
      G.spot(t, e.team, now);
    }
    if (best) {
      if (best !== this.target) {
        const D = this.D;
        let react = rnd(D.react[0], D.react[1]);
        // beklenen yön ise daha hızlı
        const ang = Math.abs(angDiff(e.yaw, Math.atan2(-(best.pos.x - e.pos.x), -(best.pos.z - e.pos.z))));
        if (ang < 15 * DEG) react *= 0.8; else if (ang > 60 * DEG) react *= 1.25;
        if (this.target && now - this.lastSeenT < 1) react *= 0.5;
        this.reactAt = now + react;
        const dd = dist2(e.pos, best.pos);
        const err = D.err * (1 + Math.min(1.5, ang / (60 * DEG)));
        const a = Math.random() * Math.PI * 2;
        this.errX = Math.cos(a) * err; this.errY = Math.sin(a) * err * 0.6;
        this.aimHead = Math.random() < D.hs;
        this.burst = 0; this.crouchSpray = Math.random() < 0.35 && dd > 12;
      }
      this.target = best; this.tVis = bestVis; this.lastSeen = { x: best.pos.x, y: best.pos.y, z: best.pos.z }; this.lastSeenT = now;
    } else if (this.target) {
      if (!this.target.alive || now - this.lastSeenT > 0.35) this.target = null;
    }
  }
  hear(pos, now, kind) {
    if (this.target) return;
    this.noise = { x: pos.x, y: pos.y || 0, z: pos.z }; this.noiseT = now;
  }
  onDamaged(att, now) {
    if (!att || att.team === this.e.team) return;
    if (!this.target) { this.noise = { x: att.pos.x, y: att.pos.y, z: att.pos.z }; this.noiseT = now + 0.5; }
  }
  // ----- Hedef seçimi (strateji) -----
  decideGoal(now) {
    const e = this.e, B = G.bomb, R = G.round;
    const tLeft = R.timeLeft;
    if (e.team === 'T') {
      if (B.state === 'dropped') {
        let closest = null, cd = 1e9;
        for (const m of G.entities) if (m.alive && m.team === 'T' && !m.isPlayer) { const d = dist2(m.pos, B.pos); if (d < cd) { cd = d; closest = m; } }
        if (closest === e) return { key: 'bomb', p: B.pos };
      }
      if (B.state === 'planted') {
        if (!this.guardSpot) this.guardSpot = G.randomNear(B.pos, 5, 12);
        return { key: 'guard', p: this.guardSpot, look: B.pos, hold: true };
      }
      const site = R.plan;
      const executing = now >= this.role.executeAt || tLeft < 40 || this.executed;
      if (executing) {
        if (!this.executed) { this.executed = true; this.planNades(site); }
        if (e.inv.bomb) {
          if (!this.siteSpot) this.siteSpot = pick(MAP.POS.plant[site]);
          return { key: 'plant', p: this.siteSpot, plant: true };
        }
        if (!this.siteSpot) this.siteSpot = G.randomNear(MAP.POS.site[site], 2, 9, site);
        return { key: 'site', p: this.siteSpot, look: pick(MAP.POS.entries[site]), hold: true };
      }
      return { key: 'stage', p: this.role.stage, look: MAP.POS.site[site], hold: true };
    } else {
      if (B.state === 'planted') {
        const timeLeft = B.timer;
        const need = e.kit ? 5 : 10;
        const d = dist2(e.pos, B.pos);
        if (timeLeft < need + d / 5.5 + 0.5 && !this.defusing) { this.saving = true; return { key: 'save', p: MAP.POS.spawnCT[0] }; }
        return { key: 'defuse', p: B.pos, defuse: true };
      }
      // takım bilgisine göre rotasyon
      const k = G.knownSiteThreat('CT', now);
      if (k && k.site !== this.role.site && (this.role.rotate || k.count >= 2)) {
        if (!this.rotSpot || this.rotSite !== k.site) { this.rotSite = k.site; this.rotSpot = pick(MAP.POS.ctHold[k.site]); }
        return { key: 'rot' + k.site, p: this.rotSpot.p, look: this.rotSpot.look, hold: true };
      }
      const h = this.role.hold;
      return { key: 'hold', p: h.p, look: h.look, hold: true };
    }
  }
  planNades(site) {
    const e = this.e;
    if (Math.random() > this.D.nade) return;
    const g = e.inv.grenades;
    const holds = MAP.POS.ctHold[site];
    if (g.includes('smoke')) this.pendingNade = { id: 'smoke', p: pick(holds).p, until: G.now + 12 };
    else if (g.includes('flash')) this.pendingNade = { id: 'flash', p: MAP.POS.site[site], until: G.now + 12, high: true };
    else if (g.includes('molotov')) this.pendingNade = { id: 'molotov', p: pick(holds).p, until: G.now + 12 };
  }
  // ----- Ana güncelleme -----
  update(dt, now) {
    const e = this.e;
    if (!e.alive) return;
    const inp = e.input;
    inp.fwd = 0; inp.side = 0; inp.walk = false; inp.crouch = false; inp.use = false;
    e.trig = false;
    if (G.round.phase === 'freeze') { this.idleLook(dt, now); return; }
    this.nextThink -= dt;
    if (this.nextThink <= 0) {
      this.nextThink = 0.1 + Math.random() * 0.05;
      this.perceive(now);
      this.goal = this.decideGoal(now);
      // değişen hedefte yeniden rota
      const gk = this.goal.key + Math.round(this.goal.p.x) + ',' + Math.round(this.goal.p.z);
      if (gk !== this.goalKey || (!this.path && now > this.repathAt)) {
        this.goalKey = gk; this.path = MAP.findPath(e.pos.x, e.pos.z, this.goal.p.x, this.goal.p.z) || []; this.pi = 0; this.repathAt = now + 1;
      }
      // silah durumu
      this.manageWeapon(now);
      this.tryNade(now);
    }
    if (this.target) { this.engage(dt, now); return; }
    // hedef yoksa: görev
    const g = this.goal; if (!g) return;
    const B = G.bomb;
    const atGoal = dist2(e.pos, g.p) < (g.plant || g.defuse ? 0.9 : 1.6);
    if (g.defuse && dist2(e.pos, B.pos) < 1.4) {
      inp.use = true; this.defusing = true;
      this.lookAt(B.pos.x, 0.2, B.pos.z, dt, 0.5);
      return;
    }
    this.defusing = false;
    if (g.plant && atGoal && G.inBombZone(e.pos)) {
      if (e.slot !== 'bomb') e.switchTo('bomb');
      inp.use = true;
      this.lookAt(e.pos.x - Math.sin(e.yaw) * 2, 0, e.pos.z - Math.cos(e.yaw) * 2, dt, 0.3);
      return;
    }
    if (!atGoal) this.followPath(dt, now);
    // bakış
    if (this.noise && now - this.noiseT < 3) this.lookAt(this.noise.x, this.noise.y + 1.4, this.noise.z, dt, 1);
    else if (this.lastSeen && now - this.lastSeenT < 3) this.lookAt(this.lastSeen.x, this.lastSeen.y + 1.5, this.lastSeen.z, dt, 1);
    else if (atGoal && g.look) this.lookAt(g.look.x, 1.5, g.look.z, dt, 0.6);
    else if (!atGoal) this.lookAlongPath(dt);
    else this.idleLook(dt, now);
    // ateş edilmiyorsa ve şarjör azsa doldur
  }
  manageWeapon(now) {
    const e = this.e;
    if (e.slot === 'bomb' && !(this.goal && this.goal.plant)) e.switchTo(e.bestSlot());
    if (e.slot === 'grenade' && !this.pendingNade) e.switchTo(e.bestSlot());
    if (e.slot === 'knife' && e.bestSlot() !== 'knife') e.switchTo(e.bestSlot());
    const w = e.weapon();
    if (w && w.def.mag) {
      if (!this.target && w.mag < w.def.mag * 0.5 && w.reserve > 0 && now - this.lastSeenT > 1.5) e.reload();
      if (w.mag === 0 && w.reserve === 0) {
        if (e.slot === 'primary' && e.inv.secondary) e.switchTo('secondary'); else if (e.slot !== 'knife') e.switchTo('knife');
      }
      // yakın mesafede boş şarjör -> tabancaya geç
      if (this.target && w.mag === 0 && e.slot === 'primary' && e.inv.secondary && e.inv.secondary.mag > 0 && dist2(e.pos, this.target.pos) < 12 && S.botDifficulty >= 2) e.switchTo('secondary');
    }
    if (!this.target && e.slot === 'secondary' && e.inv.primary && (e.inv.primary.mag > 0 || e.inv.primary.reserve > 0) && !this.pendingNade) e.switchTo('primary');
  }
  tryNade(now) {
    const e = this.e;
    let pn = this.pendingNade;
    // savaş bombası: görünmeyen bilinen düşmana HE / molotof
    if (!pn && !this.target && this.lastSeen && now - this.lastSeenT < 4 && now - this.lastSeenT > 0.8 && Math.random() < this.D.nade * 0.25) {
      const g = e.inv.grenades;
      const id = g.includes('he') ? 'he' : g.includes('molotov') ? 'molotov' : g.includes('incendiary') ? 'incendiary' : null;
      const d = dist2(e.pos, this.lastSeen);
      if (id && d > 7 && d < 28) pn = this.pendingNade = { id, p: { x: this.lastSeen.x, z: this.lastSeen.z }, until: now + 3 };
    }
    // T, bomba imha ediliyorsa molotof
    if (!pn && e.team === 'T' && G.bomb.state === 'planted' && G.bomb.defuser) {
      const id = e.inv.grenades.find(x => x === 'molotov' || x === 'he');
      if (id && dist2(e.pos, G.bomb.pos) < 25) pn = this.pendingNade = { id, p: G.bomb.pos, until: now + 3 };
    }
    if (!pn) return;
    if (now > pn.until || !e.inv.grenades.includes(pn.id) || this.target) { this.pendingNade = null; return; }
    const eye = e.eye();
    const tp = { x: pn.p.x, y: 1.0, z: pn.p.z };
    const d = dist2(eye, tp);
    if (d < 5 || d > 32) return;
    if (Phys.blocked(eye, tp) || Phys.blocked(eye, { x: eye.x + (tp.x - eye.x) * 0.5, y: eye.y + 3.5, z: eye.z + (tp.z - eye.z) * 0.5 })) return;
    // bombayı seç & at
    while (e.inv.grenades[0] !== pn.id) e.inv.grenades.push(e.inv.grenades.shift());
    if (e.slot !== 'grenade') { e.switchTo('grenade', true); return; }
    if (e.deployT > 0) return;
    const sol = G.solveThrow(eye, tp, pn.high);
    e.yaw = sol.yaw; e.pitch = sol.pitch;
    G.throwGrenade(e, WEAPONS[pn.id], sol.strength);
    this.pendingNade = null;
  }
  // ----- Çatışma -----
  engage(dt, now) {
    const e = this.e, t = this.target, D = this.D, inp = e.input;
    const eye = e.eye();
    const dist = Math.hypot(t.pos.x - eye.x, t.pos.z - eye.z);
    const headVis = this.tVis === 'head';
    const ay = (this.aimHead && headVis) ? t.pos.y + t.height - 0.12 : (this.tVis === 'chest' ? t.pos.y + t.height * 0.55 : t.pos.y + t.height * 0.62);
    // hedefin hareketini önceden tahmin (kısmi)
    const lead = 0.06;
    const tx = t.pos.x + t.vel.x * lead, tz = t.pos.z + t.vel.z * lead;
    const dx = tx - eye.x, dz = tz - eye.z, dy = ay - eye.y;
    let wantYaw = Math.atan2(-dx, -dz);
    let wantPitch = Math.atan2(dy, Math.hypot(dx, dz));
    // hata ofseti sönümlenir
    const k = Math.exp(-dt / D.settle);
    this.errX *= k; this.errY *= k;
    const jit = D.jitter * (0.5 + (e.flashT > 0 ? 6 : 0));
    const ex = this.errX + (Math.random() - 0.5) * jit * 0.4, ey = this.errY + (Math.random() - 0.5) * jit * 0.3;
    // geri tepme telafisi
    wantYaw += (e.punch.x * D.spray) * DEG - ex * DEG;
    wantPitch -= (e.punch.y * D.spray) * DEG - ey * DEG;
    this.turnTo(wantYaw, wantPitch, dt, D.turn);
    const yawErr = Math.abs(angDiff(e.yaw, wantYaw + ex * DEG)), pitchErr = Math.abs(e.pitch - (wantPitch - ey * DEG));
    const angErr = Math.hypot(yawErr, pitchErr);
    // hareket: counter-strafe & ADAD
    const def = e.def;
    const wantShoot = now >= this.reactAt && now >= this.pauseUntil && e.flashT < 0.6;
    const stopForShot = Math.random() < D.counter || def.type === 'sniper';
    this.strafeT -= dt;
    if (this.strafeT <= 0) { this.strafeDir = -this.strafeDir; this.strafeT = rnd(0.35, 0.8); }
    if (wantShoot && stopForShot && def.type !== 'smg' && def.type !== 'shotgun') {
      // karşı yöne basarak dur
      const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw), rx = Math.cos(e.yaw), rz = -Math.sin(e.yaw);
      const vf = e.vel.x * fx + e.vel.z * fz, vr = e.vel.x * rx + e.vel.z * rz;
      inp.fwd = Math.abs(vf) > 0.6 ? -Math.sign(vf) : 0; inp.side = Math.abs(vr) > 0.6 ? -Math.sign(vr) : 0;
      if (this.crouchSpray && this.burst > 2) inp.crouch = true;
    } else {
      inp.side = dist > 4 ? this.strafeDir : 0;
      if (def.type === 'knife' || (def.type === 'shotgun' && dist > 8)) inp.fwd = 1;
      if (def.type === 'smg' && dist > 15) inp.side = this.strafeDir * 0.6;
    }
    // AWP dürbün
    if (def.scope && def.type === 'sniper' && !e.scoped && !e.rescopeAt && dist > 6) e.toggleScope();
    if (def.scope && def.type !== 'sniper' && !e.scoped && dist > 25 && Math.random() < 0.02) e.toggleScope();
    // ateş
    const tol = Math.max(0.35 * DEG, Math.atan2(headVis && this.aimHead ? 0.16 : 0.3, dist)) * (1.6 + D.jitter);
    if (wantShoot && angErr < tol) {
      const w = e.weapon();
      if (w && w.def.mag && w.mag > 0) {
        const accOk = def.type === 'sniper' ? (e.hspeed() < e.maxSpeedRaw() * 0.3 && (e.scoped || dist < 6)) : true;
        if (accOk) {
          if (def.auto) { e.trig = true; }
          else { this.semiToggle = !this.semiToggle; e.trig = this.semiToggle; }
          if (e.trig && now >= e.nextFire) {
            this.burst++;
            const maxB = def.type === 'pistol' ? (dist > 15 ? 1 : 3) : (dist > D.tapDist ? (dist > 40 ? 1 : 3) : 30);
            if (this.burst >= maxB && def.auto) { this.burst = 0; this.pauseUntil = now + rnd(D.burstPause[0], D.burstPause[1]) * (dist > 40 ? 1.4 : 1); }
            if (!def.auto && def.type === 'pistol' && dist > 12) this.pauseUntil = now + rnd(0.15, 0.3) * (1 + dist / 40);
          }
        }
      } else if (w && w.def.type === 'knife') { if (dist < 2) e.trig = true; }
      else if (w && w.def.mag && w.mag === 0) e.reload();
    }
  }
  turnTo(yaw, pitch, dt, rate) {
    const e = this.e;
    const dy = angDiff(e.yaw, yaw), dp = pitch - e.pitch;
    const maxStep = rate * DEG * dt;
    const prop = 1 - Math.exp(-dt * 14);
    let sy = dy * prop, sp = dp * prop;
    const m = Math.hypot(sy, sp);
    if (m > maxStep) { sy *= maxStep / m; sp *= maxStep / m; }
    // küçük farklarda doğrudan yaklaş
    if (Math.abs(dy) < maxStep * 0.5) sy = dy * Math.min(1, dt * 22);
    if (Math.abs(dp) < maxStep * 0.5) sp = dp * Math.min(1, dt * 22);
    e.yaw += sy; e.pitch = Math.max(-1.4, Math.min(1.4, e.pitch + sp));
  }
  lookAt(x, y, z, dt, speedMul) {
    const e = this.e, eye = e.eye();
    const dx = x - eye.x, dz = z - eye.z;
    if (Math.hypot(dx, dz) < 0.3) return;
    this.turnTo(Math.atan2(-dx, -dz), Math.atan2(y - eye.y, Math.hypot(dx, dz)), dt, this.D.turn * 0.45 * (speedMul || 1));
  }
  lookAlongPath(dt) {
    const e = this.e;
    if (!this.path || this.pi >= this.path.length) return;
    // ileriye bak (birkaç metre)
    let p = this.path[this.pi];
    if (dist2(e.pos, p) < 4 && this.pi + 1 < this.path.length) p = this.path[this.pi + 1];
    this.lookAt(p.x, e.eye().y, p.z, dt, 0.55);
  }
  idleLook(dt, now) {
    const e = this.e;
    e.pitch *= 0.95;
  }
  followPath(dt, now) {
    const e = this.e, inp = e.input;
    if (!this.path || this.pi >= this.path.length) return;
    let wp = this.path[this.pi];
    const last = this.pi === this.path.length - 1;
    if (dist2(e.pos, wp) < (last ? 0.6 : 1.1)) { this.pi++; if (this.pi >= this.path.length) return; wp = this.path[this.pi]; }
    let dx = wp.x - e.pos.x, dz = wp.z - e.pos.z;
    const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    // takım arkadaşlarından ayrışma
    for (const o of G.entities) {
      if (o === e || !o.alive) continue;
      const ox = e.pos.x - o.pos.x, oz = e.pos.z - o.pos.z, od = Math.hypot(ox, oz);
      if (od < 1.2 && od > 0.01) { dx += ox / od * (1.2 - od) * 1.5; dz += oz / od * (1.2 - od) * 1.5; }
    }
    // yerel girişe çevir
    const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw), rx = Math.cos(e.yaw), rz = -Math.sin(e.yaw);
    inp.fwd = dx * fx + dz * fz; inp.side = dx * rx + dz * rz;
    const m = Math.hypot(inp.fwd, inp.side); if (m > 1) { inp.fwd /= m; inp.side /= m; }
    // yavaş yaklaşma: hedefe yakın ve tehlike bölgesindeyse yürü
    if (this.goal && this.goal.hold && dist2(e.pos, this.goal.p) < 6 && S.botDifficulty >= 2) inp.walk = true;
    // sıkışma tespiti
    const moved = Math.hypot(e.pos.x - this.lastPos.x, e.pos.z - this.lastPos.z);
    this.lastPos.x = e.pos.x; this.lastPos.z = e.pos.z;
    if (moved < 0.6 * dt) { this.stuckT += dt; } else this.stuckT = Math.max(0, this.stuckT - dt);
    if (this.stuckT > 0.8) inp.jump = true;
    if (this.stuckT > 2.0) { this.stuckT = 0; this.path = MAP.findPath(e.pos.x + rnd(-1, 1), e.pos.z + rnd(-1, 1), this.goal.p.x, this.goal.p.z) || []; this.pi = 0; }
  }
}

// ----- Bot satın alma -----
function botBuy(e, pistolRound, teamAvg) {
  const T = e.team === 'T';
  const buy = id => G.buy(e, id, true);
  if (pistolRound) {
    const r = Math.random();
    if (r < 0.4) buy('kevlar');
    else if (r < 0.65) { buy(T ? 'tec9' : 'fiveseven'); }
    else if (r < 0.85) { buy('p250'); buy('flash'); }
    else { buy('deagle'); }
    if (!T && e.money >= 400 && Math.random() < 0.3) buy('kit');
    return;
  }
  const rich = e.money >= 4200 || (e.inv.primary && e.money >= 1400);
  if (e.inv.primary) {
    // zaten silahı var: zırh & bomba
    if (e.armor < 50 || !e.helmet) buy(e.money >= 1000 ? 'helmet' : 'kevlar');
  } else if (rich || (teamAvg >= 3800 && e.money >= 3700)) {
    let id;
    if (e.money >= 6200 && Math.random() < 0.15) id = 'awp';
    else if (T) id = e.money >= 3700 ? (Math.random() < 0.85 ? 'ak47' : 'sg553') : 'galil';
    else id = e.money >= 4100 ? pick(['m4a4', 'm4a1s', 'm4a1s', 'aug']) : 'famas';
    buy(id); buy('helmet');
  } else if (e.money >= 2600 && teamAvg >= 2500) {
    // yarı alım (force)
    buy(pick(T ? ['galil', 'mac10', 'ump45', 'mp7', 'ssg08'] : ['famas', 'mp9', 'ump45', 'mp7', 'ssg08']));
    buy('kevlar');
  } else {
    // eco: bazen tabanca
    if (e.money >= 1200 && Math.random() < 0.5) buy(pick(['p250', 'deagle', T ? 'tec9' : 'fiveseven']));
  }
  // bombalar
  const nadeOrder = T ? ['smoke', 'flash', 'molotov', 'he', 'flash'] : ['smoke', 'flash', 'he', 'incendiary', 'flash'];
  for (const n of nadeOrder) { if (e.money >= 1200 && Math.random() < 0.6) buy(n); }
  if (!T && !e.kit && e.money >= 400 && Math.random() < 0.6) buy('kit');
  if (!e.inv.secondary) e.giveWeapon(T ? 'glock' : 'usp');
}
