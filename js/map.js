// Haritalar: ızgara tabanlı, özgün tasarımlar (4 harita)
'use strict';
const MAP_GRIDS = {
  dust: [
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
    "##uuuuu##########.####.##########.....##",
    "##uuuuuuuuuuuuuuu.###..##########.....##",
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
  ],
  harbor: [
    "########################################",
    "###############AAAAAAAAAAA##############",
    "####...........AAAAAAAwAAA##############",
    "####.....x.....AAAXXAAAAAA...........###",
    "####...........AAAAAAAAAAA...........###",
    "####...########AAAAAAAAAAA...........###",
    "####...########AAAAAAAAxAA#######...####",
    "####...########AxAAAAAAAAA#######...####",
    "####...########AAAAAAAAAAA#######...####",
    "####...###########uuu############...####",
    "####...###########uuu############...####",
    "#TTTTTT###########uuu############CCCCCC#",
    "#TTTTTT.........#.............x..CCCCCC#",
    "#TTTTTT...XX....#.......X........CCCCCC#",
    "#TTxTTT.........#x.....#.........CCCCCC#",
    "#TTTTTT.........#......#...XX....CCCxCC#",
    "#TTTTTT.......X........#.........CCCCCC#",
    "#TTTTTT................#.........CCCCCC#",
    "#TTTTTT#############uuu##########CCCCCC#",
    "####...#############uuu##########...####",
    "####...#############uuu##########...####",
    "####...########BBBBBBBBBBB#######...####",
    "####...########BxBBBBBBBBB#######...####",
    "####...########BBBBBBBBxBB#######...####",
    "####...########BBBBBBBBBBB...........###",
    "####...........BBBXXBBBBBB....x......###",
    "####...........BBBBBBBBBBB...........###",
    "####...........BBBBBBBwBBB##############",
    "###############BBBBBBBBBBB##############",
    "########################################",
  ],
  snow: [
    "####################################",
    "##############CCCCCCCC##############",
    "#####.........CCCCCxCC.........#####",
    "#####.........CCCCCCCC.........#####",
    "#####.........CCCCCCCC.........#####",
    "#####...########....########...#####",
    "#BBBBBBBBB######....######AAAAAAAAA#",
    "#BBBBBBBBB######....######AAAAAAAAA#",
    "#BBBBXXBBB######.x..######AAAXXAAAA#",
    "#BBBBBBBBB######....######AAAAAAAAA#",
    "#BBBBBBBxB######....######AAAAAAAAA#",
    "#BBBBBBBBB######....######AxAAAAAAA#",
    "#BBxBBBBBB##uuuuuuuuuuuu##AAAAAAxAA#",
    "#BBBBBuuuuuuuuuuuuuuuuuuuuuuuuAAAAA#",
    "#BBBBBuuuuuuuuuuuuuuuuuuuuuuuuAAAAA#",
    "#####.....##uuXuuuuuuXuu##.....#####",
    "#####.....##uuuuuuuuuuuu##.....#####",
    "#####.....##uuuu####uuuu##.....#####",
    "#####.....##uuuu####uuuu##.....#####",
    "#####.....##uuXuuuuuuXuu##.....#####",
    "#####.....##uuuuuuuuuuuu##.....#####",
    "#####..x..##uuuuuuuuuuuu##.....#####",
    "#####.....##uuuuuuuuuuuu##..x..#####",
    "#####.....######....######.....#####",
    "#####.....######....######.....#####",
    "#####.....######....######.....#####",
    "#####.....######....######.....#####",
    "#####.....######..w.######.....#####",
    "#####.........##....##.........#####",
    "#####.........##....##.........#####",
    "#####.........##....##.........#####",
    "##############TTTTTTTT##############",
    "##############TTTTTTTT##############",
    "##############TTxTTTTT##############",
    "##############TTTTTTTT##############",
    "####################################",
  ],
  town: [
    "########################################",
    "#AAAAAAAAAA####################CCCCCCCC#",
    "#AAAAAAAAAA....................CCCCCCCC#",
    "#AAAAAAAAAA..............x.....CCCCCCCC#",
    "#AAAXXAAAAA....................CCCCxCCC#",
    "#AAAAAAAAAA....................CCCCCCCC#",
    "#AAAAAAAAAA########..##########CCCCCCCC#",
    "#AAAAAAAxAA########..##########CCCCCCCC#",
    "#AxAAAAAAAA########..##########CCCCCCCC#",
    "#AAAAAAAAAA########..############....###",
    "##....#############..############....###",
    "##....#############..############....###",
    "##....#############..############....###",
    "##....########............#######....###",
    "##....########..x.........#######..x.###",
    "##....uuuuuuuu..........w.#######....###",
    "##....uuuuuuuu............#######....###",
    "###..#########.....XX.....#######....###",
    "###..#########............#######....###",
    "##....########............uuuuuuu....###",
    "##....########.w..........uuuuuuu....###",
    "##....########.........x..#######....###",
    "##.x..########............#######....###",
    "##....######..###################....###",
    "##....######..###################....###",
    "##....######..###################....###",
    "##....######..###############BBBBBBBBBB#",
    "#TTTTTTTT###..###############BBBBBBBBxB#",
    "#TTTTTTTT###..###############BBBBBBBBBB#",
    "#TTTTTTTT###..###############BBBBXXBBBB#",
    "#TTTTTTTT....................BBBBBBBBBB#",
    "#TTTTxTTT...........x........BBBBBBBBBB#",
    "#TTTTTTTT....................BBxBBBBBBB#",
    "#TTTTTTTT....................BBBBBBBBBB#",
    "#TTTTTTTT####################BBBBBBBBBB#",
    "########################################",
  ],
};
const MAP_LIST = [
  { id: 'dust', name: 'Kum Vadisi', theme: 'desert' },
  { id: 'harbor', name: 'Liman', theme: 'harbor' },
  { id: 'snow', name: 'Karlı Üs', theme: 'snow' },
  { id: 'town', name: 'Eski Kasaba', theme: 'town' },
];
const MAP = (function () {
  const CELL = 3, CEIL_Y = 3.4;
  let GRID = MAP_GRIDS.dust, W = 40, H = 36, OX = -60, OZ = -54;
  const M = { CELL, CEIL_Y, boxes: [], current: null, info: null };
  const cell = (c, r) => (r < 0 || r >= H || c < 0 || c >= W) ? '#' : GRID[r][c];
  const walkableCh = ch => '.ABCTu'.indexOf(ch) >= 0;
  const isWalk = (c, r) => walkableCh(cell(c, r));
  const c2w = (c, r) => ({ x: OX + c * CELL + CELL / 2, z: OZ + r * CELL + CELL / 2 });
  const w2c = (x, z) => [Math.floor((x - OX) / CELL), Math.floor((z - OZ) / CELL)];
  const zoneAt = (x, z) => { const [c, r] = w2c(x, z); return cell(c, r); };
  function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

  // ---------- çarpışma kutuları ----------
  function buildBoxes() {
    const boxes = M.boxes; boxes.length = 0; // aynı dizi (Phys referansı korunur)
    const addBox = (x0, y0, z0, x1, y1, z1, kind, extra) => boxes.push(Object.assign({ min: { x: x0, y: y0, z: z0 }, max: { x: x1, y: y1, z: z1 }, kind }, extra || {}));
    const R = rnd(12345 + W * 7 + H);
    const nearWalk = (c, r) => {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (walkableCh(cell(c + dc, r + dr)) || 'xXw'.includes(cell(c + dc, r + dr))) return true;
      return false;
    };
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
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const ch = cell(c, r), p = c2w(c, r);
      if (ch === 'x') addBox(p.x - 1.1, 0, p.z - 1.1, p.x + 1.1, 1.15, p.z + 1.1, 'crate', { pen: true });
      if (ch === 'X') {
        addBox(p.x - 1.35, 0, p.z - 1.35, p.x + 1.35, 1.3, p.z + 1.35, 'crate2', { pen: true });
        addBox(p.x - 1.0, 1.3, p.z - 0.6, p.x + 1.2, 2.5, p.z + 1.25, 'crate', { pen: true });
      }
      if (ch === 'w') addBox(p.x - 1.5, 0, p.z - 0.7, p.x + 1.5, 1.05, p.z + 0.7, 'lowwall');
    }
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
  }

  // ---------- Görsel ağ ----------
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
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [[z1 * s, y0 * s], [z0 * s, y0 * s], [z0 * s, y1 * s], [z1 * s, y1 * s]], [aoF(y0), aoF(y0), aoF(y1), aoF(y1)]);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [[z0 * s, y0 * s], [z1 * s, y0 * s], [z1 * s, y1 * s], [z0 * s, y1 * s]], [aoF(y0), aoF(y0), aoF(y1), aoF(y1)]);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [[x0 * s, y0 * s], [x1 * s, y0 * s], [x1 * s, y1 * s], [x0 * s, y1 * s]], [aoF(y0), aoF(y0), aoF(y1), aoF(y1)]);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [[x1 * s, y0 * s], [x0 * s, y0 * s], [x0 * s, y1 * s], [x1 * s, y1 * s]], [aoF(y0), aoF(y0), aoF(y1), aoF(y1)]);
    if (!o.noTop) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], [[x0 * s, z1 * s], [x1 * s, z1 * s], [x1 * s, z0 * s], [x0 * s, z0 * s]], [1, 1, 1, 1]);
    if (o.bottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], [[x0 * s, z0 * s], [x1 * s, z0 * s], [x1 * s, z1 * s], [x0 * s, z1 * s]], [0.6, 0.6, 0.6, 0.6]);
  };
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
  Builder.prototype.floorRect = function (x0, z0, x1, z1, y, ts) {
    const s = 1 / ts;
    this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], [[x0 * s, z1 * s], [x1 * s, z1 * s], [x1 * s, z0 * s], [x0 * s, z0 * s]], [1, 1, 1, 1]);
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

  // ---------- Temalar ----------
  function themeMats(theme) {
    const R2 = Tex.RETRO;
    const lam = map => new THREE.MeshLambertMaterial({ map, vertexColors: true });
    const T = {
      desert: () => ({
        wall0: lam(Tex.sandstone(11, R2 ? '#c9a15c' : '#c8a674')), wall1: lam(Tex.plaster(22, R2 ? '#d4b880' : '#d6c19c')), wall2: lam(Tex.sandstone(33, R2 ? '#b98c4e' : '#b99668')),
        sand: lam(Tex.ground(44, R2 ? '#bf9a5c' : '#bc9d6b')), tsand: lam(Tex.ground(55, '#b08f5f', 500)), tiles: lam(Tex.tiles(66, '#a8a08f', 4)),
        tunnelFloor: lam(Tex.tiles(77, '#7d776c', 6)), concrete: lam(Tex.concrete(88, '#8b867c')), crate: lam(Tex.crate(99, false)), crate2: lam(Tex.crate(111, true)), low: lam(Tex.concrete(122, '#9f9686')),
      }),
      harbor: () => ({
        wall0: lam(Tex.sandstone(11, '#8d9091')), wall1: lam(Tex.metal(21, '#5f7280')), wall2: lam(Tex.plaster(33, '#a29d93')),
        sand: lam(Tex.concrete(44, '#6f6d69')), tsand: lam(Tex.concrete(55, '#7a766e')), tiles: lam(Tex.tiles(66, '#8e8c86', 4)),
        tunnelFloor: lam(Tex.tiles(77, '#5f5e5a', 6)), concrete: lam(Tex.concrete(88, '#83868a')), crate: lam(Tex.crate(99, false)), crate2: lam(Tex.metal(111, '#2f6a96')), low: lam(Tex.concrete(122, '#b2a24a')),
      }),
      snow: () => ({
        wall0: lam(Tex.plaster(11, '#d7dde3')), wall1: lam(Tex.sandstone(22, '#a9b1b9')), wall2: lam(Tex.concrete(33, '#c3c9cf')),
        sand: lam(Tex.ground(44, '#e6ebf0', 40)), tsand: lam(Tex.ground(55, '#dfe5eb', 60)), tiles: lam(Tex.tiles(66, '#98a1aa', 4)),
        tunnelFloor: lam(Tex.tiles(77, '#6e747b', 6)), concrete: lam(Tex.concrete(88, '#8d939a')), crate: lam(Tex.crate(99, false)), crate2: lam(Tex.metal(111, '#56636e')), low: lam(Tex.concrete(122, '#b8bec5')),
      }),
      town: () => ({
        wall0: lam(Tex.brick(11, '#a5553e')), wall1: lam(Tex.plaster(22, '#d9cdb2')), wall2: lam(Tex.sandstone(33, '#a39b8b')),
        sand: lam(Tex.tiles(44, '#857c72', 8)), tsand: lam(Tex.tiles(55, '#7d756b', 8)), tiles: lam(Tex.tiles(66, '#9b8b78', 4)),
        tunnelFloor: lam(Tex.tiles(77, '#6d665d', 6)), concrete: lam(Tex.tiles(88, '#8a8379', 8)), crate: lam(Tex.crate(99, false)), crate2: lam(Tex.crate(111, true)), low: lam(Tex.brick(122, '#8f4a37')),
      }),
    };
    return (T[theme] || T.desert)();
  }
  const ENV = {
    desert: { fog: 0xd8c8a6, fogR: 0xcdb88e, hemiSky: 0xcfe2ff, hemiGround: 0x8a6a45, sun: 0xfff0d0, out: 0xa88c5e, hill: 0xb49a70, sky: ['#3f7cc7', '#8fbde8', '#e9dcc3', '#c9b48e'], bg: 0x9cc3ea },
    harbor: { fog: 0xb8c3cc, fogR: 0xaab4bc, hemiSky: 0xd8e4f0, hemiGround: 0x5a5c60, sun: 0xf2f0ea, out: 0x5c5a56, hill: 0x7f868d, sky: ['#5d7896', '#a8bccd', '#c7cdd2', '#7d8186'], bg: 0xa8bccd },
    snow: { fog: 0xdde5ec, fogR: 0xd5dee6, hemiSky: 0xeef4ff, hemiGround: 0xb8c0c8, sun: 0xf6f9ff, out: 0xeaeff3, hill: 0xf3f6f9, sky: ['#7d9cc2', '#c9d9ea', '#eef2f6', '#dfe5ea'], bg: 0xc9d9ea },
    town: { fog: 0xc9d4dc, fogR: 0xc2ccd2, hemiSky: 0xd6e6ff, hemiGround: 0x6b6a52, sun: 0xfff2dc, out: 0x6b7a4f, hill: 0x6d8a52, sky: ['#3d78c4', '#94c0ea', '#dfe6dd', '#8ba070'], bg: 0x94c0ea },
  };
  M.env = () => ENV[(M.info && M.info.theme) || 'desert'];

  let group = null;
  function build(scene) {
    if (group) {
      scene.remove(group);
      group.traverse(o => { if (o.isMesh) { o.geometry.dispose(); const m = o.material; if (m) { if (m.map) m.map.dispose(); m.dispose(); } } });
    }
    const theme = M.info.theme;
    const mats = themeMats(theme), env = ENV[theme];
    const B = {}; const get = k => (B[k] || (B[k] = new Builder()));
    for (const b of M.boxes) {
      if (b.kind === 'wall') get('wall' + b.mat).box(b, 4);
      else if (b.kind === 'crate') get('crate').crate(b);
      else if (b.kind === 'crate2') get('crate2').crate(b);
      else if (b.kind === 'lowwall') get('low').box(b, 2);
      else if (b.kind === 'ceil') get('concrete').box(b, 3, { bottom: true, noAO: true });
    }
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const ch = cell(c, r); if (ch === '#') continue;
      const p = c2w(c, r);
      let k = 'sand';
      if (ch === 'A' || ch === 'B') k = 'tiles'; else if (ch === 'u') k = 'tunnelFloor'; else if (ch === 'T') k = 'tsand'; else if (ch === 'C') k = 'concrete';
      get(k).floorRect(p.x - 1.5, p.z - 1.5, p.x + 1.5, p.z + 1.5, 0, k === 'tiles' ? 3 : 4);
    }
    group = new THREE.Group();
    for (const k in B) {
      const m = B[k].mesh(mats[k] || mats.wall0);
      m.receiveShadow = true;
      m.castShadow = !['sand', 'tiles', 'tsand', 'tunnelFloor'].includes(k);
      group.add(m);
    }
    for (const k in mats) if (!B[k]) { if (mats[k].map) mats[k].map.dispose(); mats[k].dispose(); }
    // site harfleri: siteye bakan en yakın duvar yüzüne
    for (const s of ['A', 'B']) {
      const cen = M.POS.site[s]; const [cc, cr] = w2c(cen.x, cen.z);
      const cands = [];
      for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
        if (cell(c, r) !== s) continue;
        for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) if (cell(c + dc, r + dr) === '#') cands.push({ c, r, dc, dr, d: Math.hypot(c - cc, r - cr) });
      }
      cands.sort((a, b) => a.d - b.d);
      const used = [];
      for (const k of cands) {
        if (used.length >= 2) break;
        if (used.some(u => u.dc === k.dc && u.dr === k.dr)) continue;
        used.push(k);
        const p = c2w(k.c, k.r);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshLambertMaterial({ map: Tex.siteLetter(s), transparent: true, depthWrite: false }));
        m.position.set(p.x + k.dc * 1.48, 3.1, p.z + k.dr * 1.48);
        m.rotation.y = k.dr === -1 ? 0 : k.dr === 1 ? Math.PI : k.dc === -1 ? Math.PI / 2 : -Math.PI / 2;
        group.add(m);
      }
    }
    const out = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: env.out }));
    out.rotation.x = -Math.PI / 2; out.position.y = -0.02; group.add(out);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12), new THREE.MeshBasicMaterial({ map: Tex.sky(env.sky), side: THREE.BackSide, fog: false, depthWrite: false }));
    group.add(sky);
    const hillMat = new THREE.MeshLambertMaterial({ color: env.hill });
    const hr = rnd(777);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2, d = 150 + hr() * 60;
      const h = new THREE.Mesh(new THREE.ConeGeometry(30 + hr() * 30, (theme === 'harbor' ? 8 : 18) + hr() * 25, 7), hillMat);
      h.position.set(Math.cos(a) * d, 5, Math.sin(a) * d); group.add(h);
    }
    // tema dekorları: tenteler
    if (theme === 'desert' || theme === 'town') {
      const cols = theme === 'town' ? [0x2f6b3a, 0x8a2b2b] : [0x8a3b2b, 0x2e5d7a];
      const R = rnd(99);
      let n = 0;
      for (let r = 1; r < H - 1 && n < 6; r++) for (let c = 1; c < W - 1 && n < 6; c++) {
        if (cell(c, r) === '.' && cell(c, r - 1) === '#' && cell(c - 1, r) === '.' && cell(c + 1, r) === '.' && R() < 0.06) {
          const p = c2w(c, r);
          const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.8), new THREE.MeshLambertMaterial({ color: cols[n % 2], side: THREE.DoubleSide }));
          m.position.set(p.x, 3.6, p.z - 1.5 + 0.8); m.rotation.set(-Math.PI / 2 + 0.35, 0, 0, 'YXZ'); m.castShadow = true; group.add(m); n++;
        }
      }
    }
    scene.add(group);
    return group;
  }

  // ---------- Navigasyon (A*) ----------
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
    while (open.length && it++ < 5000) {
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
    if (d < 0.01) return true;
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
  // ızgara görüş hattı (duvar & büyük kasa engeller)
  function gridLOS(c0, r0, c1, r1) {
    const n = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0)) * 2;
    for (let i = 1; i < n; i++) {
      const c = Math.round(c0 + (c1 - c0) * i / n), r = Math.round(r0 + (r1 - r0) * i / n);
      const ch = cell(c, r); if (ch === '#' || ch === 'X') return false;
    }
    return true;
  }
  function alongPath(path, from, distFromEnd, frac) {
    const pts = [from].concat(path || []);
    let L = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); seg.push(d); L += d; }
    let target = frac !== undefined ? L * frac : Math.max(0, L - distFromEnd);
    for (let i = 1; i < pts.length; i++) {
      if (target <= seg[i - 1]) { const t = seg[i - 1] ? target / seg[i - 1] : 0; return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, z: pts[i - 1].z + (pts[i].z - pts[i - 1].z) * t }; }
      target -= seg[i - 1];
    }
    return pts[pts.length - 1];
  }
  // Konumları ızgaradan otomatik çıkar
  function autoPOS() {
    const R = rnd(4242);
    const centroid = list => { let x = 0, z = 0; list.forEach(p => { x += p.x; z += p.z; }); return { x: x / list.length, z: z / list.length }; };
    const snap = p => { const [c, r] = w2c(p.x, p.z); if (isWalk(c, r)) return c2w(c, r); const n = nearestWalk(c, r); return c2w(n[0], n[1]); };
    const spawnT = cellsOf('T'), spawnCT = cellsOf('C');
    const tC = snap(centroid(spawnT)), ctC = snap(centroid(spawnCT));
    const P = { site: {}, plant: {}, ctHold: {}, tStage: {}, entries: {}, spawnT, spawnCT };
    for (const s of ['A', 'B']) {
      const cellsS = []; for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (cell(c, r) === s) cellsS.push([c, r]);
      const cen = snap(centroid(cellsS.map(([c, r]) => c2w(c, r))));
      // site merkezi kendi bölgesinde olsun
      let best = cellsS[0], bd = 1e9; const [cc, cr] = w2c(cen.x, cen.z);
      for (const [c, r] of cellsS) { const d = Math.hypot(c - cc, r - cr); if (d < bd) { bd = d; best = [c, r]; } }
      P.site[s] = c2w(best[0], best[1]);
      const near = cellsS.filter(([c, r]) => Math.hypot(c - best[0], r - best[1]) <= 3.2).sort(() => R() - 0.5);
      P.plant[s] = (near.length ? near : cellsS).slice(0, 4).map(([c, r]) => c2w(c, r));
      // girişler: siteye komşu, site olmayan yürünebilir hücre kümeleri
      const ent = new Set();
      for (const [c, r] of cellsS) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ch = cell(c + dc, r + dr); if (walkableCh(ch) && ch !== s) ent.add((r + dr) * W + (c + dc));
      }
      const clusters = [], seen = new Set();
      for (const k of ent) {
        if (seen.has(k)) continue;
        const cl = [], st = [k]; seen.add(k);
        while (st.length) { const q = st.pop(); cl.push(q); const qc = q % W, qr = Math.floor(q / W);
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const n = (qr + dr) * W + qc + dc; if (ent.has(n) && !seen.has(n)) { seen.add(n); st.push(n); } } }
        clusters.push(cl);
      }
      P.entries[s] = clusters.map(cl => { const ps = cl.map(q => c2w(q % W, Math.floor(q / W))); return snap(centroid(ps)); });
      if (!P.entries[s].length) P.entries[s] = [P.site[s]];
      // T tarafı girişler: T doğma noktasından gelen yol siteye girmeden ulaşıyorsa
      const crosses = (path) => (path || []).some((q, i, arr) => { const prev = i ? arr[i - 1] : tC; for (let t = 0; t <= 1; t += 0.1) { const x = prev.x + (q.x - prev.x) * t, z = prev.z + (q.z - prev.z) * t; if (zoneAt(x, z) === s || zoneAt(x, z) === 'C') return true; } return false; });
      const tPaths = P.entries[s].map(e => ({ e, path: findPath(tC.x, tC.z, e.x, e.z) }));
      let tSide = tPaths.filter(o => o.path && !crosses(o.path.slice(0, -1)));
      if (!tSide.length) tSide = tPaths.filter(o => o.path).sort((a, b) => a.path.length - b.path.length).slice(0, 1);
      // CT tutuş noktaları: T tarafı girişleri gören, 4-10 hücre uzaktaki site hücresi
      P.ctHold[s] = [];
      for (const { e } of tSide) {
        const [ec, er] = w2c(e.x, e.z);
        let pick = null, pd = -1;
        for (const [c, r] of cellsS) {
          const d = Math.hypot(c - ec, r - er);
          if (d < 4 || d > 10 || !isWalk(c, r) || !gridLOS(c, r, ec, er)) continue;
          const sc = d + R() * 2; if (sc > pd) { pd = sc; pick = [c, r]; }
        }
        if (pick) P.ctHold[s].push({ p: c2w(pick[0], pick[1]), look: e });
      }
      P.ctHold[s].push({ p: P.site[s], look: P.entries[s][0] });
      // T bekleme noktaları: her girişe giden yolda girişten ~14 m önce
      P.tStage[s] = tSide.map(o => snap(alongPath(o.path, tC, 14)));
      P.ctHold[s][P.ctHold[s].length - 1].look = tSide[0].e;
    }
    const mid = findPath(ctC.x, ctC.z, tC.x, tC.z);
    P.ctHold.mid = [{ p: snap(alongPath(mid, ctC, 0, 0.3)), look: snap(alongPath(mid, ctC, 0, 0.6)) }];
    P.tStage.mid = [snap(alongPath(mid, ctC, 0, 0.55))];
    return P;
  }
  function dustPOS() {
    const P = (c, r) => c2w(c, r);
    return {
      site: { A: P(33, 6), B: P(5, 6) },
      plant: { A: [P(32, 6), P(35, 7), P(31, 4), P(36, 4)], B: [P(6, 6), P(3, 3), P(7, 4), P(2, 6)] },
      ctHold: {
        A: [{ p: P(31, 2), look: P(35, 10) }, { p: P(37, 8), look: P(35, 13) }, { p: P(30, 8), look: P(28, 13) }, { p: P(35, 3), look: P(35, 11) }],
        B: [{ p: P(8, 3), look: P(4, 11) }, { p: P(2, 2), look: P(4, 11) }, { p: P(9, 8), look: P(13, 8) }, { p: P(6, 8), look: P(4, 11) }],
        mid: [{ p: P(19, 6), look: P(19, 20) }, { p: P(16, 8), look: P(19, 13) }],
      },
      tStage: { A: [P(35, 25), P(22, 17), P(36, 27)], B: [P(4, 23), P(13, 20), P(3, 25)], mid: [P(19, 22), P(20, 24)] },
      entries: { A: [P(35, 10), P(28, 11), P(26, 3)], B: [P(4, 10), P(12, 8), P(12, 3)] },
      spawnT: cellsOf('T', (c, r) => r >= 29 && r <= 33 && c >= 15 && c <= 24),
      spawnCT: cellsOf('C', (c, r) => r >= 1 && r <= 4 && c >= 16 && c <= 23),
    };
  }
  function load(id) {
    const info = MAP_LIST.find(m => m.id === id) || MAP_LIST[0];
    GRID = MAP_GRIDS[info.id]; W = GRID[0].length; H = GRID.length;
    OX = -W * CELL / 2; OZ = -H * CELL / 2;
    M.GRID = GRID; M.W = W; M.H = H; M.OX = OX; M.OZ = OZ; M.current = info.id; M.info = info;
    buildBoxes();
    M.POS = info.id === 'dust' ? dustPOS() : autoPOS();
    M.danger = computeDanger();
  }
  // Köşe ve girişler: düşmanın çıkabileceği yerler (botların önceden nişan aldığı noktalar)
  function computeDanger() {
    const out = [], seen = new Set();
    const add = (x, z) => { const k = Math.round(x / 1.5) + ',' + Math.round(z / 1.5); if (seen.has(k)) return; seen.add(k); out.push({ x, z, key: k }); };
    for (let r = 1; r < H - 1; r++) for (let c = 1; c < W - 1; c++) {
      if (!isWalk(c, r)) continue;
      for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        if (cell(c + dx, r + dy) === '#' && isWalk(c + dx, r) && isWalk(c, r + dy)) {
          const p = c2w(c, r);
          add(p.x + dx * 1.5 - dx * 0.6, p.z + dy * 1.5 - dy * 0.6);
        }
      }
    }
    for (const s of ['A', 'B']) for (const e of M.POS.entries[s]) add(e.x, e.z);
    return out;
  }
  function radarImage(px) {
    const cv = document.createElement('canvas'); cv.width = W * px; cv.height = H * px;
    const x = cv.getContext('2d');
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const ch = cell(c, r);
      if (ch === '#') continue;
      x.fillStyle = (ch === 'A' || ch === 'B') ? 'rgba(170,120,90,0.85)' : ch === 'u' ? 'rgba(110,110,110,0.85)' : 'rgba(150,150,150,0.8)';
      if ('xXw'.includes(ch)) x.fillStyle = 'rgba(90,80,70,0.9)';
      x.fillRect(c * px, r * px, px + 0.5, px + 0.5);
    }
    x.font = `bold ${px * 3}px Arial`; x.fillStyle = 'rgba(255,90,60,0.95)'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const s of ['A', 'B']) { const p = M.POS.site[s]; x.fillText(s, (p.x - OX) / CELL * px, (p.z - OZ) / CELL * px); }
    return cv;
  }
  Object.assign(M, { cell, isWalk, c2w, w2c, zoneAt, build, findPath, clearLine, radarImage, nearestWalk, load });
  load((typeof S !== 'undefined' && S.map && S.map !== 'random') ? S.map : 'dust');
  return M;
})();
