// Hile Simülasyonu (deneysel) — yalnızca bu çevrimdışı oyunda botlara karşı, eğlence/deneme amaçlı
'use strict';
const Cheats = {
  c: {
    aimbot: false, aimKey: 'fire', aimFov: 15, aimSmooth: 0.4, aimBone: 'head', aimWalls: false,
    trigger: false, trigDelay: 60,
    esp: false, espBox: true, espName: true, espHp: true, espDist: true, espWeapon: true, espLines: false, espTeam: false, espBomb: true,
    chams: false, radar: false,
    norecoil: false, nospread: false,
    god: false, ammo: false, speed: false,
    spin: false, third: false,
  },
  trigSince: 0, flip: false, aimTarget: null,
  load() {
    try { const r = localStorage.getItem('taktikops_cheats'); if (r) Object.assign(this.c, JSON.parse(r)); } catch (e) {}
  },
  save() { try { localStorage.setItem('taktikops_cheats', JSON.stringify(this.c)); } catch (e) {} },
  any() {
    const c = this.c;
    return c.aimbot || c.trigger || c.esp || c.chams || c.radar || c.norecoil || c.nospread || c.god || c.ammo || c.speed || c.spin || c.third;
  },
  enemy(e) { const p = G.player; return e !== p && e.alive && !G.ally(e, p); },
  aimPoint(e) {
    const h = e.height;
    if (this.c.aimBone === 'head') return { x: e.pos.x, y: e.pos.y + h - 0.12, z: e.pos.z };
    return { x: e.pos.x, y: e.pos.y + h * 0.62, z: e.pos.z };
  },
  // ---------- her kare (oyun mantığı) ----------
  update(dt) {
    const p = G.player, c = this.c;
    this.aimTarget = null;
    if (!p || !p.alive || G.round.phase === 'end') { this.trigSince = 0; return; }
    if (c.ammo) { const w = p.weapon(); if (w && w.def.mag && w.reserve < w.def.reserve) w.reserve = w.def.reserve; }
    const eye = p.eye();
    // --- Aimbot ---
    if (c.aimbot && (c.aimKey === 'always' || p.trig || Input.fireHeld)) {
      const f = dirFromAngles(p.yaw, p.pitch);
      let best = null, bestA = c.aimFov * DEG / 2, bestPt = null;
      for (const e of G.entities) {
        if (!this.enemy(e) || (e.protectUntil && G.now < e.protectUntil)) continue;
        const pt = this.aimPoint(e);
        if (!c.aimWalls && (Phys.blocked(eye, pt) || FX.smokeBlocks(eye, pt))) continue;
        const dx = pt.x - eye.x, dy = pt.y - eye.y, dz = pt.z - eye.z, d = Math.hypot(dx, dy, dz);
        const a = Math.acos(Math.max(-1, Math.min(1, (dx * f.x + dy * f.y + dz * f.z) / d)));
        if (a < bestA) { bestA = a; best = e; bestPt = pt; }
      }
      if (best) {
        this.aimTarget = best;
        const dx = bestPt.x - eye.x, dy = bestPt.y - eye.y, dz = bestPt.z - eye.z;
        // hile atışları geri tepmesiz olduğundan doğrudan hedefe bak (yere bakmaz)
        const wy = Math.atan2(-dx, -dz);
        const wp = Math.max(-1.2, Math.min(1.2, Math.atan2(dy, Math.max(0.6, Math.hypot(dx, dz)))));
        const k = c.aimSmooth <= 0.01 ? 1 : Math.min(1, dt * (1 - c.aimSmooth) * 28);
        p.yaw += angDiff(p.yaw, wy) * k;
        p.pitch = Math.max(-1.5, Math.min(1.5, p.pitch + (wp - p.pitch) * k));
      }
    }
    // --- Triggerbot ---
    if (c.trigger) {
      const d = p.def;
      const ok = d.mag || d.type === 'knife';
      let onTarget = false;
      if (ok) {
        const dir = dirFromAngles(p.yaw, p.pitch); // hile atışı tam bu yöne gider
        const wall = Phys.raycast(eye, dir, 200);
        const maxT = d.type === 'knife' ? 1.6 : (wall ? wall.t : 200);
        for (const e of G.entities) {
          if (!this.enemy(e) || (e.protectUntil && G.now < e.protectUntil)) continue;
          const h = G.hitTestEntity(e, eye, dir, maxT);
          if (!h) continue;
          const hp = { x: eye.x + dir.x * h.t, y: eye.y + dir.y * h.t, z: eye.z + dir.z * h.t };
          if (FX.smokeBlocks(eye, hp)) continue; // sis içine boşa sıkma
          onTarget = true; break;
        }
        if (onTarget) this.lastOn = G.now;
      }
      if (onTarget) {
        if (!this.trigSince) this.trigSince = G.now;
        if ((G.now - this.trigSince) * 1000 >= c.trigDelay) {
          this.flip = !this.flip;
          if (d.auto || d.type === 'knife' || this.flip) G.cheatFire = true;
        }
      } else if (!(this.trigSince && G.now - (this.lastOn || 0) < 0.12)) this.trigSince = 0; // kısa titremede gecikme sayacı sıfırlanmaz, ama ateş edilmez
    }
  },
  // ---------- görsel ----------
  camera(cam, viewE) {
    const p = G.player;
    if (!this.c.third || viewE !== p || !p.alive) return false;
    const eye = p.eye();
    const f = dirFromAngles(p.yaw, p.pitch);
    const back = { x: -f.x, y: -f.y, z: -f.z };
    const hit = Phys.raycast(eye, back, 3.2);
    const dist = hit ? Math.max(0.4, hit.t - 0.25) : 3.0;
    const rx = Math.cos(p.yaw) * 0.45, rz = -Math.sin(p.yaw) * 0.45;
    cam.position.set(eye.x + back.x * dist + rx, eye.y + back.y * dist + 0.35, eye.z + back.z * dist + rz);
    return true;
  },
  animate(e, parts) {
    if (e.isPlayer && e._spun && !this.c.spin) { e._spun = false; parts.armL.rotation.z = 0.62; parts.armR.rotation.z = -0.38; parts.head.rotation.x = 0; }
    if (!e.isPlayer || !this.c.spin || !e.alive) return;
    e._spun = true;
    e.model.root.rotation.y = G.now * 22;
    parts.upper.rotation.x = -0.9 + Math.sin(G.now * 9) * 0.3;
    parts.head.rotation.x = -0.6;
    parts.armL.rotation.z = 1.6; parts.armR.rotation.z = -1.6;
  },
  applyChams() {
    const on = this.c.chams;
    for (const e of G.entities) {
      if (!e.model) continue;
      const want = on && e !== G.player && !G.ally(e, G.player);
      if (e._chams === want) continue;
      e._chams = want;
      const gunH = e.model.parts.gun;
      const walk = o => {
        if (o === gunH) return;
        if (o.isMesh && o.material && o.material.emissive) {
          o.material.depthTest = !want; o.renderOrder = want ? 999 : 0;
          o.material.emissive.setHex(want ? 0xff2a10 : 0x000000);
          o.material.needsUpdate = true;
        }
        o.children.forEach(walk);
      };
      walk(e.model.root);
      if (!want) e._glow = null; // normal vurguyu geri yükle
    }
  },
  // ---------- ESP katmanı ----------
  drawESP(cam) {
    const cv = this.cv || (this.cv = document.getElementById('esp'));
    const W = window.innerWidth, H = window.innerHeight;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const x = this.ctx || (this.ctx = cv.getContext('2d'));
    x.clearRect(0, 0, W, H);
    const c = this.c, p = G.player;
    if (!c.esp || !G.running || !p) return;
    const v = this.v || (this.v = new THREE.Vector3());
    const proj = (px, py, pz) => { v.set(px, py, pz).project(cam); if (v.z > 1 || v.z < -1) return null; return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
    const eye = cam.position;
    x.font = 'bold 11px Arial'; x.textAlign = 'center'; x.lineWidth = 1.5;
    for (const e of G.entities) {
      if (!e.alive || e === p) continue;
      const ally = G.ally(e, p);
      if (ally && !c.espTeam) continue;
      const top = proj(e.pos.x, e.pos.y + e.height + 0.1, e.pos.z), bot = proj(e.pos.x, e.pos.y, e.pos.z);
      if (!top || !bot) continue;
      const h = bot[1] - top[1]; if (h < 4) continue;
      const w = h * 0.45, cx = (top[0] + bot[0]) / 2;
      const head = { x: e.pos.x, y: e.pos.y + e.height - 0.12, z: e.pos.z };
      const vis = !Phys.blocked({ x: eye.x, y: eye.y, z: eye.z }, head);
      const col = ally ? '#4aa8ff' : (vis ? '#ff3b30' : '#ffd23a');
      if (c.espLines) { x.strokeStyle = col; x.globalAlpha = 0.6; x.beginPath(); x.moveTo(W / 2, H); x.lineTo(cx, bot[1]); x.stroke(); x.globalAlpha = 1; }
      if (c.espBox) {
        x.strokeStyle = '#000'; x.lineWidth = 3; x.strokeRect(cx - w / 2, top[1], w, h);
        x.strokeStyle = col; x.lineWidth = 1.5; x.strokeRect(cx - w / 2, top[1], w, h);
        if (this.aimTarget === e) { x.fillStyle = 'rgba(255,60,40,.18)'; x.fillRect(cx - w / 2, top[1], w, h); }
      }
      if (c.espHp) {
        const f = Math.max(0, e.hp) / 100;
        x.fillStyle = '#000'; x.fillRect(cx - w / 2 - 6, top[1] - 1, 4, h + 2);
        x.fillStyle = f > 0.6 ? '#3ce06a' : f > 0.3 ? '#f0c040' : '#ff4030';
        x.fillRect(cx - w / 2 - 5, top[1] + h * (1 - f), 2, h * f);
        if (e.armor > 0) { x.fillStyle = '#5aa0ff'; x.fillRect(cx - w / 2 - 9, top[1] + h * (1 - e.armor / 100), 2, h * e.armor / 100); }
      }
      x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 3;
      if (c.espName) { const t = e.name + (e.inv.bomb ? ' 💣' : ''); x.strokeText(t, cx, top[1] - 4); x.fillText(t, cx, top[1] - 4); }
      let line = [];
      if (c.espWeapon) line.push(e.def.name);
      if (c.espDist) line.push(Math.round(Math.hypot(e.pos.x - eye.x, e.pos.z - eye.z)) + 'm');
      if (line.length) { const t = line.join(' • '); x.strokeText(t, cx, bot[1] + 12); x.fillText(t, cx, bot[1] + 12); }
    }
    // bomba
    const B = G.bomb;
    if (c.espBomb && (B.state === 'planted' || B.state === 'dropped')) {
      const s = proj(B.pos.x, B.pos.y + 0.2, B.pos.z);
      if (s) {
        const t = B.state === 'planted' ? `C4 ${B.timer.toFixed(1)}s` : 'C4 (yerde)';
        x.fillStyle = '#ff9a1a'; x.strokeStyle = '#000'; x.lineWidth = 3; x.font = 'bold 13px Arial';
        x.strokeText(t, s[0], s[1]); x.fillText(t, s[0], s[1]);
      }
    }
  },
  // ---------- menü ----------
  buildMenu() {
    const box = document.getElementById('cheatBody');
    const c = this.c;
    const chk = (k, label, hint) => `<label class="check"><input type="checkbox" data-ck="${k}" ${c[k] ? 'checked' : ''}> ${label}</label>${hint ? `<div class="hint">${hint}</div>` : ''}`;
    const rng = (k, label, min, max, step, unit) => `<div class="rg"><span>${label} <b data-cv="${k}">${c[k]}${unit || ''}</b></span><input type="range" min="${min}" max="${max}" step="${step}" value="${c[k]}" data-cr="${k}" data-unit="${unit || ''}"></div>`;
    const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-cs="${k}" data-v="${v}" class="${c[k] === v ? 'sel' : ''}">${l}</button>`).join('')}</div>`;
    box.innerHTML = `
      <div class="field"><label>🎯 Aimbot</label>${chk('aimbot', 'Aimbot açık', 'Görüş alanındaki en yakın düşmana nişanı kilitler (geri tepmeyi de telafi eder).')}
        ${seg('aimKey', [['fire', 'Ateş ederken'], ['always', 'Her zaman']])}
        ${seg('aimBone', [['head', 'Kafa'], ['chest', 'Gövde']])}
        ${rng('aimFov', 'Alan (FOV)', 2, 180, 1, '°')}
        ${rng('aimSmooth', 'Yumuşaklık', 0, 0.95, 0.05, '')}
        ${chk('aimWalls', 'Duvar arkasındakine de kilitlen')}</div>
      <div class="field"><label>🔫 Triggerbot</label>${chk('trigger', 'Triggerbot açık', 'Nişangah düşmanın üstüne gelince kendiliğinden ateş eder.')}
        ${rng('trigDelay', 'Gecikme', 0, 400, 10, 'ms')}</div>
      <div class="field"><label>👁 ESP (duvar arkası bilgi)</label>${chk('esp', 'ESP açık')}
        ${chk('espBox', 'Kutu')}${chk('espName', 'İsim')}${chk('espHp', 'Can / zırh çubuğu')}${chk('espWeapon', 'Silah')}${chk('espDist', 'Mesafe')}${chk('espLines', 'Çizgiler (snapline)')}${chk('espBomb', 'Bomba')}${chk('espTeam', 'Takım arkadaşlarını da göster')}
        <div class="hint">Kırmızı = görünür, sarı = duvar arkasında.</div></div>
      <div class="field"><label>🧱 Görsel</label>${chk('chams', 'Wallhack (chams) — düşmanlar duvarların içinden parlak görünür')}${chk('radar', 'Radar hilesi — tüm düşmanlar radarda')}${chk('third', 'Üçüncü şahıs kamera')}${chk('spin', 'Mevlana (spinbot) — karakterin döner durur 🌀', 'Görmek için üçüncü şahıs kamerayı aç.')}</div>
      <div class="field"><label>⚙ Silah</label>${chk('norecoil', 'Geri tepme yok (no recoil)')}${chk('nospread', 'Dağılma yok (no spread)')}${chk('ammo', 'Sonsuz mermi')}</div>
      <div class="field"><label>🛡 Oyuncu</label>${chk('god', 'Ölümsüzlük (god mode)')}${chk('speed', 'Hız hilesi (x1.6)')}
        <button class="btn sm" id="chMoney" style="margin-top:6px">💰 +$16000</button></div>`;
    box.querySelectorAll('[data-ck]').forEach(el => el.onchange = () => { c[el.dataset.ck] = el.checked; this.save(); this.refreshTag(); });
    box.querySelectorAll('[data-cr]').forEach(el => el.oninput = () => {
      c[el.dataset.cr] = parseFloat(el.value); this.save();
      box.querySelector(`[data-cv="${el.dataset.cr}"]`).textContent = el.value + el.dataset.unit;
    });
    box.querySelectorAll('[data-cs]').forEach(el => el.onclick = () => {
      c[el.dataset.cs] = el.dataset.v; this.save();
      box.querySelectorAll(`[data-cs="${el.dataset.cs}"]`).forEach(b => b.classList.toggle('sel', b === el));
    });
    document.getElementById('chMoney').onclick = () => { if (G.player) { G.player.money = ECON.max; Audio3.ui(1200); } };
  },
  open() {
    this.buildMenu();
    this.wasRunning = G.running && !G.paused;
    if (G.running) { G.paused = true; Input.fireHeld = false; if (document.exitPointerLock) document.exitPointerLock(); }
    document.getElementById('pause').classList.add('hidden');
    document.getElementById('cheatMenu').classList.remove('hidden');
  },
  close() {
    document.getElementById('cheatMenu').classList.add('hidden');
    this.refreshTag();
    if (G.running) UI.pause(false);
  },
  refreshTag() { const t = document.getElementById('cheatTag'); if (t) t.classList.toggle('hidden', !this.any()); },
  init() {
    this.load();
    document.getElementById('chClose').onclick = () => this.close();
    document.getElementById('chOff').onclick = () => { for (const k in this.c) if (typeof this.c[k] === 'boolean' && !k.startsWith('esp')) this.c[k] = false; this.c.esp = false; this.save(); this.buildMenu(); this.refreshTag(); };
    document.getElementById('btnCheats').onclick = () => this.open();
    document.getElementById('pCheats').onclick = () => this.open();
    document.getElementById('cheatMenu').addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    this.refreshTag();
  }
};
