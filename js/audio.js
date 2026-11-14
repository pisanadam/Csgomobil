// Gerçekçi ses motoru (WebAudio): konumsal ses, ses hızı gecikmesi, hava sönümü, duvar arkası boğuklaşma,
// ortama göre yankı (reverb), malzemeye göre ayak sesi, katmanlı silah/şarjör/patlama sesleri, ortam sesi.
// Harici ses dosyası yok: her şey sentezlenir.
'use strict';
const Audio3 = {
  ctx: null, master: null, dry: null, rev: null, revSend: null, noise: null, irs: {}, env: { ir: 'open', wet: 0.35, slap: 0.18 }, theme: 'desert',
  listener: { x: 0, y: 0, z: 0, yaw: 0 },
  amb: null, lastImpact: 0, lastShots: 0, shotCount: 0, shotWin: 0, voiceT: new Map(),
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const c = this.ctx = new AC();
      this.master = c.createGain(); this.master.gain.value = S.volume;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
      this.master.connect(comp); comp.connect(c.destination);
      this.dry = c.createGain(); this.dry.connect(this.master);
      // gürültü tamponu
      const len = c.sampleRate * 2;
      this.noise = c.createBuffer(1, len, c.sampleRate);
      const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // yankı
      this.rev = c.createConvolver(); this.revSend = c.createGain(); this.revSend.gain.value = 1;
      this.revSend.connect(this.rev); this.rev.connect(this.master);
      this.setEnv(this.theme);
    } catch (e) { this.ctx = null; }
  },
  setVolume(v) { if (this.master) this.master.gain.value = v; },
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  // ---------- yankı (impulse response) ----------
  makeIR(sec, decay, damp, taps) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), buf = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let y = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n, a = Math.max(0.04, 1 - t * damp);        // zamanla yüksek frekans sönümü
        y += a * ((Math.random() * 2 - 1) - y);
        d[i] = y * Math.pow(1 - t, decay) * 0.6;
      }
      for (const [tt, g] of taps || []) { const i = Math.floor((tt + ch * 0.007) * c.sampleRate); if (i < n) d[i] += g * (ch ? -1 : 1); }
    }
    return buf;
  },
  setEnv(theme) {
    this.theme = theme || 'desert';
    const E = { desert: { ir: 'open', wet: 0.34, slap: 0.2 }, harbor: { ir: 'hall', wet: 0.42, slap: 0.12 }, snow: { ir: 'dead', wet: 0.2, slap: 0 }, town: { ir: 'open', wet: 0.4, slap: 0.15 }, range: { ir: 'hall', wet: 0.38, slap: 0.1 } };
    this.env = E[this.theme] || E.desert;
    if (!this.ctx) return;
    if (!this.irs[this.env.ir]) this.irs[this.env.ir] = this.env.ir === 'open' ? this.makeIR(1.1, 3.2, 1.2, [[0.11, 0.35], [0.23, 0.22], [0.37, 0.14]]) : this.env.ir === 'hall' ? this.makeIR(2.0, 2.4, 1.6, [[0.04, 0.3], [0.09, 0.22]]) : this.makeIR(0.45, 3.5, 2.2, []);
    this.rev.buffer = this.irs[this.env.ir];
  },
  // ---------- konumsal ses düğümü ----------
  // dönüş: { node, vol, t (başlangıç zamanı, ses hızı gecikmeli), d, occ }
  spatial(pos, maxDist, o) {
    const c = this.ctx; o = o || {};
    const L = this.listener;
    let vol = 1, pan = 0, d = 0, occ = false, behind = false;
    if (pos) {
      const py = pos.y === undefined ? 1.4 : pos.y;
      const dx = pos.x - L.x, dz = pos.z - L.z, dy = py - L.y;
      d = Math.sqrt(dx * dx + dz * dz + dy * dy);
      vol = Math.pow(Math.max(0, 1 - d / (maxDist || 60)), 1.6);
      if (d > 0.5) {
        const rx = Math.cos(L.yaw), rz = -Math.sin(L.yaw), fx = -Math.sin(L.yaw), fz = -Math.cos(L.yaw);
        pan = Math.max(-1, Math.min(1, (dx * rx + dz * rz) / d)) * 0.9;
        behind = (dx * fx + dz * fz) / d < -0.2;
      }
      if (vol > 0.004 && typeof Phys !== 'undefined' && !o.noOcc && d > 1.5) { try { occ = Phys.blocked({ x: L.x, y: L.y, z: L.z }, { x: pos.x, y: py, z: pos.z }); } catch (e) { occ = false; } }
    }
    if (occ) vol *= 0.42;
    const g = c.createGain(); g.gain.value = vol;
    // hava sönümü + duvar arkası boğuklaşma + arkadan gelen sesin kafa gölgesi
    let cut = 16000;
    if (pos) { cut = Math.max(1400, 14000 - d * 190); if (occ) cut = Math.min(cut, 700); if (behind) cut *= 0.72; }
    let head = g;
    if (pos && (cut < 15000)) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; f.Q.value = 0.5; g.connect(f); head = f; }
    let tail = head;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; head.connect(p); tail = p; }
    tail.connect(this.dry);
    // yankı gönderimi: uzaktaki ve kapalı alandaki sesler daha ıslak
    let wet = (this.env.wet || 0.3) * (pos ? (0.35 + Math.min(1, d / 55) * 0.65) : 0.25) * (o.wet === undefined ? 1 : o.wet);
    if (pos && typeof MAP !== 'undefined' && MAP.zoneAt) { try { if (MAP.zoneAt(pos.x, pos.z) === 'u' || MAP.zoneAt(L.x, L.z) === 'u') wet *= 1.7; } catch (e) {} }
    if (wet > 0.01 && this.rev) { const s = c.createGain(); s.gain.value = wet; tail.connect(s); s.connect(this.revSend); }
    // ses hızı gecikmesi (yalnızca uzaktaki büyük sesler)
    const delay = (pos && o.delay) ? Math.min(0.7, d / 343) : 0;
    return { node: g, vol, t: c.currentTime + delay + 0.005, d, occ };
  },
  // ---------- sentez yardımcıları ----------
  nb(dest, t, dur, type, f, q, gain, sweep, att) {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noise; src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (sweep) fl.frequency.exponentialRampToValueAtTime(Math.max(20, sweep), t + dur);
    const g = c.createGain(), a = att || 0.002;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + a); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(fl); fl.connect(g); g.connect(dest);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  },
  tn(dest, t, dur, f0, f1, gain, type, att) {
    const c = this.ctx, o = c.createOscillator(); o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t + dur);
    const g = c.createGain(), a = att || 0.002;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + a); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  },
  // metalik "tık"
  click(pos, f) {
    if (!this.ctx) return; const sp = this.spatial(pos, 14, { noOcc: !pos }); if (sp.vol < 0.01) return; const t = sp.t, d = sp.node, k = (f || 1800) / 1800;
    this.nb(d, t, 0.012, 'highpass', 3200 * k, 0.7, 0.5); this.tn(d, t, 0.03, 1900 * k, 1100 * k, 0.22, 'square'); this.tn(d, t + 0.004, 0.05, 780 * k, 520 * k, 0.12, 'triangle');
  },
  // ---------- SİLAH ATIŞI ----------
  shot(def, pos, sil) {
    if (!this.ctx) return;
    if (sil === undefined) sil = def.silenced;
    const now = this.ctx.currentTime;
    // aynı anda çok fazla atış varsa uzak olanları atla (performans)
    if (now - this.shotWin > 0.1) { this.shotWin = now; this.shotCount = 0; }
    this.shotCount++;
    const sp = this.spatial(pos, sil ? 40 : 150, { delay: true });
    if (sp.vol < 0.004 || (this.shotCount > 9 && sp.d > 25)) return;
    const t = sp.t, d = sp.node, k = def.sound || {}, body = k.body || 1, pitch = (k.pitch || 1) * (0.94 + Math.random() * 0.12), ty = def.type, far = sp.d > 30;
    if (sil) {                                            // susturuculu: boğuk "fıt" + mekanik tak
      this.nb(d, t, 0.1, 'bandpass', 1100 * pitch, 0.9, 0.5); this.nb(d, t, 0.05, 'lowpass', 600, 0.7, 0.45);
      this.tn(d, t, 0.07, 210 * pitch, 80, 0.4, 'sine'); this.nb(d, t + 0.012, 0.02, 'highpass', 3500, 0.7, 0.18);
      this.tn(d, t + 0.05, 0.03, 1600, 900, 0.1, 'square');
      return;
    }
    if (ty === 'knife') return;
    const big = ty === 'sniper' ? 1.5 : ty === 'shotgun' ? 1.35 : ty === 'lmg' ? 1.15 : ty === 'rifle' ? 1 : ty === 'smg' ? 0.78 : 0.7;
    // 1) keskin çatlama (mermi çıkışı)
    if (!far || big > 1) this.nb(d, t, 0.028 + 0.02 * big, 'highpass', 2600 * pitch, 0.6, 0.95 * body);
    // 2) orta frekans patlama gövdesi
    this.nb(d, t, 0.09 + 0.09 * big, 'bandpass', 1300 * pitch, 0.7, 0.9 * body);
    // 3) bas gümleme
    this.nb(d, t, 0.14 + 0.28 * big, 'lowpass', 520 * pitch, 0.7, 1.05 * body * big);
    this.tn(d, t, 0.1 + 0.16 * big, 175 * pitch / Math.sqrt(big), 42, 0.95 * body * big, 'sine');
    if (ty === 'sniper' || ty === 'shotgun') this.tn(d, t, 0.5, 70, 28, 0.7, 'sine');
    // 4) mekanik (sürgü/kızak) — yakın atışlarda
    if (sp.d < 22 && ty !== 'shotgun') this.tn(d, t + 0.012, 0.025, ty === 'pistol' ? 1500 : 900, 500, 0.12, 'square');
    // 5) dağ/duvar yankısı (slapback)
    const sl = this.env.slap; if (sl && sp.d > 8) { this.nb(d, t + sl + sp.d * 0.0007, 0.25, 'lowpass', 480, 0.6, 0.22 * body * big); this.nb(d, t + sl * 1.9, 0.3, 'lowpass', 340, 0.5, 0.1 * body * big); }
    // 6) boş kovan düşme sesi
    if (sp.d < 20 && (ty === 'rifle' || ty === 'smg' || ty === 'pistol' || ty === 'lmg' || ty === 'sniper')) this.casing(pos, t + 0.2 + Math.random() * 0.15, sp.d);
    // 7) pompalı / sürgülü: sonraki mekanik
    if (ty === 'shotgun' && sp.d < 25) { this.pumpSound(d, t + 0.34); }
    if (def.bolt && sp.d < 25) { this.boltSound(d, t + 0.5); }
  },
  casing(pos, t, dist) {
    const sp = this.spatial(pos, 12, { noOcc: true }); if (sp.vol < 0.01) return;
    const d = sp.node, f = 3400 + Math.random() * 1800, T = Math.max(t, sp.t);
    this.tn(d, T, 0.09, f, f * 0.96, 0.08, 'sine'); this.tn(d, T + 0.05, 0.07, f * 1.18, f * 1.1, 0.045, 'sine'); this.tn(d, T + 0.11, 0.05, f * 0.9, f * 0.86, 0.025, 'sine');
  },
  pumpSound(d, t) { this.nb(d, t, 0.05, 'bandpass', 1500, 2, 0.4); this.tn(d, t, 0.04, 260, 130, 0.25, 'square'); this.nb(d, t + 0.15, 0.05, 'bandpass', 1900, 2, 0.45); this.tn(d, t + 0.15, 0.04, 360, 180, 0.28, 'square'); },
  boltSound(d, t) { this.nb(d, t, 0.06, 'bandpass', 1700, 2.5, 0.35); this.tn(d, t, 0.04, 320, 150, 0.2, 'square'); this.nb(d, t + 0.28, 0.05, 'bandpass', 2100, 2.5, 0.4); this.tn(d, t + 0.28, 0.04, 420, 200, 0.24, 'square'); },
  // ---------- ŞARJÖR / ÇEKME ----------
  reload(pos, def) {
    if (!this.ctx) return;
    const sp = this.spatial(pos, 16, { noOcc: !pos }); if (sp.vol < 0.012) return;
    const d = sp.node, t0 = sp.t, ty = def ? def.type : 'rifle', total = Math.max(1.2, (def && def.reload) || 2.5);
    const tick = (t, f, g) => { this.nb(d, t, 0.015, 'highpass', 3000, 0.7, g || 0.4); this.tn(d, t, 0.035, f, f * 0.55, 0.2, 'square'); };
    const slide = (t, dur) => this.nb(d, t, dur, 'bandpass', 2200, 1.2, 0.18, 1400);
    const thud = (t, g) => { this.tn(d, t, 0.09, 150, 70, g || 0.5, 'sine'); this.nb(d, t, 0.04, 'bandpass', 900, 1, 0.3); };
    if (ty === 'shotgun') { tick(t0 + 0.05, 1200, 0.3); this.nb(d, t0 + 0.04, 0.06, 'bandpass', 800, 1.5, 0.2); return; }
    if (ty === 'pistol') { tick(t0 + 0.15, 1500); slide(t0 + 0.25, 0.1); thud(t0 + total * 0.42, 0.45); tick(t0 + total * 0.42 + 0.03, 1100, 0.3); this.nb(d, t0 + total * 0.74, 0.07, 'bandpass', 1800, 2, 0.4); this.tn(d, t0 + total * 0.74, 0.05, 520, 240, 0.3, 'square'); tick(t0 + total * 0.74 + 0.09, 1400, 0.4); return; }
    if (ty === 'lmg') { this.nb(d, t0 + 0.1, 0.14, 'bandpass', 900, 1, 0.35); tick(t0 + 0.3, 900, 0.4); for (let i = 0; i < 8; i++) this.tn(d, t0 + 0.9 + i * 0.12 + Math.random() * 0.04, 0.03, 1800 + Math.random() * 800, 1200, 0.08, 'square'); thud(t0 + total * 0.7, 0.6); this.nb(d, t0 + total * 0.7 + 0.12, 0.1, 'bandpass', 700, 1, 0.45); tick(t0 + total * 0.88, 1000, 0.45); return; }
    // tüfek / SMG / keskin nişancı
    tick(t0 + 0.18, 1600, 0.45); slide(t0 + 0.3, 0.14);                          // şarjör çıkar
    this.nb(d, t0 + total * 0.35, 0.05, 'bandpass', 600, 1, 0.12);                // yeni şarjör hazırlanır
    thud(t0 + total * 0.5, 0.55); tick(t0 + total * 0.5 + 0.03, 1300, 0.35);      // şarjör girer
    if (ty === 'sniper') this.boltSound(d, t0 + total * 0.74);
    else { this.nb(d, t0 + total * 0.76, 0.07, 'bandpass', 1500, 2, 0.4); this.tn(d, t0 + total * 0.76, 0.05, 480, 220, 0.3, 'square'); tick(t0 + total * 0.76 + 0.11, 1500, 0.5); } // kurma kolu
  },
  draw(def, pos) {
    if (!this.ctx) return; const sp = this.spatial(pos, 10, { noOcc: !pos }); if (sp.vol < 0.02) return; const d = sp.node, t = sp.t;
    this.nb(d, t, 0.12, 'lowpass', 900, 0.6, 0.12, 400);                       // kumaş sürtünmesi
    if (def && def.type !== 'knife' && def.type !== 'grenade') { this.nb(d, t + 0.1, 0.03, 'highpass', 3000, 0.7, 0.2); this.tn(d, t + 0.1, 0.04, 900, 500, 0.12, 'square'); }
  },
  knife(pos) {
    if (!this.ctx) return; const sp = this.spatial(pos, 15); const t = sp.t;
    this.nb(sp.node, t, 0.16, 'bandpass', 1200, 1.4, 0.38, 3600, 0.03);
  },
  stab(pos) {
    if (!this.ctx) return; const sp = this.spatial(pos, 18); if (sp.vol < 0.02) return; const t = sp.t, d = sp.node;
    this.nb(d, t, 0.09, 'lowpass', 600, 0.8, 0.7); this.tn(d, t, 0.08, 170, 70, 0.5, 'sine'); this.nb(d, t + 0.01, 0.05, 'bandpass', 2400, 2, 0.15);
  },
  nadeThrow(pos) {
    if (!this.ctx) return; const sp = this.spatial(pos, 14); if (sp.vol < 0.02) return; const t = sp.t, d = sp.node;
    this.tn(d, t, 0.05, 2500, 1700, 0.18, 'triangle'); this.nb(d, t + 0.02, 0.01, 'highpass', 4000, 1, 0.3);   // pim
    this.nb(d, t + 0.08, 0.18, 'bandpass', 900, 1.1, 0.25, 2600, 0.04);                                         // savurma
  },
  // ---------- AYAK SESLERİ ----------
  surfaceAt(pos) {
    if (!pos || typeof MAP === 'undefined') return 'concrete';
    let z = '.'; try { z = MAP.zoneAt(pos.x, pos.z); } catch (e) {}
    const th = this.theme;
    if (th === 'desert') return (z === 'A' || z === 'B' || z === 'u') ? 'tile' : z === 'C' ? 'concrete' : 'sand';
    if (th === 'harbor') return z === 'u' ? 'metal' : 'concrete';
    if (th === 'snow') return z === 'u' ? 'tile' : z === 'C' ? 'concrete' : 'snow';
    if (th === 'town') return (z === 'A' || z === 'B' || z === 'C') ? 'tile' : 'stone';
    return 'concrete';
  },
  footstep(pos, loud, sneak) {
    if (!this.ctx) return; const sp = this.spatial(pos, 30); if (sp.vol < 0.01) return;
    const surf = this.surfaceAt(pos || { x: this.listener.x, z: this.listener.z }), t = sp.t, d = sp.node, L = (loud === undefined ? 1 : loud) * 1.5, r = Math.random(), p = 0.9 + r * 0.25;
    const heel = (g) => this.tn(d, t, 0.07, 120 * p, 60, g, 'sine');
    switch (surf) {
      case 'sand': this.nb(d, t, 0.11, 'lowpass', 1100 * p, 0.6, 0.65 * L, 500); this.nb(d, t + 0.02, 0.09, 'bandpass', 2600, 0.8, 0.14 * L); heel(0.3 * L); break;
      case 'snow': for (let i = 0; i < 4; i++) this.nb(d, t + i * 0.022, 0.03, 'bandpass', 3300 + r * 700, 2.5, 0.22 * L); this.nb(d, t, 0.1, 'lowpass', 900, 0.6, 0.35 * L); heel(0.25 * L); break;
      case 'tile': this.nb(d, t, 0.03, 'highpass', 2800 * p, 0.8, 0.55 * L); this.nb(d, t, 0.07, 'bandpass', 1500 * p, 1.5, 0.6 * L); heel(0.4 * L); this.nb(d, t + 0.05, 0.04, 'bandpass', 3400, 2, 0.15 * L); break;
      case 'metal': this.nb(d, t, 0.04, 'bandpass', 1900 * p, 2, 0.5 * L); this.tn(d, t, 0.18, 640 * p, 590 * p, 0.14 * L, 'sine'); this.tn(d, t, 0.14, 1330 * p, 1270 * p, 0.08 * L, 'sine'); heel(0.35 * L); break;
      case 'stone': this.nb(d, t, 0.04, 'highpass', 2200 * p, 0.8, 0.45 * L); this.nb(d, t, 0.08, 'bandpass', 1000 * p, 1.2, 0.55 * L); heel(0.42 * L); this.nb(d, t + 0.03, 0.05, 'bandpass', 3100, 2.5, 0.12 * L); break;
      default: this.nb(d, t, 0.025, 'highpass', 2400 * p, 0.8, 0.45 * L); this.nb(d, t, 0.08, 'bandpass', 800 * p, 1.1, 0.6 * L); heel(0.4 * L);
    }
    if (!sneak && L > 0.5) this.nb(d, t + 0.1, 0.06, 'highpass', 5000, 0.8, 0.05 * L);             // yürüyüş üstü sürtünmesi
  },
  land(pos) {
    if (!this.ctx) return; const sp = this.spatial(pos, 26); if (sp.vol < 0.01) return; const d = sp.node, t = sp.t;
    this.tn(d, t, 0.16, 110, 45, 0.9, 'sine'); this.nb(d, t, 0.14, 'lowpass', 700, 0.6, 0.8); this.footstep(pos, 1.3);
  },
  // ---------- İSABET / ACI / SES (insan sesi) ----------
  hit(headshot) {
    if (!this.ctx) return; const t = this.ctx.currentTime, d = this.dry;
    if (headshot) { this.nb(d, t, 0.035, 'highpass', 3200, 0.7, 0.4); this.tn(d, t, 0.2, 1650, 1620, 0.22, 'sine'); this.tn(d, t + 0.004, 0.14, 3300, 3250, 0.1, 'sine'); }
    else { this.nb(d, t, 0.05, 'bandpass', 1000, 1, 0.3); this.tn(d, t, 0.07, 230, 120, 0.3, 'sine'); }
  },
  hurt(dmg) {
    if (!this.ctx) return; const t = this.ctx.currentTime, d = this.dry, g = Math.min(1, 0.5 + (dmg || 20) / 60);
    this.tn(d, t, 0.14, 95, 45, 0.75 * g, 'sine'); this.nb(d, t, 0.1, 'lowpass', 700, 0.7, 0.55 * g); this.nb(d, t, 0.03, 'bandpass', 1800, 1.5, 0.2);
    this.voice(null, 'pain', 1);
  },
  // kaba insan sesi: formant süzgeçli testere dalgası
  voice(pos, kind, seed) {
    if (!this.ctx) return;
    const key = pos ? Math.round(pos.x) + ',' + Math.round(pos.z) : 'p';
    const now = this.ctx.currentTime; if (now - (this.voiceT.get(key) || 0) < 0.35) return; this.voiceT.set(key, now);
    if (this.voiceT.size > 40) this.voiceT.clear();
    const sp = this.spatial(pos, 34); if (sp.vol < 0.02) return;
    const c = this.ctx, t = sp.t, out = sp.node, death = kind === 'death';
    const f0 = (90 + ((seed || Math.random()) * 37) % 38) * (death ? 1.15 : 1), dur = death ? 0.6 : 0.2;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0 * (death ? 1.4 : 1.15), t); o.frequency.exponentialRampToValueAtTime(f0 * (death ? 0.55 : 0.8), t + dur);
    if (death) { const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 6.5; lg.gain.value = 7; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.1); }
    const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 5; f1.frequency.setValueAtTime(death ? 780 : 620, t); f1.frequency.exponentialRampToValueAtTime(death ? 380 : 480, t + dur);
    const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 6; f2.frequency.setValueAtTime(death ? 1150 : 1050, t); f2.frequency.exponentialRampToValueAtTime(death ? 900 : 1500, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(death ? 0.5 : 0.42, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
    this.nb(out, t, dur * 0.8, 'bandpass', 1400, 1, 0.12, 700);                                                   // nefes
  },
  death(pos) { this.voice(pos, 'death', Math.random()); if (pos) { const sp = this.spatial(pos, 25); if (sp.vol > 0.03) { this.nb(sp.node, sp.t + 0.35, 0.12, 'lowpass', 500, 0.7, 0.5); this.tn(sp.node, sp.t + 0.35, 0.1, 100, 50, 0.4, 'sine'); } } },   // yere düşüş
  // ---------- MERMİ ETKİLERİ ----------
  whiz(o, d, maxT, supers) {
    if (!this.ctx) return;
    const L = this.listener, ey = L.y;
    const rx = L.x - o.x, ry = ey - o.y, rz = L.z - o.z;
    let tt = rx * d.x + ry * d.y + rz * d.z; if (tt < 1 || tt > maxT) return;
    const px = o.x + d.x * tt - L.x, py = o.y + d.y * tt - ey, pz = o.z + d.z * tt - L.z, dist = Math.hypot(px, py, pz);
    if (dist > 2.8) return;
    const c = this.ctx, t = c.currentTime + 0.003, k = 1 - dist / 2.8;
    const side = Math.max(-1, Math.min(1, (px * Math.cos(L.yaw) + pz * -Math.sin(L.yaw)) / Math.max(0.2, dist)));
    const g = c.createGain(); g.gain.value = 0.9 * k; let tail = g;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = side * 0.8; g.connect(p); tail = p; }
    tail.connect(this.dry);
    this.nb(g, t, 0.14, 'bandpass', 4200, 1.8, 0.55, 1700); this.nb(g, t, 0.025, 'highpass', 3500, 0.7, 0.6);        // vıziltı + süpersonik çatlak
    if (dist < 1.2) this.tn(g, t, 0.05, 1200, 600, 0.3, 'sine');
  },
  impact(point, kind) {
    if (!this.ctx) return; const now = this.ctx.currentTime; if (now - this.lastImpact < 0.03) return; this.lastImpact = now;
    const sp = this.spatial(point, 28, { noOcc: true }); if (sp.vol < 0.02) return; const d = sp.node, t = sp.t + 0.002;
    if (kind === 'crate' || kind === 'crate2') { this.tn(d, t, 0.07, 320, 160, 0.4, 'sine'); this.nb(d, t, 0.06, 'bandpass', 1400, 1.2, 0.35); }
    else if (kind === 'ground') { this.nb(d, t, 0.1, 'lowpass', 900, 0.7, 0.4); this.nb(d, t + 0.01, 0.05, 'bandpass', 2600, 1.2, 0.15); }
    else { this.nb(d, t, 0.03, 'highpass', 3500, 0.8, 0.4); this.nb(d, t, 0.09, 'bandpass', 1900, 1.2, 0.3); this.tn(d, t, 0.06, 240, 110, 0.18, 'sine'); }  // duvar/beton: taş kırıntısı
    if (Math.random() < 0.3) this.tn(d, t + 0.01, 0.4, 1600 + Math.random() * 800, 1100, 0.05, 'sine');                                // seken mermi
  },
  // ---------- BOMBALAR / PATLAMA ----------
  bounce(pos) {
    if (!this.ctx) return; const sp = this.spatial(pos, 26); if (sp.vol < 0.02) return; const d = sp.node, t = sp.t;
    this.tn(d, t, 0.05, 2900, 1900, 0.2, 'triangle'); this.tn(d, t, 0.06, 1500, 900, 0.12, 'square'); this.nb(d, t, 0.04, 'bandpass', 3000, 2, 0.2); this.tn(d, t, 0.06, 140, 80, 0.3, 'sine');
  },
  explosion(pos, big) {
    if (!this.ctx) return; const sp = this.spatial(pos, big ? 320 : 130, { delay: true, wet: big ? 1.3 : 1 }); if (sp.vol < 0.003) return;
    const t = sp.t, d = sp.node, m = big ? 1.7 : 1;
    this.nb(d, t, 0.09, 'highpass', 3000, 0.6, 1.1);                                              // keskin çatlama
    this.nb(d, t, 0.25 * m, 'bandpass', 900, 0.5, 1.2);                                            // gövde
    this.nb(d, t, 1.2 * m, 'lowpass', 260, 0.5, 1.6 * m);                                          // gürleme
    this.tn(d, t, 0.9 * m, 85, 22, 1.5 * m, 'sine');                                               // alt bas
    this.nb(d, t + 0.05, 0.7 * m, 'bandpass', 520, 0.6, 0.55, 220);                                // ardından gelen uğultu
    for (let i = 0; i < 8; i++) { const tt = t + 0.15 + Math.random() * 0.9 * m; this.tn(d, tt, 0.06, 2500 + Math.random() * 2500, 1200, 0.09, 'triangle'); this.nb(d, tt, 0.04, 'highpass', 3500, 1, 0.12); }   // enkaz parçaları
    if (this.env.slap) this.nb(d, t + this.env.slap + 0.12, 0.7 * m, 'lowpass', 300, 0.5, 0.45 * m);
  },
  smokePop(pos) {
    if (!this.ctx) return; const sp = this.spatial(pos, 42); if (sp.vol < 0.01) return; const t = sp.t, d = sp.node;
    this.tn(d, t, 0.12, 320, 120, 0.8, 'sine'); this.nb(d, t, 0.06, 'highpass', 2500, 0.7, 0.6);
    this.nb(d, t + 0.02, 2.2, 'bandpass', 3400, 0.5, 0.35, 1500, 0.08); this.nb(d, t + 0.02, 1.8, 'highpass', 5000, 0.5, 0.14, 3000, 0.1);        // tıslama
  },
  flashBang(pos) {
    if (!this.ctx) return; const sp = this.spatial(pos, 80, { delay: true }); if (sp.vol < 0.01) return; const t = sp.t, d = sp.node;
    this.nb(d, t, 0.1, 'highpass', 2500, 0.6, 1.4); this.nb(d, t, 0.3, 'bandpass', 1500, 0.6, 1.0); this.tn(d, t, 0.25, 220, 60, 0.9, 'sine'); this.nb(d, t + 0.02, 0.5, 'lowpass', 500, 0.6, 0.6);
  },
  ring(intensity) {
    if (!this.ctx) return; const t = this.ctx.currentTime, d = this.dry, I = intensity || 1;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = 'sine'; o.frequency.value = 4100;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16 * I, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0006, t + 4.2 * I);
    o.connect(g); g.connect(d); o.start(t); o.stop(t + 4.4 * I);
    this.tn(d, t, 3.2 * I, 2200, 2150, 0.05 * I, 'sine');
  },
  fire(pos) {
    if (!this.ctx) return; const sp = this.spatial(pos, 34); if (sp.vol < 0.01) return; const t = sp.t, d = sp.node;
    for (let i = 0; i < 6; i++) this.nb(d, t + i * 0.012, 0.04, 'highpass', 4500, 0.8, 0.35);           // cam kırılması
    this.tn(d, t + 0.04, 0.08, 1800, 900, 0.15, 'triangle'); this.nb(d, t + 0.05, 0.5, 'bandpass', 700, 0.6, 0.55, 300);   // alev patlaması
    for (let i = 0; i < 26; i++) this.nb(d, t + 0.3 + Math.random() * 6, 0.025, 'highpass', 3000 + Math.random() * 3000, 0.9, 0.05 + Math.random() * 0.1);   // çıtırtı
    this.nb(d, t + 0.2, 6.5, 'lowpass', 600, 0.5, 0.1, 400, 0.4);
  },
  // ---------- C4 ----------
  beep(pos, hi) {
    if (!this.ctx) return; const sp = this.spatial(pos, 50); if (sp.vol < 0.01) return; const t = sp.t, d = sp.node, f = hi ? 2750 : 2000;
    this.tn(d, t, 0.1, f, f * 0.995, 0.4, 'square', 0.001); this.tn(d, t, 0.09, f * 2, f * 2, 0.07, 'sine', 0.001); this.nb(d, t, 0.008, 'highpass', 6000, 0.8, 0.12);
  },
  plantKey(pos) {
    if (!this.ctx) return; const sp = this.spatial(pos, 22); if (sp.vol < 0.01) return; const t = sp.t, d = sp.node, f = 1100 + Math.floor(Math.random() * 6) * 130;
    this.tn(d, t, 0.045, f, f, 0.22, 'square', 0.001); this.nb(d, t, 0.02, 'highpass', 3500, 0.8, 0.2); this.tn(d, t, 0.03, 330, 200, 0.12, 'sine');
  },
  defused(pos) {
    if (!this.ctx) return; const sp = this.spatial(pos, 40); const t = sp.t, d = sp.node;
    this.nb(d, t, 0.02, 'highpass', 4000, 0.8, 0.5); this.tn(d, t, 0.05, 1800, 900, 0.25, 'square');             // tel kesme "çıt"
    [1200, 1600, 2000].forEach((f, i) => this.tn(d, t + 0.18 + i * 0.12, 0.1, f, f, 0.2, 'square', 0.001));
  },
  // ---------- ARAYÜZ ----------
  ui(f) { if (!this.ctx) return; const t = this.ctx.currentTime; this.tn(this.dry, t, 0.07, f || 880, f ? f * 0.9 : 790, 0.12, 'sine', 0.003); this.nb(this.dry, t, 0.01, 'highpass', 5000, 0.8, 0.05); },
  radio() { if (!this.ctx) return; const t = this.ctx.currentTime, d = this.dry; this.nb(d, t, 0.05, 'bandpass', 2400, 1.2, 0.12); this.tn(d, t + 0.05, 0.05, 1500, 1500, 0.06, 'square'); this.nb(d, t + 0.1, 0.06, 'bandpass', 2000, 1.5, 0.1); },
  roundStart() { if (!this.ctx) return; const t = this.ctx.currentTime, d = this.dry; this.tn(d, t, 0.18, 660, 660, 0.14, 'triangle', 0.01); this.tn(d, t + 0.16, 0.3, 990, 990, 0.14, 'triangle', 0.01); this.tn(d, t + 0.16, 0.3, 1485, 1485, 0.05, 'sine', 0.01); },
  roundEnd(win) {
    if (!this.ctx) return; const t = this.ctx.currentTime, d = this.dry;
    const n = win ? [523, 659, 784, 1046] : [466, 415, 349, 293];
    n.forEach((f, i) => { this.tn(d, t + i * 0.15, 0.4, f, f, 0.14, 'triangle', 0.01); this.tn(d, t + i * 0.15, 0.4, f * 2, f * 2, 0.04, 'sine', 0.01); });
  },
  // ---------- ORTAM SESİ ----------
  ambStart(theme) {
    if (!this.ctx) return; this.ambStop();
    const c = this.ctx, th = theme || this.theme;
    const P = { desert: { f: 520, q: 0.5, g: 0.05, lfo: 0.11, lp: 1400 }, snow: { f: 760, q: 0.45, g: 0.065, lfo: 0.17, lp: 1900 }, harbor: { f: 300, q: 0.5, g: 0.05, lfo: 0.09, lp: 900, hum: 55 }, town: { f: 450, q: 0.5, g: 0.034, lfo: 0.1, lp: 1200 }, range: { f: 220, q: 0.5, g: 0.02, lfo: 0.06, lp: 600, hum: 50 } }[th] || { f: 400, q: 0.5, g: 0.03, lfo: 0.1, lp: 1000 };
    const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = P.f; bp.Q.value = P.q;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = P.lp;
    const g = c.createGain(); g.gain.value = P.g;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = P.lfo; lg.gain.value = P.g * 0.6; lfo.connect(lg); lg.connect(g.gain);   // rüzgâr dalgalanması
    src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(); lfo.start();
    const nodes = [src, lfo];
    if (P.hum) { const h = c.createOscillator(), hg = c.createGain(); h.type = 'sine'; h.frequency.value = P.hum; hg.gain.value = 0.012; h.connect(hg); hg.connect(this.master); h.start(); nodes.push(h); }
    this.amb = { nodes, g };
  },
  ambStop() { if (this.amb) { this.amb.nodes.forEach(n => { try { n.stop(); } catch (e) {} }); this.amb = null; } },
};
