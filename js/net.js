// Arkadaşlarla birlikte oyna (aynı Wi-Fi / internet): WebRTC, sunucusuz.
// Oda kurucu (host) maçı, botları, raunt/bomba/ekonomi mantığını yürütür. Katılanlar (client) kendi oyuncularını
// yerelde oynar (hareket, ateş), host'a durum + isabet bildirir; host herkesin durumunu geri yayınlar.
// Bağlantı kodu elle (kopyala-yapıştır) değiştirilir, bu yüzden internetsiz yerel ağda da çalışır.
'use strict';
const Net = {
  role: null,            // null | 'host' | 'client'
  peers: [],             // host: katılımcılar {id,name,pc,r,u,ready,ent}
  link: null,            // client: {pc,r,u}
  myName: 'Oyuncu', started: false, acc: 0, tick: 0,
  pendingStart: null, savedS: null, listeners: [],
  stunOn: true,
  // ---------- imza (signaling) ----------
  newPC() {
    const cfg = { iceServers: this.stunOn ? [{ urls: 'stun:stun.l.google.com:19302' }] : [] };
    return new RTCPeerConnection(cfg);
  },
  waitIce(pc, ms) {
    return new Promise(res => {
      if (pc.iceGatheringState === 'complete') return res();
      let done = false; const fin = () => { if (done) return; done = true; clearTimeout(t); pc.removeEventListener('icegatheringstatechange', ch); res(); };
      const ch = () => { if (pc.iceGatheringState === 'complete') fin(); };
      const t = setTimeout(fin, ms || 3500);
      pc.addEventListener('icegatheringstatechange', ch);
    });
  },
  async pack(desc) {
    const raw = new TextEncoder().encode(JSON.stringify({ t: desc.type, s: desc.sdp }));
    let bytes = raw, pre = 'R';
    if (typeof CompressionStream !== 'undefined') {
      try { const cs = new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))); bytes = new Uint8Array(await cs.arrayBuffer()); pre = 'Z'; } catch (e) { bytes = raw; pre = 'R'; }
    }
    let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
    return 'TO1' + pre + btoa(bin);
  },
  async unpack(code) {
    code = String(code).replace(/\s+/g, '');
    if (!code.startsWith('TO1')) throw new Error('Geçersiz kod');
    const pre = code[3], bin = atob(code.slice(4));
    let bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    if (pre === 'Z') { const ds = new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))); bytes = new Uint8Array(await ds.arrayBuffer()); }
    const o = JSON.parse(new TextDecoder().decode(bytes));
    return { type: o.t, sdp: o.s };
  },
  // ---------- host ----------
  async hostInvite(discId) {
    this.role = 'host'; this.paintMenu();
    const p = { id: ++this.idc, name: 'Arkadaş', pc: this.newPC(), r: null, u: null, ready: false, ent: null, joinCode: '', discId };
    p.r = p.pc.createDataChannel('r');
    p.u = p.pc.createDataChannel('u', { ordered: false, maxRetransmits: 0 });
    p.r.onopen = () => { p.ready = true; this.onPeerOpen(p); };
    p.r.binaryType = 'arraybuffer';
    p.r.onmessage = ev => (typeof ev.data === 'string' ? this.onMsgHost(p, JSON.parse(ev.data)) : this.onBin(ev.data, p));
    p.u.onmessage = ev => { if (typeof ev.data === 'string') this.onMsgHost(p, JSON.parse(ev.data)); };
    p.pc.onconnectionstatechange = () => { const s = p.pc.connectionState; if (s === 'failed' || s === 'closed' || s === 'disconnected') this.onPeerGone(p); };
    this.peers.push(p);
    await p.pc.setLocalDescription(await p.pc.createOffer());
    await this.waitIce(p.pc);
    p.joinCode = await this.pack(p.pc.localDescription);
    return p;
  },
  async hostAccept(p, answerCode) {
    const d = await this.unpack(answerCode);
    if (d.type !== 'answer') throw new Error('Bu bir "cevap" kodu değil');
    await p.pc.setRemoteDescription(d);
  },
  idc: 0,
  readyPeers() { return this.peers.filter(p => p.ready); },
  onPeerOpen(p) { this.lobbyBroadcast(); this.paintMenu(); },
  onPeerGone(p) {
    const i = this.peers.indexOf(p); if (i < 0) return;
    this.peers.splice(i, 1); try { p.pc.close(); } catch (e) {}
    if (p.ent && G.running && p.ent.alive) { G.onKill(p.ent, null, { name: 'bağlantı koptu' }, false); }
    if (p.ent) p.ent.remote = null;
    if (G.running && typeof UI !== 'undefined') UI.toast(`${p.name} oyundan ayrıldı`, 2.5);
    this.lobbyBroadcast(); this.paintMenu();
  },
  lobbyBroadcast() { const names = [this.hostName || 'Oda kurucu'].concat(this.readyPeers().map(p => p.name)); this.sendAll({ t: 'lobby', names }); },
  // ---------- client ----------
  async join(offerCode, name) {
    if (this.role === 'host') throw new Error('Önce odanı kapat');
    this.myName = name || 'Oyuncu'; this.role = 'client';
    const d = await this.unpack(offerCode);
    if (d.type !== 'offer') throw new Error('Bu bir "davet" kodu değil');
    const pc = this.newPC(); const L = this.link = { pc, r: null, u: null, open: false };
    pc.ondatachannel = ev => {
      const ch = ev.channel; L[ch.label] = ch;
      ch.binaryType = 'arraybuffer';
      ch.onmessage = e => (typeof e.data === 'string' ? this.onMsgClient(JSON.parse(e.data)) : this.onBin(e.data, L));
      if (ch.label === 'r') ch.onopen = () => { L.open = true; this.send(L.r, { t: 'hello', name: this.myName }); this.paintMenu(); };
    };
    pc.onconnectionstatechange = () => { const s = pc.connectionState; if (s === 'failed' || s === 'closed' || s === 'disconnected') this.onHostGone(); };
    await pc.setRemoteDescription(d);
    await pc.setLocalDescription(await pc.createAnswer());
    await this.waitIce(pc);
    return await this.pack(pc.localDescription);
  },
  onHostGone() {
    if (this.role !== 'client' || !this.link) return;
    const was = G.running; this.leave();
    if (was) { UI.quit(); }
    alert('Oda kurucu ile bağlantı koptu.');
  },
  leave() {
    try { this.sendAll({ t: 'bye' }); } catch (e) {}
    for (const p of this.peers) { try { p.pc.close(); } catch (e) {} if (p.ent) p.ent.remote = null; }
    this.peers = [];
    if (this.link) { try { this.link.pc.close(); } catch (e) {} this.link = null; }
    this.removeLimits();
    if (this.role === 'client') this.restoreS();
    this.role = null; this.started = false; this.pendingStart = null;
    this.paintMenu();
  },
  restoreS() { if (this.savedS) { Object.assign(S, this.savedS); this.savedS = null; } },
  // ---------- gönderme ----------
  send(ch, o) { try { if (ch && ch.readyState === 'open') ch.send(JSON.stringify(o)); } catch (e) {} },
  sendAll(o, except) { for (const p of this.peers) if (p.ready && p !== except) this.send(p.r, o); },
  sendAllU(o) { for (const p of this.peers) if (p.ready) this.send(p.u, o); },
  toHost(o, unrel) { if (this.link) this.send(unrel ? this.link.u : this.link.r, o); },
  // Çok oyunculuda yardımlar en fazla "orta" düzeyde: nişan/tarama yardımı <= 2, hile simülasyonu sınırlı
  assist(v) { return (this.role && this.started) ? Math.min(v, 2) : v; },
  applyLimits() {
    if (this.savedC) return;
    const c = Cheats.c; this.savedC = Object.assign({}, c);
    for (const k of ['god', 'ammo', 'speed', 'norecoil', 'nospread', 'spin', 'third', 'radar', 'chams']) c[k] = false;
    c.aimWalls = false; c.espLines = false;
    c.aimFov = Math.min(c.aimFov, 10); c.aimSmooth = Math.max(c.aimSmooth, 0.5);
    c.trigDelay = Math.max(c.trigDelay, 80);
    if (Cheats.any()) UI.toast('Çok oyunculu: yardımlar en fazla orta düzey (duvar ardı/hile sınırlandı)', 4);
  },
  removeLimits() { if (this.savedC) { Object.assign(Cheats.c, this.savedC); this.savedC = null; } },
  nid(e) { return e.nid !== undefined ? e.nid : e.id; },
  byNid(n) { return G.entities.find(e => this.nid(e) === n); },
  // ---------- host: maça oyuncu ekle (G.startMatch içinden çağrılır) ----------
  // Parti modları: coop = hepsi kurucu ile aynı takımda botlara karşı; teams = arkadaşlar iki takıma bölünür;
  // duel = 1v1 (kurucu ve ilk arkadaş, botsuz); ffa = herkes herkese ölüm kalım
  hostAddPlayers(names) {
    const peers = this.readyPeers();
    let mode = S.netMode || 'coop', bots = S.netBots !== false;
    if (mode === 'duel') { bots = false; if (peers.length > 1) mode = 'teams'; }
    if (mode === 'teams' || mode === 'ffa') { /* bots ayarı geçerli */ }
    if (mode === 'coop') bots = true;
    const humans = [0 /* kurucu: grup 0 */];
    peers.forEach((p, i) => {
      const g = mode === 'coop' ? 0 : (mode === 'duel' ? 1 : (i % 2 === 0 ? 1 : 0));
      const side = G.sideOfGroup[g];
      const e = new Entity(p.name, side, false); e.group = g; e.remote = p; e.protectUntil = 0; p.ent = e;
      G.entities.push(e); humans.push(g);
    });
    // botları yerleştir: her tarafta (takım boyutu - insan sayısı) bot kalır; botsuz modda hiç kalmaz
    for (const g of [0, 1]) {
      const side = G.sideOfGroup[g], nh = humans.filter(x => x === g).length;
      const mine = G.entities.filter(x => !x.isPlayer && !x.remote && x.bot && x.team === side);
      const keep = bots ? Math.max(0, Math.min(mine.length, (g === 0 ? S.teamSize : S.teamSize) - nh)) : 0;
      for (const old of mine.slice(keep)) { G.entities.splice(G.entities.indexOf(old), 1); G.bots.splice(G.bots.indexOf(old.bot), 1); }
    }
    for (const e of G.entities) e.nid = e.id;
  },
  // ---------- şarkı paylaşımı (katalog dışı yüklenen müzik) ----------
  songs: new Map(), songQ: Promise.resolve(),
  async mySong() {
    if (!Music.url) return null;
    try {
      const blob = await (await fetch(Music.url)).blob();
      if (blob.size > 8e6) { UI.toast('Müzik dosyan 8 MB\'tan büyük, arkadaşlara gönderilmedi', 3); return null; }
      return { blob, name: Music.name || 'müzik', start: S.mvpStart || 0, len: S.mvpLen || 9 };
    } catch (e) { return null; }
  },
  sendSongTo(ch, owner, rec) {
    this.songQ = this.songQ.then(async () => {
      if (!ch || ch.readyState !== 'open') return;
      ch.send(JSON.stringify({ t: 'songh', o: owner, name: rec.name, size: rec.blob.size, start: rec.start, len: rec.len }));
      const buf = new Uint8Array(await rec.blob.arrayBuffer());
      for (let i = 0; i < buf.length; i += 16000) { while (ch.bufferedAmount > 1e6) await new Promise(r => setTimeout(r, 25)); ch.send(buf.slice(i, i + 16000)); }
      ch.send(JSON.stringify({ t: 'songe', o: owner }));
    }).catch(() => {});
  },
  async shareMySong() {
    const rec = await this.mySong(); if (!rec) return;
    if (this.role === 'host') { const me = Net.nid(G.player); this.songs.set(me, Object.assign({ url: URL.createObjectURL(rec.blob) }, rec)); for (const p of this.readyPeers()) this.sendSongTo(p.r, me, rec); }
    else if (this.role === 'client' && this.link) this.sendSongTo(this.link.r, this.myNid, rec);
  },
  onBin(buf, holder) { if (holder.rx) { holder.rx.chunks.push(buf); holder.rx.got += buf.byteLength; } },
  songHeader(holder, m) { holder.rx = { o: m.o, name: m.name, size: m.size, start: m.start, len: m.len, chunks: [], got: 0 }; },
  songDone(holder, m, from) {
    const rx = holder.rx; holder.rx = null; if (!rx || rx.o !== m.o || rx.got !== rx.size) return;
    if (from && from.ent && from.ent.nid !== rx.o) return;       // sahte sahip
    const blob = new Blob(rx.chunks, { type: 'audio/mpeg' });
    const old = this.songs.get(rx.o); if (old && old.url) URL.revokeObjectURL(old.url);
    const rec = { blob, name: rx.name, start: rx.start, len: rx.len, url: URL.createObjectURL(blob) };
    this.songs.set(rx.o, rec);
    if (this.role === 'host') for (const p of this.readyPeers()) if (p !== from) this.sendSongTo(p.r, rx.o, rec);   // diğer arkadaşlara ilet
  },
  afterStartMatch() {
    this.started = true; this.applyLimits();
    const ents = G.entities.map(e => ({ n: e.nid, name: e.isPlayer ? (this.hostName || 'Oda kurucu') : e.name, team: e.team, g: e.group, human: !!e.remote || e.isPlayer }));
    const cfg = { map: MAP.current, mode: S.mode, maxRounds: S.maxRounds, dmTime: S.dmTime, teamSize: S.teamSize, friendlyFire: !!S.friendlyFire, c4Time: S.c4Time, roundTime: S.roundTime, freezeTime: S.freezeTime, startMoney: S.startMoney };
    for (const p of this.readyPeers()) {
      this.send(p.r, { t: 'start', cfg, ents, me: p.ent.nid, sog: G.sideOfGroup, dm: G.dm, FREEZE: G.FREEZE, ROUND_TIME: G.ROUND_TIME, BOMB_TIME: G.BOMB_TIME, start: ECON.start });
    }
    this.sendRound(false);
    this.shareMySong();
  },
  sendRound(swap) {
    const R = G.round, B = G.bomb;
    const es = G.entities.map(e => [e.nid, +e.pos.x.toFixed(2), +e.pos.z.toFixed(2), +e.yaw.toFixed(3), e.team, e.inv.bomb ? 1 : 0]);
    this.sendAll({ t: 'round', num: R.num, phase: R.phase, timer: R.timer, tl: R.timeLeft, bl: R.buyLeft, plan: R.plan, score: G.score, sog: G.sideOfGroup, swap: !!swap, es, dm: G.dm, pistol: R.num === 1 || R.num === G.halfRounds() + 1, ls: G.lossStreak });
  },
  // ---------- host: gelen mesajlar ----------
  onMsgHost(p, m) {
    const e = p.ent;
    switch (m.t) {
      case 'songh': this.songHeader(p, m); break;
      case 'songe': this.songDone(p, m, p); break;
      case 'hello': p.name = String(m.name || 'Arkadaş').slice(0, 14); this.send(p.r, { t: 'welcome', id: p.id }); this.lobbyBroadcast(); this.paintMenu(); break;
      case 'st': if (e && G.running) this.applyRemoteState(e, m); break;
      case 'shot': if (e && e.alive && G.running) { const def = WEAPONS[m.w]; if (def) { e.lastShot = G.now; G.onShot(e, def); } } break;
      case 'hit': this.hostHit(p, m); break;
      case 'selfdmg': if (e && e.alive && G.running) { e.takeDamage(m.d, null, null, 'fall', null, G.now); if (!e.alive) G.onKill(e, e, null, false); } break;
      case 'nade': if (e && e.alive && G.running) { const nd = this.spawnNade(e, m.id, m.p, m.v); this.sendAll({ t: 'nade', o: e.nid, id: m.id, p: m.p, v: m.v }, p); } break;
      case 'plant': if (e && e.alive && e.team === 'T' && G.round.phase === 'live' && G.bomb.state !== 'planted') { e.inv.bomb = true; G.plantBomb(e); } break;
      case 'defuse': if (e && e.alive && e.team === 'CT' && G.bomb.state === 'planted' && G.round.phase !== 'end') {
        const B = G.bomb; B.state = 'defused'; B.defuser = null; G.addMoney(e, ECON.defuseReward); B.defusedBy = e; Audio3.defused(B.pos); G.endRound('CT', 'defuse');
      } break;
      case 'dropbomb': if (e && e.inv.bomb) { e.inv.bomb = false; G.bomb.state = 'dropped'; G.bomb.carrier = null; G.bomb.pos = { x: m.x, y: 0, z: m.z }; G.bombMesh.visible = true; G.bombMesh.position.set(m.x, 0.07, m.z); } break;
    }
  },
  applyRemoteState(e, m) {
    if (!e.alive) return;
    e._tp = { x: m.x, y: m.y, z: m.z, yaw: m.yaw, pitch: m.pitch };
    e.vel.x = m.vx; e.vel.z = m.vz; e.vel.y = 0; e.onGround = !!m.g;
    e.crouchT = m.c; e.armor = m.a; e.helmet = !!m.h; e.kit = !!m.k; e.money = m.m; e.input.walk = !!m.wk;
    e.plantT = m.pl ? 1 : 0;
    if (G.now > (e.bombSync || 0)) e.inv.bomb = !!m.b;
    if (e.cw !== m.w && WEAPONS[m.w]) {
      e.cw = m.w; const def = WEAPONS[m.w];
      if (def.slot === 'primary' || def.slot === 'secondary') e.inv[def.slot] = { def, mag: def.mag, reserve: def.reserve, sil: true, burst: false };
      if (def.slot === 'grenade') e.inv.grenades = [def.id];
      e.slot = def.slot === 'knife' ? 'knife' : def.slot;
      if (e.model) Models.setCharGun(e.model, def);
    }
  },
  hostHit(p, m) {
    const att = p.ent, v = this.byNid(m.v);
    if (!att || !att.alive || !v || !v.alive || v === att || !G.running) return;
    if (G.ally(v, att) && !S.friendlyFire) return;
    if (G.round.phase === 'freeze') return;
    const def = WEAPONS[m.w] || WEAPONS.knife;
    const dmg = Math.max(0, Math.min(999, +m.d || 0));
    const wasAlive = v.alive;
    const dir = { x: 0, y: 0, z: 0 };
    v.takeDamage(dmg, att, def, m.g, dir, G.now);
    FX.blood({ x: v.pos.x, y: v.pos.y + v.height * 0.7, z: v.pos.z }, dir, m.g === 'head');
    if (v.bot) v.bot.onDamaged(att, G.now);
    if (!v.isPlayer && !v.remote && v.alive) Audio3.voice(v.pos, 'pain', v.id * 0.37);
    if (v.isPlayer) G.onPlayerHurt(att, dmg);
    if (wasAlive && !v.alive) G.onKill(v, att, def, m.g === 'head', !!m.wb);
  },
  spawnNade(owner, id, pos, vel) {
    const def = WEAPONS[id]; if (!def) return null;
    const mesh = Models.gun(def); mesh.scale.set(1.3, 1.3, 1.3);
    mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
    G.scene.add(mesh);
    const nd = { def, owner: owner, team: owner.team, t: 0, mesh, still: 0, pos: { x: pos.x, y: pos.y, z: pos.z }, vel: { x: vel.x, y: vel.y, z: vel.z } };
    G.nades.push(nd); Audio3.nadeThrow(owner.isPlayer ? null : owner.pos);
    return nd;
  },
  // ---------- client: gelen mesajlar ----------
  onMsgClient(m) {
    switch (m.t) {
      case 'welcome': this.paintMenu(); break;
      case 'lobby': this.lobbyNames = m.names; this.paintMenu(); break;
      case 'songh': this.songHeader(this.link, m); break;
      case 'songe': this.songDone(this.link, m, null); break;
      case 'bye': { const was = G.running; this.leave(); if (was) UI.quit(); alert('Oda kapatıldı.'); break; }
      case 'start': this.pendingStart = m; if (!G.running || G.matchOver) UI.play(); else UI.play(); break;
      case 'round': if (G.running) this.applyRound(m); break;
      case 's': if (G.running) this.applySnap(m); break;
      case 'kill': if (G.running) this.applyKill(m); break;
      case 'hurt': if (G.running) this.applyHurt(m); break;
      case 'money': { const p = G.player; if (p) p.money = Math.max(0, Math.min(ECON.max, p.money + m.d)); break; }
      case 'shot': if (G.running) this.applyShot(m); break;
      case 'nade': if (G.running) { const o = this.byNid(m.o); if (o && o !== G.player) this.spawnNade(o, m.id, m.p, m.v); } break;
      case 'respawn': if (G.running && G.player) { const p = G.player; G.respawn(p); } break;
      case 'give': if (G.player && m.bomb) { G.player.inv.bomb = true; UI.toast('Bombayı aldın', 1.5); } break;
      case 'end': if (G.running) this.applyEnd(m); break;
      case 'matchend': { const st = m.st || []; for (const a of st) { const e = this.byNid(a[0]); if (e) e.stats = a[1]; } G.score = m.score; G.running = false; G.matchOver = true; UI.matchEnd(m.score[0], m.score[1]); break; }
      case 'boom': FX.explosion(G.bomb.pos, true); Audio3.explosion(G.bomb.pos, true); G.bombMesh.visible = false; G.shake = 1.5; break;
    }
  },
  clientStart(m) {
    // host ayarlarını geçici uygula (maç bitince geri yüklenir)
    if (!this.savedS) { this.savedS = {}; for (const k in m.cfg) this.savedS[k] = S[k]; }
    Object.assign(S, m.cfg);
    for (const e of G.entities) if (e.model) G.disposeModel(e.model);
    for (const p of G.pickups) G.scene.remove(p.mesh);
    G.entities = []; G.bots = []; G.pickups = []; G.nades.forEach(n => G.scene.remove(n.mesh)); G.nades = [];
    G.aim = false; Trainer.cleanup();
    G.loadMap(m.cfg.map);
    G.sideOfGroup = m.sog; G.score = [0, 0]; G.lossStreak = { T: 0, CT: 0 };
    G.dm = m.dm; G.ffa = m.dm; G.FREEZE = m.FREEZE; G.ROUND_TIME = m.ROUND_TIME; G.BOMB_TIME = m.BOMB_TIME; ECON.start = m.start;
    document.body.classList.toggle('hudclassic', S.hudStyle === 'classic');
    this.myNid = m.me; this.applyLimits();
    for (const d of m.ents) {
      const mine = d.n === m.me;
      const e = new Entity(mine ? this.myName : d.name, d.team, mine); e.group = d.g; e.nid = d.n; e.human = d.human;
      G.entities.push(e); if (mine) G.player = e;
    }
    for (const e of G.entities) G.makeModel(e);
    G.round.num = 0; G.running = true; G.paused = false; G.matchOver = false; this.started = true;
    UI.onMatchStart(); Audio3.ambStart(MAP.info.theme);
    G.bomb = { state: 'none', carrier: null, pos: { x: 0, y: -100, z: 0 }, timer: 0, defuser: null, beepT: 0, site: null };
    this.lastBombState = 'none'; this.snapT = 0; G.now = 0;
    this.songs.clear(); this.shareMySong();
  },
  applyRound(m) {
    const R = G.round;
    R.num = m.num; R.phase = m.phase; R.timer = m.timer; R.timeLeft = m.tl; R.buyLeft = m.bl; R.plan = m.plan; R.endReason = null; R.winner = null;
    G.score = m.score; G.sideOfGroup = m.sog; G.lossStreak = m.ls || G.lossStreak;
    FX.clearAll();
    for (const p of G.pickups) G.scene.remove(p.mesh); G.pickups = [];
    for (const n of G.nades) G.scene.remove(n.mesh); G.nades = [];
    G.know.T.clear(); G.know.CT.clear();
    if (m.swap) {
      for (const e of G.entities) { e.team = G.sideOfGroup[e.group]; if (e.isPlayer) { e.money = ECON.start; } e.resetForDeath(); G.makeModel(e); }
      if (G.vm) G.vm.team = null;
      UI.toast('DEVRE ARASI — Taraflar değişti', 3);
    }
    for (const a of m.es) {
      const e = this.byNid(a[0]); if (!e) continue;
      e.team = a[4];
      e.pos.x = a[1]; e.pos.y = 0; e.pos.z = a[2]; e.vel.x = e.vel.y = e.vel.z = 0; e.yaw = a[3]; e.pitch = 0; e._tp = null;
      e.alive = true; e.hp = 100; e.deathT = 0; e.flashT = 0; e.crouch = 0; e.height = STAND_H; e.plantT = 0; e.defuseT = 0;
      e.recoilIdx = 0; e.fireInacc = 0; e.punch.x = e.punch.y = 0; e.scoped = 0; e.reloadT = 0; e.zoomed = false; e.burstLeft = 0; e.nextFire = 0; e.roundKills = 0;
      e.dmgBy.clear(); e.trig = false; e.bought = []; e.protectUntil = 0;
      if (e.isPlayer) {
        e.inv.bomb = !!a[5];
        if (!e.inv.secondary) e.giveWeapon(e.team === 'T' ? 'glock' : 'usp');
        for (const s of ['primary', 'secondary']) { const w = e.inv[s]; if (w) { w.mag = w.def.mag; w.reserve = w.def.reserve; } }
        e.slot = e.bestSlot(); e.deployT = 0; e.onEquip();
      } else { e.cw = null; e.inv = { primary: null, secondary: null, knife: { def: WEAPONS.knife }, grenades: [], bomb: false }; }
      if (e.model) { e.model.root.rotation.set(0, e.yaw, 0); e.model.root.visible = !e.isPlayer; }
    }
    if (m.dm) { G.bomb = { state: 'none', carrier: null, pos: { x: 0, y: -100, z: 0 }, timer: 0, defuser: null, beepT: 0, site: null }; G.bombMesh.visible = false; G.bombLight.intensity = 0; G.dmLoadout(G.player); G.player.protectUntil = 0; }
    else { G.bomb = { state: 'carried', carrier: null, pos: { x: 0, y: 0, z: 0 }, timer: G.BOMB_TIME, defuser: null, beepT: 0, site: null }; G.bombMesh.visible = false; G.bombLight.intensity = 0; }
    this.lastBombState = G.bomb.state;
    G.spec = null; UI.cache.slots = null;
    UI.onRoundStart(m.num, m.pistol); Audio3.roundStart();
  },
  applyEnd(m) {
    const R = G.round; R.phase = 'end'; R.timer = G.END_TIME; R.winner = m.win; R.endReason = m.reason; G.score = m.score;
    const mvp = m.mvp !== undefined && m.mvp !== null ? this.byNid(m.mvp) : null;
    const pw = m.win === G.player.team;
    const ms = m.ms; let played = false;
    if (ms && S.mvpWhen !== 'off') {
      if (ms.o !== undefined) { if (ms.o === this.myNid) played = Music.play(); else { const r = this.songs.get(ms.o); if (r) played = Music.play(r.len, r.url, r.start); } }
      else if (ms.a && S.botMusic !== 'off') { BotSongs.resolve(ms.a, ms.t).then(info => { if (info) Music.play(10, info.url, 4); }); played = true; }
    }
    if (!played) Audio3.roundEnd(pw);
    UI.roundEnd(m.win, m.reason, pw, mvp, m.why || '', null);
  },
  applyShot(m) {
    const e = this.byNid(m.n); if (!e || e === G.player || !e.alive) return;
    const def = WEAPONS[m.w]; if (!def) return;
    Audio3.shot(def, e.eye(), !!m.sil); FX.muzzleFlash3P(G.muzzleWorld(e)); e.lastShot = G.now;
  },
  applyHurt(m) {
    const p = G.player; if (!p || !p.alive) return;
    p.hp = m.hp; p.armor = m.ar;
    const att = m.a !== undefined && m.a !== null ? this.byNid(m.a) : null;
    G._netHurt = true; G.onPlayerHurt(att, m.d); G._netHurt = false;
  },
  applyKill(m) {
    const v = this.byNid(m.v), k = m.k !== undefined && m.k !== null ? this.byNid(m.k) : null;
    if (!v) return;
    if (m.sv) v.stats = m.sv; if (k && m.sk) k.stats = m.sk;
    const def = (m.w && WEAPONS[m.w]) || (m.wn ? { name: m.wn } : null);
    v.alive = false; v.hp = 0; v.deathDir = Math.random() < 0.5 ? 1 : -1; v.plantT = 0; v.defuseT = 0;
    if (!v.isPlayer) Audio3.death(v.pos);
    UI.killfeed(k && k !== v ? k : null, v, def, !!m.hs, !!m.wb);
    v.resetForDeath(); if (v.model) Models.setCharGun(v.model, null);
    if (v.isPlayer) { UI.onPlayerDeath(k); G.spec = null; }
  },
  applySnap(m) {
    const R = G.round, B = G.bomb;
    if (R.phase !== m.ph) { if (m.ph === 'live') UI.message('', 0); R.phase = m.ph; }
    R.timer = m.tm; R.timeLeft = m.tl; R.buyLeft = m.bl; G.score = m.sc;
    const b = m.bs;
    if (b.st !== this.lastBombState) {
      if (b.st === 'planted') { G.bombMesh.visible = true; G.bombMesh.position.set(b.x, b.y + 0.07, b.z); UI.toast('BOMBA KURULDU!', 3, 'warn'); Audio3.beep({ x: b.x, y: b.y, z: b.z }, true); B.beepT = 0; }
      else if (b.st === 'dropped') { G.bombMesh.visible = true; G.bombMesh.position.set(b.x, 0.07, b.z); }
      else if (b.st === 'carried' || b.st === 'none') G.bombMesh.visible = false;
      else if (b.st === 'defused') { G.bombMesh.visible = true; Audio3.defused({ x: b.x, y: b.y, z: b.z }); }
      this.lastBombState = b.st;
    }
    B.state = b.st; B.pos.x = b.x; B.pos.y = b.y; B.pos.z = b.z; B.timer = b.tm; B.defuser = b.df ? this.byNid(b.df) : null;
    const now = G.now;
    for (const a of m.e) {
      const e = this.byNid(a[0]); if (!e || e === G.player) continue;
      e._tp = { x: a[1], y: a[2], z: a[3], yaw: a[4], pitch: a[5] };
      e.vel.x = a[6]; e.vel.z = a[7]; e.crouchT = a[8]; e.alive = !!a[9]; e.hp = a[10];
      if (a[11] && e.cw !== a[11] && WEAPONS[a[11]]) { e.cw = a[11]; if (e.model && e.alive) Models.setCharGun(e.model, WEAPONS[a[11]]); }
      if (a[12]) e.spottedUntil = Math.max(e.spottedUntil, now + 0.3);
      e.team = a[13];
    }
    if (m.st) for (const a of m.st) { const e = this.byNid(a[0]); if (e && e !== G.player) e.stats = a[1]; else if (e) e.stats = a[1]; }
  },
  // ---------- döngü kancaları ----------
  // host: her kare (G.update sonunda)
  hostTick(dt) {
    if (!this.started) return;
    this.acc += dt; if (this.acc < 0.05) return; this.acc = 0; this.tick++;
    const R = G.round, B = G.bomb;
    const es = G.entities.map(e => [this.nid(e), +e.pos.x.toFixed(2), +e.pos.y.toFixed(2), +e.pos.z.toFixed(2), +e.yaw.toFixed(3), +e.pitch.toFixed(3), +e.vel.x.toFixed(2), +e.vel.z.toFixed(2), +e.crouch.toFixed(2), e.alive ? 1 : 0, Math.round(e.hp), e.alive ? e.def.id : 0, e.spottedUntil > G.now ? 1 : 0, e.team]);
    const msg = { t: 's', ph: R.phase, tm: +R.timer.toFixed(2), tl: +R.timeLeft.toFixed(2), bl: +R.buyLeft.toFixed(2), sc: G.score, e: es, bs: { st: B.state, x: B.pos.x, y: B.pos.y || 0, z: B.pos.z, tm: +B.timer.toFixed(2), df: B.defuser ? this.nid(B.defuser) : 0 } };
    if (this.tick % 20 === 0) msg.st = G.entities.map(e => [this.nid(e), e.stats]);
    this.sendAllU(msg);
  },
  // host: uzak oyuncu eşitleme (hareket yumuşatma + adım sesi)
  hostRemote(e, dt) {
    if (e._tp) {
      const k = Math.min(1, dt * 16), t = e._tp;
      e.pos.x += (t.x - e.pos.x) * k; e.pos.y += (t.y - e.pos.y) * k; e.pos.z += (t.z - e.pos.z) * k;
      e.yaw += angDiff(e.yaw, t.yaw) * k; e.pitch += (t.pitch - e.pitch) * k;
    }
    this.crouchSync(e, dt);
    const hs = e.hspeed();
    if (e.onGround && hs > 3.0 && !e.input.walk && e.crouch < 0.5) { e.stepAcc += hs * dt; if (e.stepAcc > 2.3) { e.stepAcc = 0; G.onFootstep(e); } }
  },
  crouchSync(e, dt) { const t = e.crouchT === undefined ? 0 : e.crouchT; e.crouch += (t - e.crouch) * Math.min(1, dt * 14); e.height = STAND_H - (STAND_H - CROUCH_H) * e.crouch; },
  // client: tüm döngü (G.update yerine)
  clientUpdate(dt) {
    G.now += dt; const now = G.now, R = G.round, p = G.player;
    if (R.phase === 'freeze') { R.timer -= dt; R.buyLeft -= dt; }
    else if (R.phase === 'live' || R.phase === 'planted') { R.buyLeft -= dt; if (R.phase === 'live') R.timeLeft -= dt; }
    else if (R.phase === 'end') R.timer -= dt;
    const frozen = R.phase === 'freeze';
    for (const e of G.entities) {
      if (e === p) {
        if (!e.alive) { G.animateDeath(e, dt); continue; }
        if (frozen) { e.input.fwd = e.input.side = 0; e.input.jump = false; e.trig = false; }
        e.updateMovement(dt); e.updateWeapon(dt, now); G.updatePlantDefuse(e, dt); G.updateModel(e, dt);
        continue;
      }
      if (!e.alive) { G.animateDeath(e, dt); continue; }
      if (e._tp) {
        const k = Math.min(1, dt * 16), t = e._tp;
        e.pos.x += (t.x - e.pos.x) * k; e.pos.y += (t.y - e.pos.y) * k; e.pos.z += (t.z - e.pos.z) * k;
        e.yaw += angDiff(e.yaw, t.yaw) * k; e.pitch += (t.pitch - e.pitch) * k;
      }
      this.crouchSync(e, dt);
      const hs = e.hspeed();
      if (hs > 3.0 && e.crouch < 0.5 && !e.input.walk) { e.stepAcc += hs * dt; if (e.stepAcc > 2.3) { e.stepAcc = 0; Audio3.footstep(e.pos, G.ally(e, p) ? 0.5 : 1); } }
      if (e.flashT > 0) e.flashT -= dt;
      G.updateModel(e, dt);
    }
    G.updateNades(dt);
    // bomba bip sesi (görsel)
    const B = G.bomb;
    if (B.state === 'planted' && R.phase !== 'end') {
      B.timer -= dt; B.beepT -= dt;
      if (B.beepT <= 0) { B.beepT = Math.max(0.12, Math.min(1.0, B.timer / 40)); Audio3.beep(B.pos, B.timer < 10); G.bombLight.position.set(B.pos.x, B.pos.y + 0.4, B.pos.z); G.bombLight.intensity = 2; } else G.bombLight.intensity *= 0.85;
    } else G.bombLight.intensity = 0;
    G.updatePlayerAssist(dt);
    if (!p.alive && (!G.spec || !G.spec.alive)) G.spec = G.entities.find(e => e.alive && e !== p && G.ally(e, p)) || G.entities.find(e => e.alive) || null;
    // kendi durumunu host'a yolla (20 Hz)
    this.acc += dt; if (this.acc >= 0.05) {
      this.acc = 0;
      const w = p.alive ? p.def.id : 0;
      this.toHost({ t: 'st', x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2), yaw: +p.yaw.toFixed(3), pitch: +p.pitch.toFixed(3), vx: +p.vel.x.toFixed(2), vz: +p.vel.z.toFixed(2), c: +p.crouch.toFixed(2), g: p.onGround ? 1 : 0, w, a: Math.round(p.armor), h: p.helmet ? 1 : 0, k: p.kit ? 1 : 0, m: p.money, wk: p.input.walk ? 1 : 0, pl: p.plantT > 0 ? 1 : 0, b: p.inv.bomb ? 1 : 0 }, true);
    }
  },
  // ---------- menü paneli ----------
  lobbyNames: [],
  paintMenu() {
    const st = document.getElementById('netState'); if (!st) return;
    let txt = 'Bağlı değilsin';
    if (this.role === 'host') txt = `Oda kurucusun • bağlı arkadaş: ${this.readyPeers().length}`;
    else if (this.role === 'client') txt = this.link && this.link.open ? `Odaya bağlısın (${(this.lobbyNames || []).join(', ')}) — oda kurucunun maçı başlatmasını bekle` : 'Bağlanılıyor… (cevap kodunu oda kurucuya gönderdin mi?)';
    st.textContent = txt;
    const play = document.getElementById('btnPlay');
    if (play) { play.disabled = this.role === 'client'; play.textContent = this.role === 'client' ? '⏳ Oda kurucu bekleniyor' : '▶ OYNA'; }
  },
};

// ---------- G / UI sarmalayıcıları (host yayını, client istekleri) ----------
(function () {
  const wrap = (o, k, fn) => { const orig = o[k]; o[k] = function () { return fn.call(this, orig, arguments); }; };
  const hostOn = () => Net.role === 'host' && Net.started && Net.readyPeers().length > 0;
  wrap(G, 'startMatch', function (orig, a) {
    Net.started = false;
    const modeBefore = S.mode; const force = Net.role === 'host' && Net.readyPeers().length && S.netMode === 'ffa' && S.mode !== 'aim';
    if (force) S.mode = 'dm';
    let r; try { r = orig.apply(this, a); } finally { if (force) { Net._modeRestore = modeBefore; } }
    if (Net.role === 'host' && !this.aim && Net.readyPeers().length) { Net.lastSog0 = G.sideOfGroup[0]; Net.afterStartMatch(); }
    if (Net._modeRestore) { S.mode = Net._modeRestore; Net._modeRestore = null; }
    return r;
  });
  wrap(G, 'startRound', function (orig, a) {
    const r = orig.apply(this, a);
    if (hostOn()) {
      const swap = Net.lastSog0 !== G.sideOfGroup[0]; Net.lastSog0 = G.sideOfGroup[0];
      for (const p of Net.readyPeers()) if (p.ent) p.ent.bombSync = G.now + 1.0;
      Net.sendRound(swap);
    }
    return r;
  });
  wrap(G, 'onKill', function (orig, a) {
    const r = orig.apply(this, a);
    if (hostOn()) {
      const [v, k, def, hs, wb] = a;
      Net.sendAll({ t: 'kill', v: Net.nid(v), k: k && k !== v ? Net.nid(k) : null, w: def && def.id, wn: def && !def.id ? def.name : null, hs: !!hs, wb: !!wb, sv: v.stats, sk: k && k !== v ? k.stats : null });
    }
    return r;
  });
  wrap(G, 'addMoney', function (orig, a) {
    const e = a[0], b = e.money; const r = orig.apply(this, a);
    if (e.remote && hostOn() && e.money !== b) Net.send(e.remote.r, { t: 'money', d: e.money - b });
    return r;
  });
  wrap(G, 'respawn', function (orig, a) {
    const r = orig.apply(this, a);
    if (hostOn() && a[0].remote) Net.send(a[0].remote.r, { t: 'respawn' });
    return r;
  });
  wrap(G, 'onShot', function (orig, a) {
    const r = orig.apply(this, a);
    const e = a[0], def = a[1];
    if (hostOn()) Net.sendAll({ t: 'shot', n: Net.nid(e), w: def.id, sil: e.isSilenced() ? 1 : 0 }, e.remote || undefined);
    else if (Net.role === 'client' && e.isPlayer) Net.toHost({ t: 'shot', w: def.id });
    return r;
  });
  wrap(G, 'throwGrenade', function (orig, a) {
    const n0 = G.nades.length, e = a[0]; const r = orig.apply(this, a);
    if (G.nades.length > n0) {
      const nd = G.nades[G.nades.length - 1];
      const pl = { id: nd.def.id, p: { x: +nd.pos.x.toFixed(2), y: +nd.pos.y.toFixed(2), z: +nd.pos.z.toFixed(2) }, v: { x: +nd.vel.x.toFixed(2), y: +nd.vel.y.toFixed(2), z: +nd.vel.z.toFixed(2) } };
      if (hostOn()) Net.sendAll(Object.assign({ t: 'nade', o: Net.nid(e) }, pl));
      else if (Net.role === 'client' && e.isPlayer) Net.toHost(Object.assign({ t: 'nade' }, pl));
    }
    return r;
  });
  wrap(UI, 'roundEnd', function (orig, a) {
    if (hostOn()) {
      const [win, reason, pw, mvp, why, song] = a; const cs = Net.curSong; Net.curSong = null;
      let ms = null;
      if (cs) ms = cs; else if (song && song.own) ms = { o: Net.nid(G.player) }; else if (song && mvp && mvp.song) ms = { a: mvp.song.a, t: mvp.song.t };
      Net.sendAll({ t: 'end', win, reason, mvp: mvp ? Net.nid(mvp) : null, why, score: G.score, ms });
    }
    return orig.apply(this, a);
  });
  wrap(UI, 'matchEnd', function (orig, a) {
    if (hostOn()) Net.sendAll({ t: 'matchend', score: G.score, st: G.entities.map(e => [Net.nid(e), e.stats]) });
    return orig.apply(this, a);
  });
  wrap(G, 'detonate', function (orig, a) {
    const n = a[0];
    if (hostOn() && n.def.nade === 'he') { /* HE hasarı host'ta */ }
    return orig.apply(this, a);
  });
  wrap(G, 'updateBomb', function (orig, a) {
    const B = this.bomb, was = B.state; const r = orig.apply(this, a);
    if (hostOn() && was === 'planted' && B.state === 'exploded') Net.sendAll({ t: 'boom' });
    return r;
  });
  wrap(UI, 'quit', function (orig, a) {
    if (Net.role) Net.removeLimits();
    if (Net.role === 'client' && !G.matchOver) Net.leave();
    else if (Net.role === 'host' && Net.started && !G.matchOver) Net.leave();
    return orig.apply(this, a);
  });
  wrap(UI, 'pause', function (orig, a) {
    if (Net.role && Net.started && G.running) {   // çok oyunculuda oyun durmaz, sadece menü açılır
      const on = a[0]; UI.netPaused = !!on; $('pause').classList.toggle('hidden', !on);
      if (on) { Input.fireHeld = false; if (document.exitPointerLock) document.exitPointerLock(); } else Input.lockPointer();
      return;
    }
    return orig.apply(this, a);
  });
  // menü bağlantıları
  Net.bindUI = function () {
    const $ = id => document.getElementById(id);
    const copy = (txt, btn) => { try { navigator.clipboard.writeText(txt); btn.textContent = 'Kopyalandı ✔'; setTimeout(() => btn.textContent = 'Kopyala', 1500); } catch (e) { alert('Kopyalanamadı, kutudaki yazıyı elle seç ve kopyala'); } };
    $('btnNet').onclick = () => { $('mainMenu').classList.add('hidden'); $('netPanel').classList.remove('hidden'); this.paintMenu(); };
    $('netClose').onclick = () => { $('netPanel').classList.add('hidden'); $('mainMenu').classList.remove('hidden'); };
    const nameEl = $('netName'); try { nameEl.value = localStorage.getItem('to_netname') || ''; } catch (e) {}
    nameEl.oninput = () => { try { localStorage.setItem('to_netname', nameEl.value); } catch (e) {} };
    const myName = () => (nameEl.value || 'Oyuncu').trim().slice(0, 14);
    // host
    $('netInvite').onclick = async () => {
      this.hostName = myName(); $('netInvite').disabled = true;
      const holder = document.createElement('div'); holder.className = 'netSlot'; holder.textContent = 'Kod hazırlanıyor…'; $('netSlots').appendChild(holder);
      try {
        const p = await this.hostInvite();
        holder.innerHTML = `<b>Arkadaş ${this.peers.length}</b>
          <div class="netStep">1) Bu <b>davet kodunu</b> arkadaşına gönder (WhatsApp vb.):</div>
          <textarea readonly rows="3" class="netTa"></textarea><button class="btn sm nCopy">Kopyala</button>
          <div class="netStep">2) Arkadaşın sana bir <b>cevap kodu</b> gönderecek, buraya yapıştır:</div>
          <textarea rows="3" class="netTa nAns" placeholder="Cevap kodunu buraya yapıştır"></textarea><button class="btn sm pri nGo">Bağlan</button> <span class="nSt"></span>`;
        holder.querySelector('.netTa').value = p.joinCode;
        holder.querySelector('.nCopy').onclick = ev => copy(p.joinCode, ev.currentTarget);
        holder.querySelector('.nGo').onclick = async () => {
          const st = holder.querySelector('.nSt');
          try { await this.hostAccept(p, holder.querySelector('.nAns').value); st.textContent = 'Bağlanıyor…'; const t0 = Date.now(); const iv = setInterval(() => { if (p.ready) { st.textContent = '✔ Bağlandı: ' + p.name; clearInterval(iv); } else if (Date.now() - t0 > 20000) { st.textContent = '✖ Bağlanamadı (aynı ağda mısınız?)'; clearInterval(iv); } }, 400); }
          catch (e) { st.textContent = '✖ ' + e.message; }
        };
      } catch (e) { holder.textContent = 'Hata: ' + e.message; }
      $('netInvite').disabled = false;
    };
    $('netLeave').onclick = () => { this.leave(); $('netSlots').innerHTML = ''; $('netReply').classList.add('hidden'); this.paintMenu(); };
    // client
    $('netJoin').onclick = async () => {
      const st = $('netJoinSt'); st.textContent = 'Cevap kodu hazırlanıyor…';
      try {
        const reply = await this.join($('netOffer').value, myName());
        $('netReplyTa').value = reply; $('netReply').classList.remove('hidden'); st.textContent = 'Aşağıdaki cevap kodunu oda kurucuya gönder.';
        $('netReplyCopy').onclick = ev => copy(reply, ev.currentTarget);
        this.paintMenu();
      } catch (e) { st.textContent = '✖ ' + e.message; this.role = null; this.link = null; }
    };
    $('netStun').onchange = ev => { this.stunOn = ev.target.checked; };
    this.paintMenu();
  };
})();


// ---------- Minimal MQTT 3.1.1 istemcisi (yalnızca bağlan / abone ol / yayınla, QoS 0) ----------
Net.mqtt = function (D) {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const rl = n => { const o = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; o.push(d); } while (n > 0); return o; };
  const str = t => { const b = enc.encode(t); return [b.length >> 8, b.length & 255, ...b]; };
  const pkt = (hdr, body) => { const u = new Uint8Array(1 + rl(body.length).length + body.length); u[0] = hdr; const r = rl(body.length); u.set(r, 1); u.set(body, 1 + r.length); return u; };
  const T = {
    ws: null, topic: null, cb: null, closed: false, bi: 0, buf: new Uint8Array(0), ping: null, ready: false, pid: 1, wait: [], retry: null, fail: 0,
    open(topic, cb) { this.topic = topic; this.cb = cb; this.closed = false; this.connect(); },
    connect() {
      if (this.closed) return;
      const url = D.brokers[this.bi % D.brokers.length];
      let ws; try { ws = new WebSocket(url, 'mqtt'); } catch (e) { return this.next(); }
      ws.binaryType = 'arraybuffer'; this.ws = ws; this.ready = false; this.buf = new Uint8Array(0);
      const kill = setTimeout(() => { if (!this.ready) { try { ws.close(); } catch (e) {} } }, 6000);
      ws.onopen = () => {
        const cid = 'to' + Math.random().toString(36).slice(2, 10);
        ws.send(pkt(0x10, [...str('MQTT'), 4, 2, 0, 30, ...str(cid)]));
      };
      ws.onmessage = ev => { const n = new Uint8Array(ev.data), m = new Uint8Array(this.buf.length + n.length); m.set(this.buf); m.set(n, this.buf.length); this.buf = m; this.parse(); };
      ws.onclose = () => { clearTimeout(kill); clearInterval(this.ping); this.ready = false; if (this.ws === ws) { this.fail++; this.next(); } };
      ws.onerror = () => {};
    },
    next() { if (this.closed) return; if (this.fail > 0) this.bi++; clearTimeout(this.retry); this.retry = setTimeout(() => this.connect(), Math.min(8000, 800 * (this.fail + 1))); },
    parse() {
      for (;;) {
        const b = this.buf; if (b.length < 2) return;
        let mul = 1, len = 0, i = 1, d;
        do { if (i >= b.length) return; d = b[i++]; len += (d & 127) * mul; mul *= 128; } while (d & 128);
        if (b.length < i + len) return;
        const type = b[0] >> 4, body = b.slice(i, i + len); this.buf = b.slice(i + len);
        if (type === 2) {                    // CONNACK
          if (body[1] !== 0) { try { this.ws.close(); } catch (e) {} return; }
          this.ready = true; this.fail = 0;
          this.ws.send(pkt(0x82, [this.pid >> 8, this.pid & 255, ...str(this.topic), 0])); this.pid++;
          this.ping = setInterval(() => { try { this.ws.send(new Uint8Array([0xC0, 0])); } catch (e) {} }, 20000);
          const q = this.wait; this.wait = []; q.forEach(o => this.publish(o[0], o[1]));
        } else if (type === 3) {             // PUBLISH
          const tl = (body[0] << 8) | body[1]; const off = 2 + tl + (((b[0] >> 1) & 3) ? 2 : 0);
          try { this.cb(JSON.parse(dec.decode(body.slice(off)))); } catch (e) {}
        }
      }
    },
    publish(topic, obj) {
      if (!this.ready || !this.ws || this.ws.readyState !== 1) { if (this.wait.length < 30) this.wait.push([topic, obj]); return; }
      try { this.ws.send(pkt(0x30, [...str(topic), ...enc.encode(JSON.stringify(obj))])); } catch (e) {}
    },
    close() { this.closed = true; clearTimeout(this.retry); clearInterval(this.ping); if (this.ws) { try { this.ws.close(); } catch (e) {} this.ws = null; } },
  };
  return T;
};

// ---------- Yakındaki cihazları bul (aynı IP'yi paylaşan cihazlar) ----------
// Aracı: herkese açık ücretsiz MQTT aracıları (WebSocket) üzerinden küçük mesajlar. Oda anahtarı = genel IP'nin özeti.
Net.disc = {
  id: Math.random().toString(36).slice(2, 8), topic: null, tr: null, list: new Map(), timer: null, hosting: false, wantHost: null, status: '',
  // taşıyıcı: {open(topic,onmsg), publish(topic,obj), close()}; testte değiştirilebilir
  // Taşıyıcı: herkese açık ücretsiz MQTT aracıları (WebSocket). Kota yok; küçük mesajlar (ad, bağlantı bilgisi) geçer.
  brokers: ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt', 'wss://test.mosquitto.org:8081/mqtt'],
  mk() { return Net.mqtt(this); },
  async hash(txt) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)); return 'to' + Array.from(new Uint8Array(h)).slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join(''); },
  // 6 haneli oda kodu: kodun özeti ortak konu olur; oda kurucu ve katılan aynı konuda buluşur
  trRoom: null, topicRoom: null, code: null,
  async openRoom(code) {
    this.closeRoom(); this.code = code; this.topicRoom = await this.hash('taktikops-room|' + code);
    this.trRoom = this.mk(); this.trRoom.open(this.topicRoom, m => this.onMsg(m, 'room'));
  },
  closeRoom() { if (this.trRoom) { this.trRoom.close(); this.trRoom = null; } this.topicRoom = null; this.code = null; },
  newCode() { return String(Math.floor(Math.random() * 900000) + 100000); },
  async roomKey() {
    let ip = null;
    for (const u of ['https://api.ipify.org?format=json']) { try { const r = await fetch(u); const j = await r.json(); ip = j.ip; break; } catch (e) {} }
    if (!ip) throw new Error('İnternete ulaşılamadı');
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('taktikops-v1|' + ip));
    return 'to' + Array.from(new Uint8Array(h)).slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
  },
  devLabel() {
    const u = navigator.userAgent;
    const os = /iPhone|iPad|iPod/.test(u) ? 'iPhone/iPad' : /Android/.test(u) ? 'Android' : /Windows/.test(u) ? 'Windows' : /Mac/.test(u) ? 'Mac' : /Linux/.test(u) ? 'Linux' : 'Cihaz';
    const br = /Edg\//.test(u) ? 'Edge' : /OPR\//.test(u) ? 'Opera' : /Chrome\//.test(u) ? 'Chrome' : /Firefox\//.test(u) ? 'Firefox' : /Safari\//.test(u) ? 'Safari' : 'Tarayıcı';
    return os + ' • ' + br;
  },
  myName() { const el = document.getElementById('netName'); return ((el && el.value) || 'Oyuncu').trim().slice(0, 14); },
  async start() {
    if (this.tr) return;
    this.status = 'Aranıyor…'; Net.paintList();
    try { this.topic = await this.roomKey(); } catch (e) { this.status = 'İnternet yok: cihazlar otomatik bulunamıyor. Aşağıdan "Elle bağlan" ile kodla bağlanabilirsin.'; Net.paintList(); return; }
    this.tr = this.mk(); this.tr.open(this.topic, m => this.onMsg(m, 'ip'));
    this.status = ''; this.announce(); this.timer = setInterval(() => this.announce(), 15000); this.pub({ k: 'who', id: this.id }); Net.paintList();
  },
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; if (this.tr) { this.pub({ k: 'bye', id: this.id }); this.tr.close(); } this.tr = null; this.list.clear(); },
  pub(o, via) { if (via === 'room') { if (this.trRoom) this.trRoom.publish(this.topicRoom, o); } else if (this.tr && this.topic) this.tr.publish(this.topic, o); },
  announce() {
    this.pub({ k: 'hi', id: this.id, name: this.myName(), dev: this.devLabel(), host: !!this.hosting && Net.role === 'host' && !Net.started, n: Net.readyPeers().length });
    const now = Date.now(); for (const [id, d] of this.list) if (now - d.ts > 45000) this.list.delete(id);
    Net.paintList();
  },
  async onMsg(m, via) {
    if (!m || m.id === this.id) return;
    if (m.k === 'who') { setTimeout(() => this.announce(), Math.random() * 1500); return; }
    if (m.k === 'hi') { this.list.set(m.id, { id: m.id, name: m.name, dev: m.dev, host: !!m.host, n: m.n || 0, ts: Date.now() }); Net.paintList(); return; }
    if (m.k === 'bye') { this.list.delete(m.id); Net.paintList(); return; }
    if (m.to !== this.id && !(m.to === '*' && Net.role === 'host')) return;
    try {
      if (m.k === 'join' && Net.role === 'host' && !Net.started && Net.peers.length < 4) {          // ev sahibi: davet üret ve gönder
        const old = Net.peers.find(x => x.discId === m.id);
        if (old) { if (!old.ready && old.joinCode) this.pub({ k: 'offer', to: m.id, id: this.id, code: old.joinCode }, via); return; }   // tekrar gelen istek
        const p = await Net.hostInvite(m.id); p.name = String(m.name || 'Arkadaş').slice(0, 14);
        this.pub({ k: 'offer', to: m.id, id: this.id, code: p.joinCode }, via);
      } else if (m.k === 'offer' && (this.wantHost === m.id || this.wantHost === '*') && Net.role !== 'host' && !Net.link) {
        this.wantHost = m.id;                // katılan: cevap üret ve gönder
        Net.paintMenu(); const reply = await Net.join(m.code, this.myName());
        this.pub({ k: 'answer', to: m.id, id: this.id, code: reply }, via);
      } else if (m.k === 'answer' && Net.role === 'host') {
        const p = Net.peers.find(x => x.discId === m.id); if (p) await Net.hostAccept(p, m.code);
      }
    } catch (e) { this.status = 'Bağlantı hatası: ' + e.message; Net.paintList(); }
  },
  join(hostId) {
    this.wantHost = hostId; this.status = 'Bağlanılıyor…';
    this.pub({ k: 'join', to: hostId, id: this.id, name: this.myName() });
    clearTimeout(this.jt); this.jt = setTimeout(() => { if (!(Net.link && Net.link.open)) { this.status = '✖ Bağlanamadı (aynı ağdasınız, oda hâlâ açık mı?)'; if (Net.role === 'client') Net.leave(); Net.paintList(); } }, 25000);
    Net.paintList();
  },
};
Net.disc.joinCode = async function (code) {
  code = String(code).replace(/\D/g, '');
  if (code.length !== 6) { this.status = 'Kod 6 haneli olmalı'; Net.paintList(); return; }
  this.status = 'Odaya bağlanılıyor…'; Net.paintList();
  await this.openRoom(code); this.wantHost = '*';
  const send = () => this.pub({ k: 'join', to: '*', id: this.id, name: this.myName() }, 'room');
  setTimeout(send, 600); const iv = setInterval(() => { if (Net.link || !this.trRoom) clearInterval(iv); else send(); }, 3000);
  clearTimeout(this.jt); this.jt = setTimeout(() => { clearInterval(iv); if (!(Net.link && Net.link.open)) { this.status = '✖ Bağlanamadı: kod doğru mu, oda kurucu odayı açtı mı?'; if (Net.role === 'client') Net.leave(); this.closeRoom(); Net.paintList(); } }, 30000);
};
Net.paintList = function () {
  const box = document.getElementById('netList'); if (!box) return;
  const D = this.disc, rows = [...D.list.values()];
  let h = '';
  if (D.status) h += `<div class="netEmpty">${D.status}</div>`;
  if (!rows.length && !D.status) h += '<div class="netEmpty">Yakında başka cihaz yok. Arkadaşların oyunu açıp bu paneli açınca burada görünür.</div>';
  for (const d of rows) {
    const esc = t => String(t).replace(/[<>&]/g, '');
    h += `<div class="netRow"><div><b>${esc(d.name)}</b><small>${esc(d.dev)}${d.host ? ' • 🏠 oda kurdu (' + (d.n + 1) + ' kişi)' : ''}</small></div>${d.host && this.role !== 'host' ? `<button class="btn sm pri" data-join="${d.id}">${this.role === 'client' && D.wantHost === d.id ? 'Bağlı ✔' : 'Katıl'}</button>` : ''}</div>`;
  }
  if (this._listHtml !== h) {   // aynıysa yeniden çizme (tıklama kaybolmasın)
    this._listHtml = h; box.innerHTML = h;
    box.querySelectorAll('[data-join]').forEach(b => b.onclick = () => D.join(b.dataset.join));
  }
  this.paintMenu();
};
(function () {
  const $ = id => document.getElementById(id);
  const orig = Net.bindUI;
  Net.bindUI = function () {
    orig.call(this);
    const nameEl = $('netName');
    if (!nameEl.value) { nameEl.value = this.disc.devLabel().split(' •')[0] + ' ' + this.disc.id.slice(0, 2); }
    const open = $('btnNet').onclick;
    $('btnNet').onclick = () => { open(); this.disc.start(); };
    const close = $('netClose').onclick;
    $('netClose').onclick = () => { close(); if (!this.role) this.disc.stop(); };
    $('netHost').onclick = async () => { this.hostName = this.disc.myName(); this.disc.hosting = true; this.role = 'host'; const c = this.disc.newCode(); await this.disc.openRoom(c); $('netCode').textContent = c.slice(0, 3) + ' ' + c.slice(3); $('netCodeBox').classList.remove('hidden'); this.disc.announce(); this.paintMenu(); this.paintList(); };
    $('netCodeJoin').onclick = () => this.disc.joinCode($('netCodeIn').value);
    $('netRescan').onclick = () => { this.disc.stop(); this.disc.start(); };
    const leave = $('netLeave').onclick;
    $('netLeave').onclick = () => { this.disc.hosting = false; this.disc.wantHost = null; this.disc.closeRoom(); $('netCodeBox').classList.add('hidden'); leave(); this.disc.announce(); this.paintList(); };
    nameEl.addEventListener('change', () => this.disc.announce());
  };
})();
