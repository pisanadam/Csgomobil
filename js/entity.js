// Oyuncu & bot ortak varlık sınıfı: hareket, envanter, ateş, hasar
'use strict';
const DEG = Math.PI / 180;
const MOVE = { scale: 6.2 / 250, friction: 5.2, stop: 1.9, accel: 5.5, airAccel: 12, airCap: 0.8, gravity: 20, jumpV: 7.0 };
const STAND_H = 1.8, CROUCH_H = 1.4, EYE_STAND = 1.66, EYE_CROUCH = 1.24;
let ENT_ID = 0;
const SPRAY_ASSIST = [0, 0.35, 0.6, 0.85]; // oyuncu için geri tepme azaltma oranı
function dirFromAngles(yaw, pitch) {
  const cp = Math.cos(pitch);
  return { x: -Math.sin(yaw) * cp, y: Math.sin(pitch), z: -Math.cos(yaw) * cp };
}
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

class Entity {
  constructor(name, team, isPlayer) {
    this.id = ++ENT_ID;
    this.name = name; this.team = team; this.isPlayer = !!isPlayer;
    this.pos = { x: 0, y: 0, z: 0 }; this.vel = { x: 0, y: 0, z: 0 };
    this.yaw = 0; this.pitch = 0;
    this.height = STAND_H; this.crouch = 0;
    this.onGround = true;
    this.hp = 100; this.armor = 0; this.helmet = false; this.kit = false;
    this.money = ECON.start; this.alive = true;
    this.inv = { primary: null, secondary: null, knife: { def: WEAPONS.knife }, grenades: [], bomb: false };
    this.slot = 'secondary'; this.prevSlot = 'knife';
    this.deployT = 0; this.reloadT = 0; this.nextFire = 0;
    this.trig = false; this.trigLatch = false;
    this.recoilIdx = 0; this.lastShot = -10; this.fireInacc = 0;
    this.punch = { x: 0, y: 0 };
    this.scoped = 0; this.rescopeAt = 0; this.rescopeLevel = 0;
    this.input = { fwd: 0, side: 0, walk: false, crouch: false, jump: false, use: false };
    this.stats = { kills: 0, deaths: 0, assists: 0, hs: 0, dmg: 0, mvp: 0 };
    this.dmgBy = new Map();
    this.flashT = 0; this.flashMax = 0;
    this.stepAcc = 0; this.plantT = 0; this.defuseT = 0;
    this.deathT = 0; this.spottedUntil = 0; this.lastHurt = -10;
    this.model = null; this.animPh = 0;
    this.nadeCook = false;
    this.group = 0; // maç grubu (yarı değişiminde taraf değişir)
  }
  // ----- Envanter -----
  weapon(slot) {
    const s = slot || this.slot;
    if (s === 'grenade') return this.inv.grenades.length ? { def: WEAPONS[this.inv.grenades[0]] } : null;
    if (s === 'bomb') return this.inv.bomb ? { def: WEAPONS.c4 } : null;
    return this.inv[s];
  }
  get def() { const w = this.weapon(); return w ? w.def : WEAPONS.knife; }
  giveWeapon(id, full) {
    const def = WEAPONS[id];
    if (def.slot === 'grenade') {
      const cnt = this.inv.grenades.filter(g => g === id).length;
      if (this.inv.grenades.length >= 4 || cnt >= (def.max || 1)) return false;
      if (def.nade === 'fire' && this.inv.grenades.some(g => WEAPONS[g].nade === 'fire')) return false;
      this.inv.grenades.push(id); return true;
    }
    const w = { def, mag: def.mag, reserve: def.reserve };
    this.inv[def.slot] = w;
    return w;
  }
  switchTo(slot, force) {
    if (!this.alive) return;
    if (slot === 'grenade' && this.slot === 'grenade' && this.inv.grenades.length > 1 && !force) {
      // bombalar arasında dolaş
      this.inv.grenades.push(this.inv.grenades.shift());
      this.deployT = 0.45; this.onEquip(); return;
    }
    if (!this.weapon(slot)) return;
    if (slot === this.slot && !force) return;
    if (this.slot !== slot) this.prevSlot = this.slot;
    this.slot = slot; this.reloadT = 0; this.scoped = 0; this.rescopeAt = 0; this.zoomed = false;
    this.deployT = slot === 'knife' ? 0.5 : (this.def.type === 'sniper' ? 1.1 : 0.85);
    this.plantT = 0;
    this.onEquip();
  }
  bestSlot() { return this.inv.primary ? 'primary' : this.inv.secondary ? 'secondary' : 'knife'; }
  onEquip() {
    if (this.model) Models.setCharGun(this.model, this.def);
    if (this.isPlayer && typeof G !== 'undefined' && G.onPlayerEquip) G.onPlayerEquip(this);
  }
  resetForDeath() {
    this.inv = { primary: null, secondary: null, knife: { def: WEAPONS.knife }, grenades: [], bomb: false };
    this.armor = 0; this.helmet = false; this.kit = false;
  }
  // ----- Hareket -----
  maxSpeed() {
    let sp = this.def.speed || 250;
    if (this.scoped && this.def.type === 'sniper') sp *= 0.5;
    sp *= MOVE.scale;
    if (this.crouch > 0.5) sp *= 0.34; else if (this.input.walk) sp *= 0.52;
    if (this.plantT > 0 || this.defuseT > 0) sp = 0;
    if (this.isPlayer && Cheats.c.speed) sp *= 1.6;
    return sp;
  }
  hspeed() { return Math.hypot(this.vel.x, this.vel.z); }
  updateMovement(dt) {
    const inp = this.input;
    // çömelme
    const wantC = inp.crouch || this.defuseT > 0 || this.plantT > 0;
    if (wantC) this.crouch = Math.min(1, this.crouch + dt * 8);
    else if (this.crouch > 0) {
      if (Phys.headroom(this, STAND_H)) this.crouch = Math.max(0, this.crouch - dt * 8);
    }
    this.height = STAND_H - (STAND_H - CROUCH_H) * this.crouch;
    // istek yönü
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    let wx = fx * inp.fwd + rx * inp.side, wz = fz * inp.fwd + rz * inp.side;
    let wl = Math.hypot(wx, wz);
    const mag = Math.min(1, wl);
    if (wl > 0.001) { wx /= wl; wz /= wl; }
    const maxSp = this.maxSpeed() * mag;
    if (this.onGround) {
      // sürtünme
      const sp = this.hspeed();
      if (sp > 0.001) {
        const drop = Math.max(sp, MOVE.stop) * MOVE.friction * dt;
        const ns = Math.max(0, sp - drop) / sp;
        this.vel.x *= ns; this.vel.z *= ns;
      }
      this.accelerate(wx, wz, maxSp, MOVE.accel, dt);
      if (inp.jump && this.crouch < 0.5 && this.plantT <= 0) {
        this.vel.y = MOVE.jumpV; this.onGround = false; inp.jump = false;
        this.jumpTime = performance.now();
      }
    } else {
      this.accelerate(wx, wz, Math.min(maxSp, MOVE.airCap), MOVE.airAccel * (this.maxSpeed() / MOVE.airCap), dt);
      this.vel.y -= MOVE.gravity * dt;
    }
    if (this.onGround) this.vel.y -= MOVE.gravity * dt;
    const wasAir = !this.onGround, vy = this.vel.y;
    this.blocked = false;
    Phys.moveBody(this, this.vel.x * dt, this.vel.y * dt, this.vel.z * dt);
    if (wasAir && this.onGround && vy < -6 && typeof G !== 'undefined') G.onLand(this, vy);
    // adım sesleri
    const hs = this.hspeed();
    if (this.onGround && hs > 3.0 && !inp.walk && this.crouch < 0.5) {
      this.stepAcc += hs * dt;
      if (this.stepAcc > 2.3) { this.stepAcc = 0; if (typeof G !== 'undefined') G.onFootstep(this); }
    }
  }
  accelerate(wx, wz, wishSpeed, accel, dt) {
    const cur = this.vel.x * wx + this.vel.z * wz;
    const add = wishSpeed - cur; if (add <= 0) return;
    const acc = Math.min(accel * dt * Math.max(wishSpeed, 1.5), add);
    this.vel.x += acc * wx; this.vel.z += acc * wz;
  }
  eye() { return { x: this.pos.x, y: this.pos.y + EYE_STAND - (EYE_STAND - EYE_CROUCH) * this.crouch, z: this.pos.z }; }
  // ----- İsabet sapması (derece) -----
  inaccuracy() {
    const d = this.def; if (!d.mag) return 0;
    if (this.isPlayer && Cheats.c.nospread) return 0;
    let base;
    if (d.type === 'sniper') base = this.scoped ? d.scopedInacc : d.inacc;
    else base = this.crouch > 0.5 ? d.crouchInacc : d.inacc;
    if (this.scoped && d.type !== 'sniper') base *= 0.8;
    const ms = this.maxSpeedRaw();
    const frac = Math.max(0, Math.min(1, (this.hspeed() - ms * 0.34) / (ms * 0.66)));
    let inc = base + d.moveInacc * frac + this.fireInacc;
    if (!this.onGround) inc += d.type === 'sniper' ? 15 : 9;
    return inc;
  }
  maxSpeedRaw() { return (this.def.speed || 250) * MOVE.scale; }
  // ----- Ateş -----
  canAct() { return this.alive && this.deployT <= 0; }
  updateWeapon(dt, now) {
    if (this.deployT > 0) this.deployT -= dt;
    const d = this.def;
    // geri tepme toparlanma
    if (now - this.lastShot > (d.interval || 0.1) * 1.2) {
      this.recoilIdx = Math.max(0, this.recoilIdx - dt * (this.recoilIdx * 3.5 + 5));
    }
    this.fireInacc *= Math.exp(-dt * 3 / (d.recover || 0.35));
    const pat = d.pattern;
    if (pat) {
      const i0 = Math.min(pat.length - 1, Math.floor(this.recoilIdx)), i1 = Math.min(pat.length - 1, i0 + 1), f = this.recoilIdx - Math.floor(this.recoilIdx);
      const ra = this.isPlayer ? (Cheats.c.norecoil ? 0 : 1 - SPRAY_ASSIST[S.sprayAssist || 0]) : 1;
      const tx = (pat[i0][0] + (pat[i1][0] - pat[i0][0]) * f) * ra, ty = (pat[i0][1] + (pat[i1][1] - pat[i0][1]) * f) * ra;
      const k = Math.min(1, dt * 25);
      this.punch.x += (tx - this.punch.x) * k; this.punch.y += (ty - this.punch.y) * k;
    } else { this.punch.x *= 0.8; this.punch.y *= 0.8; }
    // şarjör değiştirme
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      const w = this.weapon();
      if (this.reloadT <= 0 && w && w.def.mag) {
        if (w.def.shellReload) {
          if (w.reserve > 0 && w.mag < w.def.mag) { w.mag++; w.reserve--; }
          if (w.mag < w.def.mag && w.reserve > 0) { this.reloadT = w.def.reload; if (typeof G !== 'undefined') G.sound('click', this, 1400); }
        } else {
          const need = w.def.mag - w.mag, take = Math.min(need, w.reserve);
          w.mag += take; w.reserve -= take;
        }
      }
    }
    if (this.autoReloadAt && now >= this.autoReloadAt) { this.autoReloadAt = 0; if (this.slot === 'primary' || this.slot === 'secondary') this.reload(); }
    // tekrar dürbün
    if (this.rescopeAt && now >= this.rescopeAt) { this.scoped = this.rescopeLevel; this.rescopeAt = 0; }
    // tetik
    if (this.trig) this.tryFire(now);
    else this.trigLatch = false;
    if (this.flashT > 0) this.flashT -= dt;
  }
  reload() {
    const w = this.weapon(); if (!w || !w.def.mag) return;
    if (this.reloadT > 0 || w.mag >= w.def.mag || w.reserve <= 0 || !this.alive) return;
    this.reloadT = w.def.shellReload ? w.def.reload + 0.3 : w.def.reload;
    this.scoped = 0; this.rescopeAt = 0;
    if (typeof G !== 'undefined') G.sound('reload', this);
  }
  tryFire(now) {
    if (!this.canAct() || now < this.nextFire) return;
    const w = this.weapon(); if (!w) return;
    const d = w.def;
    if (d.type === 'knife') {
      if (this.trigLatch && false) return;
      this.nextFire = now + 0.45; G.knifeAttack(this, false); return;
    }
    if (d.type === 'grenade') {
      if (this.trigLatch) return;
      this.trigLatch = true; G.throwGrenade(this, d, 1); return;
    }
    if (d.type === 'bomb') return;
    if (this.reloadT > 0) {
      if (d.shellReload && w.mag > 0) this.reloadT = 0; else return;
    }
    if (!d.auto && this.trigLatch) return;
    this.trigLatch = true;
    if (w.mag <= 0) { G.sound('click', this, 900); this.nextFire = now + 0.25; this.reload(); return; }
    if (!(this.isPlayer && Cheats.c.ammo)) w.mag--;
    this.nextFire = now + d.interval;
    const inacc = this.inaccuracy();
    const eye = this.eye();
    const pellets = d.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = d.pellets ? Math.sqrt(Math.random()) * d.pelletSpread + Math.random() * inacc * 0.5 : Math.random() * inacc;
      const sx = Math.cos(a) * rr, sy = Math.sin(a) * rr;
      const yaw = this.yaw - (this.punch.x + sx) * DEG;
      const pitch = this.pitch + (this.punch.y + sy) * DEG;
      G.fireBullet(this, eye, dirFromAngles(yaw, pitch), d, i === 0);
    }
    this.lastShot = now;
    this.recoilIdx += 1;
    this.fireInacc = Math.min(this.fireInacc + d.fireInacc * (this.isPlayer ? 1 - SPRAY_ASSIST[S.sprayAssist || 0] * 0.6 : 1), 8);
    G.onShot(this, d);
    if (d.bolt) {
      if (this.scoped) { this.rescopeLevel = this.scoped; this.scoped = 0; this.rescopeAt = now + d.interval * 0.85; }
    }
    if (w.mag === 0 && w.reserve > 0) { this.autoReloadAt = now + 0.35; }
  }
  toggleScope() {
    const d = this.def;
    if (!d.scope) { if (d.mag) { this.zoomed = !this.zoomed; if (typeof G !== 'undefined') G.sound('click', this, 2000); } return; }
    if (this.reloadT > 0 || this.deployT > 0) return;
    this.rescopeAt = 0;
    this.scoped = (this.scoped + 1) % (d.scope.length + 1);
    if (typeof G !== 'undefined') G.sound('click', this, 2200);
  }
  // ----- Hasar -----
  takeDamage(dmg, attacker, def, group, dir, now) {
    if (!this.alive) return 0;
    if (this.protectUntil && now < this.protectUntil) return 0;
    if (this.isPlayer && Cheats.c.god) return 0;
    let d = dmg;
    const armored = this.armor > 0 && group !== 'legs' && (group !== 'head' || this.helmet) && group !== 'fire';
    if (armored && def && def.pen !== undefined) {
      const hd = d * def.pen;
      this.armor = Math.max(0, this.armor - (d - hd) * 0.5);
      d = hd;
    } else if (armored && group === 'blast') { const hd = d * 0.5; this.armor = Math.max(0, this.armor - hd * 0.5); d = hd; }
    d = Math.max(1, Math.round(d));
    const real = Math.min(this.hp, d);
    this.hp -= d; this.lastHurt = now;
    if (attacker && attacker !== this) {
      this.dmgBy.set(attacker, (this.dmgBy.get(attacker) || 0) + real);
      attacker.stats.dmg += real;
    }
    // vurulma yavaşlatması (tagging)
    this.vel.x *= 0.45; this.vel.z *= 0.45;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; return real; }
    return real;
  }
}
