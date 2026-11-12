// Sentezlenmiş ses efektleri (WebAudio) - harici dosya gerektirmez
'use strict';
const Audio3 = {
  ctx: null, master: null, noise: null,
  listener: { x: 0, y: 0, z: 0, yaw: 0 },
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = S.volume;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp); comp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  setVolume(v) { if (this.master) this.master.gain.value = v; },
  // Konuma göre kazanç & pan düğümü
  spatial(pos, maxDist) {
    const c = this.ctx;
    const g = c.createGain();
    let vol = 1, pan = 0;
    if (pos) {
      const L = this.listener;
      const dx = pos.x - L.x, dz = pos.z - L.z, dy = (pos.y || 0) - L.y;
      const d = Math.sqrt(dx * dx + dz * dz + dy * dy);
      vol = Math.max(0, 1 - d / (maxDist || 60));
      vol = vol * vol;
      if (d > 0.5) {
        // dinleyicinin sağ vektörü
        const rx = Math.cos(L.yaw), rz = -Math.sin(L.yaw);
        pan = Math.max(-1, Math.min(1, (dx * rx + dz * rz) / d)) * 0.85;
      }
    }
    g.gain.value = vol;
    let out = g;
    if (c.createStereoPanner) {
      const p = c.createStereoPanner(); p.pan.value = pan;
      g.connect(p); p.connect(this.master);
    } else g.connect(this.master);
    return { node: g, vol };
  },
  noiseBurst(dest, t, dur, freq, q, gain, type) {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  },
  tone(dest, t, dur, f0, f1, gain, type) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  },
  shot(def, pos) {
    if (!this.ctx) return;
    const sp = this.spatial(pos, def.silenced ? 35 : 120);
    if (sp.vol < 0.003) return;
    const t = this.ctx.currentTime, d = sp.node;
    const k = def.sound || {};
    const body = k.body || 1, pitch = k.pitch || 1;
    if (def.silenced) {
      this.noiseBurst(d, t, 0.09, 1800 * pitch, 0.8, 0.5, 'bandpass');
      this.tone(d, t, 0.06, 300, 120, 0.25, 'triangle');
      return;
    }
    this.noiseBurst(d, t, 0.05, 4000 * pitch, 0.5, 0.8 * body, 'highpass');
    this.noiseBurst(d, t, 0.18 * body, 900 * pitch, 0.7, 1.0 * body, 'lowpass');
    this.tone(d, t, 0.12 * body, 140 * pitch, 45, 0.9 * body, 'sine');
    // uzaklıkta yankı
    this.noiseBurst(d, t + 0.05, 0.35 * body, 500 * pitch, 0.4, 0.18 * body, 'lowpass');
  },
  knife(pos) {
    if (!this.ctx) return;
    const sp = this.spatial(pos, 15); const t = this.ctx.currentTime;
    this.noiseBurst(sp.node, t, 0.15, 3000, 1.5, 0.35, 'bandpass');
  },
  footstep(pos, loud) {
    if (!this.ctx) return;
    const sp = this.spatial(pos, 28); if (sp.vol < 0.01) return;
    const t = this.ctx.currentTime;
    this.noiseBurst(sp.node, t, 0.07, 350 + Math.random() * 200, 1.2, 0.9 * (loud || 1), 'bandpass');
    this.noiseBurst(sp.node, t + 0.02, 0.05, 2200, 2, 0.15 * (loud || 1), 'bandpass');
  },
  land(pos) {
    if (!this.ctx) return;
    const sp = this.spatial(pos, 25); const t = this.ctx.currentTime;
    this.noiseBurst(sp.node, t, 0.12, 250, 1, 1.0, 'lowpass');
  },
  click(pos, f) {
    if (!this.ctx) return;
    const sp = this.spatial(pos, 12); const t = this.ctx.currentTime;
    this.tone(sp.node, t, 0.04, f || 1800, (f || 1800) * 0.6, 0.3, 'square');
  },
  reload(pos) {
    if (!this.ctx) return;
    const sp = this.spatial(pos, 14); const t = this.ctx.currentTime;
    this.noiseBurst(sp.node, t, 0.06, 2500, 3, 0.4, 'bandpass');
    this.tone(sp.node, t + 0.35, 0.05, 900, 500, 0.3, 'square');
    this.noiseBurst(sp.node, t + 0.55, 0.06, 1800, 3, 0.5, 'bandpass');
  },
  hit(headshot) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (headshot) {
      this.tone(this.master, t, 0.25, 2600, 2400, 0.25, 'triangle');
      this.tone(this.master, t, 0.15, 5200, 5000, 0.08, 'sine');
    } else {
      this.noiseBurst(this.master, t, 0.06, 1200, 1, 0.25, 'bandpass');
    }
  },
  hurt() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.noiseBurst(this.master, t, 0.12, 600, 1, 0.6, 'lowpass');
  },
  beep(pos, hi) {
    if (!this.ctx) return;
    const sp = this.spatial(pos, 45); const t = this.ctx.currentTime;
    this.tone(sp.node, t, 0.12, hi ? 2400 : 1950, null, 0.35, 'square');
  },
  plantKey(pos) {
    if (!this.ctx) return;
    const sp = this.spatial(pos, 20); const t = this.ctx.currentTime;
    this.tone(sp.node, t, 0.06, 1200 + Math.random() * 600, null, 0.2, 'square');
  },
  explosion(pos, big) {
    if (!this.ctx) return;
    const sp = this.spatial(pos, big ? 250 : 110); const t = this.ctx.currentTime;
    const m = big ? 1.6 : 1;
    this.noiseBurst(sp.node, t, 1.2 * m, 300, 0.5, 1.6, 'lowpass');
    this.tone(sp.node, t, 0.8 * m, 90, 25, 1.4, 'sine');
    this.noiseBurst(sp.node, t, 0.3, 2500, 0.5, 0.6, 'highpass');
  },
  bounce(pos) {
    if (!this.ctx) return;
    const sp = this.spatial(pos, 25); const t = this.ctx.currentTime;
    this.tone(sp.node, t, 0.05, 1500, 900, 0.25, 'triangle');
  },
  smokePop(pos) {
    if (!this.ctx) return;
    const sp = this.spatial(pos, 40); const t = this.ctx.currentTime;
    this.noiseBurst(sp.node, t, 2.0, 700, 0.3, 0.7, 'lowpass');
  },
  flashBang(pos) {
    if (!this.ctx) return;
    const sp = this.spatial(pos, 70); const t = this.ctx.currentTime;
    this.noiseBurst(sp.node, t, 0.5, 3000, 0.3, 1.4, 'highpass');
    this.tone(sp.node, t, 0.3, 180, 60, 1.0, 'sine');
  },
  ring(intensity) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(this.master, t, 2.5 * intensity, 3200, 3100, 0.12 * intensity, 'sine');
  },
  fire(pos) {
    if (!this.ctx) return;
    const sp = this.spatial(pos, 30); const t = this.ctx.currentTime;
    this.noiseBurst(sp.node, t, 0.4, 500, 0.3, 0.25, 'lowpass');
  },
  ui(f) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(this.master, t, 0.08, f || 880, null, 0.12, 'sine');
  },
  roundStart() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(this.master, t, 0.15, 660, null, 0.15, 'triangle');
    this.tone(this.master, t + 0.15, 0.25, 990, null, 0.15, 'triangle');
  },
  roundEnd(win) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const n = win ? [523, 659, 784, 1046] : [523, 466, 392, 330];
    n.forEach((f, i) => this.tone(this.master, t + i * 0.16, 0.35, f, null, 0.15, 'triangle'));
  }
};
