// Ayarlar: varsayılanlar + kalıcı kayıt
'use strict';
const DEFAULT_SETTINGS = {
  // Nişan yardımı
  aimAssist: 2,          // 0 kapalı, 1 düşük, 2 orta, 3 yüksek
  sprayAssist: 2,        // tarama (geri tepme) yardımı: 0 kapalı .. 3 yüksek
  autoFire: false,       // nişangah düşmana gelince otomatik ateş
  // Kontroller
  touchSens: 1.0,
  mouseSens: 1.0,
  scopeSens: 0.8,
  invertY: false,
  leftFire: false,       // sol tarafta ikinci ateş tuşu
  btnScale: 1.0,
  btnOpacity: 0.6,
  // Görüntü
  fov: 66,
  sharp: 2,
  enemyGlow: true,       // düşmanları hafif kırmızı vurgula              // netlik: 0=1x, 1=1.5x, 2=2x, 3=3x (piksel oranı)
  graphics: 1,           // 0 düşük, 1 orta, 2 yüksek
  shadows: true,
  showFps: false,
  // Nişangah
  crossColor: '#3cff6e',
  crossSize: 7,
  crossGap: 4,
  crossThick: 2,
  crossDot: false,
  crossDynamic: true,
  // Botlar & maç
  botDiffAlly: 1,        // kendi takımındaki botların zorluğu
  botDifficulty: 1,      // 0 kolay, 1 normal, 2 zor, 3 uzman
  teamSize: 5,
  maxRounds: 16,
  friendlyFire: false,
  playerTeam: 'auto',
  startMoney: 800, roundTime: 115, c4Time: 40, freezeTime: 6,
  hudStyle: 'modern',    // 'modern' | 'classic'
  aimScenario: 'grid', aimTime: 60, aimSize: 1, aimSpeed: 1,
  mvpWhen: 'me',         // MVP müziği: 'me' (ben olunca) | 'always' | 'off'
  musicVol: 0.8,
  map: 'dust',            // dust, harbor, snow, town, random
  mode: 'comp',          // 'comp' rekabetçi, 'dm' ölüm kalım
  dmTime: 300,           // ölüm kalım süresi (sn)
  // Ses
  volume: 0.8,
  texStyle: 'retro',     // 'retro' (eski okul, piksel) veya 'modern'
  layoutV: 3,
};

const Settings = {
  data: Object.assign({}, DEFAULT_SETTINGS),
  load() {
    try {
      const raw = localStorage.getItem('taktikops_settings');
      if (raw) {
        const d = JSON.parse(raw);
        if (!d.layoutV) { d.leftFire = false; d.btnScale = 1; d.btnOpacity = 0.6; d.layoutV = 2; }
        if (d.layoutV < 3) { if (d.fov === 74) d.fov = 66; d.layoutV = 3; }
        Object.assign(this.data, d);
      }
    } catch (e) { /* depolama yok */ }
    return this.data;
  },
  save() {
    try { localStorage.setItem('taktikops_settings', JSON.stringify(this.data)); } catch (e) {}
  },
  reset() {
    Object.assign(this.data, DEFAULT_SETTINGS);
    this.save();
  }
};
Settings.load();
const S = Settings.data;
