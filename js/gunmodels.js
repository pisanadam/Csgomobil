// Ayrıntılı silah modelleri: yan profilden (silüet) kalınlık verilerek üretilir + silindirik parçalar
// Koordinat: u = ileri (namlu yönü), v = yukarı. Namlu ekseni v = 0. Kabza/tetik u ≈ 0.
'use strict';
const GunModels = (function () {
  const mc = {};
  function M(color, kind) {
    const k = color + (kind || 'p');
    if (mc[k]) return mc[k];
    // renkler sRGB olarak verilir; doğrusal uzaya çevrilir (aksi halde soluk/gri görünür)
    const col = new THREE.Color(color).convertSRGBToLinear();
    if (kind === 'matte') mc[k] = new THREE.MeshLambertMaterial({ color: col });
    else mc[k] = new THREE.MeshPhongMaterial({ color: col, specular: 0x222222, shininess: 30 });
    return mc[k];
  }
  let woodTex = null;
  function wood(tint) {
    const k = 'wood' + tint; if (mc[k]) return mc[k];
    if (!woodTex) {
      const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
      x.fillStyle = '#8a5a2c'; x.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(${40 + Math.random() * 50},${20 + Math.random() * 25},5,${0.25 + Math.random() * 0.3})`; x.lineWidth = 1 + Math.random() * 2; const y = Math.random() * 64; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(20, y + (Math.random() - 0.5) * 6, 44, y + (Math.random() - 0.5) * 6, 64, y); x.stroke(); }
      woodTex = new THREE.CanvasTexture(c); woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping; woodTex.repeat.set(5, 3); woodTex.encoding = THREE.sRGBEncoding;
      if (typeof Tex !== 'undefined' && Tex.RETRO) { woodTex.magFilter = THREE.NearestFilter; }
    }
    mc[k] = new THREE.MeshPhongMaterial({ map: woodTex, color: new THREE.Color(tint), specular: 0x120c06, shininess: 14 });
    return mc[k];
  }
  // silüetten kalınlıklı parça
  function ext(pts, depth, m, bevel) {
    bevel = bevel === undefined ? 0.004 : bevel;
    const sh = new THREE.Shape();
    pts.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]));
    const d = Math.max(0.001, depth - 2 * bevel);
    const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, steps: 1, curveSegments: 3 });
    g.translate(0, 0, -d / 2); g.rotateY(Math.PI / 2);
    return new THREE.Mesh(g, m);
  }
  const rect = (u0, u1, v0, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  function cyl(r0, r1, len, m, uc, v, seg, x) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, seg || 10), m);
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x || 0, v || 0, -uc); return mesh;
  }
  function bx(w, h, len, m, uc, v, x) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, len), m); mesh.position.set(x || 0, v, -uc); return mesh; }
  function vcyl(r, h, m, uc, v, x, seg) { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 8), m); mesh.position.set(x || 0, v, -uc); return mesh; }
  function xcyl(r, len, m, uc, v, x) { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), m); mesh.rotation.z = Math.PI / 2; mesh.position.set(x || 0, v, -uc); return mesh; }

  const C = { steel: 0x212326, dark: 0x17181a, poly: 0x1c1d20, grey: 0x55585c, silver: 0x9a9da2, olive: 0x4a5a36, tan: 0x8b7a55, woodA: 0xb9793a, woodD: 0x7a4a22, od: 0x3a4030, glass: 0x1a2a3a };

  // ---- ortak parçalar ----
  function grip(g, m, u, slant, len) {
    const s = slant === undefined ? 0.035 : slant, L = len || 0.1;
    g.add(ext([[u - 0.012, -0.03], [u + 0.03, -0.03], [u + 0.03 - s, -0.03 - L], [u - 0.02 - s, -0.03 - L]], 0.032, m, 0.006));
  }
  function triggerGuard(g, m, u0, u1, v) {
    g.add(bx(0.008, 0.005, u1 - u0, m, (u0 + u1) / 2, v)); g.add(bx(0.008, Math.abs(v) - 0.028, 0.005, m, u1, (v - 0.03) / 2 - 0.001));
    g.add(bx(0.005, 0.022, 0.006, m, u0 + (u1 - u0) * 0.45, -0.042));
  }
  function scope(g, u, v, len, r, m) {
    const mm = m || M(C.dark);
    g.add(cyl(r * 0.62, r * 0.62, len, mm, u, v, 12));
    g.add(cyl(r * 0.62, r, len * 0.22, mm, u + len * 0.5, v, 12)); g.add(cyl(r, r, len * 0.12, mm, u + len * 0.67, v, 12));
    g.add(cyl(r * 0.85, r * 0.62, len * 0.16, mm, u - len * 0.5, v, 12)); g.add(cyl(r * 0.85, r * 0.85, len * 0.1, mm, u - len * 0.62, v, 12));
    g.add(cyl(r * 0.9, r * 0.9, 0.004, M(C.glass), u + len * 0.735, v, 12)); g.add(cyl(r * 0.75, r * 0.75, 0.004, M(C.glass), u - len * 0.675, v, 12));
    g.add(vcyl(r * 0.42, r * 0.9, mm, u, v + r * 0.75)); g.add(xcyl(r * 0.42, r * 1.0, mm, u, v, r * 0.7));
    for (const du of [-len * 0.28, len * 0.28]) g.add(bx(r * 1.5, v - 0.03, 0.018, mm, u + du, (v + 0.03) / 2 - r * 0.15));
  }
  function suppressor(g, u, len, r) { g.add(cyl(r, r, len, M(C.dark), u + len / 2, 0, 12)); g.add(cyl(r * 0.75, r * 0.75, 0.012, M(C.steel), u + 0.004, 0, 10)); return u + len; }
  function flashHider(g, u, r) { g.add(cyl(r, r, 0.045, M(C.dark), u + 0.02, 0, 8)); return u + 0.045; }
  function rail(g, u0, u1, v) { g.add(bx(0.022, 0.008, u1 - u0, M(C.dark), (u0 + u1) / 2, v)); const n = Math.floor((u1 - u0) / 0.025); for (let i = 0; i < n; i++) g.add(bx(0.024, 0.004, 0.008, M(C.steel), u0 + 0.012 + i * 0.025, v + 0.005)); }

  // ---- UZUN SİLAHLAR ----
  const B = {};
  B.ak47 = (g, o) => {
    const st = M(C.steel), w = wood(o && o.wood || 0xffffff);
    g.add(ext([[-0.11, -0.03], [0.17, -0.03], [0.17, 0.02], [0.13, 0.036], [-0.09, 0.036], [-0.11, 0.02]], 0.046, st));         // gövde + toz kapağı
    g.add(ext([[-0.11, 0.022], [-0.11, -0.028], [-0.2, -0.045], [-0.36, -0.085], [-0.375, -0.08], [-0.375, 0.0], [-0.34, 0.012]], 0.04, w, 0.007)); // dipçik
    g.add(ext([[0.17, -0.034], [0.37, -0.03], [0.37, 0.004], [0.17, 0.006]], 0.046, w, 0.007));                                  // alt el kundağı
    g.add(ext([[0.19, 0.012], [0.35, 0.012], [0.35, 0.038], [0.19, 0.04]], 0.036, w, 0.007));                                    // üst (gaz tüpü) kundağı
    g.add(cyl(0.008, 0.008, 0.2, st, 0.45, 0.026, 8));                                                                           // gaz tüpü
    g.add(cyl(0.0095, 0.0095, 0.36, st, 0.52, 0, 10));                                                                           // namlu
    g.add(bx(0.022, 0.05, 0.022, st, 0.55, 0.018)); g.add(bx(0.006, 0.05, 0.006, st, 0.64, 0.03)); g.add(bx(0.03, 0.012, 0.012, st, 0.64, 0.058)); // gaz bloğu & arpacık
    g.add(bx(0.02, 0.012, 0.07, st, 0.2, 0.046));                                                                                // gez
    g.add(ext([[0.085, -0.03], [0.14, -0.03], [0.165, -0.1], [0.215, -0.2], [0.165, -0.225], [0.115, -0.13]], 0.03, st, 0.004)); // muz şarjör
    grip(g, w, 0.0, 0.03, 0.1); triggerGuard(g, st, 0.015, 0.08, -0.068);
    g.add(xcyl(0.006, 0.03, st, 0.1, 0.012, 0.032));                                                                             // kurma kolu
    return flashHider(g, 0.7, 0.011);
  };
  B.galil = (g) => {
    const st = M(C.steel), p = M(C.poly, 'matte');
    g.add(ext([[-0.11, -0.03], [0.17, -0.03], [0.17, 0.024], [0.13, 0.038], [-0.1, 0.038], [-0.11, 0.02]], 0.046, st));
    g.add(cyl(0.012, 0.012, 0.24, st, -0.23, 0.01, 8)); g.add(ext([[-0.33, 0.03], [-0.36, 0.03], [-0.365, -0.07], [-0.335, -0.07]], 0.03, p)); g.add(bx(0.01, 0.01, 0.22, st, -0.23, -0.05)); // iskelet dipçik
    g.add(ext([[0.17, -0.036], [0.38, -0.032], [0.38, 0.03], [0.17, 0.034]], 0.05, p, 0.008));
    g.add(cyl(0.0095, 0.0095, 0.32, st, 0.52, 0, 10)); g.add(bx(0.006, 0.05, 0.006, st, 0.6, 0.03)); g.add(bx(0.02, 0.012, 0.05, st, -0.05, 0.046));
    g.add(ext([[0.085, -0.03], [0.14, -0.03], [0.16, -0.12], [0.2, -0.24], [0.15, -0.26], [0.11, -0.14]], 0.03, st, 0.004));
    grip(g, p, 0.0, 0.03, 0.1); triggerGuard(g, st, 0.015, 0.08, -0.068);
    return flashHider(g, 0.68, 0.011);
  };
  function ar15(g, o) {
    const st = M(C.steel), p = M(C.poly, 'matte');
    g.add(ext([[-0.1, -0.03], [0.15, -0.03], [0.15, 0.034], [-0.1, 0.034]], 0.044, st));                    // alt/üst gövde
    g.add(ext([[0.02, -0.03], [0.08, -0.03], [0.08, -0.05], [0.03, -0.05]], 0.044, st));                    // şarjör yuvası çıkıntısı
    g.add(cyl(0.014, 0.014, 0.2, st, -0.2, 0.012, 10));                                                     // tampon borusu
    g.add(ext([[-0.2, 0.034], [-0.325, 0.034], [-0.335, -0.085], [-0.3, -0.085], [-0.27, -0.025], [-0.2, -0.015]], 0.042, p, 0.006)); // teleskopik dipçik
    const hgL = o.hg || 0.24;
    g.add(cyl(0.026, 0.026, hgL, p, 0.15 + hgL / 2, 0.002, 10));                                           // yuvarlak el kundağı
    rail(g, -0.08, 0.14, 0.04);
    if (!o.scope) { g.add(ext([[-0.07, 0.044], [0.08, 0.044], [0.07, 0.078], [0.03, 0.082], [-0.05, 0.082]], 0.022, st, 0.004)); g.add(bx(0.012, 0.012, 0.11, M(C.dark), 0.01, 0.062)); } // taşıma kulpu
    const bl = o.barrel || 0.2, b0 = 0.15 + hgL;
    g.add(cyl(0.0085, 0.0085, bl, st, b0 + bl / 2, 0, 10));
    g.add(ext([[b0 + 0.01, 0.0], [b0 + 0.05, 0.0], [b0 + 0.036, 0.078], [b0 + 0.024, 0.078]], 0.02, st, 0.003)); // A-çerçeve arpacık
    g.add(ext([[0.045, -0.03], [0.1, -0.03], [0.125, -0.19], [0.075, -0.2]], 0.026, M(C.grey), 0.004));      // STANAG şarjör
    grip(g, p, 0.0, 0.035, 0.1); triggerGuard(g, st, 0.015, 0.075, -0.066);
    g.add(xcyl(0.007, 0.012, st, 0.06, 0.012, 0.027));
    const tip = b0 + bl;
    return o.supp ? suppressor(g, tip - 0.02, 0.2, 0.019) : flashHider(g, tip, 0.011);
  }
  B.m4a4 = g => ar15(g, { hg: 0.24, barrel: 0.2 });
  B.m4a1s = g => ar15(g, { hg: 0.26, barrel: 0.1, supp: true });
  B.famas = (g) => {
    const p = M(0x2a2e2b, 'matte'), st = M(C.steel);
    g.add(ext([[-0.33, -0.05], [-0.1, -0.045], [0.2, -0.035], [0.3, -0.02], [0.3, 0.03], [-0.33, 0.03]], 0.05, p, 0.008));           // bullpup gövde
    g.add(ext([[-0.12, 0.03], [-0.1, 0.085], [0.22, 0.085], [0.26, 0.03]], 0.018, p, 0.004)); g.add(bx(0.012, 0.03, 0.3, M(C.dark), 0.07, 0.045)); // uzun taşıma kulpu
    g.add(cyl(0.0085, 0.0085, 0.2, st, 0.4, 0, 10));
    g.add(ext([[-0.21, -0.048], [-0.16, -0.047], [-0.15, -0.2], [-0.2, -0.2]], 0.026, st, 0.004));                                    // arkada düz şarjör
    grip(g, p, 0.0, 0.03, 0.095); triggerGuard(g, p, 0.01, 0.1, -0.075);
    return flashHider(g, 0.5, 0.012);
  };
  B.aug = (g) => {
    const p = M(0x4b5a44, 'matte'), st = M(C.steel);
    g.add(ext([[-0.36, -0.07], [-0.14, -0.06], [-0.05, -0.03], [0.24, -0.028], [0.24, 0.03], [-0.36, 0.03]], 0.05, p, 0.009));
    g.add(ext([[-0.26, -0.06], [-0.2, -0.058], [-0.17, -0.2], [-0.23, -0.21]], 0.028, M(0x3a3f33, 'matte'), 0.004));                  // yarı saydam şarjör
    g.add(cyl(0.0095, 0.0095, 0.3, st, 0.39, 0, 10));
    g.add(ext([[0.25, -0.01], [0.28, -0.01], [0.3, -0.11], [0.27, -0.11]], 0.026, p, 0.006));                                         // katlanır ön kabza
    scope(g, 0.03, 0.075, 0.2, 0.02); grip(g, p, 0.0, 0.03, 0.1); g.add(ext([[0.02, -0.04], [0.11, -0.04], [0.1, -0.13], [0.0, -0.13]], 0.012, p, 0.003));
    return flashHider(g, 0.54, 0.012);
  };
  B.sg553 = (g) => {
    const p = M(0x33372f, 'matte'), st = M(C.steel);
    g.add(ext([[-0.11, -0.03], [0.17, -0.03], [0.17, 0.034], [-0.11, 0.034]], 0.046, st));
    g.add(ext([[-0.11, 0.03], [-0.34, 0.03], [-0.35, -0.08], [-0.31, -0.08], [-0.28, -0.02], [-0.11, -0.02]], 0.036, p, 0.006));      // katlanır iskelet dipçik
    g.add(ext([[0.17, -0.036], [0.37, -0.03], [0.37, 0.032], [0.17, 0.036]], 0.05, p, 0.008));
    g.add(cyl(0.009, 0.009, 0.24, st, 0.49, 0, 10)); g.add(bx(0.006, 0.045, 0.006, st, 0.56, 0.028));
    g.add(ext([[0.08, -0.03], [0.135, -0.03], [0.15, -0.12], [0.18, -0.2], [0.13, -0.22], [0.1, -0.13]], 0.03, M(0x4a4f45, 'matte'), 0.004));
    scope(g, 0.03, 0.078, 0.2, 0.02); grip(g, p, 0.0, 0.03, 0.1); triggerGuard(g, st, 0.015, 0.075, -0.066);
    return flashHider(g, 0.61, 0.011);
  };
  // ---- KESKİN NİŞANCI ----
  B.awp = (g) => {
    const gr = M(0x47603a, 'matte'), st = M(C.steel);
    g.add(ext([[-0.42, -0.1], [-0.4, 0.03], [-0.16, 0.035], [-0.1, 0.012], [0.34, 0.0], [0.36, -0.03], [0.1, -0.045], [0.03, -0.04], [-0.02, -0.14], [-0.075, -0.14], [-0.07, -0.06], [-0.2, -0.05], [-0.33, -0.11]], 0.052, gr, 0.009)); // başparmak delikli kundak
    g.add(ext([[-0.38, 0.03], [-0.2, 0.034], [-0.2, 0.06], [-0.37, 0.058]], 0.04, M(C.poly, 'matte'), 0.006));                          // yanak desteği
    g.add(ext([[-0.12, 0.0], [0.16, 0.0], [0.16, 0.04], [-0.12, 0.04]], 0.04, st));                                                      // mekanizma
    g.add(cyl(0.014, 0.011, 0.5, st, 0.59, 0.018, 12));                                                                                  // ağır namlu
    g.add(cyl(0.02, 0.02, 0.06, st, 0.87, 0.018, 10)); g.add(bx(0.044, 0.01, 0.012, M(C.dark), 0.87, 0.018));                            // namlu freni
    g.add(ext([[0.03, -0.045], [0.1, -0.045], [0.095, -0.1], [0.035, -0.1]], 0.03, st, 0.004));                                          // şarjör
    g.add(xcyl(0.006, 0.05, st, -0.04, 0.03, 0.04)); const kn = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), M(C.dark)); kn.position.set(0.065, 0.03, 0.04); g.add(kn); // sürgü kolu
    scope(g, 0.03, 0.095, 0.3, 0.027);
    g.userData.bore = 0.018; return 0.9;
  };
  B.ssg08 = (g) => {
    const p = M(0x2a2f33, 'matte'), st = M(C.steel);
    g.add(ext([[-0.4, -0.085], [-0.39, 0.028], [-0.12, 0.03], [0.3, 0.0], [0.32, -0.028], [0.08, -0.04], [0.03, -0.038], [0.0, -0.13], [-0.05, -0.13], [-0.04, -0.045], [-0.2, -0.04], [-0.33, -0.09]], 0.044, p, 0.008));
    g.add(ext([[-0.11, 0.0], [0.14, 0.0], [0.14, 0.036], [-0.11, 0.036]], 0.036, st));
    g.add(cyl(0.009, 0.0075, 0.46, st, 0.53, 0.016, 10));
    g.add(ext([[0.03, -0.04], [0.085, -0.04], [0.08, -0.085], [0.035, -0.085]], 0.026, st, 0.003));
    g.add(xcyl(0.005, 0.045, st, -0.04, 0.026, 0.035));
    scope(g, 0.02, 0.085, 0.26, 0.022);
    g.userData.bore = 0.016; return 0.76;
  };
  function autoSniper(g, o) {
    const p = M(o.col, 'matte'), st = M(C.steel);
    g.add(ext([[-0.12, -0.035], [0.2, -0.035], [0.2, 0.036], [-0.12, 0.036]], 0.046, st));
    if (o.skeleton) { g.add(ext([[-0.12, 0.034], [-0.38, 0.034], [-0.39, -0.09], [-0.35, -0.09], [-0.32, -0.02], [-0.12, -0.02]], 0.036, p, 0.006)); }
    else g.add(ext([[-0.12, 0.034], [-0.12, -0.03], [-0.36, -0.09], [-0.39, -0.085], [-0.39, 0.03]], 0.042, p, 0.008));
    g.add(ext([[0.2, -0.035], [0.48, -0.028], [0.48, 0.028], [0.2, 0.036]], 0.046, p, 0.008));
    g.add(cyl(0.0105, 0.0095, 0.3, st, 0.63, 0, 10));
    g.add(o.curved ? ext([[0.07, -0.035], [0.13, -0.035], [0.145, -0.12], [0.17, -0.19], [0.12, -0.2], [0.09, -0.12]], 0.03, M(0x4a4f45, 'matte'), 0.004)
      : ext([[0.07, -0.035], [0.13, -0.035], [0.135, -0.17], [0.08, -0.17]], 0.03, st, 0.004));
    grip(g, p, 0.0, 0.03, 0.1); triggerGuard(g, st, 0.015, 0.07, -0.068);
    scope(g, 0.04, 0.085, 0.27, 0.023);
    return flashHider(g, 0.78, 0.012);
  }
  B.g3sg1 = g => autoSniper(g, { col: 0x3a3b30 });
  B.sg550 = g => autoSniper(g, { col: 0x30332c, skeleton: true, curved: true });
  // ---- SMG ----
  B.mp5 = (g) => {
    const st = M(C.steel), p = M(C.poly, 'matte');
    g.add(ext([[-0.1, -0.03], [0.12, -0.03], [0.12, 0.012], [-0.1, 0.012]], 0.04, st)); g.add(cyl(0.02, 0.02, 0.3, st, 0.03, 0.022, 10)); // gövde + üst tüp
    g.add(ext([[-0.1, 0.03], [-0.1, -0.03], [-0.3, -0.07], [-0.32, -0.065], [-0.32, 0.03]], 0.036, p, 0.007));
    g.add(ext([[0.12, -0.04], [0.28, -0.034], [0.28, 0.0], [0.12, 0.004]], 0.044, p, 0.008));
    g.add(cyl(0.0085, 0.0085, 0.16, st, 0.26, 0.0, 8)); g.add(cyl(0.016, 0.016, 0.012, st, 0.3, 0.035, 10)); g.add(bx(0.008, 0.03, 0.01, st, 0.3, 0.02));
    g.add(ext([[0.055, -0.03], [0.1, -0.03], [0.12, -0.11], [0.155, -0.2], [0.11, -0.21], [0.075, -0.12]], 0.024, st, 0.003));
    g.add(bx(0.02, 0.014, 0.03, st, -0.07, 0.05));
    grip(g, p, 0.0, 0.03, 0.1); triggerGuard(g, p, 0.012, 0.07, -0.066);
    g.userData.bore = 0.0; return 0.34;
  };
  B.ump45 = (g) => {
    const p = M(0x242528, 'matte'), st = M(C.steel);
    g.add(ext([[-0.1, -0.035], [0.26, -0.035], [0.26, 0.04], [-0.1, 0.04]], 0.046, p, 0.007));
    g.add(ext([[-0.1, 0.035], [-0.3, 0.035], [-0.31, -0.085], [-0.27, -0.085], [-0.24, -0.01], [-0.1, -0.01]], 0.03, p, 0.005));
    g.add(ext([[0.06, -0.035], [0.11, -0.035], [0.115, -0.22], [0.065, -0.22]], 0.03, st, 0.004));
    g.add(cyl(0.01, 0.01, 0.07, st, 0.29, 0, 8)); rail(g, -0.06, 0.2, 0.046); g.add(bx(0.006, 0.03, 0.006, st, 0.23, 0.066));
    grip(g, p, 0.0, 0.03, 0.1); triggerGuard(g, p, 0.012, 0.055, -0.066);
    return 0.325;
  };
  B.p90 = (g) => {
    const p = M(0x24262a, 'matte'), tn = M(0x55604a, 'matte');
    g.add(ext([[-0.26, -0.11], [-0.25, 0.03], [0.1, 0.035], [0.2, 0.02], [0.22, -0.02], [0.16, -0.035], [0.13, -0.12], [0.08, -0.13], [0.06, -0.06], [0.0, -0.06], [-0.02, -0.14], [-0.08, -0.14], [-0.08, -0.07], [-0.16, -0.06], [-0.2, -0.115]], 0.05, p, 0.01)); // bullpup gövde, çift delik
    g.add(ext([[-0.2, 0.036], [0.1, 0.04], [0.1, 0.062], [-0.2, 0.058]], 0.04, M(0x6b6f5c, 'matte'), 0.006));                            // üstte yatay şarjör
    g.add(ext([[0.02, 0.062], [0.14, 0.062], [0.13, 0.09], [0.03, 0.09]], 0.02, M(C.dark), 0.004));                                      // optik
    g.add(cyl(0.011, 0.011, 0.07, M(C.steel), 0.25, 0, 8));
    g.userData.noGrip = true; return 0.285;
  };
  B.mac10 = (g) => {
    const st = M(0x2c2d2f);
    g.add(ext([[-0.09, -0.03], [0.13, -0.03], [0.13, 0.04], [-0.09, 0.04]], 0.05, st, 0.004));
    g.add(ext([[-0.02, -0.03], [0.03, -0.03], [0.02, -0.22], [-0.03, -0.22]], 0.03, M(C.dark), 0.004));                                  // kabza içi uzun şarjör
    g.add(cyl(0.011, 0.011, 0.05, st, 0.155, 0.005, 8)); g.add(bx(0.012, 0.01, 0.2, st, -0.19, 0.03)); g.add(bx(0.012, 0.08, 0.012, st, -0.29, -0.005)); // tel dipçik
    g.add(vcyl(0.008, 0.016, st, 0.04, 0.048)); triggerGuard(g, st, 0.03, 0.085, -0.066);
    g.userData.bore = 0.005; return 0.18;
  };
  function compactSmg(g, o) {
    const p = M(o.col || 0x26272a, 'matte'), st = M(C.steel);
    g.add(ext([[-0.09, -0.032], [0.2, -0.032], [0.2, 0.036], [-0.09, 0.036]], 0.044, p, 0.007));
    g.add(ext([[o.magU, -0.032], [o.magU + 0.045, -0.032], [o.magU + 0.05, -0.19], [o.magU + 0.005, -0.19]], 0.026, st, 0.003));
    if (o.fore) g.add(ext([[0.14, -0.032], [0.18, -0.032], [0.19, -0.12], [0.15, -0.12]], 0.028, p, 0.006));
    if (o.stock) { g.add(bx(0.01, 0.01, 0.2, st, -0.19, 0.02)); g.add(ext([[-0.28, 0.03], [-0.3, 0.03], [-0.305, -0.07], [-0.285, -0.07]], 0.03, p, 0.004)); }
    g.add(cyl(0.01, 0.01, 0.05, st, 0.225, 0, 8)); rail(g, -0.05, 0.16, 0.042);
    if (o.magU > 0.03) grip(g, p, 0.0, 0.03, 0.095);
    triggerGuard(g, p, 0.015, 0.06, -0.066);
    let tip = 0.25; if (o.supp) tip = suppressor(g, 0.24, 0.13, 0.018);
    return tip;
  }
  B.mp7 = g => compactSmg(g, { magU: -0.02, fore: true, stock: true });
  B.mp9 = g => compactSmg(g, { magU: 0.07, fore: true, stock: true, col: 0x303236 });
  B.tmp = g => compactSmg(g, { magU: 0.07, fore: true, supp: true });
  // ---- POMPALI ----
  function shotgun(g, o) {
    const st = M(C.steel), p = M(o.col || C.poly, 'matte');
    g.add(ext([[-0.12, -0.035], [0.16, -0.035], [0.16, 0.03], [-0.1, 0.03]], 0.046, st));
    g.add(ext([[-0.12, 0.028], [-0.12, -0.03], [-0.34, -0.09], [-0.37, -0.085], [-0.37, 0.005], [-0.3, 0.02]], 0.04, p, 0.008));
    g.add(cyl(0.011, 0.011, 0.52, st, 0.42, 0.012, 10));                                                    // namlu
    g.add(cyl(0.012, 0.012, 0.4, st, 0.36, -0.016, 10));                                                    // tüp şarjör
    if (o.pump) { g.add(cyl(0.022, 0.022, 0.15, p, 0.34, -0.014, 10)); for (let i = 0; i < 5; i++) g.add(cyl(0.0235, 0.0235, 0.008, M(C.dark), 0.28 + i * 0.03, -0.014, 10)); }
    else g.add(ext([[0.16, -0.04], [0.42, -0.034], [0.42, 0.0], [0.16, 0.0]], 0.046, p, 0.008));
    if (o.rail) rail(g, -0.06, 0.14, 0.036);
    g.add(bx(0.006, 0.014, 0.006, st, 0.66, 0.03));
    grip(g, p, 0.0, 0.035, 0.1); triggerGuard(g, st, 0.012, 0.07, -0.068);
    g.userData.bore = 0.012; return 0.68;
  }
  B.nova = g => shotgun(g, { pump: true, col: 0x232427 });
  B.m3 = g => shotgun(g, { pump: true, col: 0x1b1b1c });
  B.xm1014 = g => shotgun(g, { rail: true, col: 0x202124 });
  // ---- MAKİNELİ ----
  function lmg(g, o) {
    const st = M(C.steel), p = M(o.col, 'matte');
    g.add(ext([[-0.14, -0.045], [0.24, -0.045], [0.24, 0.045], [-0.14, 0.045]], 0.055, st));
    g.add(ext([[-0.1, 0.045], [0.2, 0.045], [0.18, 0.062], [-0.08, 0.062]], 0.05, st, 0.003));                                         // besleme kapağı
    g.add(ext([[-0.14, 0.04], [-0.38, 0.04], [-0.39, -0.09], [-0.34, -0.09], [-0.3, -0.01], [-0.14, -0.02]], 0.042, p, 0.007));
    g.add(ext([[0.24, -0.04], [0.46, -0.034], [0.46, 0.02], [0.24, 0.03]], 0.05, p, 0.008));
    g.add(cyl(0.012, 0.011, 0.36, st, 0.6, 0.0, 10));
    g.add(ext([[0.03, -0.045], [0.2, -0.045], [0.19, -0.17], [0.04, -0.17]], 0.075, M(0x3c4234, 'matte'), 0.008));                     // şerit kutusu
    g.add(ext([[-0.02, 0.062], [0.12, 0.062], [0.1, 0.1], [0.0, 0.1]], 0.012, st, 0.003));                                              // taşıma kulpu
    for (const s of [-1, 1]) { const leg = bx(0.007, 0.007, 0.24, st, 0.56, -0.04, s * 0.02); leg.rotation.x = 0.12; g.add(leg); }      // katlı çatal ayak
    grip(g, p, -0.03, 0.03, 0.1); triggerGuard(g, st, -0.015, 0.035, -0.07);
    return flashHider(g, 0.78, 0.013);
  }
  B.m249 = g => lmg(g, { col: 0x202124 });
  B.negev = g => lmg(g, { col: 0x2c3027 });
  // ---- TABANCALAR ----
  function pistol(g, o) {
    const sl = M(o.slide || C.steel), fr = M(o.frame || C.poly, 'matte');
    const L = o.len || 0.19, h = o.h || 0.034;
    g.add(ext([[-0.045, 0.0], [L - 0.05, 0.0], [L - 0.045, 0.008], [L - 0.045, h], [-0.04, h], [-0.048, h * 0.5]], o.w || 0.028, sl, 0.004)); // sürgü
    for (let i = 0; i < 5; i++) g.add(bx((o.w || 0.028) + 0.002, h * 0.7, 0.003, M(C.dark), -0.03 + i * 0.008, h * 0.5));                    // sürgü tırtıkları
    g.add(ext([[-0.04, 0.0], [L - 0.06, 0.0], [L - 0.06, -0.022], [0.06, -0.026], [0.05, -0.05], [0.015, -0.052], [0.0, -0.02], [-0.02, -0.02], [-0.055, -0.125], [-0.095, -0.118], [-0.06, -0.01]], (o.w || 0.028) - 0.002, fr, 0.005)); // gövde + kabza + tetik korkuluğu
    g.add(bx(0.004, 0.02, 0.005, M(C.dark), 0.03, -0.03));                                                                                   // tetik
    g.add(bx(0.006, 0.008, 0.008, M(C.dark), L - 0.06, h + 0.004)); g.add(bx(0.012, 0.008, 0.008, M(C.dark), -0.035, h + 0.004));          // nişangâhlar
    g.add(cyl(0.0065, 0.0065, 0.02, M(C.grey), L - 0.045, h * 0.55, 8));
    if (o.hammer) g.add(bx(0.006, 0.016, 0.01, M(C.dark), -0.052, h * 0.75));
    g.userData.bore = h * 0.55;
    let tip = L - 0.035;
    if (o.supp) { g.add(cyl(0.016, 0.016, 0.15, M(C.dark), tip + 0.075, h * 0.55, 12)); tip += 0.15; }
    return tip;
  }
  B.glock = g => pistol(g, { len: 0.19, slide: 0x232427, frame: 0x1a1b1d });
  B.usp = g => pistol(g, { len: 0.2, slide: 0x2e3034, frame: 0x1c1d20, supp: true, hammer: true });
  B.p2000 = g => pistol(g, { len: 0.185, slide: 0x2b2d30, frame: 0x1c1d20, hammer: true });
  B.p228 = g => pistol(g, { len: 0.185, slide: 0x3a3c40, frame: 0x26272a, hammer: true });
  B.p250 = g => pistol(g, { len: 0.185, slide: 0x4a463e, frame: 0x26272a, hammer: true });
  B.fiveseven = g => pistol(g, { len: 0.21, slide: 0x5f6266, frame: 0x26272a, h: 0.036 });
  B.elite = g => pistol(g, { len: 0.21, slide: 0x9b9ea3, frame: 0x8a8d92, hammer: true });
  B.deagle = (g) => {
    const tip = pistol(g, { len: 0.26, slide: 0xa4a7ab, frame: 0x8f9296, h: 0.046, w: 0.034, hammer: true });
    g.add(ext([[0.06, 0.046], [0.2, 0.046], [0.2, 0.054], [0.06, 0.054]], 0.014, M(0x8f9296), 0.002));                                     // üst rampa
    g.add(ext([[-0.058, -0.03], [-0.02, -0.022], [-0.05, -0.12], [-0.088, -0.115]], 0.036, M(0x1a1a1a, 'matte'), 0.004));                  // siyah kabza paneli
    return tip;
  };
  B.tec9 = (g) => {
    const st = M(0x2a2b2e), p = M(C.poly, 'matte');
    g.add(ext([[-0.06, -0.02], [0.12, -0.02], [0.12, 0.03], [-0.06, 0.03]], 0.036, st));
    g.add(cyl(0.017, 0.017, 0.15, st, 0.195, 0.008, 10)); for (let i = 0; i < 4; i++) g.add(cyl(0.0175, 0.0175, 0.012, M(C.dark), 0.15 + i * 0.03, 0.008, 10)); // delikli namlu gömleği
    g.add(ext([[0.05, -0.02], [0.09, -0.02], [0.095, -0.2], [0.055, -0.2]], 0.022, M(C.dark), 0.003));                                     // öne yerleşik şarjör
    g.add(ext([[-0.05, -0.02], [-0.01, -0.02], [-0.04, -0.12], [-0.08, -0.115]], 0.03, p, 0.005));
    triggerGuard(g, st, -0.005, 0.045, -0.05);
    g.userData.bore = 0.008; return 0.275;
  };
  // ---- BIÇAK / BOMBALAR ----
  B.knife = (g) => {
    g.add(ext([[-0.11, -0.016], [0.0, -0.018], [0.0, 0.016], [-0.11, 0.014]], 0.024, M(0x1c1d1f, 'matte'), 0.007));                        // sap
    for (let i = 0; i < 4; i++) g.add(bx(0.026, 0.004, 0.006, M(0x0c0c0d), -0.085 + i * 0.022, -0.012));
    g.add(bx(0.012, 0.052, 0.01, M(C.steel), 0.004, 0.0));                                                                                 // balçak
    g.add(ext([[0.008, -0.017], [0.13, -0.017], [0.175, 0.006], [0.14, 0.017], [0.1, 0.02], [0.008, 0.017]], 0.005, M(0xc3c7cc), 0.002));  // kıvrık uçlu namlu
    g.add(ext([[0.02, 0.008], [0.11, 0.008], [0.11, 0.012], [0.02, 0.012]], 0.006, M(0x8a8d92), 0.0005));                                  // kan oluğu
    g.userData.bore = 0; return 0.18;
  };
  function lathe(pts, m, seg) { return new THREE.Mesh(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg || 12), m); }
  function nadeTop(g, y) {
    const st = M(C.grey);
    g.add(vcyl(0.012, 0.022, st, 0, y + 0.011)); g.add(bx(0.014, 0.012, 0.014, M(C.steel), 0, y + 0.026));
    const lever = ext([[0, 0], [0.012, 0], [0.03, -0.05], [0.026, -0.085], [0.02, -0.085], [0.022, -0.05]], 0.012, st, 0.001); lever.rotation.y = Math.PI / 2; lever.position.set(0, y + 0.03, 0); g.add(lever);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.002, 4, 10), M(C.silver)); ring.position.set(-0.018, y + 0.028, 0); g.add(ring);
  }
  B.he = (g) => { g.add(lathe([[0, -0.045], [0.022, -0.042], [0.033, -0.02], [0.034, 0.012], [0.026, 0.036], [0.014, 0.045], [0, 0.045]], M(0x3f5a2a, 'matte'))); for (const y of [-0.015, 0.012]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.0345, 0.002, 4, 14), M(0x2c401d, 'matte')); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); } nadeTop(g, 0.045); };
  B.flash = (g) => { g.add(vcyl(0.026, 0.1, M(0x8e939b), 0, 0, 0, 6)); for (const y of [-0.03, 0, 0.03]) g.add(vcyl(0.0265, 0.008, M(0x44474c), 0, y, 0, 6)); g.add(vcyl(0.028, 0.008, M(0x3b6ea8, 'matte'), 0, 0.044, 0, 6)); nadeTop(g, 0.05); };
  B.smoke = (g) => { g.add(vcyl(0.029, 0.125, M(0x55606a, 'matte'), 0, 0, 0, 12)); g.add(vcyl(0.0295, 0.016, M(0xd8d8d0, 'matte'), 0, 0.03, 0, 12)); g.add(vcyl(0.0295, 0.008, M(0x2a2e33, 'matte'), 0, -0.05, 0, 12)); nadeTop(g, 0.0625); };
  B.incendiary = (g) => { g.add(vcyl(0.029, 0.12, M(0x7a2f22, 'matte'), 0, 0, 0, 12)); g.add(vcyl(0.0295, 0.014, M(0xe0b040, 'matte'), 0, 0.02, 0, 12)); nadeTop(g, 0.06); };
  B.molotov = (g) => {
    g.add(lathe([[0, -0.07], [0.03, -0.068], [0.032, 0.01], [0.026, 0.035], [0.011, 0.055], [0.011, 0.095], [0.013, 0.1], [0, 0.1]], new THREE.MeshPhongMaterial({ color: 0x5f7f2e, transparent: true, opacity: 0.8, shininess: 80, specular: 0x999999 })));
    g.add(vcyl(0.027, 0.06, M(0xb07a1e, 'matte'), 0, -0.035, 0, 10));                                                                       // içindeki sıvı
    g.add(vcyl(0.0325, 0.03, M(0xd9d2c0, 'matte'), 0, -0.02, 0, 10));                                                                       // etiket
    const rag = ext([[0, 0], [0.02, 0], [0.03, 0.05], [0.012, 0.07], [0.004, 0.04]], 0.012, M(0xd8cfbc, 'matte'), 0.002); rag.position.set(0, 0.095, 0); g.add(rag);
  };
  B.c4 = (g) => {
    const tan = M(0xb49a6a, 'matte');
    for (const x of [-0.065, 0, 0.065]) g.add(bx(0.058, 0.045, 0.13, tan, 0, 0, x));                                                        // üç kalıp
    g.add(bx(0.2, 0.012, 0.03, M(0x1a1a1a, 'matte'), 0.035, 0.02)); g.add(bx(0.2, 0.012, 0.03, M(0x1a1a1a, 'matte'), -0.035, 0.02));       // bantlar
    g.add(bx(0.11, 0.022, 0.085, M(0x2a2c2f), 0, 0.034, 0.01));                                                                             // kontrol kutusu
    g.add(bx(0.05, 0.004, 0.022, new THREE.MeshBasicMaterial({ color: 0xff2a1a }), 0.022, 0.046, -0.012));                                 // ekran
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) g.add(bx(0.01, 0.004, 0.01, M(0x9a9da2), -0.022 + j * 0.014, 0.046, 0.022 + i * 0.016));
    for (const [c, x] of [[0xc0392b, -0.05], [0x2e6fd0, -0.062], [0xd8c020, -0.074]]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0025, 4, 10, Math.PI), M(c, 'matte')); w.position.set(x, 0.03, 0.0); w.rotation.y = Math.PI / 2; g.add(w); }
  };

  function build(def) {
    const fn = B[def.id]; if (!fn) return null;
    const g = new THREE.Group();
    const tip = fn(g);
    const isNade = def.type === 'grenade' || def.type === 'bomb';
    const muzzle = new THREE.Object3D(); muzzle.name = 'muzzle';
    muzzle.position.set(0, g.userData.bore || 0, -(tip || 0.1) - 0.01);
    g.add(muzzle);
    // namlu eksenini eski modellerle aynı yüksekliğe getir (kabza/eller uyumu)
    if (!isNade) { const inner = new THREE.Group(); while (g.children.length) inner.add(g.children[0]); inner.position.y = def.type === 'knife' ? 0 : 0.045; g.add(inner); }
    g.userData = {};
    bakeUV(g);
    return g;
  }
  // Skin için düzlemsel (yandan) UV: u = namlu yönü, v = yükseklik; tüm parçalar tek dokuyu paylaşır
  function bakeUV(g) {
    g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g);
    const u0 = -box.max.z - 0.005, u1 = -box.min.z + 0.005, v0 = box.min.y - 0.005, v1 = box.max.y + 0.005;
    const v = new THREE.Vector3();
    g.traverse(o => {
      if (!o.isMesh) return;
      const pos = o.geometry.attributes.position, uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); uv[i * 2] = (-v.z - u0) / (u1 - u0); uv[i * 2 + 1] = (v.y - v0) / (v1 - v0); }
      o.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    });
  }
  return { build };
})();
