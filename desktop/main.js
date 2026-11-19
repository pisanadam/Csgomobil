// Taktik Ops masaüstü: oyunu kendi penceresinde açar, yanında hile paneli gösterir.
// Tek oyunculuda hileler serbest. Çok oyunculu odada yalnızca oda kurucunun açıkça izin verdiği ('Hileli oda') gruplar açılabilir; geri kalanı kilitli kalır.
const { app, BrowserWindow, ipcMain, globalShortcut, Menu } = require('electron');
const path = require('path'), fs = require('fs');

let game, panel;
const profFile = () => path.join(app.getPath('userData'), 'profiller.json');
const readProf = () => { try { return JSON.parse(fs.readFileSync(profFile(), 'utf8')); } catch (e) { return {}; } };

// oyunun içinde çalışan küçük yardımcı: durum oku / hile ayarla (çok oyunculuda reddeder)
const STATE_JS = `(() => { try {
  const mp = (typeof Net !== 'undefined') && !!Net.role;
  return { ok: true, mp, allowed: mp ? Array.from(Net.allowed || []) : null, running: (typeof G !== 'undefined') && !!G.running, cheats: Object.assign({}, Cheats.c) };
} catch (e) { return { ok: false }; } })()`;
const setJS = (k, v) => `(() => { try {
  if (typeof Net !== 'undefined' && Net.role) { const map = { aimFov: 'aimbot', aimSmooth: 'aimbot', aimBone: 'aimbot', aimKey: 'aimbot', trigDelay: 'trigger' }; const need = map[${JSON.stringify(k)}] || ${JSON.stringify(k)}; if (!(Net.allowed && Net.allowed.has(need))) return { ok: false, locked: true }; }
  Cheats.c[${JSON.stringify(k)}] = ${JSON.stringify(v)}; Cheats.save(); Cheats.refreshTag(); return { ok: true };
} catch (e) { return { ok: false }; } })()`;

function createWindows() {
  game = new BrowserWindow({ width: 1280, height: 760, backgroundColor: '#000', title: 'Taktik Ops', webPreferences: { contextIsolation: true, sandbox: true } });
  game.setMenuBarVisibility(false);
  game.loadFile(path.join(__dirname, 'game', 'taktik-ops.html'));
  game.on('closed', () => { game = null; app.quit(); });
  panel = new BrowserWindow({ width: 340, height: 640, x: 20, y: 40, alwaysOnTop: true, resizable: true, title: 'Hile Paneli (tek oyunculu)', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true } });
  panel.setMenuBarVisibility(false);
  panel.loadFile(path.join(__dirname, 'panel.html'));
  panel.on('closed', () => { panel = null; });
}

const run = js => (game && !game.isDestroyed()) ? game.webContents.executeJavaScript(js).catch(() => ({ ok: false })) : Promise.resolve({ ok: false });

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindows();
  ipcMain.handle('state', () => run(STATE_JS));
  ipcMain.handle('set', (e, k, v) => run(setJS(String(k), v)));
  ipcMain.handle('profiles', () => readProf());
  ipcMain.handle('saveProfile', (e, name, cheats) => { const p = readProf(); p[String(name).slice(0, 24)] = cheats; fs.writeFileSync(profFile(), JSON.stringify(p)); return p; });
  ipcMain.handle('fullscreen', () => { if (game) game.setFullScreen(!game.isFullScreen()); });
  // kısayollar (oyun penceresi odaktayken de çalışır)
  const toggles = { F5: 'aimbot', F6: 'trigger', F7: 'esp', F8: 'speed', F9: 'god', F10: 'norecoil' };
  for (const [key, name] of Object.entries(toggles)) {
    globalShortcut.register(key, async () => {
      const st = await run(STATE_JS); if (!st.ok) return;
      await run(setJS(name, !st.cheats[name]));
      if (panel && !panel.isDestroyed()) panel.webContents.send('refresh');
    });
  }
});
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
