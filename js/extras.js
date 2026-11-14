// Ekstralar: silah skinleri (hazır desenler + 3D model üzerinde çizim) ve Raundun Oyuncusu müziği
'use strict';
// ====================== SKİNLER ======================
const Skins = {
  W: 512, H: 256,
  canvases: {}, textures: {}, mats: {}, editing: false,
  key: id => 'taktikops_skin_' + id,
  has(id) { return !!this.canvases[id]; },
  ensure(id) {
    if (!this.canvases[id]) {
      const c = document.createElement('canvas'); c.width = this.W; c.height = this.H;
      this.canvases[id] = c;
      const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
      this.textures[id] = t;
    }
    return this.canvases[id];
  },
  loadAll() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i); if (!k || k.indexOf('taktikops_skin_') !== 0) continue;
        const id = k.slice(15); if (!WEAPONS[id]) continue;
        const img = new Image();
        img.onload = () => { const c = this.ensure(id); c.getContext('2d').drawImage(img, 0, 0, this.W, this.H); this.textures[id].needsUpdate = true; };
        img.src = localStorage.getItem(k);
      }
    } catch (e) {}
  },
  save(id) {
    try { localStorage.setItem(this.key(id), this.canvases[id].toDataURL('image/png')); return true; }
    catch (e) { return false; }
  },
  remove(id) {
    try { localStorage.removeItem(this.key(id)); } catch (e) {}
    delete this.canvases[id]; if (this.textures[id]) { this.textures[id].dispose(); delete this.textures[id]; }
  },
  // temel malzeme + skin dokusu: boyanan yerde skin, boyanmayan yerde silahın kendi rengi
  matFor(base, id) {
    const k = base.uuid + ':' + id; if (this.mats[k]) return this.mats[k];
    const m = base.clone();
    if (base.map) { m.color = new THREE.Color(0x8a5a2c).convertSRGBToLinear(); } // ahşap: düz kahverengi zemin
    m.map = this.textures[id];
    m.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>',
        '#ifdef USE_MAP\n vec4 skT = texture2D( map, vUv ); skT = mapTexelToLinear( skT ); diffuseColor.rgb = mix( diffuseColor.rgb, skT.rgb, skT.a );\n#endif');
    };
    m.customProgramCacheKey = () => 'skinmix';
    this.mats[k] = m; return m;
  },
  apply(group, id) {
    if (!group || !this.has(id)) return;
    group.traverse(o => { if (o.isMesh && o.material && o.material.isMeshBasicMaterial !== true && !o.material.transparent) o.material = this.matFor(o.material, id); });
  },
  // ---------- hazır desenler ----------
  presets: {
    camo: { name: 'Kamuflaj', fn(x, W, H) { x.fillStyle = '#5b6b3a'; x.fillRect(0, 0, W, H); const cols = ['#3d4a26', '#7a7648', '#2a2f1c', '#8a9a5a']; for (let i = 0; i < 90; i++) { x.fillStyle = cols[i % 4]; x.beginPath(); x.ellipse(Math.random() * W, Math.random() * H, 12 + Math.random() * 40, 8 + Math.random() * 22, Math.random() * 3, 0, 7); x.fill(); } } },
    tiger: { name: 'Kaplan', fn(x, W, H) { x.fillStyle = '#e08a1e'; x.fillRect(0, 0, W, H); x.fillStyle = '#16120c'; for (let i = 0; i < 26; i++) { const px = i * W / 24 + (Math.random() - 0.5) * 14; x.beginPath(); x.moveTo(px, 0); x.bezierCurveTo(px + 22, H * 0.3, px - 26, H * 0.6, px + 8, H); x.lineTo(px + 14 + Math.random() * 12, H); x.bezierCurveTo(px - 12, H * 0.6, px + 34, H * 0.3, px + 8 + Math.random() * 8, 0); x.fill(); } } },
    fade: { name: 'Gökkuşağı', fn(x, W, H) { const g = x.createLinearGradient(0, 0, W, H * 0.4); ['#7a2bd6', '#e23aa8', '#ff8a3a', '#ffe14a', '#3ad6c8'].forEach((c, i) => g.addColorStop(i / 4, c)); x.fillStyle = g; x.fillRect(0, 0, W, H); } },
    carbon: { name: 'Karbon', fn(x, W, H) { x.fillStyle = '#16171a'; x.fillRect(0, 0, W, H); for (let j = 0; j < H; j += 8) for (let i = 0; i < W; i += 8) { x.fillStyle = ((i + j) / 8) % 2 ? '#2a2c31' : '#0e0f11'; x.fillRect(i, j, 8, 4); x.fillStyle = ((i + j) / 8) % 2 ? '#0e0f11' : '#24262b'; x.fillRect(i, j + 4, 8, 4); } } },
    gold: { name: 'Altın', fn(x, W, H) { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fff0a0'); g.addColorStop(0.45, '#e0a820'); g.addColorStop(0.55, '#b07a10'); g.addColorStop(1, '#f2c94c'); x.fillStyle = g; x.fillRect(0, 0, W, H); for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(255,255,230,${Math.random() * 0.5})`; x.fillRect(Math.random() * W, Math.random() * H, 2, 2); } } },
    digital: { name: 'Dijital', fn(x, W, H) { const cols = ['#3a4654', '#5a6a7c', '#1f2730', '#8a98a8']; for (let j = 0; j < H; j += 12) for (let i = 0; i < W; i += 12) { x.fillStyle = cols[Math.floor(Math.random() * 4)]; x.fillRect(i, j, 12, 12); } } },
    lava: { name: 'Lav', fn(x, W, H) { x.fillStyle = '#1a0a06'; x.fillRect(0, 0, W, H); for (let i = 0; i < 60; i++) { const px = Math.random() * W, py = Math.random() * H, r = 10 + Math.random() * 40; const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(255,220,80,.9)'); g.addColorStop(0.4, 'rgba(255,90,10,.7)'); g.addColorStop(1, 'rgba(120,10,0,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); } } },
    ice: { name: 'Buz', fn(x, W, H) { const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#e8f6ff'); g.addColorStop(0.5, '#6ec0f2'); g.addColorStop(1, '#1f5fa8'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 40; i++) { x.lineWidth = 1 + Math.random() * 2; x.beginPath(); let px = Math.random() * W, py = Math.random() * H; x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (Math.random() - 0.5) * 80; py += (Math.random() - 0.5) * 60; x.lineTo(px, py); } x.stroke(); } } },
  },
  applyPreset(id, key) {
    const c = this.ensure(id), x = c.getContext('2d');
    x.globalCompositeOperation = 'source-over'; this.presets[key].fn(x, this.W, this.H);
    this.textures[id].needsUpdate = true;
  },
  // ====================== EDİTÖR ======================
  ed: { id: 'ak47', mode: 'paint', color: '#e23a3a', size: 14, erase: false, undo: [], rotY: -Math.PI / 2 + 0.3, rotX: 0.1, dist: 1.4, ptr: new Map(), last: null },
  open() {
    if (G.running) return;
    const E = this.ed;
    if (!this.scene) {
      this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x2b3038);
      this.scene.add(new THREE.HemisphereLight(0xffffff, 0x445066, 0.75));
      const d = new THREE.DirectionalLight(0xffffff, 0.8); d.position.set(2, 3, 4); this.scene.add(d);
      this.cam = new THREE.PerspectiveCamera(35, 1, 0.01, 20);
      this.pivot = new THREE.Group(); this.scene.add(this.pivot);
      this.ray = new THREE.Raycaster();
      this.bindUI();
    }
    this.editing = true; document.body.classList.add('skinning');
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('skinEditor').classList.remove('hidden');
    this.setWeapon(E.id);
  },
  close() {
    this.editing = false; document.body.classList.remove('skinning');
    document.getElementById('skinEditor').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
    G.resize();
  },
  setWeapon(id) {
    const E = this.ed; E.id = id; E.undo = [];
    while (this.pivot.children.length) this.pivot.remove(this.pivot.children[0]);
    this.hadSkin = this.has(id);
    this.ensure(id);
    const g = Models.gun(WEAPONS[id]);
    // editörde her zaman skin malzemesi
    g.traverse(o => { if (o.isMesh && o.material && o.material.isMeshBasicMaterial !== true && !o.material.transparent) o.material = this.matFor(o.material, id); });
    const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    g.position.sub(c); this.pivot.add(g); this.gun = g;
    E.dist = Math.max(0.5, Math.max(s.z, s.y * 2.2) * 1.9);
    E.rotY = -Math.PI / 2 + 0.3; E.rotX = 0.1;
    document.getElementById('skWeapon').value = id;
  },
  render() {
    const r = G.renderer, E = this.ed;
    const w = window.innerWidth, h = window.innerHeight;
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    this.cam.position.set(0, 0, E.dist); this.cam.lookAt(0, 0, 0);
    this.pivot.rotation.set(E.rotX, E.rotY, 0);
    r.clear(); r.render(this.scene, this.cam);
  },
  pushUndo() {
    const E = this.ed, c = this.canvases[E.id];
    E.undo.push(c.getContext('2d').getImageData(0, 0, this.W, this.H)); if (E.undo.length > 12) E.undo.shift();
  },
  undo() {
    const E = this.ed; const d = E.undo.pop(); if (!d) return;
    this.canvases[E.id].getContext('2d').putImageData(d, 0, 0); this.textures[E.id].needsUpdate = true;
  },
  uvAt(cx, cy) {
    const v = document.getElementById('skView').getBoundingClientRect();
    const nx = ((cx - v.left) / v.width) * 2 - 1, ny = -(((cy - v.top) / v.height) * 2 - 1);
    // görünüm tüm ekranı kaplar; kamera da tüm ekran
    this.ray.setFromCamera({ x: (cx / window.innerWidth) * 2 - 1, y: -((cy / window.innerHeight) * 2 - 1) }, this.cam);
    this.pivot.updateMatrixWorld(true);
    const hit = this.ray.intersectObject(this.gun, true)[0];
    return hit && hit.uv ? { u: hit.uv.x, v: hit.uv.y } : null;
  },
  stroke(a, b) {
    const E = this.ed, c = this.canvases[E.id], x = c.getContext('2d');
    x.globalCompositeOperation = E.erase ? 'destination-out' : 'source-over';
    x.strokeStyle = x.fillStyle = E.color; x.lineWidth = E.size; x.lineCap = 'round'; x.lineJoin = 'round';
    const ax = a.u * this.W, ay = (1 - a.v) * this.H, bx2 = b.u * this.W, by = (1 - b.v) * this.H;
    if (Math.hypot(bx2 - ax, by - ay) > 90) { x.beginPath(); x.arc(bx2, by, E.size / 2, 0, 7); x.fill(); }   // farklı parçaya atlama: çizgi çekme
    else { x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx2, by); x.stroke(); }
    x.globalCompositeOperation = 'source-over';
    this.textures[E.id].needsUpdate = true;
  },
  bindUI() {
    const E = this.ed, $$ = id => document.getElementById(id);
    const sel = $$('skWeapon');
    for (const id in WEAPONS) { const d = WEAPONS[id]; if (d.type === 'bomb') continue; const o = document.createElement('option'); o.value = id; o.textContent = d.name; sel.appendChild(o); }
    sel.onchange = () => this.setWeapon(sel.value);
    const ps = $$('skPreset');
    for (const k in this.presets) { const o = document.createElement('option'); o.value = k; o.textContent = this.presets[k].name; ps.appendChild(o); }
    ps.onchange = () => { if (!ps.value) return; this.pushUndo(); this.applyPreset(E.id, ps.value); ps.value = ''; };
    const setMode = m => { E.mode = m; $$('skPaint').classList.toggle('sel', m === 'paint' && !E.erase); $$('skErase').classList.toggle('sel', m === 'paint' && E.erase); $$('skRotate').classList.toggle('sel', m === 'rotate'); };
    $$('skPaint').onclick = () => { E.erase = false; setMode('paint'); };
    $$('skErase').onclick = () => { E.erase = true; setMode('paint'); };
    $$('skRotate').onclick = () => setMode('rotate');
    $$('skColor').oninput = e => { E.color = e.target.value; E.erase = false; setMode('paint'); };
    document.querySelectorAll('#skSwatches i').forEach(s => s.onclick = () => { E.color = s.dataset.c; $$('skColor').value = E.color; E.erase = false; setMode('paint'); });
    $$('skSize').oninput = e => { E.size = +e.target.value; };
    $$('skFill').onclick = () => { this.pushUndo(); const x = this.canvases[E.id].getContext('2d'); x.globalCompositeOperation = 'source-over'; x.fillStyle = E.color; x.fillRect(0, 0, this.W, this.H); this.textures[E.id].needsUpdate = true; };
    $$('skClear').onclick = () => { this.pushUndo(); this.canvases[E.id].getContext('2d').clearRect(0, 0, this.W, this.H); this.textures[E.id].needsUpdate = true; };
    $$('skUndo').onclick = () => this.undo();
    $$('skSave').onclick = () => { const ok = this.save(E.id); this.hadSkin = true; $$('skMsg').textContent = ok ? `✓ ${WEAPONS[E.id].name} skini kaydedildi ve kuşanıldı` : '✗ Kaydedilemedi (depolama dolu olabilir)'; setTimeout(() => $$('skMsg').textContent = '', 2500); };
    $$('skRemove').onclick = () => { this.remove(E.id); this.setWeapon(E.id); this.hadSkin = false; $$('skMsg').textContent = 'Skin kaldırıldı'; setTimeout(() => $$('skMsg').textContent = '', 2000); };
    $$('skClose').onclick = () => { if (!this.hadSkin) { delete this.canvases[E.id]; } this.close(); };
    // 3D görünüm: boya / döndür / yakınlaştır
    const view = $$('skView');
    view.addEventListener('pointerdown', ev => {
      ev.preventDefault(); view.setPointerCapture && view.setPointerCapture(ev.pointerId);
      E.ptr.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (E.ptr.size === 1 && E.mode === 'paint') { const p = this.uvAt(ev.clientX, ev.clientY); if (p) { this.pushUndo(); this.stroke(p, p); E.last = p; } else E.last = null; }
    });
    view.addEventListener('pointermove', ev => {
      const prev = E.ptr.get(ev.pointerId); if (!prev) return;
      ev.preventDefault();
      if (E.ptr.size >= 2) { // iki parmak: yakınlaştır + döndür
        const others = [...E.ptr.entries()].filter(([k]) => k !== ev.pointerId)[0][1];
        const d0 = Math.hypot(prev.x - others.x, prev.y - others.y), d1 = Math.hypot(ev.clientX - others.x, ev.clientY - others.y);
        if (d0 > 5) E.dist = Math.max(0.25, Math.min(4, E.dist * d0 / d1));
        E.rotY += (ev.clientX - prev.x) * 0.004; E.rotX += (ev.clientY - prev.y) * 0.004;
        E.last = null;
      } else if (E.mode === 'rotate') { E.rotY += (ev.clientX - prev.x) * 0.008; E.rotX = Math.max(-1.4, Math.min(1.4, E.rotX + (ev.clientY - prev.y) * 0.008)); }
      else { const p = this.uvAt(ev.clientX, ev.clientY); if (p) { if (!E.last) this.pushUndo(); this.stroke(E.last || p, p); } E.last = p; }
      prev.x = ev.clientX; prev.y = ev.clientY;
    });
    const up = ev => { E.ptr.delete(ev.pointerId); E.last = null; };
    view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
    view.addEventListener('wheel', ev => { ev.preventDefault(); E.dist = Math.max(0.25, Math.min(4, E.dist * (ev.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
  },
};

// ====================== RAUNDUN OYUNCUSU MÜZİĞİ ======================
const Music = {
  url: null, name: '', audio: null, fadeT: null,
  db() {
    return new Promise((res, rej) => {
      try { const r = indexedDB.open('taktikops', 1); r.onupgradeneeded = () => r.result.createObjectStore('files'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }
      catch (e) { rej(e); }
    });
  },
  async init() {
    try {
      const db = await this.db();
      const rec = await new Promise((res, rej) => { const q = db.transaction('files').objectStore('files').get('mvp'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
      if (rec && rec.blob) { this.url = URL.createObjectURL(rec.blob); this.name = rec.name || 'müzik'; }
    } catch (e) {}
    this.refreshUI();
  },
  isVideo(f) { return /^video\//.test(f.type) || /\.(mp4|m4v|mov|3gp|mkv|avi)$/i.test(f.name); },
  status(t) { const el = document.getElementById('mvpName'); if (el) el.textContent = t; },
  // Videonun (MP4 vb.) ses kanalını çöz, MP3'e çevir (tarayıcı içinde, internet gerekmez)
  async toMp3(file) {
    if (typeof lamejs === 'undefined' || !lamejs.Mp3Encoder) throw new Error('MP3 kodlayıcı yok');
    this.status('⏳ MP4 okunuyor…');
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    let buf;
    try { buf = await ctx.decodeAudioData(await file.arrayBuffer()); }
    finally { if (ctx.close) ctx.close(); }
    const MAXS = 6 * 60;                                    // en fazla 6 dakika (dosya boyutu / hız için)
    const rate = buf.sampleRate, ch = Math.min(2, buf.numberOfChannels), n = Math.min(buf.length, Math.floor(rate * MAXS));
    const enc = new lamejs.Mp3Encoder(ch, rate, 128);
    const L = buf.getChannelData(0), R = ch > 1 ? buf.getChannelData(1) : L;
    const toI16 = (src, a, b) => { const o = new Int16Array(b - a); for (let i = a; i < b; i++) { const v = Math.max(-1, Math.min(1, src[i])); o[i - a] = v < 0 ? v * 32768 : v * 32767; } return o; };
    const parts = []; const BLK = 1152 * 20; let t0 = performance.now();
    for (let i = 0; i < n; i += BLK) {
      const e = Math.min(n, i + BLK);
      const l = toI16(L, i, e), r = ch > 1 ? toI16(R, i, e) : null;
      const out = ch > 1 ? enc.encodeBuffer(l, r) : enc.encodeBuffer(l);
      if (out.length) parts.push(new Uint8Array(out));
      if (performance.now() - t0 > 40) { this.status(`⏳ MP3'e çevriliyor… %${Math.round(i / n * 100)}`); await new Promise(r2 => setTimeout(r2, 0)); t0 = performance.now(); }
    }
    const end = enc.flush(); if (end.length) parts.push(new Uint8Array(end));
    return new Blob(parts, { type: 'audio/mpeg' });
  },
  // ---- Apple Music (iTunes Search API): şarkı ara, 30 sn'lik önizlemeyi seç ----
  prev: null,
  async search(q) {
    q = (q || '').trim(); if (!q) return;
    const box = document.getElementById('amResults'); box.innerHTML = '<div class="amMsg">Aranıyor…</div>';
    try {
      const r = await fetch('https://itunes.apple.com/search?media=music&entity=song&limit=12&country=TR&term=' + encodeURIComponent(q));
      if (!r.ok) throw new Error('http ' + r.status);
      const j = await r.json();
      const list = (j.results || []).filter(x => x.previewUrl);
      if (!list.length) { box.innerHTML = '<div class="amMsg">Sonuç bulunamadı</div>'; return; }
      box.innerHTML = '';
      const esc = t => String(t || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      list.forEach(x => {
        const row = document.createElement('div'); row.className = 'amRow';
        row.innerHTML = `<img src="${esc(x.artworkUrl60 || x.artworkUrl100)}" alt=""><div class="amT"><b>${esc(x.trackName)}</b><span>${esc(x.artistName)} • ${esc(x.collectionName)}</span></div><button class="btn sm amP">▶</button><button class="btn sm pri amS">Seç (30 sn)</button>`;
        row.querySelector('.amP').onclick = ev => { ev.stopPropagation(); this.previewToggle(x.previewUrl, row.querySelector('.amP')); };
        row.querySelector('.amS').onclick = ev => { ev.stopPropagation(); this.pickApple(x); };
        box.appendChild(row);
      });
    } catch (e) { box.innerHTML = '<div class="amMsg">Arama yapılamadı (internet bağlantısını kontrol et)</div>'; }
  },
  previewToggle(url, btn) {
    if (this.prev) { this.prev.pause(); this.prev = null; document.querySelectorAll('.amP').forEach(b => b.textContent = '▶'); if (btn.dataset.on === url) { btn.dataset.on = ''; return; } }
    document.querySelectorAll('.amP').forEach(b => b.dataset.on = '');
    const a = this.prev = new Audio(url); a.volume = Math.min(1, S.volume * 0.9);
    btn.textContent = '■'; btn.dataset.on = url;
    a.onended = () => { btn.textContent = '▶'; btn.dataset.on = ''; this.prev = null; };
    const p = a.play(); if (p && p.catch) p.catch(() => { btn.textContent = '▶'; });
  },
  async pickApple(x) {
    if (this.prev) { this.prev.pause(); this.prev = null; }
    document.querySelectorAll('.amP').forEach(b => b.textContent = '▶');
    this.status('⏳ 30 saniyelik önizleme indiriliyor…');
    try {
      const r = await fetch(x.previewUrl); if (!r.ok) throw new Error('http');
      const blob = await r.blob();
      const safe = (x.artistName + ' - ' + x.trackName).replace(/[\\/:*?"<>|]/g, '').slice(0, 60);
      let file = new File([blob], safe + '.m4a', { type: 'audio/mp4' });
      try { const mp3 = await this.toMp3(file); file = new File([mp3], safe + ' (30sn).mp3', { type: 'audio/mpeg' }); } catch (e) { /* çevrilemezse m4a olarak kalır */ }
      await this.set(file);
    } catch (e) { this.status('✗ Önizleme indirilemedi'); }
  },
  async set(file) {
    if (!file) return;
    if (this.isVideo(file)) {
      try {
        const mp3 = await this.toMp3(file);
        const base = file.name.replace(/\.[^.]+$/, '');
        file = new File([mp3], base + '.mp3', { type: 'audio/mpeg' });
        this.converted = true;
      } catch (e) {
        // çözülemezse videoyu olduğu gibi sakla (tarayıcı sesini çalabilir)
        this.converted = false;
        this.status('⚠ MP3\'e çevrilemedi, dosya olduğu gibi kullanılacak');
        await new Promise(r => setTimeout(r, 1200));
      }
    }
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = URL.createObjectURL(file); this.name = file.name;
    this.refreshUI();
    try { const db = await this.db(); db.transaction('files', 'readwrite').objectStore('files').put({ blob: file, name: file.name }, 'mvp'); } catch (e) { /* kalıcı olmaz, bu oturumda çalışır */ }
  },
  async clear() {
    this.stop(); if (this.url) URL.revokeObjectURL(this.url); this.url = null; this.name = '';
    this.refreshUI();
    try { const db = await this.db(); db.transaction('files', 'readwrite').objectStore('files').delete('mvp'); } catch (e) {}
  },
  play(seconds, urlOverride, startAt) {
    const src = urlOverride || this.url;
    if (!src) return false;
    this.stop();
    const a = this.audio = new Audio(src);
    if (startAt) { try { a.addEventListener('loadedmetadata', () => { if (a.duration > startAt + 6) a.currentTime = startAt; }, { once: true }); } catch (e) {} }
    const vol = Math.max(0, Math.min(1, S.volume * (S.musicVol === undefined ? 0.8 : S.musicVol)));
    a.volume = vol;
    const p = a.play(); if (p && p.catch) p.catch(() => {});
    const dur = seconds || 9;
    const t0 = performance.now();
    this.fadeT = setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      if (t > dur - 2) a.volume = Math.max(0, vol * (dur - t) / 2);
      if (t >= dur) this.stop();
    }, 100);
    return true;
  },
  stop() { if (this.fadeT) { clearInterval(this.fadeT); this.fadeT = null; } if (this.audio) { try { this.audio.pause(); } catch (e) {} this.audio = null; } },
  refreshUI() { const el = document.getElementById('mvpName'); if (el) el.textContent = this.url ? '♪ ' + this.name : 'Yüklü müzik yok'; },
  bind() {
    const f = document.getElementById('mvpFile');
    f.onchange = () => { if (f.files && f.files[0]) this.set(f.files[0]); f.value = ''; };
    const q = document.getElementById('amQuery'), go = () => this.search(q.value);
    document.getElementById('amGo').onclick = go; q.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); go(); } e.stopPropagation(); };
    q.onkeyup = q.onkeypress = e => e.stopPropagation();
    const dl = document.getElementById('mvpSave');
    if (dl) dl.onclick = () => { if (!this.url) return; const a = document.createElement('a'); a.href = this.url; a.download = this.name || 'muzik.mp3'; document.body.appendChild(a); a.click(); a.remove(); };
    document.getElementById('mvpPick').onclick = () => f.click();
    document.getElementById('mvpTest').onclick = () => { Audio3.init(); if (!this.play(8)) UI.toast && (document.getElementById('mvpName').textContent = 'Önce bir müzik dosyası seç'); };
    document.getElementById('mvpStop').onclick = () => this.stop();
    document.getElementById('mvpClear').onclick = () => this.clear();
  },
};

// ====================== BOTLARIN ŞARKILARI (Apple Music 30 sn önizleme) ======================
// Her bota Türkçe/İngilizce bir şarkı atanır; bot raundun oyuncusu olunca şarkısı çalar.
// Şarkılar bir kez indirilip cihazda (IndexedDB) saklanır; sonrasında internetsiz de çalar.
const BotSongs = {
  LIST: { tr: [["Tarkan","Kuzu Kuzu"],["Tarkan","Şımarık"],["Sezen Aksu","Hadi Bakalım"],["Sertab Erener","Everyway That I Can"],["Hadise","Düm Tek Tek"],["Mabel Matiz","Aşk Bu Mu"],["Duman","Her Şeyi Yak"],["Mor ve Ötesi","Bir Derdim Var"],["Teoman","Paramparça"],["Athena","Senden Daha Güzel"],["maNga","Fly to Stay Alive"],["Ceza","Neyim Var Ki"],["Ezhel","Geceler"],["Murat Boz","Aşkı Bulamam"],["Hande Yener","Kış Güneşi"],["Barış Manço","Gülpembe"],["Kenan Doğulu","Shake It Up Şekerim"],["Şebnem Ferah","Sil Baştan"],["Yüksek Sadakat","Belki Üstümüzden Bir Kuş Geçer"],["Emre Aydın","Beni Biraz Anla"],["Müslüm Gürses","Nilüfer"],["Sagopa Kajmer","Bir Pesimistin Gözyaşları"],["Sıla","Yolun Sonu"],["Cem Adrian","Sen Aşkı Bana Sor"],["Kolpa","Aşkın Nur Hali"],["Norm Ender","Bi Dakika"],["Mustafa Sandal","Araba"]], en: [["Queen","We Will Rock You"],["Eminem","Lose Yourself"],["Daft Punk","Harder, Better, Faster, Stronger"],["The Weeknd","Blinding Lights"],["Survivor","Eye of the Tiger"],["Linkin Park","In the End"],["AC/DC","Thunderstruck"],["Imagine Dragons","Believer"],["Rick Astley","Never Gonna Give You Up"],["Kendrick Lamar","HUMBLE."],["Dua Lipa","Levitating"],["Metallica","Enter Sandman"],["Michael Jackson","Beat It"],["Lady Gaga","Bad Romance"],["Coldplay","Viva La Vida"],["Skrillex","Scary Monsters and Nice Sprites"],["Rage Against the Machine","Killing in the Name"],["Guns N' Roses","Sweet Child O' Mine"],["Britney Spears","Toxic"],["Kanye West","Stronger"],["Foo Fighters","Everlong"],["Nirvana","Smells Like Teen Spirit"],["Gorillaz","Feel Good Inc."],["Avicii","Wake Me Up"],["Post Malone","Rockstar"],["Travis Scott","SICKO MODE"],["Billie Eilish","bad guy"],["Pharrell Williams","Happy"],["Bon Jovi","It's My Life"],["Red Hot Chili Peppers","Can't Stop"]] },
  cache: {}, loaded: false, saved: new Map(), urls: new Map(), prefetching: new Set(),
  async init() {
    if (this.loaded) return; this.loaded = true;
    try { this.cache = JSON.parse(localStorage.getItem('taktikops_songcache') || '{}'); } catch (e) { this.cache = {}; }
    try {
      const db = await Music.db();
      await new Promise(res => {
        const st = db.transaction('files').objectStore('files'), q = st.openCursor();
        q.onsuccess = () => { const c = q.result; if (!c) return res(); if (String(c.key).indexOf('song:') === 0 && c.value && c.value.blob) this.saved.set(String(c.key).slice(5), { title: c.value.title, artist: c.value.artist, size: c.value.blob.size, blob: c.value.blob }); c.continue(); };
        q.onerror = () => res();
      });
    } catch (e) {}
    this.refreshUI();
  },
  persist() { try { localStorage.setItem('taktikops_songcache', JSON.stringify(this.cache)); } catch (e) {} },
  key(a, t) { return a + '|' + t; },
  blobUrl(k) { const r = this.saved.get(k); if (!r) return null; if (!this.urls.has(k)) this.urls.set(k, URL.createObjectURL(r.blob)); return this.urls.get(k); },
  async search(a, t) {
    const k = this.key(a, t), c = this.cache[k];
    if (c && Date.now() - c.at < 6 * 24 * 3600 * 1000) return c.info;
    const r = await fetch('https://itunes.apple.com/search?media=music&entity=song&limit=6&country=TR&term=' + encodeURIComponent(a + ' ' + t));
    if (!r.ok) throw new Error('http');
    const first = a.toLowerCase().replace(/'/g, '').split(' ')[0];
    const res = ((await r.json()).results || []).filter(x => x.previewUrl && x.artistName.toLowerCase().replace(/'/g, '').indexOf(first) >= 0);
    if (!res.length) return null;
    const x = res[0], info = { url: x.previewUrl, title: x.trackName, artist: x.artistName };
    this.cache[k] = { at: Date.now(), info }; this.persist();
    return info;
  },
  // indirip cihaza kaydet
  async download(a, t) {
    const k = this.key(a, t); if (this.saved.has(k)) return true;
    try {
      const info = await this.search(a, t); if (!info) return false;
      const r = await fetch(info.url); if (!r.ok) return false;
      const blob = await r.blob();
      const db = await Music.db();
      await new Promise((res, rej) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').put({ blob, title: info.title, artist: info.artist }, 'song:' + k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
      this.saved.set(k, { title: info.title, artist: info.artist, size: blob.size, blob });
      return true;
    } catch (e) { return false; }
  },
  // çalınacak bilgi: önce cihazdaki kopya (internetsiz), yoksa Apple bağlantısı
  async resolve(a, t) {
    const k = this.key(a, t);
    const u = this.blobUrl(k); if (u) { const r = this.saved.get(k); return { url: u, title: r.title, artist: r.artist, local: true }; }
    if (!navigator.onLine) return null;
    try { return await this.search(a, t); } catch (e) { return null; }
  },
  // bot varlıklarına şarkı ata
  assign(entities) {
    const mode = S.botMusic || 'both';
    for (const e of entities) e.song = null;
    if (mode === 'off') return;
    const pool = [];
    if (mode !== 'en') this.LIST.tr.forEach(s => pool.push(s));
    if (mode !== 'tr') this.LIST.en.forEach(s => pool.push(s));
    // internet yoksa yalnızca cihazdaki şarkılardan seç
    let use = navigator.onLine ? pool : pool.filter(s => this.saved.has(this.key(s[0], s[1])));
    if (!use.length) return;
    // indirilmiş şarkıları tercih et (daha hızlı, veri harcamaz)
    use = use.slice().sort(() => Math.random() - 0.5);
    if (navigator.onLine) use.sort((x, y) => (this.saved.has(this.key(y[0], y[1])) ? 1 : 0) - (this.saved.has(this.key(x[0], x[1])) ? 1 : 0) + (Math.random() - 0.5) * 1.2);
    let i = 0;
    for (const e of entities) {
      if (e.isPlayer) continue;
      const s = use[i++ % use.length]; e.song = { a: s[0], t: s[1], info: null };
      this.resolve(s[0], s[1]).then(info => { if (e.song && e.song.a === s[0]) e.song.info = info; });
      // arka planda cihaza kaydet (bir sonraki sefer internetsiz çalsın)
      if (navigator.onLine && !this.saved.has(this.key(s[0], s[1])) && !this.prefetching.has(this.key(s[0], s[1]))) {
        const kk = this.key(s[0], s[1]); this.prefetching.add(kk);
        this.download(s[0], s[1]).then(() => { this.prefetching.delete(kk); this.refreshUI(); });
      }
    }
  },
  // ---- ayarlar ekranı ----
  total() { return this.LIST.tr.length + this.LIST.en.length; },
  refreshUI() {
    const el = document.getElementById('songStat'); if (!el) return;
    let mb = 0; this.saved.forEach(r => { mb += r.size; });
    el.textContent = `Cihazda: ${this.saved.size}/${this.total()} şarkı (${(mb / 1048576).toFixed(1)} MB)`;
  },
  async downloadAll() {
    const btn = document.getElementById('songDl'), el = document.getElementById('songStat');
    if (this.busy) return; this.busy = true; btn.disabled = true;
    const all = [].concat(this.LIST.tr, this.LIST.en); let done = 0, fail = 0;
    for (const s of all) {
      if (!navigator.onLine) { el.textContent = '✗ İnternet yok'; break; }
      if (!this.saved.has(this.key(s[0], s[1]))) { const ok = await this.download(s[0], s[1]); if (!ok) fail++; }
      done++; el.textContent = `⏳ İndiriliyor… ${done}/${all.length}` + (fail ? ` (${fail} bulunamadı)` : '');
    }
    this.busy = false; btn.disabled = false; this.refreshUI();
  },
  async clearAll() {
    try { const db = await Music.db(); await new Promise(res => { const tx = db.transaction('files', 'readwrite'), st = tx.objectStore('files'); this.saved.forEach((_, k) => st.delete('song:' + k)); tx.oncomplete = res; tx.onerror = res; }); } catch (e) {}
    this.urls.forEach(u => URL.revokeObjectURL(u)); this.urls.clear(); this.saved.clear(); this.refreshUI();
  },
  bind() {
    const d = document.getElementById('songDl'), c = document.getElementById('songClear'); if (!d) return;
    d.onclick = () => this.downloadAll(); c.onclick = () => this.clearAll();
  },
};
