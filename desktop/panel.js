const GROUPS = [
  ['🎯 Aimbot', [['aimbot', 'Aimbot açık'], ['aimWalls', 'Duvar arkasına da kilitlen']]],
  ['🔫 Triggerbot', [['trigger', 'Triggerbot açık']]],
  ['👁 Görsel', [['esp', 'ESP'], ['chams', 'Wallhack (chams)'], ['radar', 'Radar hilesi'], ['third', 'Üçüncü şahıs'], ['spin', 'Spinbot']]],
  ['⚙ Silah / oyuncu', [['norecoil', 'Geri tepme yok'], ['nospread', 'Dağılma yok'], ['ammo', 'Sonsuz mermi'], ['god', 'Ölümsüzlük'], ['speed', 'Hız x1.6']]],
];
const RANGES = [['aimFov', 'Aimbot alanı (°)', 2, 180, 1], ['aimSmooth', 'Yumuşaklık', 0, 0.95, 0.05], ['trigDelay', 'Trigger gecikmesi (ms)', 0, 400, 10]];
const body = document.getElementById('body'), st = document.getElementById('st'); let last = null;
function build(s) {
  body.innerHTML = '';
  for (const [t, items] of GROUPS) { const h = document.createElement('h3'); h.textContent = t; body.appendChild(h); for (const [k, l] of items) { const d = document.createElement('label'); d.className = 'c'; d.innerHTML = `<input type="checkbox" data-k="${k}"> ${l}`; body.appendChild(d); } }
  const h = document.createElement('h3'); h.textContent = 'Ayarlar'; body.appendChild(h);
  for (const [k, l, mn, mx, sp] of RANGES) { const d = document.createElement('div'); d.innerHTML = `<div>${l}: <b data-v="${k}"></b></div><input type="range" data-r="${k}" min="${mn}" max="${mx}" step="${sp}">`; body.appendChild(d); }
  const d = document.createElement('div'); d.innerHTML = '<div>Hedef bölge</div><select data-s="aimBone"><option value="head">Kafa</option><option value="chest">Gövde</option></select>'; body.appendChild(d);
  body.querySelectorAll('[data-k]').forEach(e => e.onchange = () => api.set(e.dataset.k, e.checked));
  body.querySelectorAll('[data-r]').forEach(e => e.oninput = () => { api.set(e.dataset.r, parseFloat(e.value)); body.querySelector(`[data-v="${e.dataset.r}"]`).textContent = e.value; });
  body.querySelectorAll('[data-s]').forEach(e => e.onchange = () => api.set(e.dataset.s, e.value));
}
async function refresh() {
  const s = await api.state(); if (!body.firstChild) build(s);
  if (!s.ok) { st.className = 'st idle'; st.textContent = 'Oyun bekleniyor…'; return; }
  const locked = s.mp;
  st.className = 'st ' + (locked ? 'lock' : 'ok');
  st.textContent = locked ? '🔒 Çok oyunculu: hileler kilitli ve kapalı' : (s.running ? '✔ Tek oyunculu maç: hileler kullanılabilir' : '✔ Menüde (maç başlayınca etkin)');
  body.querySelectorAll('input,select').forEach(e => e.disabled = locked);
  for (const e of body.querySelectorAll('[data-k]')) e.checked = !!s.cheats[e.dataset.k];
  for (const e of body.querySelectorAll('[data-r]')) { e.value = s.cheats[e.dataset.r]; body.querySelector(`[data-v="${e.dataset.r}"]`).textContent = s.cheats[e.dataset.r]; }
  for (const e of body.querySelectorAll('[data-s]')) e.value = s.cheats[e.dataset.s];
  last = s.cheats;
}
async function profs() { const p = await api.profiles(), sel = document.getElementById('prof'); sel.innerHTML = Object.keys(p).map(n => `<option>${n}</option>`).join(''); return p; }
document.getElementById('save').onclick = async () => { const n = document.getElementById('pname').value.trim(); if (n && last) { await api.saveProfile(n, last); profs(); } };
document.getElementById('load').onclick = async () => { const p = await profs(), n = document.getElementById('prof').value; if (p[n]) { for (const [k, v] of Object.entries(p[n])) await api.set(k, v); refresh(); } };
document.getElementById('fs').onclick = () => api.fullscreen();
api.onRefresh(refresh); profs(); refresh(); setInterval(refresh, 800);
