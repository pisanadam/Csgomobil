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
    // insan benzeri kişilik
    this.pers = { aggr: Math.random(), chatty: 0.35 + Math.random() * 0.65, knifeRun: Math.random() < 0.75, patience: Math.random() };
    this.checked = new Map(); this.lookPt = null; this.lookUntil = 0; this.dangerAt = 0;
    this.swayPh = Math.random() * 10; this.retreatUntil = 0; this.dodge = null; this.trade = null; this.tradeUntil = 0;
    this.knifeRunning = false; this.rotSince = 0; this.rotSiteSeen = null; this.lastChat = -10; this.hpCalled = false;
  }
  // zorluk: oyuncunun takımındaki botlar ve rakip botlar ayrı ayarlanır (Ölüm Kalım'da herkes rakip)
  get lvl() { const ally = !G.ffa && G.player && this.e.group === G.player.group; const v = ally ? S.botDiffAlly : S.botDifficulty; return (v === undefined || v === null) ? 1 : v; }
  get D() { return BOT_DIFF[this.lvl] || BOT_DIFF[1]; }
  // ----- Tur başı -----
  roundStart(role) {
    this.role = role; this.path = null; this.goal = null; this.goalKey = '';
    this.target = null; this.lastSeen = null; this.noise = null; this.pendingNade = null;
    this.guardSpot = null; this.executed = false; this.siteSpot = null; this.saving = false;
    this.holdUntil = 0; this.roam = null;
    this.checked.clear(); this.lookPt = null; this.retreatUntil = 0; this.dodge = null; this.trade = null;
    this.knifeRunning = false; this.rotSince = 0; this.rotSiteSeen = null; this.hpCalled = false; this.wallbang = null;
  }
  // ----- İnsan benzeri yardımcılar -----
  pathRemaining() {
    const e = this.e; if (!this.path || this.pi >= this.path.length) return 0;
    let L = dist2(e.pos, this.path[this.pi]);
    for (let i = this.pi + 1; i < this.path.length; i++) L += dist2(this.path[i - 1], this.path[i]);
    return L;
  }
  threatNear(now, r) {
    const e = this.e;
    if (this.noise && now - this.noiseT < 5 && dist2(e.pos, this.noise) < r) return true;
    if (this.lastSeen && now - this.lastSeenT < 8 && dist2(e.pos, this.lastSeen) < r) return true;
    const kn = G.know[e.team];
    if (kn && !G.ffa) for (const [t, k] of kn) if (t.alive && now - k.time < 6 && dist2(e.pos, k.pos) < r) return true;
    return false;
  }
  knownEnemyPoint(now) {
    const e = this.e; const kn = G.know[e.team]; if (!kn || G.ffa) return null;
    let best = null, bd = 30;
    for (const [t, k] of kn) if (t.alive && now - k.time < 4) { const d = dist2(e.pos, k.pos); if (d < bd) { bd = d; best = k.pos; } }
    return best;
  }
  // Köşe/giriş kontrolü: hareket yönünde, görünen, yakın zamanda bakılmamış tehlike noktası
  pickDanger(now) {
    const e = this.e, eye = e.eye(); const pts = MAP.danger || [];
    let mx = 0, mz = 0;
    if (this.path && this.pi < this.path.length) { const p = this.path[this.pi]; mx = p.x - e.pos.x; mz = p.z - e.pos.z; }
    const ml = Math.hypot(mx, mz);
    const cands = [];
    for (const p of pts) {
      const d = dist2(eye, p); if (d < 3 || d > 32) continue;
      const ck = this.checked.get(p.key); if (ck && now - ck < 6) continue;
      if (ml > 0.5) { const dot = ((p.x - e.pos.x) * mx + (p.z - e.pos.z) * mz) / (d * ml); if (dot < 0.25) continue; }
      cands.push({ p, s: d * (0.7 + Math.random() * 0.6) });
    }
    cands.sort((a, b) => a.s - b.s);
    for (let i = 0; i < Math.min(4, cands.length); i++) {
      const p = cands[i].p; const tp = { x: p.x, y: 1.55, z: p.z };
      if (!Phys.blocked(eye, tp)) { this.lookPt = p; this.lookUntil = now + rnd(0.45, 1.1) * (1.3 - this.lvl * 0.12); return; }
      this.checked.set(p.key, now - 3); // görünmüyor: kısa süre atla
    }
    this.lookPt = null;
  }
  isLastAlive() { const e = this.e; return !G.ffa && !G.entities.some(o => o !== e && o.alive && o.team === e.team); }
  onTeammateDeath(v, k, now) {
    const e = this.e; if (!e.alive || this.target || v === e) return;
    if (dist2(e.pos, v.pos) < 22 && Math.random() < 0.55 + this.pers.aggr * 0.4) {
      this.trade = { x: v.pos.x, z: v.pos.z }; this.tradeUntil = now + rnd(3, 6);
      if (k && k.alive) { this.noise = { x: k.pos.x, y: k.pos.y, z: k.pos.z }; this.noiseT = now; }
    }
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
      if (!t.alive || t === e || G.ally(t, e)) continue;
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
        // insan "flick": hedefin biraz ötesine savrulup geri düzeltme
        const eye0 = e.eye(), hx = best.pos.x - eye0.x, hz = best.pos.z - eye0.z;
        const dyawDeg = angDiff(e.yaw, Math.atan2(-hx, -hz)) / DEG;
        const dpDeg = (Math.atan2(best.pos.y + 1.5 - eye0.y, Math.hypot(hx, hz)) - e.pitch) / DEG;
        const over = rnd(0.06, 0.2) * (1.25 - this.lvl * 0.2);
        const cap = v => Math.max(-9, Math.min(9, v));
        this.errX = cap(-dyawDeg * over) + Math.cos(a) * err * 0.6; this.errY = cap(dpDeg * over * 0.6) + Math.sin(a) * err * 0.4;
        if (!this.target && Math.random() < this.pers.chatty * 0.5) BotChat.spotted(e, best, now);
        this.aimHead = Math.random() < D.hs;
        this.burst = 0; this.crouchSpray = Math.random() < 0.35 && dd > 12;
      }
      this.target = best; this.tVis = bestVis; this.lastSeen = { x: best.pos.x, y: best.pos.y, z: best.pos.z }; this.lastSeenT = now;
    } else if (this.target) {
      const killed = !this.target.alive;
      if (killed || now - this.lastSeenT > 0.35) {
        if (killed) {
          if (Math.random() < this.pers.chatty * 0.3) BotChat.say(e, pick(['bir gitti!', 'tamamdır', `biri düştü, ${G.entities.filter(o => o.alive && !G.ally(o, e) && o !== e).length} kaldı`, 'aldım onu']), now);
          // başka tehdit varsa yer değiştir
          if (this.threatNear(now, 25) && Math.random() < 0.4 + this.lvl * 0.15) {
            const back = this.lastSeen || e.pos;
            this.dodge = { fwd: rnd(-1, -0.3), side: Math.random() < 0.5 ? -1 : 1, until: now + rnd(0.5, 1.0), look: { x: back.x, z: back.z } };
          }
        }
        // insan gibi: az önce duvarın arkasına kaçan rakibe duvardan ateş
        if (!killed && this.lastSeen && this.lvl >= 2 && e.def.mag && e.weapon().mag > 3 && Math.random() < 0.25 + 0.15 * this.lvl * this.pers.aggr) {
          const tp = { x: this.target.pos.x, y: this.target.pos.y + this.target.height * 0.6, z: this.target.pos.z };
          if (G.wallbangScale(e.eye(), tp, e.def) > 0.25) this.wallbang = { p: tp, until: now + rnd(0.5, 1.1), start: now + rnd(0.08, 0.2) };
        }
        this.target = null;
      }
    }
  }
  hear(pos, now, kind) {
    if (this.target) return;
    this.noise = { x: pos.x, y: pos.y || 0, z: pos.z }; this.noiseT = now;
  }
  onDamaged(att, now) {
    if (!att || att === this.e || G.ally(att, this.e)) return;
    if (this.e.alive && this.e.hp < 35 && !this.hpCalled && Math.random() < this.pers.chatty) { this.hpCalled = true; BotChat.say(this.e, pick([`canım ${Math.ceil(this.e.hp)}, destek!`, `vuruldum, ${Math.ceil(this.e.hp)} kaldı`, 'az canım var, geri çekiliyorum']), now); }
    if (!this.target) { this.noise = { x: att.pos.x, y: att.pos.y, z: att.pos.z }; this.noiseT = now + 0.5; }
  }
  // ----- Hedef seçimi (strateji) -----
  decideGoal(now) {
    const e = this.e, B = G.bomb, R = G.round;
    const tLeft = R.timeLeft;
    if (G.dm) {
      if (this.lastSeen && now - this.lastSeenT < 4) return { key: 'hunt', p: this.lastSeen };
      if (!this.roam || dist2(e.pos, this.roam) < 2 || now > this.roamUntil) {
        let near = null, nd = 1e9;
        for (const o of G.entities) if (o.alive && o !== e && !G.ally(o, e)) { const d = dist2(o.pos, e.pos); if (d < nd) { nd = d; near = o; } }
        this.roam = near && Math.random() < 0.6 ? G.randomNear(near.pos, 2, 10) : G.randomNear(e.pos, 15, 45);
        this.roamUntil = now + 12 + Math.random() * 8;
      }
      return { key: 'roam', p: this.roam };
    }
    // oyuncunun telsiz komutu
    const od = this.order;
    if (od && now < od.until && B.state !== 'planted' && G.player && G.player.alive && !(e.inv.bomb && this.executed)) {
      if (od.type === 'follow') {
        const pp = G.player.pos;
        if (!od.spot || dist2(od.at || pp, pp) > 3.5) { od.at = { x: pp.x, z: pp.z }; od.spot = G.randomNear(pp, 1.6, 3.6); }
        return { key: 'follow', p: od.spot, hold: true, look: { x: pp.x - Math.sin(G.player.yaw) * 15, z: pp.z - Math.cos(G.player.yaw) * 15 } };
      }
      if (od.type === 'hold') return { key: 'ordhold', p: od.p, look: od.look, hold: true };
      if (od.type === 'push') { const kp = this.knownEnemyPoint(now); if (kp) return { key: 'push', p: kp }; const st = MAP.POS.tStage.mid[0]; return { key: 'push', p: st }; }
    } else if (od) this.order = null;
    if (this.trade && now < this.tradeUntil && B.state !== 'planted') return { key: 'trade', p: this.trade };
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
      // bilgiye tepki gecikmeli (insan gibi): önce duyar, 1-3 sn sonra döner
      if (k && k.site !== this.rotSiteSeen) { this.rotSiteSeen = k.site; this.rotSince = now + rnd(1, 3); }
      if (k && k.site !== this.role.site && now > this.rotSince && (this.role.rotate || k.count >= 2)) {
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
    if (G.round.phase === 'freeze') { this.freezeFidget(dt, now); return; }
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
      if (!this.target && (now > this.lookUntil || !this.lookPt)) {
        if (this.lookPt) this.checked.set(this.lookPt.key, now);
        this.pickDanger(now);
      }
    }
    // duvar arkasına ateş (wallbang)
    if (this.wallbang && !this.target) {
      const wbk = this.wallbang;
      if (now > wbk.until) this.wallbang = null;
      else {
        const eye = e.eye(), dx = wbk.p.x - eye.x, dz = wbk.p.z - eye.z;
        this.turnTo(Math.atan2(-dx, -dz) + e.punch.x * this.D.spray * DEG, Math.atan2(wbk.p.y - eye.y, Math.hypot(dx, dz)) - e.punch.y * this.D.spray * DEG, dt, this.D.turn);
        if (now > wbk.start) { if (e.def.auto) e.trig = true; else { this.semiToggle = !this.semiToggle; e.trig = this.semiToggle; } }
        return;
      }
    }
    // çatışma sonrası kaçış/yer değiştirme
    if (this.dodge && now < this.dodge.until && !this.target) {
      inp.fwd = this.dodge.fwd; inp.side = this.dodge.side; inp.walk = false;
      this.lookAt(this.dodge.look.x, 1.5, this.dodge.look.z, dt, 1);
      return;
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
    // sessiz yürüme: tehlike yakınsa ya da son kalan oyuncuysa
    if (!atGoal && !this.knifeRunning && this.lvl >= 1 && (this.threatNear(now, 16) || (this.isLastAlive() && this.pers.patience > 0.3)) && !(g.defuse && G.bomb.timer < 15)) inp.walk = true;
    // bakış (nişangah yerleşimi: kafa hizası)
    const kp = this.knownEnemyPoint(now);
    if (this.noise && now - this.noiseT < 3) this.lookAt(this.noise.x, this.noise.y + 1.5, this.noise.z, dt, 1);
    else if (this.lastSeen && now - this.lastSeenT < 3) this.lookAt(this.lastSeen.x, this.lastSeen.y + 1.5, this.lastSeen.z, dt, 1);
    else if (kp) this.lookAt(kp.x, 1.55, kp.z, dt, 0.8);
    else if (atGoal && g.look) {
      // tutuşta: ana açı ağırlıklı, ara sıra diğer köşelere göz at
      if (this.lookPt && now < this.lookUntil && Math.random() < 0.985 && this.scanMode) this.lookAt(this.lookPt.x, 1.55, this.lookPt.z, dt, 0.5);
      else { this.scanMode = Math.random() < 0.012; this.lookAt(g.look.x, 1.55, g.look.z, dt, 0.6); }
      this.sway(dt, now);
    }
    else if (!atGoal && this.lookPt && now < this.lookUntil && !this.knifeRunning) this.lookAt(this.lookPt.x, 1.55, this.lookPt.z, dt, 0.75);
    else if (!atGoal) this.lookAlongPath(dt);
    else this.idleLook(dt, now);
    // ateş edilmiyorsa ve şarjör azsa doldur
  }
  manageWeapon(now) {
    const e = this.e;
    if (e.slot === 'bomb' && !(this.goal && this.goal.plant)) e.switchTo(e.bestSlot());
    if (e.slot === 'grenade' && !this.pendingNade) e.switchTo(e.bestSlot());
    // bıçakla koşma (daha hızlı): uzun, güvenli yolda
    const longRun = this.pathRemaining() > 22 && !(this.goal && (this.goal.plant || this.goal.hold && dist2(e.pos, this.goal.p) < 18));
    const safe = !this.target && !this.threatNear(now, 32) && now - this.lastSeenT > 6 && G.round.phase === 'live';
    if (this.pers.knifeRun && this.lvl >= 1 && safe && longRun && !this.pendingNade && e.reloadT <= 0 && !G.dm) {
      if (e.slot !== 'knife') { e.switchTo('knife'); this.knifeRunning = true; }
    } else if (this.knifeRunning) { this.knifeRunning = false; e.switchTo(e.bestSlot()); }
    if (e.slot === 'knife' && e.bestSlot() !== 'knife' && !this.knifeRunning) e.switchTo(e.bestSlot());
    const w = e.weapon();
    if (w && w.def.mag) {
      if (!this.target && w.mag < w.def.mag * 0.5 && w.reserve > 0 && now - this.lastSeenT > 1.5) e.reload();
      if (w.mag === 0 && w.reserve === 0) {
        if (e.slot === 'primary' && e.inv.secondary) e.switchTo('secondary'); else if (e.slot !== 'knife') e.switchTo('knife');
      }
      // yakın mesafede boş şarjör -> tabancaya geç
      if (this.target && w.mag === 0 && e.slot === 'primary' && e.inv.secondary && e.inv.secondary.mag > 0 && dist2(e.pos, this.target.pos) < 12 && this.lvl >= 2) e.switchTo('secondary');
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
    if (this.knifeRunning) { this.knifeRunning = false; e.switchTo(e.bestSlot()); }
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
    const def = e.def;
    // menzil dışı (tabanca/SMG/pompalı/bıçak): ateş etme, hedefe doğru yaklaş
    const effR = { pistol: 42, smg: 50, shotgun: 20, knife: 2.2 }[def.type] || 1e9;
    if (dist > effR) {
      if (!(now < this.chaseAt)) { this.chaseAt = now + 0.6; this.path = MAP.findPath(e.pos.x, e.pos.z, t.pos.x, t.pos.z) || []; this.pi = 0; this.goalKey = 'chase'; }
      this.followPath(dt, now);
      return;
    }
    // geri çekilme: canı az ya da şarjör boşken kapağa çekil (ateş etmeye devam ederek)
    const w0 = e.weapon();
    const emptyMag = w0 && w0.def.mag && w0.mag === 0 && w0.reserve > 0;
    if (!this.retreatUntil || now > this.retreatUntil + 2) {
      const lowHp = e.hp < 35 && dist > 8 && !this.isLastAlive() && Math.random() < 0.02 * (0.5 + this.lvl * 0.5) * (1.2 - this.pers.aggr);
      if (lowHp || (emptyMag && dist > 6)) {
        this.retreatUntil = now + rnd(0.9, 1.6);
        if (emptyMag) { e.reload(); if (Math.random() < this.pers.chatty * 0.4) BotChat.say(e, pick(['dolduruyorum!', 'şarjör boş, kapat beni', 'reload!']), now); }
      }
    }
    if (now < this.retreatUntil) {
      const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw);
      inp.fwd = -1; inp.side = this.strafeDir * 0.5;
      // geri çekilirken arkada duvar varsa yana kay
      if (Phys.blocked(eye, { x: eye.x - fx * 1.2, y: eye.y, z: eye.z - fz * 1.2 })) { inp.fwd = 0; inp.side = this.strafeDir; }
    }
    // hareket: counter-strafe & ADAD
    const wantShoot = now >= this.reactAt && now >= this.pauseUntil && e.flashT < 0.6;
    const stopForShot = Math.random() < D.counter || def.type === 'sniper';
    this.strafeT -= dt;
    if (this.strafeT <= 0) { this.strafeDir = -this.strafeDir; this.strafeT = rnd(0.35, 0.8); }
    if (now < this.retreatUntil) { /* geri çekilme hareketi yukarıda */ }
    else if (wantShoot && stopForShot && def.type !== 'smg' && def.type !== 'shotgun') {
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
    e.pitch += (0 - e.pitch) * Math.min(1, dt * 2);
    this.sway(dt, now);
  }
  sway(dt, now) {
    const e = this.e;
    this.swayPh += dt;
    e.yaw += Math.sin(this.swayPh * 0.9) * 0.12 * dt + Math.sin(this.swayPh * 2.3) * 0.05 * dt;
    e.pitch += Math.sin(this.swayPh * 1.3) * 0.03 * dt;
  }
  freezeFidget(dt, now) {
    // raunt başında: etrafa bakınma, takım arkadaşına dönme
    const e = this.e;
    if (!this.fidgetT || now > this.fidgetT) {
      this.fidgetT = now + rnd(0.6, 2.2);
      const mates = G.entities.filter(o => o !== e && o.alive && G.ally(o, e));
      if (mates.length && Math.random() < 0.4) { const m = pick(mates); this.fidgetLook = { x: m.pos.x, y: 1.5, z: m.pos.z }; }
      else { const a = e.yaw + rnd(-1.2, 1.2); this.fidgetLook = { x: e.pos.x - Math.sin(a) * 10, y: rnd(0.5, 2.5), z: e.pos.z - Math.cos(a) * 10 }; }
    }
    if (this.fidgetLook) this.lookAt(this.fidgetLook.x, this.fidgetLook.y, this.fidgetLook.z, dt, 0.4);
  }
  followPath(dt, now) {
    const e = this.e, inp = e.input;
    if (!this.path || this.pi >= this.path.length) return;
    let wp = this.path[this.pi];
    const last = this.pi === this.path.length - 1;
    if (dist2(e.pos, wp) < (last ? 0.6 : 1.1)) { this.pi++; if (this.pi >= this.path.length) return; wp = this.path[this.pi]; }
    let dx = wp.x - e.pos.x, dz = wp.z - e.pos.z;
    const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    // hafif kıvrımlı hareket
    this.swayPh += dt;
    const wob = Math.sin(this.swayPh * 1.7 + this.e.id) * 0.18 * (L > 3 ? 1 : 0);
    const ndx = dx - dz * wob, ndz = dz + dx * wob; dx = ndx; dz = ndz;
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
    if (this.goal && this.goal.hold && dist2(e.pos, this.goal.p) < 6 && this.lvl >= 2) inp.walk = true;
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
  const T = e.team === 'T'; e._eco = false;
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
    e._eco = true;
    // eco: bazen tabanca
    if (e.money >= 1200 && Math.random() < 0.5) buy(pick(['p250', 'deagle', T ? 'tec9' : 'fiveseven']));
  }
  // bombalar
  const nadeOrder = T ? ['smoke', 'flash', 'molotov', 'he', 'flash'] : ['smoke', 'flash', 'he', 'incendiary', 'flash'];
  for (const n of nadeOrder) { if (e.money >= 1200 && Math.random() < 0.6) buy(n); }
  if (!T && !e.kit && e.money >= 400 && Math.random() < 0.6) buy('kit');
  if (!e.inv.secondary) e.giveWeapon(T ? 'glock' : 'usp');
}

// ----- Takım telsizi / sohbet (insan benzeri konuşmalar) -----
const BotChat = {
  lastGlobal: -10, lastSpot: { T: -10, CT: -10 },
  zoneName(p) {
    const z = MAP.zoneAt(p.x, p.z);
    if (z === 'A') return "A'da"; if (z === 'B') return "B'de";
    if (z === 'T') return 'T doğmada';
    if (z === 'C') return 'CT doğmada';
    const P = MAP.POS;
    const dA = dist2(p, P.site.A), dB = dist2(p, P.site.B);
    if (Math.min(dA, dB) < 20) return (dA < dB ? 'A' : 'B') + ' girişinde';
    if (z === 'u') return { desert: 'tünelde', harbor: 'geçitte', snow: 'binanın içinde', town: 'kemer altında' }[MAP.info.theme] || 'içeride';
    return 'ortada';
  },
  say(e, text, now, all) {
    now = now === undefined ? G.now : now;
    const b = e.bot;
    if (b && now - b.lastChat < 3.5) return;
    if (now - this.lastGlobal < 0.9) return;
    if (b) b.lastChat = now; this.lastGlobal = now;
    if (typeof UI !== 'undefined' && UI.chat) UI.chat(e, text, all || G.ffa);
  },
  spotted(e, t, now) {
    if (G.ffa || now - this.lastSpot[e.team] < 6) return;
    this.lastSpot[e.team] = now;
    const n = G.entities.filter(o => o.alive && !G.ally(o, e) && o !== e && dist2(o.pos, t.pos) < 8).length;
    const where = this.zoneName(t.pos);
    this.say(e, n > 1 ? `${n} kişi ${where}!` : pick([`biri ${where}!`, `düşman ${where}`, `${where} birini gördüm`]), now);
  },
  roundStart(plan, ecoTeams) {
    if (G.dm) return;
    const Tb = G.bots.filter(b => b.e.team === 'T'), Cb = G.bots.filter(b => b.e.team === 'CT');
    const later = (fn, d) => setTimeout(() => { if (G.running && !G.paused) fn(); }, d);
    const to = plan === 'A' ? "A'ya" : "B'ye";
    if (Tb.length) later(() => this.say(pick(Tb).e, pick([`${to} gidiyoruz, beraber girelim`, `${plan} oynayalım`, `hadi ${to}, hızlı girelim`])), 1500);
    if (Cb.length) later(() => this.say(pick(Cb).e, pick(['ben bakıyorum burayı', 'pozisyon alın', 'sessiz tutalım'])), 2600);
    for (const t of ['T', 'CT']) if (ecoTeams[t]) { const bs = t === 'T' ? Tb : Cb; if (bs.length) later(() => this.say(pick(bs).e, pick(['bu raunt eko, para biriktirin', 'eko yapıyoruz', 'alım yok bu el'])), 3600); }
  },
  planted(site) {
    const Cb = G.bots.filter(b => b.e.alive && b.e.team === 'CT'), Tb = G.bots.filter(b => b.e.alive && b.e.team === 'T');
    const at = site === 'A' ? "A'da" : "B'de", to = site === 'A' ? "A'ya" : "B'ye";
    if (Cb.length) this.say(pick(Cb).e, pick([`bomba ${at}, dönün!`, `${site} kuruldu, geri alalım!`, `hepimiz ${to}!`]));
    else if (Tb.length) this.say(pick(Tb).e, pick(['kuruldu, pozisyon alın', 'bomba aktif, saklanın', 'iyi, şimdi bekleyelim']));
  },
  death(v, k) {
    if (!v.bot || Math.random() > v.bot.pers.chatty * 0.6) return;
    const t = k && k !== v && k.alive ? `${k.name} ${this.zoneName(k.pos)}, canı ${Math.ceil(k.hp)}` : null;
    this.say(v, (t && Math.random() < 0.6) ? t : pick(['ah be...', 'nereden çıktı o?', 'çok şanslıydı', 'kafadan aldı', 'üzgünüm çocuklar']));
  },
  roundEnd(win) {
    if (G.dm) return;
    const winners = G.bots.filter(b => b.e.team === win), losers = G.bots.filter(b => b.e.team !== win);
    if (winners.length && Math.random() < 0.8) setTimeout(() => this.say(pick(winners).e, pick(['güzel raunt!', 'nasıl ama', 'iyi oynadık', 'devam böyle']), undefined), 700);
    if (losers.length && Math.random() < 0.7) setTimeout(() => this.say(pick(losers).e, pick(['toparlanalım', 'sonraki bizim', 'yaa az kaldı', 'olur böyle']), undefined), 1700);
  },
  clutch(e) { this.say(e, pick([`1v${G.entities.filter(o => o.alive && !G.ally(o, e) && o !== e).length}, sessiz olun`, 'son kaldım, deniyorum', 'yalnızım, bakalım'])); },
};
