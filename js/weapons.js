// Silah & ekipman verileri (gerçek dünya silah adları, taktik nişancı değerleri)
'use strict';
// birimler: hasar puanı, rpm, saniye, inaccuracy derece, hız (250 = bıçak)
// rangeMod: her 12.7 m'de hasar çarpanı
// pen: zırh delme oranı (zırhlıya giden hasar oranı)
function seededRand(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
// Sprey deseni üretici (derece cinsinden kümülatif sapma). Tekrarlanabilir = öğrenilebilir.
function makePattern(n, up, side, seed, style) {
  const r = seededRand(seed);
  const p = [[0, 0]];
  let x = 0, y = 0;
  for (let i = 1; i < n; i++) {
    let dy, dx;
    if (style === 'smooth') {               // SMG/hafif
      dy = i < 8 ? up * (0.7 + i * 0.05) : up * 0.25;
      dx = side * 0.5 * Math.sin(i * 0.45 + seed) + (r() - 0.5) * side * 0.3;
    } else if (style === 'pistol') {
      dy = up * (1 - i * 0.03); dx = (r() - 0.5) * side;
    } else {                                // tüfek: önce yukarı, sonra sol-sağ
      if (i < 10) { dy = up * (0.55 + i * 0.09); dx = (r() - 0.5) * side * 0.25; }
      else {
        dy = up * (0.12 + r() * 0.1);
        const ph = (i - 10) / 7;
        dx = side * (Math.floor(ph) % 2 === 0 ? -1 : 1) * (0.8 + r() * 0.5);
      }
    }
    x += dx; y += dy;
    p.push([x, y]);
  }
  return p;
}

const WEAPONS = {
  // ---------- BIÇAK ----------
  knife: { id: 'knife', name: 'Bıçak', slot: 'knife', type: 'knife', price: 0, damage: 40, damage2: 65, rpm: 120, speed: 250, side: 'both', reward: 1500,
    model: { kind: 'knife' } },
  // ---------- TABANCALAR ----------
  glock: { id: 'glock', name: 'Glock-18', slot: 'secondary', type: 'pistol', price: 200, damage: 30, pen: 0.47, rpm: 400, mag: 20, reserve: 120, reload: 2.2,
    speed: 240, rangeMod: 0.85, inacc: 0.9, crouchInacc: 0.7, moveInacc: 2.2, fireInacc: 1.4, recover: 0.32, recoil: 1.0, side: 'T', reward: 300, auto: false,
    model: { kind: 'pistol', body: 0x2b2b2b, grip: 0x1a1a1a, len: 0.19 }, sound: { body: 0.6, pitch: 1.3 } },
  usp: { id: 'usp', name: 'USP-S', slot: 'secondary', type: 'pistol', price: 200, damage: 35, pen: 0.505, rpm: 352, mag: 12, reserve: 24, reload: 2.2,
    speed: 240, rangeMod: 0.91, inacc: 0.55, crouchInacc: 0.45, moveInacc: 2.0, fireInacc: 1.6, recover: 0.3, recoil: 1.0, side: 'CT', reward: 300, silenced: true,
    model: { kind: 'pistol', body: 0x3a3a3a, grip: 0x222222, len: 0.2, silencer: true }, sound: { body: 0.6, pitch: 1.2 } },
  p2000: { id: 'p2000', name: 'P2000', slot: 'secondary', type: 'pistol', price: 200, damage: 35, pen: 0.505, rpm: 352, mag: 13, reserve: 52, reload: 2.2,
    speed: 240, rangeMod: 0.91, inacc: 0.6, crouchInacc: 0.5, moveInacc: 2.0, fireInacc: 1.6, recover: 0.3, recoil: 1.0, side: 'CT', reward: 300,
    model: { kind: 'pistol', body: 0x303030, grip: 0x1d1d1d, len: 0.19 }, sound: { body: 0.65, pitch: 1.15 } },
  p250: { id: 'p250', name: 'P250', slot: 'secondary', type: 'pistol', price: 300, damage: 38, pen: 0.64, rpm: 400, mag: 13, reserve: 26, reload: 2.2,
    speed: 240, rangeMod: 0.85, inacc: 0.75, crouchInacc: 0.6, moveInacc: 2.2, fireInacc: 2.0, recover: 0.32, recoil: 1.1, side: 'both', reward: 300,
    model: { kind: 'pistol', body: 0x555048, grip: 0x222222, len: 0.18 }, sound: { body: 0.7, pitch: 1.1 } },
  fiveseven: { id: 'fiveseven', name: 'Five-SeveN', slot: 'secondary', type: 'pistol', price: 500, damage: 32, pen: 0.91, rpm: 400, mag: 20, reserve: 100, reload: 2.2,
    speed: 240, rangeMod: 0.81, inacc: 0.7, crouchInacc: 0.55, moveInacc: 2.0, fireInacc: 1.6, recover: 0.3, recoil: 1.0, side: 'CT', reward: 300,
    model: { kind: 'pistol', body: 0x6b6e70, grip: 0x222222, len: 0.2 }, sound: { body: 0.65, pitch: 1.25 } },
  tec9: { id: 'tec9', name: 'Tec-9', slot: 'secondary', type: 'pistol', price: 500, damage: 33, pen: 0.9, rpm: 500, mag: 18, reserve: 90, reload: 2.5,
    speed: 240, rangeMod: 0.83, inacc: 0.9, crouchInacc: 0.75, moveInacc: 1.6, fireInacc: 1.8, recover: 0.3, recoil: 1.0, side: 'T', reward: 300,
    model: { kind: 'pistol', body: 0x2e2e2e, grip: 0x1a1a1a, len: 0.26 }, sound: { body: 0.7, pitch: 1.2 } },
  deagle: { id: 'deagle', name: 'Desert Eagle', slot: 'secondary', type: 'pistol', price: 700, damage: 63, pen: 0.932, rpm: 267, mag: 7, reserve: 35, reload: 2.2,
    speed: 230, rangeMod: 0.81, inacc: 0.6, crouchInacc: 0.45, moveInacc: 4.5, fireInacc: 5.0, recover: 0.45, recoil: 2.6, side: 'both', reward: 300,
    model: { kind: 'pistol', body: 0x9a9a9a, grip: 0x222222, len: 0.25 }, sound: { body: 1.2, pitch: 0.8 } },
  // ---------- SMG ----------
  mac10: { id: 'mac10', name: 'MAC-10', slot: 'primary', type: 'smg', price: 1050, damage: 29, pen: 0.575, rpm: 800, mag: 30, reserve: 100, reload: 3.2,
    speed: 240, rangeMod: 0.8, inacc: 1.2, crouchInacc: 1.0, moveInacc: 2.4, fireInacc: 0.55, recover: 0.3, recoil: 0.75, side: 'T', reward: 600, auto: true,
    model: { kind: 'smg', body: 0x2a2a2a, furn: 0x1a1a1a, len: 0.34 }, sound: { body: 0.7, pitch: 1.3 } },
  mp9: { id: 'mp9', name: 'MP9', slot: 'primary', type: 'smg', price: 1250, damage: 26, pen: 0.6, rpm: 857, mag: 30, reserve: 120, reload: 2.1,
    speed: 240, rangeMod: 0.87, inacc: 1.0, crouchInacc: 0.85, moveInacc: 2.2, fireInacc: 0.5, recover: 0.3, recoil: 0.7, side: 'CT', reward: 600, auto: true,
    model: { kind: 'smg', body: 0x333333, furn: 0x111111, len: 0.38 }, sound: { body: 0.7, pitch: 1.35 } },
  mp7: { id: 'mp7', name: 'MP7', slot: 'primary', type: 'smg', price: 1500, damage: 29, pen: 0.625, rpm: 750, mag: 30, reserve: 120, reload: 3.1,
    speed: 220, rangeMod: 0.85, inacc: 0.9, crouchInacc: 0.75, moveInacc: 2.2, fireInacc: 0.45, recover: 0.3, recoil: 0.7, side: 'both', reward: 600, auto: true,
    model: { kind: 'smg', body: 0x3b3b3b, furn: 0x1f1f1f, len: 0.42 }, sound: { body: 0.75, pitch: 1.25 } },
  ump45: { id: 'ump45', name: 'UMP-45', slot: 'primary', type: 'smg', price: 1200, damage: 35, pen: 0.65, rpm: 666, mag: 25, reserve: 100, reload: 3.5,
    speed: 230, rangeMod: 0.75, inacc: 1.0, crouchInacc: 0.85, moveInacc: 2.6, fireInacc: 0.55, recover: 0.32, recoil: 0.85, side: 'both', reward: 600, auto: true,
    model: { kind: 'smg', body: 0x2c2c2c, furn: 0x2c2c2c, len: 0.48 }, sound: { body: 0.8, pitch: 1.1 } },
  p90: { id: 'p90', name: 'P90', slot: 'primary', type: 'smg', price: 2350, damage: 26, pen: 0.69, rpm: 857, mag: 50, reserve: 100, reload: 3.3,
    speed: 230, rangeMod: 0.86, inacc: 1.0, crouchInacc: 0.85, moveInacc: 2.4, fireInacc: 0.45, recover: 0.3, recoil: 0.7, side: 'both', reward: 300, auto: true,
    model: { kind: 'smg', body: 0x262626, furn: 0x4a4f3a, len: 0.5, bullpup: true }, sound: { body: 0.75, pitch: 1.3 } },
  // ---------- POMPALI / AĞIR ----------
  nova: { id: 'nova', name: 'Nova', slot: 'primary', type: 'shotgun', price: 1050, damage: 26, pellets: 9, pelletSpread: 3.8, pen: 0.5, rpm: 68, mag: 8, reserve: 32, reload: 0.5, shellReload: true,
    speed: 220, rangeMod: 0.7, inacc: 0.5, crouchInacc: 0.4, moveInacc: 1.5, fireInacc: 2.0, recover: 0.6, recoil: 3.0, side: 'both', reward: 900, auto: false,
    model: { kind: 'shotgun', body: 0x222222, furn: 0x3a3a3a, len: 0.95 }, sound: { body: 1.4, pitch: 0.75 } },
  xm1014: { id: 'xm1014', name: 'XM1014', slot: 'primary', type: 'shotgun', price: 2000, damage: 20, pellets: 6, pelletSpread: 4.2, pen: 0.8, rpm: 171, mag: 7, reserve: 32, reload: 0.45, shellReload: true,
    speed: 215, rangeMod: 0.7, inacc: 0.6, crouchInacc: 0.5, moveInacc: 1.5, fireInacc: 1.8, recover: 0.5, recoil: 2.2, side: 'both', reward: 900, auto: true,
    model: { kind: 'shotgun', body: 0x1e1e1e, furn: 0x1e1e1e, len: 1.0 }, sound: { body: 1.3, pitch: 0.8 } },
  negev: { id: 'negev', name: 'Negev', slot: 'primary', type: 'lmg', price: 1700, damage: 35, pen: 0.71, rpm: 800, mag: 150, reserve: 300, reload: 5.7,
    speed: 150, rangeMod: 0.9, inacc: 1.6, crouchInacc: 1.2, moveInacc: 7, fireInacc: 0.3, recover: 0.6, recoil: 0.6, side: 'both', reward: 300, auto: true,
    model: { kind: 'lmg', body: 0x2e3029, furn: 0x22241f, len: 1.0 }, sound: { body: 1.1, pitch: 0.95 } },
  m249: { id: 'm249', name: 'M249', slot: 'primary', type: 'lmg', price: 5200, damage: 32, pen: 0.8, rpm: 750, mag: 100, reserve: 200, reload: 5.7,
    speed: 195, rangeMod: 0.97, inacc: 1.4, crouchInacc: 1.0, moveInacc: 7, fireInacc: 0.35, recover: 0.6, recoil: 0.7, side: 'both', reward: 300, auto: true,
    model: { kind: 'lmg', body: 0x2a2a2a, furn: 0x1c1c1c, len: 1.05 }, sound: { body: 1.1, pitch: 0.9 } },
  // ---------- TÜFEKLER ----------
  galil: { id: 'galil', name: 'Galil AR', slot: 'primary', type: 'rifle', price: 1800, damage: 30, pen: 0.775, rpm: 666, mag: 35, reserve: 90, reload: 3.0,
    speed: 215, rangeMod: 0.98, inacc: 0.55, crouchInacc: 0.4, moveInacc: 6, fireInacc: 0.45, recover: 0.38, recoil: 0.85, side: 'T', reward: 300, auto: true,
    model: { kind: 'rifle', body: 0x2f2f2f, furn: 0x3d3a33, len: 0.95 }, sound: { body: 1.0, pitch: 1.0 } },
  famas: { id: 'famas', name: 'FAMAS', slot: 'primary', type: 'rifle', price: 2050, damage: 30, pen: 0.7, rpm: 666, mag: 25, reserve: 90, reload: 3.3,
    speed: 220, rangeMod: 0.96, inacc: 0.5, crouchInacc: 0.38, moveInacc: 6, fireInacc: 0.42, recover: 0.38, recoil: 0.8, side: 'CT', reward: 300, auto: true,
    model: { kind: 'rifle', body: 0x2d2f2c, furn: 0x2d2f2c, len: 0.78, bullpup: true }, sound: { body: 0.95, pitch: 1.05 } },
  ak47: { id: 'ak47', name: 'AK-47', slot: 'primary', type: 'rifle', price: 2700, damage: 36, pen: 0.775, rpm: 600, mag: 30, reserve: 90, reload: 2.5,
    speed: 215, rangeMod: 0.98, inacc: 0.35, crouchInacc: 0.25, moveInacc: 6.5, fireInacc: 0.5, recover: 0.4, recoil: 1.15, side: 'T', reward: 300, auto: true,
    model: { kind: 'rifle', body: 0x262626, furn: 0x7a4a22, len: 0.92, curvedMag: true }, sound: { body: 1.15, pitch: 0.85 } },
  m4a4: { id: 'm4a4', name: 'M4A4', slot: 'primary', type: 'rifle', price: 3100, damage: 33, pen: 0.7, rpm: 666, mag: 30, reserve: 90, reload: 3.1,
    speed: 225, rangeMod: 0.97, inacc: 0.3, crouchInacc: 0.22, moveInacc: 6, fireInacc: 0.42, recover: 0.36, recoil: 0.95, side: 'CT', reward: 300, auto: true,
    model: { kind: 'rifle', body: 0x232323, furn: 0x2c2c2c, len: 0.9 }, sound: { body: 1.05, pitch: 0.95 } },
  m4a1s: { id: 'm4a1s', name: 'M4A1-S', slot: 'primary', type: 'rifle', price: 2900, damage: 38, pen: 0.7, rpm: 600, mag: 20, reserve: 80, reload: 3.1,
    speed: 225, rangeMod: 0.99, inacc: 0.25, crouchInacc: 0.18, moveInacc: 6, fireInacc: 0.36, recover: 0.36, recoil: 0.8, side: 'CT', reward: 300, auto: true, silenced: true,
    model: { kind: 'rifle', body: 0x2a2a2a, furn: 0x333333, len: 0.9, silencer: true }, sound: { body: 0.9, pitch: 1.0 } },
  sg553: { id: 'sg553', name: 'SG 553', slot: 'primary', type: 'rifle', price: 3000, damage: 30, pen: 1.0, rpm: 545, mag: 30, reserve: 90, reload: 2.8,
    speed: 210, rangeMod: 0.98, inacc: 0.32, crouchInacc: 0.24, moveInacc: 6.5, fireInacc: 0.45, recover: 0.38, recoil: 1.0, side: 'T', reward: 300, auto: true, scope: [55],
    model: { kind: 'rifle', body: 0x34362e, furn: 0x2a2b26, len: 0.95, scope: true }, sound: { body: 1.05, pitch: 0.95 } },
  aug: { id: 'aug', name: 'AUG', slot: 'primary', type: 'rifle', price: 3300, damage: 28, pen: 0.9, rpm: 600, mag: 30, reserve: 90, reload: 3.8,
    speed: 220, rangeMod: 0.98, inacc: 0.3, crouchInacc: 0.22, moveInacc: 6, fireInacc: 0.4, recover: 0.36, recoil: 0.9, side: 'CT', reward: 300, auto: true, scope: [55],
    model: { kind: 'rifle', body: 0x3c4a3a, furn: 0x2a2a2a, len: 0.8, bullpup: true, scope: true }, sound: { body: 1.0, pitch: 1.0 } },
  ssg08: { id: 'ssg08', name: 'SSG 08', slot: 'primary', type: 'sniper', price: 1700, damage: 88, pen: 0.85, rpm: 48, mag: 10, reserve: 90, reload: 3.7,
    speed: 230, rangeMod: 0.99, inacc: 1.2, scopedInacc: 0.05, crouchInacc: 1.0, moveInacc: 5, fireInacc: 2, recover: 0.5, recoil: 2.0, side: 'both', reward: 300, auto: false, scope: [40, 15], bolt: true,
    model: { kind: 'sniper', body: 0x2a2f33, furn: 0x2a2f33, len: 1.0 }, sound: { body: 1.2, pitch: 1.0 } },
  awp: { id: 'awp', name: 'AWP', slot: 'primary', type: 'sniper', price: 4750, damage: 115, pen: 0.975, rpm: 41, mag: 5, reserve: 30, reload: 3.7,
    speed: 200, rangeMod: 0.99, inacc: 7.5, scopedInacc: 0.02, crouchInacc: 6.5, moveInacc: 12, fireInacc: 3, recover: 0.6, recoil: 3.0, side: 'both', reward: 100, auto: false, scope: [40, 10], bolt: true,
    model: { kind: 'sniper', body: 0x3d5233, furn: 0x3d5233, len: 1.15, heavy: true }, sound: { body: 1.6, pitch: 0.7 } },
  // ---------- BOMBALAR ----------
  he: { id: 'he', name: 'HE Bombası', slot: 'grenade', type: 'grenade', price: 300, side: 'both', reward: 300, speed: 245, nade: 'he', model: { kind: 'nade', color: 0x3d5a2a } },
  flash: { id: 'flash', name: 'Flaş Bombası', slot: 'grenade', type: 'grenade', price: 200, side: 'both', reward: 300, speed: 245, nade: 'flash', max: 2, model: { kind: 'nade', color: 0x8a8f99 } },
  smoke: { id: 'smoke', name: 'Sis Bombası', slot: 'grenade', type: 'grenade', price: 300, side: 'both', reward: 300, speed: 245, nade: 'smoke', model: { kind: 'nade', color: 0x5d6f7d } },
  molotov: { id: 'molotov', name: 'Molotof', slot: 'grenade', type: 'grenade', price: 400, side: 'T', reward: 300, speed: 245, nade: 'fire', model: { kind: 'molotov', color: 0x6b8a3a } },
  incendiary: { id: 'incendiary', name: 'Yangın Bombası', slot: 'grenade', type: 'grenade', price: 600, side: 'CT', reward: 300, speed: 245, nade: 'fire', model: { kind: 'nade', color: 0x8a3a2a } },
  // ---------- BOMBA (C4) ----------
  c4: { id: 'c4', name: 'C4 Patlayıcı', slot: 'bomb', type: 'bomb', price: 0, speed: 250, side: 'T', model: { kind: 'bomb' } },
};
// Desen & görsel varsayılanlar
(function () {
  let seed = 7;
  for (const k in WEAPONS) {
    const w = WEAPONS[k];
    seed += 13;
    if (w.mag) {
      const style = w.type === 'pistol' ? 'pistol' : (w.type === 'smg' ? 'smooth' : 'rifle');
      const up = (w.type === 'sniper' || w.type === 'shotgun') ? 2.5 : (w.type === 'pistol' ? 1.2 : 0.62);
      const side = (w.type === 'smg') ? 0.35 : 0.45;
      w.pattern = makePattern(Math.max(w.mag, 30), up * w.recoil, side * w.recoil, seed, style);
      w.interval = 60 / w.rpm;
      if (w.auto === undefined) w.auto = false;
    }
  }
})();

const EQUIPMENT = {
  kevlar: { id: 'kevlar', name: 'Kevlar Yelek', price: 650, side: 'both' },
  helmet: { id: 'helmet', name: 'Kevlar + Kask', price: 1000, side: 'both' },
  kit: { id: 'kit', name: 'İmha Kiti', price: 400, side: 'CT' },
};

const BUY_MENU = [
  { cat: 'Tabancalar', items: ['glock', 'usp', 'p2000', 'p250', 'tec9', 'fiveseven', 'deagle'] },
  { cat: 'Ağır', items: ['nova', 'xm1014', 'negev', 'm249'] },
  { cat: 'SMG', items: ['mac10', 'mp9', 'mp7', 'ump45', 'p90'] },
  { cat: 'Tüfekler', items: ['galil', 'famas', 'ak47', 'm4a4', 'm4a1s', 'ssg08', 'sg553', 'aug', 'awp'] },
  { cat: 'Ekipman', items: ['kevlar', 'helmet', 'kit'] },
  { cat: 'Bombalar', items: ['flash', 'smoke', 'he', 'molotov', 'incendiary'] },
];

function itemDef(id) { return WEAPONS[id] || EQUIPMENT[id]; }
function sideOk(def, team) { return def.side === 'both' || def.side === team; }

const ECON = {
  start: 800, max: 16000,
  winElim: 3250, winBomb: 3500, winDefuse: 3500, winTime: 3250,
  lossBase: 1400, lossStep: 500, lossMax: 3400,
  plantBonus: 800, plantReward: 300, defuseReward: 300,
};
