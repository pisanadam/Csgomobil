# Taktik Ops — Masaüstü (Windows .exe) + tek oyunculu hile paneli

Oyunu kendi pencerede açar, yanında **hile paneli** gösterir (aimbot, triggerbot, ESP, hız, ölümsüzlük, geri tepme yok, spinbot, profiller, kısayollar).

**Kural:** Tek oyunculuda hileler serbest. Çok oyunculu odada hileler varsayılan olarak kilitlidir; yalnızca oda kurucu "🧪 Hileli oda"yı açar ve katılan herkes uyarıyı onaylarsa, izin verilen gruplar panelden de açılabilir. Başka oyunlara/programlara müdahale etmez; sadece kendi penceresindeki bu oyunu yönetir.

## Windows'ta .exe üretme
1. [Node.js](https://nodejs.org) (LTS) kur.
2. Depo kökünde oyunu üret: `python3 build.py` (veya hazır `taktik-ops.html` dosyası kökte dursun).
3. Bu klasörde:
   ```
   npm install
   npm run dist
   ```
4. `dist/TaktikOps-Masaustu.exe` oluşur (taşınabilir, kurulum gerektirmez).
   Denemek için: `npm start`

İmzasız exe olduğu için Windows SmartScreen "bilinmeyen yayıncı" uyarısı verebilir: "Daha fazla bilgi → Yine de çalıştır".

## Kısayollar
F5 aimbot • F6 trigger • F7 ESP • F8 hız • F9 ölümsüzlük • F10 geri tepme yok
