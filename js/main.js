// Başlatıcı & ana döngü
'use strict';
(function () {
  G.init();
  Input.init();
  UI.init();
  UI.applySettings();
  let last = performance.now(), fpsAcc = 0, fpsN = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    let dt = (t - last) / 1000; last = t;
    if (dt > 0.05) dt = 0.05; if (dt <= 0) dt = 0.001;
    fpsAcc += dt; fpsN++;
    if (fpsAcc > 0.5) { G.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
    if (G.running && !G.paused) {
      Input.apply(dt);
      // fizik alt adımları (kararlı hareket)
      const steps = dt > 0.025 ? 2 : 1;
      for (let i = 0; i < steps; i++) G.update(dt / steps);
      UI.update(dt);
    }
    G.render(G.running && !G.paused ? dt : 0);
  }
  // menü arka planı: kamerayı haritada gezdir
  G.menuCam = true;
  const origRender = G.render.bind(G);
  G.render = function (dt) {
    if (!this.running && !this.matchOver || !this.player) {
      const tt = performance.now() / 1000;
      this.camera.position.set(Math.sin(tt * 0.05) * 25, 14, Math.cos(tt * 0.05) * 25);
      this.camera.rotation.set(-0.35, tt * 0.05 + 0, 0);
      FX.update(0.016, this.camera.position);
      this.renderer.clear(); this.renderer.render(this.scene, this.camera);
      return;
    }
    origRender(dt);
  };
  requestAnimationFrame(frame);
  // görünürlük değişince duraklat
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.running && !G.paused) UI.pause(true); });
})();
