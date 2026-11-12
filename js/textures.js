// Prosedürel dokular (canvas) - harici görsel dosyası yok
'use strict';
const Tex = (function () {
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function noise(ctx, w, h, amt, r, alpha) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() - 0.5) * amt;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.9));
      if (alpha) d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  function blotches(ctx, w, h, r, n, colors, minR, maxR, a) {
    for (let i = 0; i < n; i++) {
      const x = r() * w, y = r() * h, rad = minR + r() * (maxR - minR);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const c = colors[Math.floor(r() * colors.length)];
      g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }
  const RETRO = (typeof S !== 'undefined') && S.texStyle === 'retro';
  // Eski okul görünüm: düşük çözünürlük, sınırlı renk, sıralı titreşim (dither), daha doygun ve kontrastlı
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function retroize(src, size, keepAlpha) {
    const c = canvas(size, size), x = c.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, size, size);
    const img = x.getImageData(0, 0, size, size), d = img.data;
    const levels = 24;
    for (let y = 0; y < size; y++) for (let xx = 0; xx < size; xx++) {
      const i = (y * size + xx) * 4;
      const dth = (BAYER[(y & 3) * 4 + (xx & 3)] / 16 - 0.5) * (255 / levels);
      let r = d[i], g = d[i + 1], b = d[i + 2];
      const l = (r + g + b) / 3;
      // doygunluk & kontrast
      r = l + (r - l) * 1.35; g = l + (g - l) * 1.35; b = l + (b - l) * 1.35;
      r = (r - 128) * 1.12 + 128; g = (g - 128) * 1.12 + 128; b = (b - 128) * 1.12 + 128;
      const q = v => Math.max(0, Math.min(255, Math.round((v + dth) / 255 * (levels - 1)) * 255 / (levels - 1)));
      d[i] = q(r); d[i + 1] = q(g); d[i + 2] = q(b);
      if (!keepAlpha) d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  function pixelate(t) {
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestMipmapLinearFilter;
    t.anisotropy = 1;
    return t;
  }
  function toTex(c, repeat) {
    if (RETRO) c = retroize(c, c.width >= 512 ? 128 : 64);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    t.encoding = THREE.sRGBEncoding;
    if (RETRO) pixelate(t);
    return t;
  }
  // Kumtaşı blok duvar
  function sandstone(seed, base) {
    const S = 512, c = canvas(S), x = c.getContext('2d'), r = rng(seed);
    x.fillStyle = base || '#c9a978'; x.fillRect(0, 0, S, S);
    const rows = 8, bh = S / rows;
    for (let row = 0; row < rows; row++) {
      let cx = row % 2 ? -bh * 0.8 : 0;
      while (cx < S) {
        const bw = bh * (1.4 + r() * 1.2);
        const t = (r() - 0.5) * 26;
        x.fillStyle = `rgba(${t > 0 ? 255 : 60},${t > 0 ? 235 : 40},${t > 0 ? 200 : 20},${Math.abs(t) / 120})`;
        x.fillRect(cx, row * bh, bw, bh);
        // harç çizgisi
        x.fillStyle = 'rgba(70,50,30,0.45)';
        x.fillRect(cx, row * bh, 3, bh);
        cx += bw;
      }
      x.fillStyle = 'rgba(70,50,30,0.5)'; x.fillRect(0, row * bh, S, 3);
      x.fillStyle = 'rgba(255,240,210,0.18)'; x.fillRect(0, row * bh + 3, S, 2);
    }
    blotches(x, S, S, r, 40, ['90,60,30', '255,230,190', '120,90,60'], 10, 70, 0.12);
    noise(x, S, S, 30, r);
    return toTex(c);
  }
  // Sıva duvar
  function plaster(seed, base) {
    const S = 512, c = canvas(S), x = c.getContext('2d'), r = rng(seed);
    x.fillStyle = base || '#d8c4a0'; x.fillRect(0, 0, S, S);
    blotches(x, S, S, r, 60, ['150,120,80', '240,225,200', '110,90,70'], 20, 110, 0.14);
    // dökülmüş sıva -> tuğla
    for (let i = 0; i < 5; i++) {
      const px = r() * S, py = r() * S, w = 40 + r() * 80, h = 30 + r() * 50;
      x.fillStyle = 'rgba(150,85,55,0.85)'; x.fillRect(px, py, w, h);
      x.strokeStyle = 'rgba(90,60,40,0.8)'; x.lineWidth = 2;
      for (let yy = py; yy < py + h; yy += 10) { x.beginPath(); x.moveTo(px, yy); x.lineTo(px + w, yy); x.stroke(); }
    }
    // çatlaklar
    x.strokeStyle = 'rgba(80,60,40,0.4)'; x.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      let px = r() * S, py = r() * S; x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 6; k++) { px += (r() - 0.5) * 40; py += r() * 25; x.lineTo(px, py); }
      x.stroke();
    }
    noise(x, S, S, 22, r);
    return toTex(c);
  }
  function ground(seed, base, stones) {
    const S = 512, c = canvas(S), x = c.getContext('2d'), r = rng(seed);
    x.fillStyle = base || '#b89a6a'; x.fillRect(0, 0, S, S);
    blotches(x, S, S, r, 90, ['130,100,60', '220,195,150', '100,80,50'], 15, 90, 0.18);
    for (let i = 0; i < (stones || 250); i++) {
      const px = r() * S, py = r() * S, rad = 1 + r() * 3;
      x.fillStyle = `rgba(${80 + r() * 60},${65 + r() * 50},${45 + r() * 30},0.6)`;
      x.beginPath(); x.arc(px, py, rad, 0, 6.3); x.fill();
    }
    noise(x, S, S, 26, r);
    return toTex(c);
  }
  function tiles(seed, base, size) {
    const S = 512, c = canvas(S), x = c.getContext('2d'), r = rng(seed);
    x.fillStyle = base || '#a39a8a'; x.fillRect(0, 0, S, S);
    const n = size || 4, ts = S / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const t = (r() - 0.5) * 30;
      x.fillStyle = `rgba(${t > 0 ? 255 : 0},${t > 0 ? 245 : 0},${t > 0 ? 230 : 0},${Math.abs(t) / 150})`;
      x.fillRect(i * ts, j * ts, ts, ts);
      x.strokeStyle = 'rgba(50,45,40,0.6)'; x.lineWidth = 3; x.strokeRect(i * ts + 1, j * ts + 1, ts - 2, ts - 2);
    }
    blotches(x, S, S, r, 40, ['80,70,60', '200,190,170'], 15, 80, 0.15);
    noise(x, S, S, 22, r);
    return toTex(c);
  }
  function crate(seed, dark) {
    const S = 256, c = canvas(S), x = c.getContext('2d'), r = rng(seed);
    const base = dark ? [92, 70, 45] : [150, 112, 66];
    x.fillStyle = `rgb(${base})`; x.fillRect(0, 0, S, S);
    // tahtalar
    const planks = 6, ph = S / planks;
    for (let i = 0; i < planks; i++) {
      const t = (r() - 0.5) * 30;
      x.fillStyle = `rgb(${base[0] + t},${base[1] + t * 0.8},${base[2] + t * 0.6})`;
      x.fillRect(0, i * ph, S, ph - 2);
      x.strokeStyle = 'rgba(60,40,20,0.35)'; x.lineWidth = 1;
      for (let k = 0; k < 5; k++) { const yy = i * ph + r() * ph; x.beginPath(); x.moveTo(0, yy); x.bezierCurveTo(S * 0.3, yy + (r() - 0.5) * 6, S * 0.6, yy + (r() - 0.5) * 6, S, yy); x.stroke(); }
      x.fillStyle = 'rgba(30,20,10,0.6)'; x.fillRect(0, i * ph + ph - 2, S, 2);
    }
    // çerçeve + çapraz
    const fw = 22;
    x.fillStyle = `rgb(${base[0] - 18},${base[1] - 16},${base[2] - 12})`;
    x.fillRect(0, 0, S, fw); x.fillRect(0, S - fw, S, fw); x.fillRect(0, 0, fw, S); x.fillRect(S - fw, 0, fw, S);
    x.save(); x.translate(S / 2, S / 2); x.rotate(Math.PI / 4); x.fillRect(-S * 0.7, -fw / 2, S * 1.4, fw); x.restore();
    x.strokeStyle = 'rgba(20,10,0,0.6)'; x.lineWidth = 2; x.strokeRect(fw, fw, S - fw * 2, S - fw * 2); x.strokeRect(1, 1, S - 2, S - 2);
    // çiviler
    x.fillStyle = 'rgba(40,40,40,0.9)';
    [[11, 11], [S - 11, 11], [11, S - 11], [S - 11, S - 11]].forEach(p => { x.beginPath(); x.arc(p[0], p[1], 3, 0, 7); x.fill(); });
    if (RETRO) {
      // şablon boya: yön okları ve kargo yazısı
      x.fillStyle = 'rgba(25,18,8,0.75)'; x.font = 'bold 26px Impact, Arial Black, sans-serif'; x.textAlign = 'center';
      x.fillText(dark ? 'KARGO' : 'KIRILIR', S / 2, S * 0.36);
      x.beginPath(); x.moveTo(S / 2 - 30, S * 0.66); x.lineTo(S / 2 - 16, S * 0.54); x.lineTo(S / 2 - 2, S * 0.66); x.fill();
      x.beginPath(); x.moveTo(S / 2 + 2, S * 0.66); x.lineTo(S / 2 + 16, S * 0.54); x.lineTo(S / 2 + 30, S * 0.66); x.fill();
      x.fillRect(S / 2 - 20, S * 0.66, 8, 22); x.fillRect(S / 2 + 12, S * 0.66, 8, 22);
    }
    noise(x, S, S, 18, r);
    return toTex(c);
  }
  function metal(seed, base) {
    const S = 256, c = canvas(S), x = c.getContext('2d'), r = rng(seed);
    x.fillStyle = base || '#4f6152'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < S; i += 16) { x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(i, 0, 4, S); x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(i + 4, 0, 3, S); }
    blotches(x, S, S, r, 25, ['110,60,30', '60,40,30'], 5, 30, 0.35);
    noise(x, S, S, 20, r);
    return toTex(c);
  }
  function concrete(seed, base) {
    const S = 256, c = canvas(S), x = c.getContext('2d'), r = rng(seed);
    x.fillStyle = base || '#8e8a82'; x.fillRect(0, 0, S, S);
    blotches(x, S, S, r, 40, ['60,60,60', '170,165,155'], 10, 60, 0.2);
    noise(x, S, S, 26, r);
    return toTex(c);
  }
  function siteLetter(letter) {
    const S = 256, c = canvas(S), x = c.getContext('2d');
    x.clearRect(0, 0, S, S);
    x.font = 'bold 200px Impact, Arial Black, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = 'rgba(200,40,20,0.85)'; x.fillText(letter, S / 2, S / 2 + 10);
    // sprey dağılımı
    const r = rng(letter.charCodeAt(0));
    for (let i = 0; i < 300; i++) { x.fillStyle = 'rgba(200,40,20,0.25)'; x.fillRect(S / 2 + (r() - 0.5) * 180, S / 2 + (r() - 0.5) * 200, 2, 2); }
    const t = new THREE.CanvasTexture(RETRO ? retroize(c, 64, true) : c); t.encoding = THREE.sRGBEncoding; if (RETRO) pixelate(t); return t;
  }
  function sky() {
    const c = canvas(16, 256), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256);
    if (RETRO) { g.addColorStop(0, '#2f63b8'); g.addColorStop(0.42, '#7fb0e6'); g.addColorStop(0.5, '#d9c08a'); g.addColorStop(1, '#b8955a'); }
    else { g.addColorStop(0, '#3f7cc7'); g.addColorStop(0.45, '#8fbde8'); g.addColorStop(0.5, '#e9dcc3'); g.addColorStop(1, '#c9b48e'); }
    x.fillStyle = g; x.fillRect(0, 0, 16, 256);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }
  function soft(r0, inner, outer) {
    const S = 64, c = canvas(S), x = c.getContext('2d');
    const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, inner || 'rgba(255,255,255,1)'); g.addColorStop(r0 || 0.3, inner || 'rgba(255,255,255,0.8)'); g.addColorStop(1, outer || 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    return new THREE.CanvasTexture(c);
  }
  function smokePuff(seed) {
    const S = 128, c = canvas(S), x = c.getContext('2d'), r = rng(seed);
    for (let i = 0; i < 18; i++) {
      const px = S / 2 + (r() - 0.5) * S * 0.45, py = S / 2 + (r() - 0.5) * S * 0.45, rad = S * (0.15 + r() * 0.22);
      const g = x.createRadialGradient(px, py, 0, px, py, rad);
      const v = 200 + r() * 40;
      g.addColorStop(0, `rgba(${v},${v},${v},0.5)`); g.addColorStop(1, `rgba(${v},${v},${v},0)`);
      x.fillStyle = g; x.fillRect(0, 0, S, S);
    }
    return new THREE.CanvasTexture(c);
  }
  function muzzle() {
    const S = 128, c = canvas(S), x = c.getContext('2d');
    x.translate(S / 2, S / 2);
    for (let i = 0; i < 7; i++) {
      x.rotate(Math.PI * 2 / 7 + Math.random() * 0.3);
      const g = x.createLinearGradient(0, 0, S / 2, 0);
      g.addColorStop(0, 'rgba(255,255,220,1)'); g.addColorStop(0.4, 'rgba(255,200,80,0.8)'); g.addColorStop(1, 'rgba(255,120,0,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(0, -6); x.lineTo(S / 2, 0); x.lineTo(0, 6); x.fill();
    }
    const g2 = x.createRadialGradient(0, 0, 0, 0, 0, S * 0.3);
    g2.addColorStop(0, 'rgba(255,255,230,1)'); g2.addColorStop(1, 'rgba(255,180,60,0)');
    x.fillStyle = g2; x.fillRect(-S / 2, -S / 2, S, S);
    return new THREE.CanvasTexture(c);
  }
  function bulletHole() {
    const S = 32, c = canvas(S), x = c.getContext('2d');
    const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(10,8,5,1)'); g.addColorStop(0.3, 'rgba(25,20,15,0.95)'); g.addColorStop(0.55, 'rgba(60,50,40,0.5)'); g.addColorStop(1, 'rgba(60,50,40,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    return new THREE.CanvasTexture(c);
  }
  function camo(seed, cols) {
    const S = 128, c = canvas(S), x = c.getContext('2d'), r = rng(seed);
    x.fillStyle = cols[0]; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 40; i++) {
      x.fillStyle = cols[1 + Math.floor(r() * (cols.length - 1))];
      x.beginPath(); const px = r() * S, py = r() * S;
      x.ellipse(px, py, 5 + r() * 14, 3 + r() * 8, r() * 3, 0, 7); x.fill();
    }
    noise(x, S, S, 14, r);
    return toTex(c);
  }
  return { RETRO, sandstone, plaster, ground, tiles, crate, metal, concrete, siteLetter, sky, soft, smokePuff, muzzle, bulletHole, camo };
})();
