// Ayarlar: varsayılanlar + kalıcı kayıt
'use strict';
const DEFAULT_SETTINGS = {
  // Nişan yardımı
  aimAssist: 2,          // 0 kapalı, 1 düşük, 2 orta, 3 yüksek
  sprayAssist: 2,        // tarama (geri tepme) yardımı: 0 kapalı .. 3 yüksek
  autoFire: false,       // nişangah düşmana gelince otomatik ateş
  // Kontroller
  touchSens: 1.0,
  mouseSens: 5.73,       // CS2 ölçüsü (m_yaw 0.022°/birim). 5.73 = eski varsayılanla (0.126°/birim) aynı his
  mouseDpi: 800,
  scopeSens: 0.8,
  invertY: false,
  crouchKey: 'both',     // eğilme tuşu: 'both' (Ctrl + C) | 'c' | 'ctrl'
  autoFs: true,          // masaüstünde oyunu tam ekran başlat (Ctrl+W gibi kısayollar tam ekranda kilitlenir)
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
  botMusic: 'all',      // botların şarkıları: 'both' | 'tr' | 'en' | 'off'
  mvpStart: 0, mvpLen: 10, // yüklenen şarkıdan çalınacak bölüm (sn)
  aceMode: 'on', aceSong: 'random', aceLen: 16,   // ACE şarkısı
  mvpWhen: 'me',         // MVP müziği: 'me' (ben olunca) | 'always' | 'off'
  musicVol: 0.8,
  map: 'dust',            // dust, harbor, snow, town, random
  mode: 'comp',          // 'comp' rekabetçi, 'dm' ölüm kalım
  dmTime: 300,           // ölüm kalım süresi (sn)
  // Ses
  volume: 0.8,
  micMode: 'off', micSens: 0.5,   // mikrofon: botlar sesini duyar
  netMode: 'coop', netBots: true,   // çok oyunculu parti modu: coop | teams | duel | ffa
  autoRes: true,         // kare hızı düşerse çözünürlüğü kendiliğinden azalt
  audio3d: 'hrtf',       // ses konumu: 'hrtf' (3B kulaklık) | 'stereo' (hoparlör)
  texStyle: 'retro',     // 'retro' (eski okul, piksel) veya 'modern'
  layoutV: 3,
  sensV: 3,
};

const Settings = {
  data: Object.assign({}, DEFAULT_SETTINGS),
  load() {
    try {
      const raw = localStorage.getItem('taktikops_settings');
      if (raw) {
        const d = JSON.parse(raw);
        if (!d.layoutV) { d.leftFire = false; d.btnScale = 1; d.btnOpacity = 0.6; d.layoutV = 2; }
        // hassasiyet ölçeği: eski ölçek 0.126°/birim, CS2 0.022°/birim -> eski değer x 5.73 = CS2 değeri
        if (!d.sensV) { if (typeof d.mouseSens === 'number') d.mouseSens = Math.max(0.05, Math.round(d.mouseSens * 5.73 * 100) / 100); d.sensV = 3; }
        else if (d.sensV === 2) { if (typeof d.mouseSens === 'number' && d.mouseSens <= 0.5) d.mouseSens = d.mouseSens === 0.17 ? 5.73 : Math.round(d.mouseSens / 0.1745 * 5.73 * 100) / 100; d.sensV = 3; }   // 2. sürümde ters çevrilmişti: düzelt
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
