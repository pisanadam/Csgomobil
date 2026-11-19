// Oyunu (tek dosyalık HTML) game/ klasörüne kopyalar. Müzikli sürüm varsa onu tercih eder.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const pick = ['taktik-ops-muzikli.html', 'taktik-ops.html'].map(f => path.join(root, f)).find(f => fs.existsSync(f));
if (!pick) { console.error('Hata: ../taktik-ops.html bulunamadı. Önce depo kökünde "python3 build.py" çalıştır.'); process.exit(1); }
fs.mkdirSync(path.join(__dirname, 'game'), { recursive: true });
fs.copyFileSync(pick, path.join(__dirname, 'game', 'taktik-ops.html'));
console.log('Oyun kopyalandı:', path.basename(pick));
