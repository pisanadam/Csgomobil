// Arayüz: HUD, menüler, satın alma, skor tablosu, radar, nişangah
'use strict';
const $ = id => document.getElementById(id);
const UI = {
  buyOpen: false, cache: {}, toastT: 0, msgT: 0, hitT: 0, useMode: null, buyCat: 3,
  init() {
    this.bindSettings();
    $('btnPlay').onclick = () => this.play();
    $('btnSettings').onclick = () => this.openSettings();
    $('btnHelp').onclick = () => $('help').classList.remove('hidden');
    $('helpClose').onclick = () => $('help').classList.add('hidden');
    $('setClose').onclick = () => this.closeSettings();
    $('setReset').onclick = () => { Settings.reset(); this.refreshSettings(); this.applySettings(); };
    document.querySelectorAll('#setTabs button').forEach(b => b.onclick = () => {
      document.querySelectorAll('#setTabs button').forEach(x => x.classList.toggle('sel', x === b));
      document.querySelectorAll('.tabc').forEach(c => c.classList.toggle('hidden', c.dataset.tab !== b.dataset.tab));
    });
    $('pResume').onclick = () => this.pause(false);
    $('pSettings').onclick = () => this.openSettings();
    $('pQuit').onclick = () => this.quit();
    $('meAgain').onclick = () => { $('matchEnd').classList.add('hidden'); this.play(); };
    $('meMenu').onclick = () => { $('matchEnd').classList.add('hidden'); this.quit(); };
    $('buyClose').onclick = () => this.toggleBuy(false);
    $('buyMenu').addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    this.buildCrosshair();
    this.radarImg = MAP.radarImage(8);
    this.radarCtx = $('radar').getContext('2d');
    this.buildBuyCats();
  },
  // ---------- Ayarlar ----------
  bindSettings() {
    document.querySelectorAll('[data-set]').forEach(el => {
      const key = el.dataset.set;
      if (el.classList.contains('seg')) {
        const opts = JSON.parse(el.dataset.opts);
        el.innerHTML = '';
        opts.forEach(([v, label]) => {
          const b = document.createElement('button'); b.textContent = label; b.dataset.v = JSON.stringify(v);
          b.onclick = () => { S[key] = v; Settings.save(); this.refreshSettings(); this.applySettings(key); Audio3.ui(); if (el.dataset.reload) this.needReload = true; };
          el.appendChild(b);
        });
      } else if (el.type === 'range') {
        el.oninput = () => { S[key] = parseFloat(el.value); Settings.save(); this.refreshSettings(); this.applySettings(key); };
      } else if (el.type === 'checkbox') {
        el.onchange = () => { S[key] = el.checked; Settings.save(); this.applySettings(key); if (el.dataset.reload) this.needReload = true; };
      }
    });
    this.refreshSettings();
  },
  refreshSettings() {
    document.querySelectorAll('[data-set]').forEach(el => {
      const key = el.dataset.set, v = S[key];
      if (el.classList.contains('seg')) el.querySelectorAll('button').forEach(b => b.classList.toggle('sel', JSON.stringify(v) === b.dataset.v));
      else if (el.type === 'range') el.value = v;
      else if (el.type === 'checkbox') el.checked = !!v;
    });
    document.querySelectorAll('[data-val]').forEach(el => { const v = S[el.dataset.val]; el.textContent = typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(2)) : v; });
  },
  applySettings(key) {
    this.buildCrosshair();
    Input.applyButtonStyle();
    Audio3.setVolume(S.volume);
    $('fps').classList.toggle('hidden', !S.showFps);
    if (key === 'graphics' && G.renderer) G.applyGraphics();
    if (key === 'fov' && G.camera) { G.camera.fov = S.fov; G.camera.updateProjectionMatrix(); }
  },
  openSettings() { this.refreshSettings(); $('settings').classList.remove('hidden'); },
  closeSettings() {
    $('settings').classList.add('hidden');
    if (this.needReload && !G.running) { this.needReload = false; location.reload(); }
  },
  // ---------- Akış ----------
  play() {
    Audio3.init();
    $('mainMenu').classList.add('hidden');
    $('hud').classList.remove('hidden');
    document.body.classList.add('ingame');
    if (Input.isMobile) {
      try { const de = document.documentElement; (de.requestFullscreen || de.webkitRequestFullscreen || (() => {})).call(de); } catch (e) {}
      try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) {}
    } else {
      const c = document.querySelector('#game canvas'); c && c.requestPointerLock && c.requestPointerLock();
    }
    G.startMatch();
  },
  quit() {
    G.running = false; G.paused = false;
    $('pause').classList.add('hidden'); $('hud').classList.add('hidden');
    this.toggleBuy(false); this.showScore(false);
    document.body.classList.remove('ingame');
    $('mainMenu').classList.remove('hidden');
    if (document.exitPointerLock) document.exitPointerLock();
    if (this.needReload) { this.needReload = false; location.reload(); }
  },
  pause(on) {
    if (!G.running) return;
    G.paused = on;
    $('pause').classList.toggle('hidden', !on);
    if (on) { Input.fireHeld = false; if (document.exitPointerLock) document.exitPointerLock(); }
    else if (!Input.isMobile) { const c = document.querySelector('#game canvas'); c && c.requestPointerLock && c.requestPointerLock(); }
  },
  onMatchStart() {
    this.cache = {}; $('killfeed').innerHTML = '';
    $('specInfo').classList.add('hidden');
  },
  onRoundStart(n, pistol) {
    if (G.dm) {
      this.message('ÖLÜM KALIM', 3, `${Math.round(S.dmTime / 60)} dakika • Herkes herkese karşı • Satın alma ücretsiz ve her zaman açık`);
      $('specInfo').classList.add('hidden'); this.cache.slots = null; return;
    }
    const half = G.halfRounds();
    const last = n === S.maxRounds ? ' • SON RAUNT' : n === half ? ' • DEVRE ÖNCESİ SON RAUNT' : '';
    this.message(`RAUNT ${n}${pistol ? ' • TABANCA RAUNDU' : ''}`, 3, `Sen ${G.player.team === 'T' ? 'SALDIRI' : 'SAVUNMA'} timindesin${last}`);
    $('specInfo').classList.add('hidden');
    if (Input.isMobile || true) this.cache.slots = null;
  },
  roundEnd(win, reason, pw) {
    const names = { T: 'SALDIRI TİMİ KAZANDI', CT: 'SAVUNMA TİMİ KAZANDI' };
    const rs = { elim: 'Karşı takım yok edildi', bomb: 'Bomba patladı', defuse: 'Bomba imha edildi', time: 'Süre doldu' }[reason];
    this.message(`<span style="color:${win === 'T' ? 'var(--t)' : 'var(--ct)'}">${names[win]}</span>`, 4.5, rs);
    this.toggleBuy(false);
  },
  onPlayerDeath(k) {
    this.toggleBuy(false);
    this.message('<span style="color:var(--danger)">ÖLDÜN</span>', 2.5, k && k !== G.player ? `${k.name} tarafından (${k.hp} CP kaldı)` : '');
  },
  matchEnd(a, b) {
    $('hud').classList.add('hidden');
    if (document.exitPointerLock) document.exitPointerLock();
    let won = a > b, draw = a === b;
    const rank = G.entities.slice().sort((x, y) => y.stats.kills - x.stats.kills);
    const top = rank[0];
    if (G.ffa) { won = top === G.player; draw = false; a = G.player.stats.kills; b = top.stats.kills; }
    $('meTitle').textContent = draw ? 'BERABERE' : won ? 'ZAFER' : 'MAĞLUBİYET';
    $('meSub').textContent = G.ffa ? `Sıran: ${rank.indexOf(G.player) + 1}/${rank.length} • Öldürmen: ${G.player.stats.kills} • Kazanan: ${top.name} (${top.stats.kills})` : `Skor ${a} - ${b}`;
    $('meBoard').innerHTML = this.scoreTable();
    $('matchEnd').classList.remove('hidden');
  },
  // ---------- Mesajlar ----------
  message(html, t, sub) { $('centerMsg').innerHTML = html + (sub ? `<small>${sub}</small>` : ''); this.msgT = t; },
  toast(txt, t, cls) { const el = $('toast'); el.textContent = txt; el.className = cls || ''; this.toastT = t || 2; },
  killfeed(k, v, def, hs, wb) {
    const el = document.createElement('div');
    const me = (k && k.isPlayer) || v.isPlayer;
    el.className = 'kf' + (me ? ' me' : '');
    const wn = def ? def.name : '';
    el.innerHTML = (k ? `<span class="${k.team}">${k.name}</span>` : '') + `<span class="w">${wb ? '⟿ ' : ''}${wn}${hs ? ' ◉' : ''}</span><span class="${v.team}">${v.name}</span>`;
    const kf = $('killfeed'); kf.insertBefore(el, kf.firstChild);
    while (kf.children.length > 6) kf.removeChild(kf.lastChild);
    setTimeout(() => el.remove(), 7000);
  },
  hitmarker(hs, kill) {
    const h = $('hitmarker'); h.className = hs || kill ? 'hs' : ''; h.style.transition = 'none'; h.style.opacity = 1;
    requestAnimationFrame(() => { h.style.transition = 'opacity .3s'; h.style.opacity = 0; });
  },
  damage(from, dmg) {
    const v = $('dmgVignette'); v.style.transition = 'none'; v.style.opacity = Math.min(1, 0.35 + dmg / 60);
    requestAnimationFrame(() => { v.style.transition = 'opacity .8s'; v.style.opacity = 0; });
    if (!from) return;
    const p = G.player;
    const a = Math.atan2(-(from.x - p.pos.x), -(from.z - p.pos.z));
    const rel = angDiff(p.yaw, a);
    const d = document.createElement('div'); d.className = 'dd';
    const R = 90;
    d.style.transform = `translate(${-Math.sin(rel) * R}px,${-Math.cos(rel) * R}px) rotate(${-rel}rad)`;
    $('dmgDirs').appendChild(d);
    setTimeout(() => d.style.opacity = 0, 400); setTimeout(() => d.remove(), 1400);
  },
  // ---------- Nişangah ----------
  buildCrosshair() {
    const c = $('crosshair'); c.innerHTML = '';
    c.style.setProperty('--cc', S.crossColor);
    this.crossEls = [];
    for (let i = 0; i < 4; i++) { const d = document.createElement('div'); c.appendChild(d); this.crossEls.push(d); }
    if (S.crossDot) { const d = document.createElement('div'); d.style.cssText = `width:${S.crossThick}px;height:${S.crossThick}px;left:${-S.crossThick / 2}px;top:${-S.crossThick / 2}px`; c.appendChild(d); }
    this.layoutCross(S.crossGap);
  },
  layoutCross(gap) {
    const L = S.crossSize, T = S.crossThick, g = gap;
    const [u, d, l, r] = this.crossEls;
    u.style.cssText = `width:${T}px;height:${L}px;left:${-T / 2}px;top:${-g - L}px`;
    d.style.cssText = `width:${T}px;height:${L}px;left:${-T / 2}px;top:${g}px`;
    l.style.cssText = `width:${L}px;height:${T}px;left:${-g - L}px;top:${-T / 2}px`;
    r.style.cssText = `width:${L}px;height:${T}px;left:${g}px;top:${-T / 2}px`;
  },
  // ---------- Satın alma ----------
  buildBuyCats() {
    const c = $('buyCats'); c.innerHTML = '';
    BUY_MENU.forEach((cat, i) => {
      const b = document.createElement('button'); b.textContent = cat.cat; b.onclick = () => { this.buyCat = i; this.renderBuy(); };
      c.appendChild(b);
    });
  },
  toggleBuy(force) {
    const open = force === undefined ? !this.buyOpen : force;
    if (open && (!G.running || !G.canBuy(G.player))) { if (open && G.running) this.toast(G.round.buyLeft <= 0 ? 'Satın alma süresi doldu' : 'Satın alma bölgesinde değilsin', 1.5); return; }
    this.buyOpen = open;
    $('buyMenu').classList.toggle('hidden', !open);
    if (open) { Input.fireHeld = false; this.renderBuy(); if (document.exitPointerLock && !Input.isMobile) { this.relock = true; document.exitPointerLock(); } }
    else if (this.relock && !Input.isMobile && G.running && !G.paused) { this.relock = false; const c = document.querySelector('#game canvas'); c && c.requestPointerLock && c.requestPointerLock(); }
  },
  renderBuy() {
    const p = G.player;
    $('buyMoney').textContent = '$' + p.money;
    document.querySelectorAll('#buyCats button').forEach((b, i) => b.classList.toggle('sel', i === this.buyCat));
    const box = $('buyItems'); box.innerHTML = '';
    for (const id of BUY_MENU[this.buyCat].items) {
      const def = itemDef(id);
      if (!sideOk(def, p.team)) continue;
      const b = document.createElement('button'); b.className = 'bi';
      let price = def.price; if (id === 'helmet' && p.armor >= 100 && !p.helmet) price = 350;
      if (G.dm) price = 0;
      const own = (def.slot && p.inv[def.slot] && p.inv[def.slot].def.id === id) || (def.slot === 'grenade' && p.inv.grenades.includes(id)) || (id === 'kit' && p.kit) || (id === 'helmet' && p.helmet) || (id === 'kevlar' && p.armor >= 100);
      if (p.money < price) b.classList.add('no');
      if (own) b.classList.add('own');
      let info = '';
      if (def.damage && def.mag) info = `Hasar ${def.damage}${def.pellets ? 'x' + def.pellets : ''} • ${def.mag}/${def.reserve} • ${Math.round(def.pen * 100)}% zırh delme`;
      else if (def.nade) info = { he: 'Patlayıcı hasar', flash: 'Kör eder (en fazla 2)', smoke: 'Görüşü engeller', fire: 'Alanı yakar' }[def.nade];
      else if (id === 'kit') info = 'İmha süresi 10s → 5s';
      else if (id === 'helmet') info = 'Kafa vuruşlarına karşı';
      else if (id === 'kevlar') info = 'Gövde hasarını azaltır';
      b.innerHTML = `${def.name}<span>${G.dm ? 'ÜCRETSİZ' : '$' + price}</span><em>${info}</em>`;
      b.onclick = () => { if (G.buy(p, id)) { this.renderBuy(); } else { Audio3.ui(220); } };
      box.appendChild(b);
    }
  },
  // ---------- Skor tablosu ----------
  showScore(on) {
    const sb = $('scoreboard');
    if (on && G.entities.length) { sb.innerHTML = this.scoreTable(); sb.classList.remove('hidden'); }
    else sb.classList.add('hidden');
  },
  scoreTable() {
    let h = '';
    if (G.ffa) {
      const list = G.entities.slice().sort((a, b) => b.stats.kills - a.stats.kills || a.stats.deaths - b.stats.deaths);
      h += '<div class="sbHead"><span>ÖLÜM KALIM — HERKES HERKESE KARŞI</span></div>';
      h += '<table><tr><th>#</th><th>Oyuncu</th><th>Ö</th><th>A</th><th>Ö/K</th><th>HS%</th><th>HASAR</th></tr>';
      list.forEach((e, i) => {
        const hs = e.stats.kills ? Math.round(e.stats.hs / e.stats.kills * 100) : 0;
        h += `<tr class="${e.alive ? '' : 'dead'} ${e.isPlayer ? 'me' : ''}"><td>${i + 1}</td><td style="text-align:left">${e.isPlayer ? '★ ' : ''}${e.name}</td><td>${e.stats.kills}</td><td>${e.stats.assists}</td><td>${e.stats.deaths}</td><td>${hs}</td><td>${e.stats.dmg}</td></tr>`;
      });
      return h + '</table>';
    }
    for (const team of ['CT', 'T']) {
      const g = G.sideOfGroup.indexOf(team);
      const list = G.entities.filter(e => e.team === team).sort((a, b) => b.stats.kills - a.stats.kills || b.stats.dmg - a.stats.dmg);
      h += `<div class="sbHead ${team}"><span>${team === 'T' ? 'SALDIRI TİMİ' : 'SAVUNMA TİMİ'}</span><span>${G.score[g]}</span></div>`;
      h += '<table><tr><th>Oyuncu</th><th>$</th><th>Ö</th><th>A</th><th>Ö/K</th><th>HS%</th><th>HASAR</th></tr>';
      for (const e of list) {
        const hs = e.stats.kills ? Math.round(e.stats.hs / Math.max(1, e.stats.kills) * 100) : 0;
        const showMoney = e.team === G.player.team;
        h += `<tr class="${e.alive ? '' : 'dead'} ${e.isPlayer ? 'me' : ''}"><td>${e.isPlayer ? '★ ' : ''}${e.name}${e.inv.bomb && showMoney ? ' 💣' : ''}</td><td>${showMoney ? '$' + e.money : '-'}</td><td>${e.stats.kills}</td><td>${e.stats.assists}</td><td>${e.stats.deaths}</td><td>${hs}</td><td>${e.stats.dmg}</td></tr>`;
      }
      h += '</table>';
    }
    return h;
  },
  // ---------- Her kare ----------
  set(id, v, prop) { if (this.cache[id + (prop || '')] !== v) { this.cache[id + (prop || '')] = v; if (prop) $(id).style[prop] = v; else $(id).textContent = v; } },
  update(dt) {
    if (!G.running) return;
    const p = G.player, R = G.round;
    const view = !p.alive && G.spec ? G.spec : p;
    // skor & zaman
    if (G.ffa) {
      let best = 0; for (const e of G.entities) if (e !== p) best = Math.max(best, e.stats.kills);
      this.set('scL', String(p.stats.kills)); this.set('scR', String(best));
    } else {
      const lg = G.sideOfGroup.indexOf('CT'), rg = 1 - lg;
      this.set('scL', String(G.score[lg])); this.set('scR', String(G.score[rg]));
    }
    let t = R.phase === 'freeze' ? R.timer : R.phase === 'planted' ? G.bomb.timer : R.phase === 'end' ? R.timer : R.timeLeft;
    t = Math.max(0, t);
    const ts = R.phase === 'planted' ? '💣 ' + t.toFixed(1) : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    this.set('timer', ts);
    const bombCls = R.phase === 'planted' ? 'hudbox bomb' : 'hudbox';
    if (this.cache.timerCls !== bombCls) { this.cache.timerCls = bombCls; $('timer').className = bombCls; }
    // canlı göstergeleri
    const aliveStr = team => G.entities.filter(e => e.team === team).map(e => `<i class="${e.alive ? '' : 'dead'}"></i>`).join('');
    const aL = G.ffa ? '<b style="font-size:11px;color:#fff">SEN</b>' : aliveStr('CT'), aR = G.ffa ? '<b style="font-size:11px;color:#fff">LİDER</b>' : aliveStr('T');
    if (this.cache.aL !== aL) { this.cache.aL = aL; $('aliveL').innerHTML = aL; }
    if (this.cache.aR !== aR) { this.cache.aR = aR; $('aliveR').innerHTML = aR; }
    // oyuncu
    this.set('hp', String(Math.ceil(view.hp))); this.set('ar', String(Math.ceil(view.armor)) + (view.helmet ? '+' : ''));
    const lowCls = view.hp <= 25 ? 'hudbox low' : 'hudbox';
    if (this.cache.hpCls !== lowCls) { this.cache.hpCls = lowCls; $('hpBox').className = lowCls; }
    this.set('money', G.dm ? `Öldürme: ${p.stats.kills}` : '$' + p.money);
    const inBuy = G.canBuy(p);
    if (this.cache.buyz !== inBuy) { this.cache.buyz = inBuy; $('money').className = 'hudbox' + (inBuy ? ' buyzone' : ''); $('bBuy').classList.toggle('hidden', !inBuy); if (!inBuy && this.buyOpen) this.toggleBuy(false); }
    const w = view.weapon();
    const d = w ? w.def : WEAPONS.knife;
    this.set('wname', d.name);
    if (d.mag) { this.set('ammo', String(w.mag)); this.set('reserve', '/ ' + w.reserve); }
    else if (d.type === 'grenade') { this.set('ammo', String(view.inv.grenades.filter(g => g === d.id).length)); this.set('reserve', ''); }
    else { this.set('ammo', d.type === 'knife' ? '—' : 'C4'); this.set('reserve', ''); }
    $('bombIcon').classList.toggle('hidden', !(p.alive && p.inv.bomb));
    const nl = p.inv.grenades.map(g => WEAPONS[g].name.split(' ')[0]).join(' • ');
    this.set('nadeList', nl); $('nadeList').classList.toggle('hidden', !nl);
    // dinamik nişangah
    const showX = view.alive && d.type !== 'sniper' ? 'block' : 'none';
    this.set('crosshair', showX, 'display');
    if (S.crossDynamic && d.mag) {
      const inacc = view.inaccuracy();
      const pxPerDeg = window.innerHeight / G.camera.fov;
      const gap = Math.round(S.crossGap + Math.min(40, Math.max(0, inacc - d.inacc) * pxPerDeg * 0.5));
      if (this.cache.gap !== gap) { this.cache.gap = gap; this.layoutCross(gap); }
    } else if (this.cache.gap !== S.crossGap) { this.cache.gap = S.crossGap; this.layoutCross(S.crossGap); }
    // dürbün
    const sc = view.alive && view.scoped && d.type === 'sniper';
    if (this.cache.sc !== sc) { this.cache.sc = sc; $('scope').className = sc ? 'on' : ''; }
    // flaş
    const fl = view.flashT > 0 ? Math.min(1, view.flashT / Math.min(1.5, view.flashMax * 0.5)) : 0;
    this.set('flash', fl.toFixed(2), 'opacity');
    // kur / imha
    let prog = 0, ptxt = '';
    if (view.plantT > 0) { prog = view.plantT / 3.2; ptxt = 'BOMBA KURULUYOR…'; }
    if (view.defuseT > 0) { prog = view.defuseT / (view.kit ? 5 : 10); ptxt = 'İMHA EDİLİYOR…' + (view.kit ? ' (kit)' : ''); }
    $('progress').classList.toggle('hidden', !prog);
    if (prog) { this.set('progTxt', ptxt); this.set('progBar', Math.min(100, prog * 100) + '%', 'width'); }
    // kullan tuşu
    let um = null;
    if (p.alive && R.phase !== 'end') {
      if (p.inv.bomb && G.inBombZone(p.pos) && R.phase === 'live') um = 'plant';
      else if (p.team === 'CT' && G.bomb.state === 'planted' && dist2(p.pos, G.bomb.pos) < 1.6) um = 'defuse';
      else if (G.pickups.some(k => dist2(k.pos, p.pos) < 1.8)) um = 'pick';
    }
    this.useMode = um;
    if (this.cache.um !== um) {
      this.cache.um = um; $('bUse').classList.toggle('hidden', !um);
      $('bUse').textContent = um === 'plant' ? 'KUR' : um === 'defuse' ? 'İMHA' : 'AL';
      if (um && !Input.isMobile) this.toast(um === 'plant' ? '[E] basılı tut: Bombayı kur' : um === 'defuse' ? '[E] basılı tut: İmha et' : '[E] Silahı al', 1.5);
    }
    // dürbün tuşu
    const hasScope = p.alive && !!d.scope;
    if (this.cache.hs !== hasScope) { this.cache.hs = hasScope; $('bScope').classList.toggle('hidden', !hasScope); }
    // yuvalar
    const slotSig = ['primary', 'secondary', 'grenade', 'bomb'].map(s => { const ww = p.weapon(s); return ww ? ww.def.id : '-'; }).join() + p.slot + p.inv.grenades.length;
    if (this.cache.slots !== slotSig) {
      this.cache.slots = slotSig;
      document.querySelectorAll('.slot').forEach(el => {
        const s = el.dataset.s, ww = p.weapon(s);
        el.classList.toggle('act', p.slot === s); el.classList.toggle('empty', !ww);
        el.querySelector('span').textContent = ww ? (s === 'grenade' ? ww.def.name.split(' ')[0] + (p.inv.grenades.length > 1 ? ' +' + (p.inv.grenades.length - 1) : '') : ww.def.name) : '—';
        el.classList.toggle('hidden', s === 'bomb' && !ww);
      });
    }
    // izleyici
    if (!p.alive && G.dm && p.respawnAt) { this.set('specInfo', `Yeniden doğuluyor… ${Math.max(0, p.respawnAt - G.now).toFixed(1)}s`); $('specInfo').classList.remove('hidden'); }
    else if (!p.alive && G.spec) { this.set('specInfo', `İZLENİYOR: ${G.spec.name}  •  ${Math.ceil(G.spec.hp)} CP  •  ${G.spec.def.name}`); $('specInfo').classList.remove('hidden'); }
    else $('specInfo').classList.add('hidden');
    // zamanlayıcılar
    if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) $('centerMsg').innerHTML = ''; }
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) $('toast').textContent = ''; }
    if (this.buyOpen) { this.set('buyTime', R.buyLeft > 0 ? `(${Math.ceil(R.buyLeft)}s)` : ''); if (this.cache.bm !== p.money) { this.cache.bm = p.money; this.renderBuy(); } }
    if (Input.scoreHeld) { this.sbT = (this.sbT || 0) - dt; if (this.sbT <= 0) { this.sbT = 0.5; $('scoreboard').innerHTML = this.scoreTable(); } }
    if (S.showFps) this.set('fps', G.fps + ' FPS');
    this.drawRadar(view);
  },
  drawRadar(view) {
    const c = this.radarCtx, W = 300, px = 8, scale = 300 / 150;
    c.clearRect(0, 0, W, W);
    c.save();
    c.translate(W / 2, W / 2);
    c.rotate(view.yaw);
    const zoom = 1.25 * scale;
    c.scale(zoom, zoom);
    // dünya -> radar pikseli: (x - OX)/CELL*px
    const wx = (view.pos.x - MAP.OX) / MAP.CELL * px, wz = (view.pos.z - MAP.OZ) / MAP.CELL * px;
    c.translate(-wx, -wz);
    c.drawImage(this.radarImg, 0, 0);
    const toR = p => [(p.x - MAP.OX) / MAP.CELL * px, (p.z - MAP.OZ) / MAP.CELL * px];
    const now = G.now;
    for (const e of G.entities) {
      if (!e.alive) continue;
      const mate = e === view || (!G.ffa && e.team === G.player.team);
      if (!mate && e.spottedUntil < now) continue;
      const [x, y] = toR(e.pos);
      c.fillStyle = mate ? (e.team === 'T' ? '#f0b43c' : '#6aa8ff') : '#ff3b30';
      c.beginPath(); c.arc(x, y, e === view ? 5 : 4, 0, 7); c.fill();
      if (e === view || mate) { c.strokeStyle = '#fff'; c.lineWidth = e === view ? 1.5 : 0.6; c.stroke(); }
      // bakış yönü
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - Math.sin(e.yaw) * 9, y - Math.cos(e.yaw) * 9); c.stroke();
    }
    const B = G.bomb;
    if ((B.state === 'dropped' || B.state === 'planted') && (G.player.team === 'T' || B.state === 'planted')) {
      const [x, y] = toR(B.pos); c.fillStyle = B.state === 'planted' ? (Math.floor(now * 4) % 2 ? '#ff2a2a' : '#ffaa00') : '#ffaa00';
      c.fillRect(x - 4, y - 3, 8, 6);
    }
    c.restore();
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.strokeRect(0.5, 0.5, W - 1, W - 1);
  }
};
