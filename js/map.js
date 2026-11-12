// Harita: "Kum Vadisi" — ızgara tabanlı, özgün tasarım
'use strict';
const MAP = (function () {
  const GRID = [
    "########################################",
    "#BBBBBBBBBB####CCCCCCCCCC####AAAAAAAAAA#",
    "#BBBBBBBxBB....CCCCCCCCCC....AAAAAAAxAA#",
    "#BBBBBBBBBB....CCxCCCCCCC....AwAAAAAAAA#",
    "#BBBXXBBBBB....CCCCCCCCCC....AAAAXXAAAA#",
    "#BBBBBBBBwB####CCCCCCCCCC####AAAAAAAAAA#",
    "#BBBBBBBBBB#######....#######AAAAAAAAxA#",
    "#BBxBBBxBBB...........#######AAxAAAAAAA#",
    "#BBBBBBBBBB...........#######AAAAAAAAAA#",
    "#BBBBBBBBBB#######....#######AAAAAAAAAA#",
    "##....############....#####...###.....##",
    "##....############....#####...###.....##",
    "##uuuuu############..######.w.###.....##",
    "##uuuuu############..######...###.....##",
    "##uuuuu##########......####...###...X.##",
    "##uuuuu##########...........#####.....##",
    "##uuuuu##########...........#####.....##",
    "##uuuuu##########..x........#####.....##",
    "##uuuuu##########......##########.....##",
    "##uuuuuuuuuuuuuuu......##########.....##",
    "##uuuuuuuuuuuuuuu......############..###",
    "##uuuuu##########......############..###",
    "##.....##########....X.##########.....##",
    "##.....##########......##########.....##",
    "##.....##########......##########.....##",
    "##.....##########......##########.x...##",
    "##.....###########....###########.....##",
    "##.....######TTTTTTTTTTTTTT######.....##",
    "##.....######TTTTTTTTTTTTTT######.....##",
    "#####uuuuuuuuTTTTTTTTTTTTTT.........####",
    "#####uuuuuuuuTTxTTTTTTTTTTT.........####",
    "#####uuuuuuuuTTTTTTTTTTTTTT.........####",
    "#############TTTTTTTTTTTxTT#############",
    "#############TTTTTTTTTTTTTT#############",
    "#############TTTTTTTTTTTTTT#############",
    "########################################",
  ];
  const W = 40, H = GRID.length, CELL = 3, OX = -60, OZ = -54;
  const CEIL_Y = 3.4;
  const cell = (c, r) => (r < 0 || r >= H || c < 0 || c >= W) ? '#' : GRID[r][c];
  const walkableCh = ch => '.ABCTu'.indexOf(ch) >= 0;
  const isWalk = (c, r) => walkableCh(cell(c, r));
  const c2w = (c, r) => ({ x: OX + c * CELL + CELL / 2, z: OZ + r * CELL + CELL / 2 });
  const w2c = (x, z) => [Math.floor((x - OX) / CELL), Math.floor((z - OZ) / CELL)];
  const zoneAt = (x, z) => { const [c, r] = w2c(x, z); return cell(c, r); };

  const boxes = []; // {min:{x,y,z}, max:{x,y,z}, kind, pen}
  function addBox(x0, y0, z0, x1, y1, z1, kind, extra) {
    const b = Object.assign({ min: { x: x0, y: y0, z: z0 }, max: { x: x1, y: y1, z: z1 }, kind }, extra || {});
    boxes.push(b); return b;
  }
  // --- çarpışma kutularını üret ---
  function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  const R = rnd(12345);
  function nearWalk(c, r) {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (walkableCh(cell(c + dc, r + dr)) || 'xXw'.includes(cell(c + dc, r + dr))) return true;
    return false;
  }
  for (let r = 0; r < H; r++) {
    let c = 0;
    while (c < W) {
      if (cell(c, r) === '#' && nearWalk(c, r)) {
        let c1 = c;
        while (c1 + 1 < W && cell(c1 + 1, r) === '#' && nearWalk(c1 + 1, r) && c1 - c < 6) c1++;
        const border = r === 0 || r === H - 1 || c === 0 || c1 === W - 1;
        const h = border ? 10 : [6, 7, 7.5, 8, 9][Math.floor(R() * 5)];
        const a = c2w(c, r), b = c2w(c1, r);
        addBox(a.x - 1.5, 0, a.z - 1.5, b.x + 1.5, h, b.z + 1.5, 'wall', { mat: Math.floor(R() * 3) });
        c = c1 + 1;
      } else c++;
    }
  }
  // sandıklar / alçak duvarlar
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const ch = cell(c, r), p = c2w(c, r);
    if (ch === 'x') addBox(p.x - 1.1, 0, p.z - 1.1, p.x + 1.1, 1.15, p.z + 1.1, 'crate', { pen: true });
    if (ch === 'X') {
      addBox(p.x - 1.35, 0, p.z - 1.35, p.x + 1.35, 1.3, p.z + 1.35, 'crate2', { pen: true });
      addBox(p.x - 1.0, 1.3, p.z - 0.6, p.x + 1.2, 2.5, p.z + 1.25, 'crate', { pen: true });
    }
    if (ch === 'w') addBox(p.x - 1.5, 0, p.z - 0.7, p.x + 1.5, 1.05, p.z + 0.7, 'lowwall');
  }
  // tünel tavanları
  for (let r = 0; r < H; r++) {
    let c = 0;
    while (c < W) {
      if (cell(c, r) === 'u') {
        let c1 = c; while (c1 + 1 < W && cell(c1 + 1, r) === 'u') c1++;
        const a = c2w(c, r), b = c2w(c1, r);
        addBox(a.x - 1.5, CEIL_Y, a.z - 1.5, b.x + 1.5, CEIL_Y + 0.6, b.z + 1.5, 'ceil');
        c = c1 + 1;
      } else c++;
    }
  }

  // --- Görsel ağ (merge) ---
  function Builder() { this.pos = []; this.nor = []; this.uv = []; this.col = []; }
  Builder.prototype.quad = function (p0, p1, p2, p3, n, uvs, cols) {
    const P = [p0, p1, p2, p0, p2, p3], U = [uvs[0], uvs[1], uvs[2], uvs[0], uvs[2], uvs[3]], C = [cols[0], cols[1], cols[2], cols[0], cols[2], cols[3]];
    for (let i = 0; i < 6; i++) {
      this.pos.push(P[i][0], P[i][1], P[i][2]); this.nor.push(n[0], n[1], n[2]);
      this.uv.push(U[i][0], U[i][1]); this.col.push(C[i], C[i], C[i]);
    }
  };
  function ao(y) { return Math.min(1, 0.55 + y * 0.28); }
  Builder.prototype.box = function (b, ts, opts) {
    const x0 = b.min.x, y0 = b.min.y, z0 = b.min.z, x1 = b.max.x, y1 = b.max.y, z1 = b.max.z;
    const s = 1 / ts; const o = opts || {};
    const aoF = o.noAO ? (() => 1) : ao;
    // +X
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [[z1 * s, y0 * s], [z0 * s, y0 * s], [z0 * s, y1 * s], [z1 * s, y1 * s]], [aoF(y0), aoF(y0), aoF(y1), aoF(y1)]);
    // -X
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [[z0 * s, y0 * s], [z1 * s, y0 * s], [z1 * s, y1 * s], [z0 * s, y1 * s]], [aoF(y0), aoF(y0), aoF(y1), aoF(y1)]);
    // +Z
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [[x0 * s, y0 * s], [x1 * s, y0 * s], [x1 * s, y1 * s], [x0 * s, y1 * s]], [aoF(y0), aoF(y0), aoF(y1), aoF(y1)]);
    // -Z
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [[x1 * s, y0 * s], [x0 * s, y0 * s], [x0 * s, y1 * s], [x1 * s, y1 * s]], [aoF(y0), aoF(y0), aoF(y1), aoF(y1)]);
    if (!o.noTop) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], [[x0 * s, z1 * s], [x1 * s, z1 * s], [x1 * s, z0 * s], [x0 * s, z0 * s]], [1, 1, 1, 1]);
    if (o.bottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], [[x0 * s, z0 * s], [x1 * s, z0 * s], [x1 * s, z1 * s], [x0 * s, z1 * s]], [0.6, 0.6, 0.6, 0.6]);
  };
  // Kasa: her yüz dokuyu tam kaplasın
  Builder.prototype.crate = function (b) {
    const x0 = b.min.x, y0 = b.min.y, z0 = b.min.z, x1 = b.max.x, y1 = b.max.y, z1 = b.max.z;
    const U = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const c0 = ao(y0) + 0.1, c1 = 1;
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], U, [c0, c0, c1, c1]);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], U, [c0, c0, c1, c1]);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], U, [c0, c0, c1, c1]);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], U, [c0, c0, c1, c1]);
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], U, [1, 1, 1, 1]);
  };
  Builder.prototype.floorRect = function (x0, z0, x1, z1, y, ts, aoEdge) {
    const s = 1 / ts;
    this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], [[x0 * s, z1 * s], [x1 * s, z1 * s], [x1 * s, z0 * s], [x0 * s, z0 * s]], aoEdge || [1, 1, 1, 1]);
  };
  Builder.prototype.mesh = function (mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    return new THREE.Mesh(g, mat);
  };

  function build(scene, quality) {
    const lam = (map, extra) => new THREE.MeshLambertMaterial(Object.assign({ map, vertexColors: true }, extra || {}));
    const mats = {
      wall0: lam(Tex.sandstone(11, '#c8a674')),
      wall1: lam(Tex.plaster(22, '#d6c19c')),
      wall2: lam(Tex.sandstone(33, '#b99668')),
      sand: lam(Tex.ground(44, '#bc9d6b')),
      tsand: lam(Tex.ground(55, '#b08f5f', 500)),
      tiles: lam(Tex.tiles(66, '#a8a08f', 4)),
      tunnelFloor: lam(Tex.tiles(77, '#7d776c', 6)),
      concrete: lam(Tex.concrete(88, '#8b867c')),
      crate: lam(Tex.crate(99, false)),
      crate2: lam(Tex.crate(111, true)),
      low: lam(Tex.concrete(122, '#9f9686')),
    };
    const B = {}; const get = k => (B[k] || (B[k] = new Builder()));
    for (const b of boxes) {
      if (b.kind === 'wall') get('wall' + b.mat).box(b, 4);
      else if (b.kind === 'crate') get('crate').crate(b);
      else if (b.kind === 'crate2') get('crate2').crate(b);
      else if (b.kind === 'lowwall') get('low').box(b, 2);
      else if (b.kind === 'ceil') get('concrete').box(b, 3, { bottom: true, noAO: true });
    }
    // zemin: hücre bazlı malzeme
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const ch = cell(c, r); if (ch === '#') continue;
      const p = c2w(c, r);
      let k = 'sand';
      if (ch === 'A' || ch === 'B') k = 'tiles';
      else if (ch === 'u') k = 'tunnelFloor';
      else if (ch === 'T') k = 'tsand';
      else if (ch === 'C') k = 'concrete';
      get(k).floorRect(p.x - 1.5, p.z - 1.5, p.x + 1.5, p.z + 1.5, 0, k === 'tiles' ? 3 : 4);
    }
    const group = new THREE.Group();
    for (const k in B) {
      const m = B[k].mesh(mats[k] || mats.wall0);
      m.receiveShadow = true;
      m.castShadow = !k.startsWith('sand') && k !== 'tiles' && k !== 'tsand' && k !== 'tunnelFloor';
      group.add(m);
    }
    // site harfleri
    const letter = (ch, x, y, z, ry) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshLambertMaterial({ map: Tex.siteLetter(ch), transparent: true, depthWrite: false }));
      m.position.set(x, y, z); m.rotation.y = ry; group.add(m);
    };
    // A sitesi: kuzey duvarı (r=0) iç yüzü z = OZ + 3
    letter('A', c2w(33, 1).x, 3.2, OZ + 3.02, 0);
    letter('A', OX + 39 * 3 - 0.02, 3.0, c2w(38, 5).z, -Math.PI / 2);
    letter('B', c2w(5, 1).x, 3.2, OZ + 3.02, 0);
    letter('B', OX + 3 + 0.02, 3.0, c2w(1, 5).z, Math.PI / 2);
    // dış zemin
    const out = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: 0xa88c5e }));
    out.rotation.x = -Math.PI / 2; out.position.y = -0.02; out.receiveShadow = false; group.add(out);
    // gökyüzü
    const skyGeo = new THREE.SphereGeometry(400, 24, 12);
    const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ map: Tex.sky(), side: THREE.BackSide, fog: false, depthWrite: false }));
    group.add(sky);
    // uzak tepeler
    const hillMat = new THREE.MeshLambertMaterial({ color: 0xb49a70, fog: true });
    const hr = rnd(777);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2, d = 150 + hr() * 60;
      const h = new THREE.Mesh(new THREE.ConeGeometry(30 + hr() * 30, 18 + hr() * 25, 7), hillMat);
      h.position.set(Math.cos(a) * d, 5, Math.sin(a) * d); group.add(h);
    }
    // Dekor: duvar üstü bezemeleri & tenteler
    const awnMat = new THREE.MeshLambertMaterial({ color: 0x8a3b2b, side: THREE.DoubleSide });
    const awnMat2 = new THREE.MeshLambertMaterial({ color: 0x2e5d7a, side: THREE.DoubleSide });
    const awn = (x, z, w, d, ry, mat) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      m.position.set(x, 3.6, z); m.rotation.set(-Math.PI / 2 + 0.35, ry, 0, 'YXZ'); m.castShadow = true; group.add(m);
    };
    awn(c2w(19, 30).x, OZ + 27 * 3 + 0.8, 5, 2, 0, awnMat);
    awn(c2w(24, 2).x, OZ + 3 + 0.8, 4, 1.8, 0, awnMat2);
    awn(c2w(35, 15).x, OZ + 10 * 3 + 0.8, 4, 1.8, 0, awnMat);
    scene.add(group);
    return group;
  }

  // --- Navigasyon (A*) ---
  function blockedNav(c, r) { return !isWalk(c, r); }
  function findPath(sx, sz, tx, tz) {
    let [sc, sr] = w2c(sx, sz), [tc, tr] = w2c(tx, tz);
    if (blockedNav(sc, sr)) { const n = nearestWalk(sc, sr); if (n) [sc, sr] = n; }
    if (blockedNav(tc, tr)) { const n = nearestWalk(tc, tr); if (n) [tc, tr] = n; else return null; }
    const key = (c, r) => r * W + c;
    const open = [], g = new Map(), from = new Map(), closed = new Set();
    const h = (c, r) => { const dx = Math.abs(c - tc), dy = Math.abs(r - tr); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    const sk = key(sc, sr); g.set(sk, 0); open.push({ c: sc, r: sr, f: h(sc, sr) });
    let found = false, it = 0;
    while (open.length && it++ < 4000) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      const cur = open.splice(bi, 1)[0]; const ck = key(cur.c, cur.r);
      if (closed.has(ck)) continue; closed.add(ck);
      if (cur.c === tc && cur.r === tr) { found = true; break; }
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nc = cur.c + dc, nr = cur.r + dr;
        if (blockedNav(nc, nr)) continue;
        if (dc && dr && (blockedNav(cur.c + dc, cur.r) || blockedNav(cur.c, cur.r + dr))) continue;
        const nk = key(nc, nr);
        if (closed.has(nk)) continue;
        const ng = g.get(ck) + (dc && dr ? 1.414 : 1);
        if (!g.has(nk) || ng < g.get(nk)) { g.set(nk, ng); from.set(nk, ck); open.push({ c: nc, r: nr, f: ng + h(nc, nr) }); }
      }
    }
    if (!found) return null;
    const cells = []; let k = key(tc, tr);
    while (k !== undefined) { cells.push(k); if (k === sk) break; k = from.get(k); }
    cells.reverse();
    let pts = cells.map(k2 => { const c = k2 % W, r = Math.floor(k2 / W); const p = c2w(c, r); return { x: p.x, z: p.z }; });
    pts[pts.length - 1] = { x: tx, z: tz };
    if (blockedNav(...w2c(tx, tz))) { const p = pts[pts.length - 1]; const q = c2w(tc, tr); p.x = q.x; p.z = q.z; }
    // düzleştirme
    const out = [pts[0]]; let i = 0;
    while (i < pts.length - 1) {
      let j = pts.length - 1;
      while (j > i + 1 && !clearLine(pts[i], pts[j])) j--;
      out.push(pts[j]); i = j;
    }
    out.shift();
    return out;
  }
  function clearLine(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    const n = Math.ceil(d / 0.6), px = -dz / d * 0.55, pz = dx / d * 0.55;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = a.x + dx * t, z = a.z + dz * t;
      if (!isWalk(...w2c(x + px, z + pz)) || !isWalk(...w2c(x - px, z - pz))) return false;
    }
    return true;
  }
  function nearestWalk(c, r) {
    for (let rad = 1; rad < 6; rad++)
      for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++)
        if (isWalk(c + dc, r + dr)) return [c + dc, r + dr];
    return null;
  }
  function cellsOf(ch, filter) {
    const out = [];
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (cell(c, r) === ch && (!filter || filter(c, r))) out.push(c2w(c, r));
    return out;
  }
  const P = (c, r) => c2w(c, r);
  const POS = {
    site: { A: P(33, 6), B: P(5, 6) },
    plant: { A: [P(32, 6), P(35, 7), P(31, 4), P(36, 4)], B: [P(6, 6), P(3, 3), P(7, 4), P(2, 6)] },
    ctHold: {
      A: [{ p: P(31, 2), look: P(35, 10) }, { p: P(37, 8), look: P(35, 13) }, { p: P(30, 8), look: P(28, 13) }, { p: P(35, 3), look: P(35, 11) }],
      B: [{ p: P(8, 3), look: P(4, 11) }, { p: P(2, 2), look: P(4, 11) }, { p: P(9, 8), look: P(13, 8) }, { p: P(6, 8), look: P(4, 11) }],
      mid: [{ p: P(19, 6), look: P(19, 20) }, { p: P(16, 8), look: P(19, 13) }],
    },
    tStage: {
      A: [P(35, 25), P(22, 17), P(36, 27)],
      B: [P(4, 23), P(13, 20), P(3, 25)],
      mid: [P(19, 22), P(20, 24)],
    },
    entries: { A: [P(35, 10), P(28, 11), P(26, 3)], B: [P(4, 10), P(12, 8), P(12, 3)] },
    spawnT: cellsOf('T', (c, r) => r >= 29 && r <= 33 && c >= 15 && c <= 24),
    spawnCT: cellsOf('C', (c, r) => r >= 1 && r <= 4 && c >= 16 && c <= 23 && cell(c, r) === 'C'),
  };
  // Radar görseli
  function radarImage(px) {
    const cv = document.createElement('canvas'); cv.width = W * px; cv.height = H * px;
    const x = cv.getContext('2d');
    x.fillStyle = 'rgba(0,0,0,0)'; x.fillRect(0, 0, cv.width, cv.height);
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const ch = cell(c, r);
      if (ch === '#') continue;
      x.fillStyle = (ch === 'A' || ch === 'B') ? 'rgba(170,120,90,0.85)' : ch === 'u' ? 'rgba(110,110,110,0.85)' : 'rgba(150,150,150,0.8)';
      if ('xXw'.includes(ch)) x.fillStyle = 'rgba(90,80,70,0.9)';
      x.fillRect(c * px, r * px, px + 0.5, px + 0.5);
    }
    x.font = `bold ${px * 3}px Arial`; x.fillStyle = 'rgba(255,90,60,0.95)'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('A', 33.5 * px, 6 * px); x.fillText('B', 5.5 * px, 6 * px);
    return cv;
  }
  return { GRID, W, H, CELL, OX, OZ, CEIL_Y, cell, isWalk, c2w, w2c, zoneAt, boxes, build, findPath, clearLine, POS, radarImage, nearestWalk };
})();
