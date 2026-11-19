// CS2 tarzı skin sistemi: envanter, kasalar (nadirlik oranları), aşınma (float), StatTrak, kasa açma animasyonu.
// Skinler yerelde saklanır; kuşanılan skin Skins.canvases'e çizilir (3B silah modellerinde ve arkadaşlarda görünür).
'use strict';
const Inv = {
  KEY: 'taktikops_inv',
  RAR: {
    mil: { n: 'Askeri Sınıf', c: '#4b69ff', w: 7992, sell: 15 },
    res: { n: 'Kısıtlı', c: '#8847ff', w: 1598, sell: 60 },
    cls: { n: 'Gizli', c: '#d32ce6', w: 320, sell: 250 },
    cov: { n: 'Sır', c: '#eb4b4b', w: 64, sell: 900 },
    rare: { n: 'Nadir Özel ★', c: '#e4ae39', w: 26, sell: 2500 },
  },
  ORDER: ['mil', 'res', 'cls', 'cov', 'rare'],
  WEAR: [['Fabrikadan Yeni', 0, 0.07, 3, 1.6], ['Az Aşınmış', 0.07, 0.15, 24, 1.2], ['Biraz Aşınmış', 0.15, 0.38, 33, 1], ['İyi Aşınmış', 0.38, 0.45, 8, 0.8], ['Savaş Görmüş', 0.45, 1, 32, 0.6]],
  // ---------- desenler (512x256 tuvale çizilir; R = tohumlu rastgele) ----------
  FIN: {
    sand: { n: 'Çöl Fırtınası', fn(x, W, H, R) { x.fillStyle = '#c9a86b'; x.fillRect(0, 0, W, H); const c = ['#a07d45', '#d9bf8a', '#7b5d33', '#b99256']; for (let i = 0; i < 80; i++) { x.fillStyle = c[i % 4]; x.beginPath(); x.ellipse(R() * W, R() * H, W * (0.02 + R() * 0.07), H * (0.03 + R() * 0.09), R() * 3, 0, 7); x.fill(); } } },
    forest: { n: 'Orman Gölgesi', fn(x, W, H, R) { x.fillStyle = '#3f5a2c'; x.fillRect(0, 0, W, H); const c = ['#2a3d1b', '#6e8a45', '#1d2a12', '#8a9f5a']; for (let i = 0; i < 90; i++) { x.fillStyle = c[i % 4]; x.beginPath(); x.ellipse(R() * W, R() * H, W * (0.02 + R() * 0.07), H * (0.03 + R() * 0.08), R() * 3, 0, 7); x.fill(); } } },
    arctic: { n: 'Kutup Beyazı', fn(x, W, H, R) { x.fillStyle = '#e9eef2'; x.fillRect(0, 0, W, H); const c = ['#b7c3cc', '#8c9aa6', '#f7fafc', '#cdd7de']; for (let i = 0; i < 80; i++) { x.fillStyle = c[i % 4]; x.beginPath(); x.ellipse(R() * W, R() * H, W * (0.02 + R() * 0.06), H * (0.03 + R() * 0.08), R() * 3, 0, 7); x.fill(); } } },
    navy: { n: 'Gece Mavisi', fn(x, W, H, R) { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b1d4a'); g.addColorStop(1, '#2c5fd0'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(190,220,255,.35)'; for (let i = -H; i < W; i += 14) { x.lineWidth = 1 + R() * 2; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + H * 0.7, H); x.stroke(); } } },
    rust: { n: 'Paslı Çelik', fn(x, W, H, R) { x.fillStyle = '#5e3a22'; x.fillRect(0, 0, W, H); for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${170 + R() * 60 | 0},${70 + R() * 50 | 0},20,${0.15 + R() * 0.4})`; x.fillRect(R() * W, R() * H, 2 + R() * 8, 2 + R() * 5); } for (let i = 0; i < 300; i++) { x.fillStyle = 'rgba(30,18,10,.35)'; x.fillRect(R() * W, R() * H, 1 + R() * 3, 1 + R() * 3); } } },
    violet: { n: 'Mor Dalga', fn(x, W, H, R) { const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#2b0a5c'); g.addColorStop(0.5, '#8a2be2'); g.addColorStop(1, '#ff4fa8'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.lineWidth = 3; for (let k = 0; k < 14; k++) { x.strokeStyle = `rgba(255,255,255,${0.08 + R() * 0.18})`; x.beginPath(); for (let i = 0; i <= W; i += 8) { const y = H * (k / 14) + Math.sin(i * 0.03 + k) * 14; i ? x.lineTo(i, y) : x.moveTo(i, y); } x.stroke(); } } },
    carbon: { n: 'Karbon Elyaf', fn(x, W, H) { Skins.presets.carbon.fn(x, W, H); } },
    hexmesh: { n: 'Altıgen Ağ', fn(x, W, H, R) { x.fillStyle = '#10161d'; x.fillRect(0, 0, W, H); x.strokeStyle = '#2fd6e8'; x.lineWidth = 2; const r = 18, h = r * Math.sqrt(3) / 2; for (let row = 0; row * h < H + h; row++) for (let col = 0; col * r * 1.5 < W + r; col++) { const cx = col * r * 1.5, cy = row * h * 2 + (col % 2 ? h : 0); x.globalAlpha = 0.25 + R() * 0.6; x.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k; x.lineTo(cx + r * 0.9 * Math.cos(a), cy + r * 0.9 * Math.sin(a)); } x.closePath(); x.stroke(); } x.globalAlpha = 1; } },
    neon: { n: 'Neon Şehir', fn(x, W, H, R) { x.fillStyle = '#0a0612'; x.fillRect(0, 0, W, H); const cols = ['#ff2bd6', '#2be4ff', '#ffe92b']; for (let i = 0; i < 16; i++) { const c = cols[i % 3]; x.shadowColor = c; x.shadowBlur = 14; x.strokeStyle = c; x.lineWidth = 3 + R() * 4; const px = R() * W; x.beginPath(); x.moveTo(px, 0); x.lineTo(px + H * 0.9, H); x.stroke(); } x.shadowBlur = 0; } },
    serpent: { n: 'Kızıl Yılan', fn(x, W, H, R) { x.fillStyle = '#1d3a1c'; x.fillRect(0, 0, W, H); const s = 22; for (let row = 0; row < H / (s * 0.6) + 1; row++) for (let col = 0; col < W / s + 1; col++) { const cx = col * s + (row % 2 ? s / 2 : 0), cy = row * s * 0.6; x.fillStyle = R() < 0.12 ? '#c4221f' : (R() < 0.5 ? '#2f6a2c' : '#27551f'); x.beginPath(); x.arc(cx, cy, s * 0.55, 0, Math.PI); x.fill(); x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 1.5; x.stroke(); } } },
    lava: { n: 'Lav Akışı', fn(x, W, H) { Skins.presets.lava.fn(x, W, H); } },
    dragon: { n: 'Ejder Ateşi', fn(x, W, H, R) { x.fillStyle = '#120808'; x.fillRect(0, 0, W, H); for (let i = 0; i < 18; i++) { const bx = R() * W, by = H * (0.5 + R() * 0.5); const g = x.createLinearGradient(bx, by, bx, by - H * (0.5 + R() * 0.5)); g.addColorStop(0, '#ffe04a'); g.addColorStop(0.5, '#ff7a1a'); g.addColorStop(1, 'rgba(180,20,0,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(bx - 14, by); x.bezierCurveTo(bx - 20, by - H * 0.3, bx + 20, by - H * 0.4, bx + (R() - 0.5) * 40, by - H * 0.6); x.bezierCurveTo(bx + 30, by - H * 0.3, bx + 20, by - H * 0.1, bx + 14, by); x.fill(); } } },
    gold: { n: 'Altın Damar', fn(x, W, H, R) { const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#fff0a0'); g.addColorStop(0.4, '#e0a820'); g.addColorStop(0.7, '#9a6a10'); g.addColorStop(1, '#f2c94c'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(60,35,5,.55)'; x.lineWidth = 1.5; for (let k = 0; k < 14; k++) { x.beginPath(); let px = R() * W, py = 0; x.moveTo(px, py); while (py < H) { px += (R() - 0.5) * 50; py += 12 + R() * 22; x.lineTo(px, py); } x.stroke(); } } },
    damascus: { n: 'Şam Çeliği', fn(x, W, H, R) { x.fillStyle = '#9aa3ab'; x.fillRect(0, 0, W, H); for (let k = 0; k < 60; k++) { x.strokeStyle = `rgba(${40 + R() * 80 | 0},${45 + R() * 80 | 0},${55 + R() * 80 | 0},.55)`; x.lineWidth = 1 + R() * 3; x.beginPath(); for (let i = 0; i <= W; i += 10) { const y = (k / 60) * H + Math.sin(i * 0.04 + k * 1.7) * 9 + Math.sin(i * 0.11 + k) * 4; i ? x.lineTo(i, y) : x.moveTo(i, y); } x.stroke(); } } },
    ocean: { n: 'Okyanus Dalgası', fn(x, W, H, R) { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a3d62'); g.addColorStop(1, '#19c6b5'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 2; for (let k = 0; k < 18; k++) { x.beginPath(); for (let i = 0; i <= W; i += 6) { const y = (k / 18) * H + Math.sin(i * 0.05 + k * 0.8) * 10; i ? x.lineTo(i, y) : x.moveTo(i, y); } x.stroke(); } } },
    shadow: { n: 'Gece Gölgesi', fn(x, W, H, R) { x.fillStyle = '#0b0a12'; x.fillRect(0, 0, W, H); for (let i = 0; i < 60; i++) { const px = R() * W, py = R() * H, r = 20 + R() * 60, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(${90 + R() * 60 | 0},40,${140 + R() * 90 | 0},.5)`); g.addColorStop(1, 'rgba(10,8,20,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); } } },
  },
  // ---------- kasalar: [silah, desen, nadirlik] ----------
  CASES: {
    kum: { n: 'Kum Kasası', price: 80, items: [['glock', 'sand', 'mil'], ['usp', 'rust', 'mil'], ['galil', 'forest', 'mil'], ['mp9', 'sand', 'mil'], ['nova', 'rust', 'mil'], ['ak47', 'hexmesh', 'res'], ['p90', 'carbon', 'res'], ['deagle', 'violet', 'res'], ['m4a1s', 'serpent', 'cls'], ['awp', 'lava', 'cov'], ['knife', 'damascus', 'rare']] },
    gece: { n: 'Gece Kasası', price: 100, items: [['usp', 'navy', 'mil'], ['famas', 'arctic', 'mil'], ['mp9', 'navy', 'mil'], ['galil', 'arctic', 'mil'], ['tec9', 'navy', 'mil'], ['m4a4', 'violet', 'res'], ['ump45', 'carbon', 'res'], ['glock', 'neon', 'res'], ['ak47', 'neon', 'cls'], ['awp', 'dragon', 'cov'], ['knife', 'shadow', 'rare']] },
    efsane: { n: 'Efsane Kasası', price: 150, items: [['p250', 'forest', 'mil'], ['sg553', 'sand', 'mil'], ['mac10', 'rust', 'mil'], ['aug', 'arctic', 'mil'], ['xm1014', 'forest', 'mil'], ['deagle', 'hexmesh', 'res'], ['m4a1s', 'violet', 'res'], ['fiveseven', 'carbon', 'res'], ['ak47', 'serpent', 'cls'], ['awp', 'neon', 'cls'], ['m4a4', 'dragon', 'cov'], ['ak47', 'lava', 'cov'], ['knife', 'gold', 'rare'], ['knife', 'ocean', 'rare']] },
  },
  data: null,
  load() {
    try { const r = localStorage.getItem(this.KEY); if (r) this.data = JSON.parse(r); } catch (e) {}
    if (!this.data || !this.data.items) this.data = { coins: 250, items: [], equipped: {}, cases: { kum: 2 }, uid: 1 };
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) {} },
  get(uid) { return this.data.items.find(i => i.uid === uid); },
  isEq(wid) { return !!this.data && !!this.data.equipped[wid]; },
  rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; },
  wearOf(f) { for (const w of this.WEAR) if (f < w[2]) return w; return this.WEAR[4]; },
  name(it) { return `${it.st ? 'StatTrak™ ' : ''}${WEAPONS[it.wid].name} | ${this.FIN[it.fid].n}`; },
  price(it) { const w = this.wearOf(it.fl); return Math.round(this.RAR[it.rar].sell * w[4] * (it.st ? 1.5 : 1)); },
  // tuvale çiz: desen + aşınma (çizikler ve kir)
  render(it, c) {
    const x = c.getContext('2d'), W = c.width, H = c.height; x.save(); x.clearRect(0, 0, W, H);
    const R = this.rng(it.seed); this.FIN[it.fid].fn(x, W, H, R);
    const fl = it.fl;
    if (fl > 0.07) {      // kir / solma
      x.fillStyle = `rgba(40,34,28,${Math.min(0.55, fl * 0.5)})`; for (let i = 0; i < fl * 700; i++) x.fillRect(R() * W, R() * H, 1 + R() * 6, 1 + R() * 4);
      x.fillStyle = `rgba(120,115,108,${Math.min(0.4, fl * 0.35)})`; x.fillRect(0, 0, W, H);
    }
    x.strokeStyle = 'rgba(230,230,230,.6)'; x.lineWidth = 1;
    for (let i = 0; i < fl * 90; i++) { const px = R() * W, py = R() * H; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (R() - 0.5) * 50, py + (R() - 0.5) * 12); x.stroke(); }
    x.restore();
  },
  thumb(it, w, h) { const c = document.createElement('canvas'); c.width = w || 192; c.height = h || 96; this.render(it, c); return c; },
  // ---------- kuşanma: kuşanılan skinler Skins'e yazılır ----------
  apply() {
    if (!this.data) return;
    for (const wid in WEAPONS) {
      const uid = this.data.equipped[wid], it = uid && this.get(uid);
      if (it) { const c = Skins.ensure(wid); this.render(it, c); Skins.textures[wid].needsUpdate = true; this._own = this._own || {}; this._own[wid] = 1; }
      else if (this._own && this._own[wid]) { delete this._own[wid]; this.restoreWorkshop(wid); }
    }
  },
  restoreWorkshop(wid) {
    let d = null; try { d = localStorage.getItem(Skins.key(wid)); } catch (e) {}
    if (d) { const img = new Image(); img.onload = () => { const c = Skins.ensure(wid); c.getContext('2d').clearRect(0, 0, c.width, c.height); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); Skins.textures[wid].needsUpdate = true; }; img.src = d; }
    else { delete Skins.canvases[wid]; if (Skins.textures[wid]) { Skins.textures[wid].dispose(); delete Skins.textures[wid]; } }
  },
  equip(uid) { const it = this.get(uid); if (!it) return; this.data.equipped[it.wid] = uid; this.save(); this.apply(); },
  unequip(wid) { delete this.data.equipped[wid]; this.save(); this.apply(); },
  sell(uid) {
    const it = this.get(uid); if (!it) return 0; const p = this.price(it);
    if (this.data.equipped[it.wid] === uid) delete this.data.equipped[it.wid];
    this.data.items = this.data.items.filter(i => i.uid !== uid); this.data.coins += p; this.save(); this.apply(); return p;
  },
  addCoins(n) { this.data.coins += n; this.save(); },
  // ---------- kasa açma ----------
  rollRarity(caseId) {
    const have = new Set(this.CASES[caseId].items.map(i => i[2])), keys = this.ORDER.filter(k => have.has(k));
    let tot = 0; keys.forEach(k => tot += this.RAR[k].w); let r = Math.random() * tot;
    for (const k of keys) { r -= this.RAR[k].w; if (r <= 0) return k; } return keys[0];
  },
  rollItem(caseId) {
    const rar = this.rollRarity(caseId), pool = this.CASES[caseId].items.filter(i => i[2] === rar), p = pool[Math.floor(Math.random() * pool.length)];
    let f = Math.random() * 100, w = this.WEAR[0]; for (const ww of this.WEAR) { f -= ww[3]; if (f <= 0) { w = ww; break; } }
    return { uid: 0, wid: p[0], fid: p[1], rar, fl: +(w[1] + Math.random() * (w[2] - w[1])).toFixed(4), st: Math.random() < 0.1 ? 1 : 0, stK: 0, seed: Math.floor(Math.random() * 1e9) };
  },
  buyCase(id) { const c = this.CASES[id]; if (this.data.coins < c.price) return false; this.data.coins -= c.price; this.data.cases[id] = (this.data.cases[id] || 0) + 1; this.save(); return true; },
  // ---------- oyun içi olaylar ----------
  onKill(def, enemy) {
    if (!this.data) return; if (enemy) this.data.coins += 2;
    const uid = def && this.data.equipped[def.id], it = uid && this.get(uid);
    if (it && it.st) { it.stK = (it.stK || 0) + 1; }
    clearTimeout(this._sv); this._sv = setTimeout(() => this.save(), 2500);
  },
  onRoundWin() { this.addCoins(10); },
  onMatchEnd(won, ranked) {
    this.addCoins(won ? 50 : 20);
    if (ranked) { const ids = Object.keys(this.CASES), id = ids[Math.floor(Math.random() * ids.length)]; this.data.cases[id] = (this.data.cases[id] || 0) + 1; this.save(); UI.toast(`🎁 Maç ödülü: ${this.CASES[id].n} kazandın! (Envanter & Kasalar)`, 5, 'money'); }
    else this.save();
  },
  // ---------- arayüz ----------
  init() {
    this.load(); this.apply();
    const st = document.createElement('style'); st.textContent = `
#invScreen .invTabs{display:flex;gap:6px;margin:8px 0}#invScreen .invTabs button{flex:1}
.invGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.invCard{position:relative;background:#14181f;border:1px solid #2a313c;border-bottom:4px solid var(--rc,#555);border-radius:8px;padding:6px;cursor:pointer;font-size:11px;line-height:1.25}
.invCard canvas{width:100%;height:auto;border-radius:4px;background:#000;display:block}.invCard b{display:block;margin-top:3px;color:#fff}.invCard small{color:#9ab}
.invCard .eqb{position:absolute;top:4px;right:4px;background:#2a8a3a;color:#fff;border-radius:4px;padding:1px 4px;font-size:10px}
.invCard .stb{color:#ff9a2a;font-weight:700}
.caseRow{display:flex;gap:10px;align-items:center;background:#14181f;border:1px solid #2a313c;border-radius:10px;padding:10px;margin-bottom:8px;flex-wrap:wrap}
.caseRow .cn{flex:1;min-width:160px}.caseRow .ci{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px}.caseRow .ci i{width:12px;height:12px;border-radius:2px;display:inline-block}
#caseOpen{position:fixed;inset:0;z-index:60;background:rgba(5,7,10,.96);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px}
#caseOpen .win{position:relative;width:min(900px,96vw);height:150px;overflow:hidden;border:2px solid #444;border-radius:10px;background:#0b0e13}
#caseOpen .win:after{content:'';position:absolute;left:50%;top:0;bottom:0;width:3px;background:#ffd23a;box-shadow:0 0 10px #ffd23a;z-index:2}
#caseOpen .strip{display:flex;height:100%;will-change:transform}
#caseOpen .it{flex:0 0 150px;height:100%;box-sizing:border-box;padding:8px;border-bottom:5px solid var(--rc);font-size:11px;color:#dde}
#caseOpen .it canvas{width:100%;height:80px;border-radius:4px}
.invDetail{position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center}
.invDetail .box{background:#161b23;border:2px solid var(--rc);border-radius:12px;padding:14px;width:min(520px,94vw);display:flex;flex-direction:column;gap:8px}
.invDetail canvas{width:100%;border-radius:6px;background:#000}`;
    document.head.appendChild(st);
    const scr = document.createElement('div'); scr.id = 'invScreen'; scr.className = 'screen hidden';
    scr.innerHTML = `<div class="panel"><div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px"><b style="font-size:22px">🎒 ENVANTER & KASALAR</b><span><b id="invCoins" style="color:#ffd23a;margin-right:10px"></b><button class="btn sm" id="invClose">GERİ ←</button></span></div>
      <div class="invTabs"><button class="btn sm sel" data-t="inv">Envanter</button><button class="btn sm" data-t="cases">Kasalar</button><button class="btn sm" data-t="info">Nasıl çalışır?</button></div>
      <div id="invBody"></div></div>`;
    document.body.appendChild(scr);
    scr.querySelector('#invClose').onclick = () => this.close();
    scr.querySelectorAll('.invTabs button').forEach(b => b.onclick = () => { scr.querySelectorAll('.invTabs button').forEach(x => x.classList.toggle('sel', x === b)); this.tab = b.dataset.t; this.paint(); });
    const bt = document.getElementById('btnInv'); if (bt) bt.onclick = () => this.open();
    const ip = document.getElementById('pInv'); if (ip) ip.onclick = () => this.open();
    this.tab = 'inv';
  },
  open() { document.getElementById('mainMenu').classList.add('hidden'); document.getElementById('invScreen').classList.remove('hidden'); this.paint(); },
  close() { document.getElementById('invScreen').classList.add('hidden'); if (!G.running) document.getElementById('mainMenu').classList.remove('hidden'); },
  paint() {
    const body = document.getElementById('invBody'); if (!body) return;
    document.getElementById('invCoins').textContent = '🪙 ' + this.data.coins;
    if (this.tab === 'cases') return this.paintCases(body);
    if (this.tab === 'info') { body.innerHTML = `<div style="font-size:13px;line-height:1.55;color:#cde">
      <b>Nasıl kazanılır?</b> Öldürme +2🪙, raunt kazanma +10🪙, maç sonu +50🪙 (kayıp +20🪙). Rekabetçi maçı bitirince bedava bir kasa düşer.<br>
      <b>Kasalar:</b> 🪙 ile satın al, ücretsiz aç. Nadirlik oranları: Askeri Sınıf %79,9 • Kısıtlı %16 • Gizli %3,2 • Sır %0,64 • Nadir Özel ★ (bıçak) %0,26.<br>
      <b>Aşınma:</b> her skinin 0-1 arası bir <i>float</i> değeri vardır. Düşük = temiz (Fabrikadan Yeni), yüksek = çizik ve kirli (Savaş Görmüş). Aşınma silahın üstünde de görünür, satış değerini etkiler.<br>
      <b>StatTrak™:</b> %10 ihtimalle skin StatTrak çıkar ve o silahla attığın öldürmeleri sayar.<br>
      <b>Kuşan:</b> envanterde bir skine tıkla → Kuşan. Skin oyunda silahında ve (çok oyunculuda) arkadaşlarında görünür. Kendi boyadığın skinler 🎨 SKİNLER bölümünde ayrıca durur; kuşandığın skin onların yerine geçer.</div>`; return; }
    const items = this.data.items.slice().sort((a, b) => this.ORDER.indexOf(b.rar) - this.ORDER.indexOf(a.rar) || a.fl - b.fl);
    if (!items.length) { body.innerHTML = '<div style="color:#9ab;padding:20px">Envanterin boş. <b>Kasalar</b> sekmesinden kasa aç!</div>'; return; }
    body.innerHTML = '<div class="invGrid"></div>'; const grid = body.firstChild;
    for (const it of items) {
      const d = document.createElement('div'); d.className = 'invCard'; d.style.setProperty('--rc', this.RAR[it.rar].c);
      const w = this.wearOf(it.fl);
      d.appendChild(this.thumb(it));
      d.insertAdjacentHTML('beforeend', `<b>${it.st ? '<span class="stb">StatTrak™</span> ' : ''}${WEAPONS[it.wid].name}</b><small>${this.FIN[it.fid].n} • ${w[0]}</small>${this.data.equipped[it.wid] === it.uid ? '<span class="eqb">KUŞANILDI</span>' : ''}`);
      d.onclick = () => this.detail(it.uid); grid.appendChild(d);
    }
  },
  detail(uid) {
    const it = this.get(uid); if (!it) return; const w = this.wearOf(it.fl), eq = this.data.equipped[it.wid] === uid;
    const m = document.createElement('div'); m.className = 'invDetail'; m.style.setProperty('--rc', this.RAR[it.rar].c);
    m.innerHTML = `<div class="box"><b style="font-size:17px;color:${this.RAR[it.rar].c}">${this.name(it)}</b><div style="color:#9ab;font-size:12px">${this.RAR[it.rar].n} • ${w[0]} • float ${it.fl.toFixed(4)}${it.st ? ` • <span style="color:#ff9a2a">StatTrak™ sayaç: ${it.stK || 0}</span>` : ''}</div><div id="dvC"></div>
      <div class="row"><button class="btn pri" id="dvEq">${eq ? 'Kuşanmayı bırak' : 'Kuşan'}</button><button class="btn" id="dvSell">Sat (+${this.price(it)}🪙)</button><button class="btn sm" id="dvX">Kapat</button></div></div>`;
    document.body.appendChild(m);
    const big = this.thumb(it, 512, 256); m.querySelector('#dvC').appendChild(big);
    m.querySelector('#dvEq').onclick = () => { eq ? this.unequip(it.wid) : this.equip(uid); m.remove(); this.paint(); Audio3.ui(1000); };
    m.querySelector('#dvSell').onclick = () => { if (confirm(`${this.name(it)} satılsın mı?`)) { this.sell(uid); m.remove(); this.paint(); Audio3.ui(700); } };
    m.querySelector('#dvX').onclick = () => m.remove(); m.onclick = e => { if (e.target === m) m.remove(); };
  },
  paintCases(body) {
    body.innerHTML = '';
    for (const id in this.CASES) {
      const c = this.CASES[id], n = this.data.cases[id] || 0, row = document.createElement('div'); row.className = 'caseRow';
      const cnt = {}; c.items.forEach(i => cnt[i[2]] = (cnt[i[2]] || 0) + 1);
      row.innerHTML = `<div class="cn"><b style="font-size:16px">📦 ${c.n}</b><div style="font-size:12px;color:#9ab">${c.items.length} skin • sahip olduğun: <b>${n}</b></div><div class="ci">${c.items.map(i => `<i style="background:${this.RAR[i[2]].c}" title="${WEAPONS[i[0]].name} | ${this.FIN[i[1]].n}"></i>`).join('')}</div></div>
        <button class="btn sm" data-a="list">İçerik</button><button class="btn sm" data-a="buy" ${this.data.coins < c.price ? 'disabled' : ''}>Satın al 🪙${c.price}</button><button class="btn sm pri" data-a="open" ${n ? '' : 'disabled'}>AÇ</button>`;
      row.querySelector('[data-a=buy]').onclick = () => { if (this.buyCase(id)) { Audio3.ui(900); this.paint(); } };
      row.querySelector('[data-a=open]').onclick = () => this.openCase(id);
      row.querySelector('[data-a=list]').onclick = () => alert(c.n + ' içeriği:\n' + c.items.map(i => `• [${this.RAR[i[2]].n}] ${WEAPONS[i[0]].name} | ${this.FIN[i[1]].n}`).join('\n'));
      body.appendChild(row);
    }
  },
  openCase(id) {
    if (!(this.data.cases[id] > 0)) return;
    this.data.cases[id]--; const win = this.rollItem(id); win.uid = this.data.uid++; this.data.items.push(win); this.save();
    const ov = document.createElement('div'); ov.id = 'caseOpen';
    ov.innerHTML = `<b style="font-size:20px;color:#fff">${this.CASES[id].n} açılıyor…</b><div class="win"><div class="strip"></div></div><div id="coRes" style="min-height:120px;text-align:center"></div>`;
    document.body.appendChild(ov);
    const strip = ov.querySelector('.strip'), N = 46, WIN = 38, cards = [];
    for (let i = 0; i < N; i++) {
      const it = i === WIN ? win : this.rollItem(id); cards.push(it);
      const d = document.createElement('div'); d.className = 'it'; d.style.setProperty('--rc', this.RAR[it.rar].c);
      d.appendChild(this.thumb(it, 140, 80)); d.insertAdjacentHTML('beforeend', `<div>${WEAPONS[it.wid].name}</div><div style="color:#9ab">${this.FIN[it.fid].n}</div>`); strip.appendChild(d);
    }
    const cw = 150, view = ov.querySelector('.win').clientWidth || 900, target = -(WIN * cw + cw / 2 - view / 2 + (Math.random() - 0.5) * 100);
    strip.style.transition = 'none'; strip.style.transform = 'translateX(0)'; void strip.offsetWidth;
    strip.style.transition = 'transform 6s cubic-bezier(.08,.6,.12,1)'; strip.style.transform = `translateX(${target}px)`;
    // tıkırtı sesi: kartlar geçerken
    let last = -1; const t0 = performance.now();
    const tick = setInterval(() => { const m = new DOMMatrixReadOnly(getComputedStyle(strip).transform); const idx = Math.floor((-m.m41 + view / 2) / cw); if (idx !== last) { last = idx; try { Audio3.ui(500 + (idx % 5) * 30); } catch (e) {} } if (performance.now() - t0 > 6200) clearInterval(tick); }, 30);
    setTimeout(() => {
      const w = this.wearOf(win.fl), res = ov.querySelector('#coRes');
      res.innerHTML = `<div style="font-size:20px;font-weight:800;color:${this.RAR[win.rar].c}">${this.name(win)}</div><div style="color:#9ab">${this.RAR[win.rar].n} • ${w[0]} • float ${win.fl.toFixed(4)}</div><div class="row" style="justify-content:center;margin-top:8px"><button class="btn pri" id="coEq">Kuşan</button><button class="btn" id="coOk">Tamam</button></div>`;
      try { Audio3.ui(1400); setTimeout(() => Audio3.ui(1800), 120); } catch (e) {}
      res.querySelector('#coEq').onclick = () => { this.equip(win.uid); ov.remove(); this.paint(); };
      res.querySelector('#coOk').onclick = () => { ov.remove(); this.paint(); };
    }, 6300);
  },
};
// ---------- oyuna bağlama ----------
(function () {
  const wrap = (o, k, fn) => { const orig = o[k]; o[k] = function () { return fn.call(this, orig, arguments); }; };
  wrap(G, 'onKill', function (orig, a) {
    const [v, k, def] = a; const r = orig.apply(this, a);
    if (k && k.isPlayer && k !== v && !(!G.ffa && k.team === v.team)) Inv.onKill(def, true);
    return r;
  });
  wrap(UI, 'roundEnd', function (orig, a) { if (a[2]) Inv.onRoundWin(); return orig.apply(this, a); });
  wrap(UI, 'matchEnd', function (orig, a) { if (!G.aim) Inv.onMatchEnd(G.ffa ? G.entities.slice().sort((x, y) => y.stats.kills - x.stats.kills)[0] === G.player : a[0] > a[1], !G.dm); return orig.apply(this, a); });
})();
