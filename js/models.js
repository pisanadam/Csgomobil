// Karakter ve silah modelleri (prosedürel low-poly)
'use strict';
const Models = (function () {
  const matCache = {};
  function mat(color, extra) {
    const k = color + (extra ? JSON.stringify(extra) : '');
    if (!matCache[k]) matCache[k] = new THREE.MeshLambertMaterial(Object.assign({ color }, extra || {}));
    return matCache[k];
  }
  function box(w, h, d, m, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x || 0, y || 0, z || 0);
    return mesh;
  }
  function cyl(r, len, m, x, y, z, seg) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg || 8), m);
    mesh.rotation.x = Math.PI / 2; mesh.position.set(x || 0, y || 0, z || 0);
    return mesh;
  }
  // ---------- SİLAH ----------
  function gun(def) {
    const g = new THREE.Group();
    const M = def.model || { kind: 'pistol' };
    const body = mat(M.body || 0x2a2a2a), furn = mat(M.furn || M.body || 0x2a2a2a), dark = mat(0x151515), metal = mat(0x5a5a5a);
    const muzzle = new THREE.Object3D();
    const L = M.len || 0.9;
    switch (M.kind) {
      case 'rifle': case 'lmg': case 'smg': case 'sniper': case 'shotgun': {
        const isS = M.kind === 'smg';
        const rh = M.kind === 'lmg' ? 0.11 : (isS ? 0.075 : 0.085);
        const recLen = L * (M.bullpup ? 0.55 : 0.36);
        const recZ = M.bullpup ? 0.05 : -recLen / 2 + 0.06;
        g.add(box(0.055, rh, recLen, body, 0, 0.04, recZ));                 // gövde
        const frontZ = M.bullpup ? recZ - recLen / 2 : -recLen + 0.06;
        const hgLen = L * (M.bullpup ? 0.18 : 0.28);
        g.add(box(0.06, rh * 0.85, hgLen, furn, 0, 0.035, frontZ - hgLen / 2)); // el kundağı
        const barLen = L * (M.kind === 'sniper' ? 0.42 : 0.24);
        const bz = frontZ - hgLen - barLen / 2;
        g.add(cyl(M.kind === 'sniper' ? 0.013 : 0.011, barLen, dark, 0, 0.05, bz));
        let tip = bz - barLen / 2;
        if (M.silencer) { g.add(cyl(0.02, 0.17, dark, 0, 0.05, tip - 0.085)); tip -= 0.17; }
        muzzle.position.set(0, 0.05, tip);
        // kabza
        const grip = box(0.045, 0.1, 0.05, dark, 0, -0.04, M.bullpup ? -0.05 : 0.04); grip.rotation.x = 0.3; g.add(grip);
        // dipçik
        if (!M.bullpup && !(isS && L < 0.4)) {
          const st = box(0.045, M.kind === 'sniper' ? 0.11 : 0.08, L * 0.28, furn, 0, 0.01, 0.06 + L * 0.14);
          g.add(st);
        }
        // şarjör
        if (M.kind === 'lmg') g.add(box(0.1, 0.1, 0.12, mat(0x3a3f30), 0.02, -0.05, recZ - 0.02));
        else if (M.kind === 'shotgun') { g.add(cyl(0.013, L * 0.45, dark, 0, 0.015, frontZ - L * 0.2)); const pump = box(0.05, 0.05, 0.13, furn, 0, 0.015, frontZ - 0.1); g.add(pump); }
        else {
          const magLen = isS ? 0.14 : 0.17;
          const mg = box(0.035, magLen, 0.06, dark, 0, -0.02 - magLen / 2, M.bullpup ? 0.12 : -0.06);
          if (M.curvedMag) mg.rotation.x = -0.35;
          g.add(mg);
        }
        // nişangah / dürbün
        if (M.kind === 'sniper' || M.scope) {
          g.add(cyl(0.024, 0.26, dark, 0, 0.13, -0.05));
          g.add(box(0.02, 0.05, 0.03, dark, 0, 0.09, -0.02)); g.add(box(0.02, 0.05, 0.03, dark, 0, 0.09, -0.12));
        } else {
          g.add(box(0.012, 0.03, 0.012, dark, 0, 0.1, frontZ - hgLen + 0.02));
          g.add(box(0.03, 0.025, 0.04, dark, 0, 0.095, 0.0));
        }
        if (M.kind === 'lmg') { const bp = box(0.15, 0.01, 0.01, dark, 0, -0.02, bz + 0.05); g.add(bp); }
        break;
      }
      case 'pistol': {
        g.add(box(0.035, 0.045, L, body, 0, 0.055, -L / 2 + 0.04));
        const grip = box(0.032, 0.12, 0.05, mat(M.grip || 0x1a1a1a), 0, -0.01, 0.02); grip.rotation.x = 0.25; g.add(grip);
        let tip = -L + 0.04;
        if (M.silencer) { g.add(cyl(0.017, 0.14, dark, 0, 0.055, tip - 0.07)); tip -= 0.14; }
        muzzle.position.set(0, 0.055, tip);
        break;
      }
      case 'knife': {
        g.add(box(0.025, 0.035, 0.11, mat(0x1d1d1d), 0, 0, 0.02));
        const bl = box(0.006, 0.035, 0.17, mat(0xb8bcc2), 0, 0.006, -0.12); g.add(bl);
        g.add(box(0.05, 0.012, 0.012, mat(0x333333), 0, 0, -0.035));
        muzzle.position.set(0, 0, -0.2);
        break;
      }
      case 'nade': {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.1, 10), mat(M.color || 0x445533));
        g.add(b); g.add(box(0.015, 0.06, 0.02, metal, 0.03, 0.03, 0)); g.add(cyl(0.012, 0.01, metal, 0, 0.06, 0));
        break;
      }
      case 'molotov': {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.13, 10), mat(0x5d7a2e, { transparent: true, opacity: 0.85 }));
        g.add(b); const n = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 0.08, 8), mat(0x5d7a2e)); n.position.y = 0.1; g.add(n);
        g.add(box(0.03, 0.05, 0.03, mat(0xd8d0c0), 0, 0.15, 0));
        break;
      }
      case 'bomb': {
        g.add(box(0.2, 0.08, 0.13, mat(0x5a4a32), 0, 0, 0));
        g.add(box(0.07, 0.015, 0.06, mat(0x222222), 0.03, 0.045, 0));
        g.add(box(0.05, 0.01, 0.02, mat(0xff2a2a, { emissive: 0xaa0000 }), -0.05, 0.045, -0.02));
        [-0.06, 0, 0.06].forEach(x => g.add(cyl(0.015, 0.13, mat(0xaa8855), x, -0.045, 0)));
        break;
      }
    }
    g.userData.muzzle = muzzle; g.add(muzzle);
    return g;
  }

  // ---------- KARAKTER ----------
  const TEAM_LOOK = {
    T: { shirt: ['#5b4a32', '#7a6440', '#3e3222'], pants: ['#8a7550', '#6f5c3c', '#a08a60'], vest: 0x3b3326, head: 0x2b2420, skin: 0xb98a65, accent: 0x8a2a1a },
    CT: { shirt: ['#2e3b4f', '#3e4f68', '#1f2836'], pants: ['#3a4556', '#2b3442', '#4e5a6c'], vest: 0x1d232b, head: 0x23272d, skin: 0xd4a582, accent: 0x2a5a9a },
  };
  const camoCache = {};
  function camoMat(key, cols, seed) {
    if (!camoCache[key]) camoCache[key] = new THREE.MeshLambertMaterial({ map: Tex.camo(seed, cols) });
    return camoCache[key];
  }
  function character(team) {
    const L = TEAM_LOOK[team];
    const shirt = camoMat(team + 's', L.shirt, team === 'T' ? 5 : 9), pants = camoMat(team + 'p', L.pants, team === 'T' ? 6 : 10);
    const vest = mat(L.vest), skin = mat(L.skin), dark = mat(0x161616), boots = mat(0x2a2218), headM = mat(L.head);
    const root = new THREE.Group();
    const parts = {};
    // bacaklar (kalça pivotu)
    const mkLeg = (x) => {
      const hip = new THREE.Group(); hip.position.set(x, 0.88, 0);
      const thigh = box(0.17, 0.46, 0.19, pants, 0, -0.23, 0); hip.add(thigh);
      const knee = new THREE.Group(); knee.position.set(0, -0.46, 0); hip.add(knee);
      knee.add(box(0.155, 0.36, 0.17, pants, 0, -0.18, 0));
      knee.add(box(0.17, 0.08, 0.27, boots, 0, -0.38, -0.04));
      hip.userData.knee = knee;
      root.add(hip); return hip;
    };
    parts.legL = mkLeg(-0.11); parts.legR = mkLeg(0.11);
    // gövde (üst gövde pivotu bel)
    const upper = new THREE.Group(); upper.position.set(0, 0.92, 0); root.add(upper); parts.upper = upper;
    upper.add(box(0.4, 0.22, 0.23, pants, 0, 0.06, 0));                 // kalça/bel
    upper.add(box(0.44, 0.42, 0.26, shirt, 0, 0.36, 0));                // gövde
    upper.add(box(0.46, 0.34, 0.3, vest, 0, 0.38, 0));                  // yelek
    upper.add(box(0.12, 0.08, 0.06, mat(0x3a3426), -0.12, 0.3, -0.17)); // cep
    upper.add(box(0.12, 0.08, 0.06, mat(0x3a3426), 0.12, 0.3, -0.17));
    // kafa
    const head = new THREE.Group(); head.position.set(0, 0.68, 0); upper.add(head); parts.head = head;
    head.add(box(0.11, 0.08, 0.11, skin, 0, -0.02, 0));               // boyun
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.125, 12, 10), team === 'T' ? headM : skin);
    skull.position.y = 0.12; skull.scale.set(0.95, 1.08, 1.0); head.add(skull);
    if (team === 'T') {
      head.add(box(0.2, 0.05, 0.03, skin, 0, 0.14, -0.11));             // göz bandı (yüz açıklığı)
      head.add(box(0.2, 0.025, 0.02, dark, 0, 0.145, -0.125));
      head.add(box(0.26, 0.05, 0.26, mat(L.accent), 0, 0.2, 0));         // bandana
    } else {
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x2d3542));
      helm.position.y = 0.15; head.add(helm);
      head.add(box(0.2, 0.05, 0.04, mat(0x101010), 0, 0.15, -0.115));   // gözlük
      head.add(box(0.18, 0.06, 0.03, mat(0x1d2128), 0, 0.06, -0.11));   // maske
    }
    // kollar (omuz pivotu) - tüfek tutar pozisyonda
    const mkArm = (x) => {
      const sh = new THREE.Group(); sh.position.set(x, 0.52, 0); upper.add(sh);
      sh.add(box(0.12, 0.3, 0.13, shirt, 0, -0.14, 0));
      const el = new THREE.Group(); el.position.set(0, -0.28, 0); sh.add(el);
      el.add(box(0.11, 0.28, 0.12, shirt, 0, -0.13, 0));
      el.add(box(0.1, 0.09, 0.1, dark, 0, -0.3, 0));
      sh.userData.el = el; return sh;
    };
    parts.armR = mkArm(0.27); parts.armL = mkArm(-0.27);
    parts.armR.rotation.set(1.2, 0, -0.38); parts.armR.userData.el.rotation.x = 0.35;
    parts.armL.rotation.set(1.38, 0, 0.62); parts.armL.userData.el.rotation.x = 0.2;
    // silah tutucu
    const gunHolder = new THREE.Group(); gunHolder.position.set(0.08, 0.42, -0.38); upper.add(gunHolder); parts.gun = gunHolder;
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    return { root, parts };
  }
  function setCharGun(ch, def) {
    const h = ch.parts.gun;
    while (h.children.length) h.remove(h.children[0]);
    if (!def) return;
    const g = gun(def);
    if (def.type === 'pistol' || def.type === 'knife' || def.type === 'grenade' || def.type === 'bomb') g.position.set(0, -0.02, 0.08);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    h.add(g); h.userData.model = g;
  }

  // ---------- BİRİNCİ ŞAHIS KOLLARI ----------
  function viewArms(team) {
    const L = TEAM_LOOK[team];
    const sleeve = camoMat(team + 's', L.shirt, team === 'T' ? 5 : 9);
    const glove = mat(team === 'T' ? 0x3b3020 : 0x1a1d22);
    const arms = new THREE.Group();
    const mk = (x, y, z, rx, ry) => {
      const a = new THREE.Group(); a.position.set(x, y, z); a.rotation.set(rx, ry, 0);
      a.add(box(0.075, 0.075, 0.38, sleeve, 0, 0, 0.19));
      a.add(box(0.07, 0.065, 0.11, glove, 0, 0, -0.04));
      arms.add(a); return a;
    };
    arms.userData.R = mk(0.0, -0.06, 0.06, 0.15, 0.08);
    arms.userData.L = mk(-0.07, -0.02, -0.25, 0.2, -0.45);
    return arms;
  }
  return { gun, character, setCharGun, viewArms, mat, box };
})();
