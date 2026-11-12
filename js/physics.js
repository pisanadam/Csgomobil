// Çarpışma, ışın testleri, görüş hattı
'use strict';
const Phys = (function () {
  const boxes = MAP.boxes;
  // Işın - AABB (slab). dönüş: t veya -1, normal ekseni
  function rayAABB(ox, oy, oz, dx, dy, dz, mn, mx, maxT) {
    let tmin = 0, tmax = maxT, nAxis = -1, nSign = 0;
    const o = [ox, oy, oz], d = [dx, dy, dz], a = [mn.x, mn.y, mn.z], b = [mx.x, mx.y, mx.z];
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-9) { if (o[i] < a[i] || o[i] > b[i]) return null; }
      else {
        const inv = 1 / d[i];
        let t1 = (a[i] - o[i]) * inv, t2 = (b[i] - o[i]) * inv, s = -1;
        if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1; }
        if (t1 > tmin) { tmin = t1; nAxis = i; nSign = s; }
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) return null;
      }
    }
    return { t: tmin, tExit: tmax, axis: nAxis, sign: nSign };
  }
  // dünya ışını: en yakın kutu
  function raycast(o, d, maxT, skipPen) {
    let best = null;
    for (const b of boxes) {
      if (skipPen && b.pen) continue;
      const h = rayAABB(o.x, o.y, o.z, d.x, d.y, d.z, b.min, b.max, best ? best.t : maxT);
      if (h && (!best || h.t < best.t)) { best = h; best.box = b; }
    }
    // zemin
    if (d.y < -1e-6) {
      const t = -o.y / d.y;
      if (t >= 0 && t < (best ? best.t : maxT)) best = { t, axis: 1, sign: 1, box: null, ground: true };
    }
    if (best) {
      const n = { x: 0, y: 0, z: 0 };
      if (best.axis === 0) n.x = best.sign; else if (best.axis === 1) n.y = best.sign; else if (best.axis === 2) n.z = best.sign;
      best.normal = n;
      best.point = { x: o.x + d.x * best.t, y: o.y + d.y * best.t, z: o.z + d.z * best.t };
    }
    return best;
  }
  // Tüm kesişimler (delme için) sıralı
  function raycastAll(o, d, maxT) {
    const hits = [];
    for (const b of boxes) {
      const h = rayAABB(o.x, o.y, o.z, d.x, d.y, d.z, b.min, b.max, maxT);
      if (h) { h.box = b; hits.push(h); }
    }
    if (d.y < -1e-6) { const t = -o.y / d.y; if (t >= 0 && t < maxT) hits.push({ t, tExit: t, axis: 1, sign: 1, box: null, ground: true }); }
    hits.sort((a, b) => a.t - b.t);
    for (const h of hits) {
      const n = { x: 0, y: 0, z: 0 };
      if (h.axis === 0) n.x = h.sign; else if (h.axis === 1) n.y = h.sign; else if (h.axis === 2) n.z = h.sign;
      h.normal = n; h.point = { x: o.x + d.x * h.t, y: o.y + d.y * h.t, z: o.z + d.z * h.t };
    }
    return hits;
  }
  // a->b arası duvar engeli var mı
  function blocked(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const L = Math.sqrt(dx * dx + dy * dy + dz * dz); if (L < 1e-4) return false;
    const ix = dx / L, iy = dy / L, iz = dz / L;
    for (const bx of boxes) {
      const h = rayAABB(a.x, a.y, a.z, ix, iy, iz, bx.min, bx.max, L);
      if (h && h.t < L) return true;
    }
    return false;
  }
  // segment - küre
  function segSphere(a, b, c, r) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const fx = a.x - c.x, fy = a.y - c.y, fz = a.z - c.z;
    const A = dx * dx + dy * dy + dz * dz, Bq = 2 * (fx * dx + fy * dy + fz * dz), C = fx * fx + fy * fy + fz * fz - r * r;
    if (C < 0) return true;
    const disc = Bq * Bq - 4 * A * C; if (disc < 0) return false;
    const s = Math.sqrt(disc), t1 = (-Bq - s) / (2 * A), t2 = (-Bq + s) / (2 * A);
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
  }
  function raySphere(o, d, c, r, maxT) {
    const fx = o.x - c.x, fy = o.y - c.y, fz = o.z - c.z;
    const b = fx * d.x + fy * d.y + fz * d.z, cc = fx * fx + fy * fy + fz * fz - r * r;
    const disc = b * b - cc; if (disc < 0) return -1;
    const t = -b - Math.sqrt(disc);
    return (t >= 0 && t <= maxT) ? t : -1;
  }
  // AABB çakışması
  function overlap(x0, y0, z0, x1, y1, z1, b) {
    return x0 < b.max.x && x1 > b.min.x && y0 < b.max.y && y1 > b.min.y && z0 < b.max.z && z1 > b.min.z;
  }
  // varlık hareketi: eksen eksen çöz
  const RAD = 0.38;
  function moveBody(e, dx, dy, dz) {
    const h = e.height;
    // X
    e.pos.x += dx;
    for (const b of boxes) {
      if (overlap(e.pos.x - RAD, e.pos.y, e.pos.z - RAD, e.pos.x + RAD, e.pos.y + h, e.pos.z + RAD, b)) {
        // alçak engel: üstüne çık (basamak)
        if (b.max.y - e.pos.y <= 0.36 && canStand(e, b.max.y)) { e.pos.y = b.max.y; continue; }
        if (dx > 0) e.pos.x = b.min.x - RAD - 1e-4; else if (dx < 0) e.pos.x = b.max.x + RAD + 1e-4;
        e.vel.x = 0; e.blocked = true;
      }
    }
    // Z
    e.pos.z += dz;
    for (const b of boxes) {
      if (overlap(e.pos.x - RAD, e.pos.y, e.pos.z - RAD, e.pos.x + RAD, e.pos.y + h, e.pos.z + RAD, b)) {
        if (b.max.y - e.pos.y <= 0.36 && canStand(e, b.max.y)) { e.pos.y = b.max.y; continue; }
        if (dz > 0) e.pos.z = b.min.z - RAD - 1e-4; else if (dz < 0) e.pos.z = b.max.z + RAD + 1e-4;
        e.vel.z = 0; e.blocked = true;
      }
    }
    // Y
    e.pos.y += dy; e.onGround = false;
    if (e.pos.y <= 0) { e.pos.y = 0; if (e.vel.y < 0) e.vel.y = 0; e.onGround = true; }
    for (const b of boxes) {
      if (overlap(e.pos.x - RAD, e.pos.y, e.pos.z - RAD, e.pos.x + RAD, e.pos.y + h, e.pos.z + RAD, b)) {
        if (dy <= 0) { e.pos.y = b.max.y; if (e.vel.y < 0) e.vel.y = 0; e.onGround = true; }
        else { e.pos.y = b.min.y - h - 1e-4; e.vel.y = 0; }
      }
    }
    // zemin kontrolü (kenardan düşme)
    if (!e.onGround && e.vel.y <= 0) {
      for (const b of boxes) {
        if (Math.abs(e.pos.y - b.max.y) < 0.02 && overlap(e.pos.x - RAD, b.max.y - 0.05, e.pos.z - RAD, e.pos.x + RAD, b.max.y + 0.01, e.pos.z + RAD, b)) { e.onGround = true; break; }
      }
    }
  }
  function canStand(e, y) {
    for (const b of boxes) if (overlap(e.pos.x - RAD, y + 0.01, e.pos.z - RAD, e.pos.x + RAD, y + e.height, e.pos.z + RAD, b)) return false;
    return true;
  }
  function headroom(e, h) {
    for (const b of boxes) if (overlap(e.pos.x - RAD, e.pos.y + 0.01, e.pos.z - RAD, e.pos.x + RAD, e.pos.y + h, e.pos.z + RAD, b)) return false;
    return true;
  }
  // Bomba fiziği: nokta-kutu
  function insideBox(p, pad) {
    for (const b of boxes) {
      if (p.x > b.min.x - pad && p.x < b.max.x + pad && p.y > b.min.y - pad && p.y < b.max.y + pad && p.z > b.min.z - pad && p.z < b.max.z + pad) return b;
    }
    return null;
  }
  return { raycast, raycastAll, blocked, segSphere, raySphere, rayAABB, moveBody, headroom, insideBox, RAD };
})();
