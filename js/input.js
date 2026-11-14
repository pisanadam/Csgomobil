// Girdi: dokunmatik (joystick + bakış + tuşlar) ve klavye/fare
'use strict';
const Input = {
  isMobile: false,
  keys: {}, fireHeld: false, useHeld: false, walkToggle: false, crouchToggle: false,
  joy: { id: null, x0: 0, y0: 0, dx: 0, dy: 0 },
  touches: new Map(), lookActive: false, lastLookT: 0, lastLookDX: 0, lastLookDY: 0,
  scoreHeld: false, locked: false,
  init() {
    this.isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (this.isMobile) document.body.classList.add('mobile');
    this.applyButtonStyle();
    const tl = document.getElementById('touch');
    tl.addEventListener('touchstart', e => this.onTouchStart(e), { passive: false });
    tl.addEventListener('touchmove', e => this.onTouchMove(e), { passive: false });
    tl.addEventListener('touchend', e => this.onTouchEnd(e), { passive: false });
    tl.addEventListener('touchcancel', e => this.onTouchEnd(e), { passive: false });
    // klavye & fare
    window.addEventListener('keydown', e => this.onKey(e, true));
    window.addEventListener('keyup', e => this.onKey(e, false));
    const cv = document.getElementById('game');
    cv.addEventListener('mousedown', e => {
      if (!G.running || G.paused || UI.buyOpen) return;
      if (!this.locked && !this.isMobile) { this.lockPointer(); return; }
      if (G.player && !G.player.alive) { G.cycleSpec(); return; }
      if (e.button === 0) this.fireHeld = true;
      if (e.button === 2 && G.player) G.player.toggleScope();
    });
    window.addEventListener('mouseup', e => { if (e.button === 0) this.fireHeld = false; });
    window.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.locked = !!document.pointerLockElement;
      if (!this.locked && G.running && !G.paused && !UI.buyOpen && !this.isMobile && !G.matchOver) UI.pause(true);
    });
    window.addEventListener('mousemove', e => {
      if (!this.locked || !G.running || G.paused) return;
      this.look(e.movementX, e.movementY, S.mouseSens * 0.0022);
    });
    window.addEventListener('wheel', e => {
      if (!G.running || !G.player) return;
      const order = ['primary', 'secondary', 'knife', 'grenade', 'bomb'];
      const p = G.player; let i = order.indexOf(p.slot);
      for (let k = 0; k < 5; k++) { i = (i + (e.deltaY > 0 ? 1 : 4)) % 5; if (p.weapon(order[i])) { p.switchTo(order[i]); break; } }
    });
    window.addEventListener('blur', () => { this.keys = {}; this.fireHeld = false; this.useHeld = false; });
  },
  lockPointer() {
    if (this.isMobile || document.pointerLockElement) return;
    const c = document.querySelector('#game canvas'); if (!c || !c.requestPointerLock) return;
    try { const r = c.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
  },
  applyButtonStyle() {
    document.documentElement.style.setProperty('--bs', S.btnScale);
    document.documentElement.style.setProperty('--bo', S.btnOpacity);
    document.getElementById('bFire2').classList.toggle('hidden', !S.leftFire);
  },
  look(dx, dy, k) {
    const p = G.player; if (!p || !p.alive) return;
    let s = k * G.lookScale;
    if (p.scoped && p.def.scope) s *= S.scopeSens * (p.def.scope[p.scoped - 1] / 90);
    else if (p.zoomed) s *= S.scopeSens / 1.5;
    p.yaw -= dx * s;
    p.pitch -= dy * s * (S.invertY ? -1 : 1);
    p.pitch = Math.max(-1.5, Math.min(1.5, p.pitch));
    this.lastLookT = performance.now(); this.lastLookDX = dx; this.lastLookDY = dy;
  },
  // ---- Dokunmatik ----
  btnOf(el) { while (el && el !== document.body) { if (el.dataset && el.dataset.b) return el; el = el.parentElement; } return null; },
  onTouchStart(ev) {
    ev.preventDefault();
    Audio3.init();
    for (const t of ev.changedTouches) {
      const el = this.btnOf(t.target);
      if (el) {
        const b = el.dataset.b;
        this.touches.set(t.identifier, { kind: b, el, x: t.clientX, y: t.clientY });
        this.pressButton(b, el, true);
        continue;
      }
      // ölüyken ekrana dokunmak: sıradaki takım arkadaşını izle
      if (G.player && !G.player.alive && G.running && !G.paused) {
        G.cycleSpec();
        this.touches.set(t.identifier, { kind: 'look', x: t.clientX, y: t.clientY });
        continue;
      }
      if (t.clientX < window.innerWidth * 0.42 && this.joy.id === null) {
        this.joy.id = t.identifier; this.joy.x0 = t.clientX; this.joy.y0 = t.clientY; this.joy.dx = this.joy.dy = 0;
        const jb = document.getElementById('joyBase'); jb.style.display = 'block'; jb.style.left = t.clientX + 'px'; jb.style.top = t.clientY + 'px';
        document.getElementById('joyKnob').style.transform = '';
        this.touches.set(t.identifier, { kind: 'joy' });
        document.body.classList.add('joying');
      } else {
        this.touches.set(t.identifier, { kind: 'look', x: t.clientX, y: t.clientY });
      }
    }
  },
  onTouchMove(ev) {
    ev.preventDefault();
    for (const t of ev.changedTouches) {
      const st = this.touches.get(t.identifier); if (!st) continue;
      if (st.kind === 'joy') {
        const R = 60 * S.btnScale;
        let dx = t.clientX - this.joy.x0, dy = t.clientY - this.joy.y0;
        const m = Math.hypot(dx, dy);
        if (m > R) { // taban parmağı takip eder
          this.joy.x0 += dx * (1 - R / m) * 0.5; this.joy.y0 += dy * (1 - R / m) * 0.5;
          dx = t.clientX - this.joy.x0; dy = t.clientY - this.joy.y0;
          const m2 = Math.hypot(dx, dy); if (m2 > R) { dx *= R / m2; dy *= R / m2; }
          const jb = document.getElementById('joyBase'); jb.style.left = this.joy.x0 + 'px'; jb.style.top = this.joy.y0 + 'px';
        }
        this.joy.dx = dx / R; this.joy.dy = dy / R;
        document.getElementById('joyKnob').style.transform = `translate(${dx}px,${dy}px)`;
      } else if (st.kind === 'look' || st.kind === 'fire') {
        const dx = t.clientX - st.x, dy = t.clientY - st.y;
        st.x = t.clientX; st.y = t.clientY;
        this.look(dx, dy, S.touchSens * 0.0058);
      }
    }
  },
  onTouchEnd(ev) {
    ev.preventDefault();
    for (const t of ev.changedTouches) {
      const st = this.touches.get(t.identifier); if (!st) continue;
      this.touches.delete(t.identifier);
      if (st.kind === 'joy') {
        this.joy.id = null; this.joy.dx = this.joy.dy = 0;
        document.getElementById('joyBase').style.display = 'none';
        document.body.classList.remove('joying');
      } else if (st.el) this.pressButton(st.kind, st.el, false);
    }
  },
  pressButton(b, el, down) {
    const p = G.player;
    if (b === 'fs') { if (!down) UI.toggleFullscreen(); return; }   // tam ekran: dokunma bırakılınca (tarayıcı izni için)
    if (b === 'fire') { this.fireTouches = (this.fireTouches || 0) + (down ? 1 : -1); this.fireHeld = this.fireTouches > 0; el.classList.toggle('on', down); return; }
    if (b === 'use') { this.useHeld = down; el.classList.toggle('on', down); if (down && p && UI.useMode === 'pick') G.playerSwapPickup(); return; }
    if (b === 'score') { this.scoreHeld = down; UI.showScore(down); return; }
    if (!down) return;
    Audio3.init();
    if (!p) return;
    switch (b) {
      case 'jump': p.input.jump = true; break;
      case 'crouch': this.crouchToggle = !this.crouchToggle; el.classList.toggle('on', this.crouchToggle); break;
      case 'walk': this.walkToggle = !this.walkToggle; el.classList.toggle('on', this.walkToggle); break;
      case 'reload': p.reload(); break;
      case 'scope': p.toggleScope(); break;
      case 'buy': UI.toggleBuy(); break;
      case 'menu': UI.pause(true); break;
      case 'radio': UI.toggleRadio(); break;
      case 'nvg': UI.toggleNvg(); break;
      case 'drop': G.dropWeapon(); break;
      case 'slot': p.switchTo(el.dataset.s); break;
    }
  },
  // ---- Klavye ----
  onKey(e, down) {
    const k = e.code;
    if (k === 'Tab') { e.preventDefault(); this.scoreHeld = down; UI.showScore(down); return; }
    if (!G.running) return;
    if (k === 'Escape' && down) { if (UI.buyOpen) UI.toggleBuy(false); UI.toggleRadio(false); return; }
    if (down && UI.radioOpen && /^Digit[1-6]$/.test(k)) { G.radio(parseInt(k.slice(5))); UI.toggleRadio(false); return; }
    this.keys[k] = down;
    if (!down) return;
    Audio3.init();
    const p = G.player; if (!p) return;
    if (e.repeat) return;
    switch (k) {
      case 'Space': p.input.jump = true; e.preventDefault(); break;
      case 'KeyR': p.reload(); break;
      case 'KeyB': UI.toggleBuy(); break;
      case 'KeyG': G.dropWeapon(); break;
      case 'KeyF': UI.toggleFullscreen(); break;
      case 'KeyE': if (UI.useMode === 'pick') G.playerSwapPickup(); break;
      case 'KeyQ': p.switchTo(p.prevSlot); break;
      case 'KeyZ': UI.toggleRadio(); break;
      case 'KeyN': UI.toggleNvg(); break;
      case 'Digit1': p.switchTo('primary'); break;
      case 'Digit2': p.switchTo('secondary'); break;
      case 'Digit3': p.switchTo('knife'); break;
      case 'Digit4': p.switchTo('grenade'); break;
      case 'Digit5': p.switchTo('bomb'); break;
      case 'Insert': case 'F2': Cheats.open(); break;
    }
    if (UI.buyOpen && /^Digit|Numpad/.test(k)) {}
  },
  // Her karede oyuncuya uygula
  apply(dt) {
    const p = G.player; if (!p) return;
    const K = this.keys;
    let fwd = (K.KeyW ? 1 : 0) - (K.KeyS ? 1 : 0), side = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0);
    let walk = !!(K.ShiftLeft || K.ShiftRight) || this.walkToggle;
    if (this.joy.id !== null) {
      const m = Math.hypot(this.joy.dx, this.joy.dy);
      if (m > 0.12) {
        fwd = -this.joy.dy; side = this.joy.dx;
        const n = Math.hypot(fwd, side); if (n > 1) { fwd /= n; side /= n; }
        if (m < 0.45) walk = true;
        if (n > 0.45) { fwd /= n; side /= n; }  // tam hız
      }
    }
    p.input.fwd = fwd; p.input.side = side; p.input.walk = walk;
    p.input.crouch = !!(K.ControlLeft || K.KeyC) || this.crouchToggle;
    p.input.use = !!K.KeyE || this.useHeld;
    if (UI.buyOpen) { p.trig = false; return; }
    // hileler aynı karede, güncel bakış açısıyla değerlendirilir (gecikmesiz)
    if (G.running && !G.paused) Cheats.update(dt);
    p.trig = this.fireHeld || G.autoFiring || G.cheatFire;
    // hile atışı (triggerbot / aimbot kilitliyken): mermi tam nişangaha gider
    p.cheatShot = !!G.cheatFire || !!(Cheats.aimTarget && Cheats.c.aimbot);
    G.cheatFire = false;
    G.autoFiring = false;
    this.lookActive = performance.now() - this.lastLookT < 120;
  }
};
