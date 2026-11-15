#!/usr/bin/env python3
"""Şarkı dinleme sayfası (muzik-dinle.html) üretir. js/songdata.js (gömülü şarkılar) gerekir; telifli veri depoya eklenmez."""
import re, os
data = open('js/songdata.js', encoding='utf-8').read()
html = '''<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Taktik Ops — Şarkı Dinleme</title>
<style>
:root{--bg:#101318;--card:#1a1e25;--line:rgba(255,255,255,.1);--txt:#eef1f4;--dim:#9aa3ad;--acc:#f0b43c}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{margin:0;background:var(--bg);color:var(--txt);font-family:"Segoe UI",Roboto,Helvetica,Arial,sans-serif;padding-bottom:130px}
header{position:sticky;top:0;z-index:5;background:rgba(16,19,24,.95);backdrop-filter:blur(6px);padding:12px 14px;border-bottom:1px solid var(--line)}
h1{margin:0 0 8px;font-size:20px;background:linear-gradient(180deg,#ffd27a,#c7862a);-webkit-background-clip:text;background-clip:text;color:transparent}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
input[type=search]{flex:1;min-width:140px;background:var(--card);border:1px solid var(--line);color:#fff;border-radius:8px;padding:9px 11px;font-size:15px}
.tabs button{padding:8px 12px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:#cfd5dc;font-weight:700;font-size:13px}
.tabs button.sel{background:var(--acc);color:#1a1206;border-color:#ffd27a}
ul{list-style:none;margin:0;padding:6px 10px}
li{display:flex;align-items:center;gap:10px;padding:9px 10px;margin:5px 0;background:var(--card);border:1px solid var(--line);border-radius:10px;cursor:pointer}
li.on{border-color:var(--acc);background:#262218}
.n{width:26px;text-align:center;color:var(--dim);font-size:13px;font-weight:700}
.i{flex:1;min-width:0}.i b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.i span{font-size:12px;color:var(--dim)}
.tag{font-size:10px;font-weight:800;padding:2px 6px;border-radius:5px;background:#2a3140;color:#cfd5dc}.tag.tr{background:#5a1f1f;color:#ffc9c9}.tag.en{background:#1f3a5a;color:#c9e2ff}.tag.xx{background:#2f4a2a;color:#d4f5c9}
#bar{position:fixed;left:0;right:0;bottom:0;background:#0b0d11;border-top:1px solid var(--line);padding:10px 14px calc(10px + env(safe-area-inset-bottom));z-index:9}
#now{font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:6px}#now small{color:var(--dim);font-weight:500}
#seek{width:100%;accent-color:var(--acc)}
.ctl{display:flex;align-items:center;gap:10px;margin-top:4px}
.ctl button{width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:#fff;font-size:18px}
.ctl button.big{width:52px;height:52px;background:var(--acc);color:#1a1206;font-size:22px;border-color:#ffd27a}
.ctl button.sel{border-color:var(--acc);color:var(--acc)}
#time{font-size:12px;color:var(--dim);min-width:80px;text-align:center}
#vol{width:90px;accent-color:var(--acc);margin-left:auto}
</style></head><body>
<header><h1>🎵 Şarkı Dinleme — Popüler Şarkılar (<span id="cnt"></span>)</h1>
<div class="row"><input id="q" type="search" placeholder="Şarkı ya da sanatçı ara…" autocomplete="off">
<div class="tabs row"><button data-f="all" class="sel">Hepsi</button><button data-f="tr">Türkçe</button><button data-f="en">İngilizce</button><button data-f="xx">Diğer diller</button></div></div></header>
<ul id="list"></ul>
<div id="bar"><div id="now">Bir şarkı seç <small></small></div>
<input id="seek" type="range" min="0" max="1000" value="0">
<div class="ctl"><button id="prev">⏮</button><button id="play" class="big">▶</button><button id="next">⏭</button><button id="shuf" title="Karışık">🔀</button><span id="time">0:00 / 0:30</span><input id="vol" type="range" min="0" max="1" step="0.05" value="0.8"></div></div>
<script>
''' + data + '''
const $ = id => document.getElementById(id);
const songs = Object.keys(SONG_DATA).map(k => ({ k, t: SONG_DATA[k].t, a: SONG_DATA[k].a, l: SONG_DATA[k].l || 'en', g: (SONG_DATA[k].l === 'tr' ? 'tr' : SONG_DATA[k].l === 'en' ? 'en' : 'xx'), url: null }));
$('cnt').textContent = songs.length;
const au = new Audio(); let cur = -1, filter = 'all', shuffle = false, shown = [];
function urlOf(s) { if (!s.url) { const b = atob(SONG_DATA[s.k].d), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); s.url = URL.createObjectURL(new Blob([u], { type: 'audio/mp4' })); } return s.url; }
function render() {
  const q = $('q').value.trim().toLowerCase();
  shown = songs.filter(s => (filter === 'all' || s.g === filter) && (!q || (s.t + ' ' + s.a).toLowerCase().includes(q)));
  $('list').innerHTML = '';
  shown.forEach((s, i) => {
    const li = document.createElement('li'); if (songs[cur] === s) li.className = 'on';
    li.innerHTML = `<div class="n">${i + 1}</div><div class="i"><b></b><span></span></div><span class="tag ${s.g}">${s.l.toUpperCase()}</span>`;
    li.querySelector('b').textContent = s.t; li.querySelector('.i span').textContent = s.a;
    li.onclick = () => playSong(s); $('list').appendChild(li);
  });
}
function playSong(s) {
  cur = songs.indexOf(s); au.src = urlOf(s); au.play().catch(() => {});
  $('now').innerHTML = ''; $('now').append(s.t + ' '); const sm = document.createElement('small'); sm.textContent = '— ' + s.a; $('now').appendChild(sm);
  render();
}
function step(d) {
  if (!shown.length) return;
  let i = shown.indexOf(songs[cur]);
  i = shuffle ? Math.floor(Math.random() * shown.length) : (i + d + shown.length) % shown.length;
  playSong(shown[i]);
}
const fmt = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
au.volume = 0.8;
au.ontimeupdate = () => { $('seek').value = au.duration ? au.currentTime / au.duration * 1000 : 0; $('time').textContent = fmt(au.currentTime) + ' / ' + fmt(au.duration || 30); };
au.onplay = () => $('play').textContent = '⏸'; au.onpause = () => $('play').textContent = '▶';
au.onended = () => step(1);
$('play').onclick = () => { if (cur < 0) { if (shown[0]) playSong(shown[0]); } else if (au.paused) au.play(); else au.pause(); };
$('prev').onclick = () => step(-1); $('next').onclick = () => step(1);
$('shuf').onclick = () => { shuffle = !shuffle; $('shuf').classList.toggle('sel', shuffle); };
$('seek').oninput = e => { if (au.duration) au.currentTime = e.target.value / 1000 * au.duration; };
$('vol').oninput = e => au.volume = +e.target.value;
$('q').oninput = render;
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { filter = b.dataset.f; document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('sel', x === b)); render(); });
render();
</script></body></html>
'''
open('muzik-dinle.html', 'w', encoding='utf-8').write(html)
print('muzik-dinle.html', round(os.path.getsize('muzik-dinle.html') / 1048576, 1), 'MB')
