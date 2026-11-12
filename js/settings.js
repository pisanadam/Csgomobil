// Ayarlar: varsayılanlar + kalıcı kayıt
'use strict';
const DEFAULT_SETTINGS = {
  // Nişan yardımı
  aimAssist: 2,          // 0 kapalı, 1 düşük, 2 orta, 3 yüksek
  autoFire: false,       // nişangah düşmana gelince otomatik ateş
  // Kontroller
  touchSens: 1.0,
  mouseSens: 1.0,
  scopeSens: 0.8,
  invertY: false,
  leftFire: true,        // sol tarafta ikinci ateş tuşu
  btnScale: 1.0,
  btnOpacity: 0.55,
  // Görüntü
  fov: 74,
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
  botDifficulty: 1,      // 0 kolay, 1 normal, 2 zor, 3 uzman
  teamSize: 5,
  maxRounds: 16,
  friendlyFire: false,
  playerTeam: 'auto',
  mode: 'comp',          // 'comp' rekabetçi, 'dm' ölüm kalım
  dmTime: 300,           // ölüm kalım süresi (sn)
  // Ses
  volume: 0.8,
};

const Settings = {
  data: Object.assign({}, DEFAULT_SETTINGS),
  load() {
    try {
      const raw = localStorage.getItem('taktikops_settings');
      if (raw) Object.assign(this.data, JSON.parse(raw));
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
