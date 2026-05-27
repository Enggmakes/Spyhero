const { app, BrowserWindow, globalShortcut, clipboard, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

let overlayWindow = null;
let settingsWindow = null;
let tray = null;

// Persistent Settings Path
const settingsDir = path.join(app.getPath('userData'));
const settingsPath = path.join(settingsDir, 'settings.json');

const defaultSettings = {
  shortcut: 'CommandOrControl+Shift+P',
  provider: 'gemini',
  keys: {
    openai: '',
    anthropic: '',
    gemini: '',
    groq: '',
    openrouter: ''
  },
  models: {
    openai: 'gpt-4o',
    anthropic: 'claude-3-5-sonnet-latest',
    gemini: 'gemini-1.5-flash',
    groq: 'llama3-70b-8192',
    openrouter: 'google/gemini-2.5-flash'
  },
  temperature: 0.7,
  autopaste: true,
  theme: 'dark',
  launchOnStartup: false
};

let settings = { ...defaultSettings };

// Load settings
function loadSettings() {
  try {
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      settings = { ...defaultSettings, ...JSON.parse(data) };
    } else {
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Save settings
function saveSettings(newSettings) {
  try {
    settings = { ...settings, ...newSettings };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    
    // Broadcast changes to renderers
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('settings-updated', settings);
    }
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send('settings-updated', settings);
    }

    // Re-register shortcuts
    registerGlobalShortcut();
    
    // Rebuild system tray context menu with the new shortcut
    updateTrayMenu();
    
    // Handle startup launcher
    toggleStartupLauncher(settings.launchOnStartup);
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// Toggle startup behavior
function toggleStartupLauncher(enable) {
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: app.getPath('exe')
  });
}

// System Tray Setup
function formatShortcutForDisplay(shortcut) {
  if (!shortcut) return 'Ctrl+Shift+P';
  return shortcut
    .replace('CommandOrControl', 'Ctrl')
    .replace('Control', 'Ctrl')
    .replace('Alt', 'Alt')
    .replace('Shift', 'Shift');
}

function updateTrayMenu() {
  if (!tray) return;
  const shortcutDisplay = formatShortcutForDisplay(settings.shortcut);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'SpyHero - Prompt Enhancer', enabled: false },
    { type: 'separator' },
    { label: `Enhance Selected Text (${shortcutDisplay})`, click: () => triggerEnhanceFlow() },
    { label: 'Settings...', click: () => openSettingsWindow() },
    { type: 'separator' },
    { label: 'Quit SpyHero', click: () => app.quit() }
  ]);
  tray.setContextMenu(contextMenu);
}

function createTray() {
  const trayIconPath = path.join(__dirname, 'tray_icon.png');
  let icon;
  
  if (fs.existsSync(trayIconPath)) {
    icon = nativeImage.createFromPath(trayIconPath);
  } else {
    // Fallback: monochrome ring base64
    const trayIconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAbUlEQVQ4y2NgGFrgP8N/Bvzw/4QZgMT/UTQhAyQZGBgYGBkYGhkYgNicjDCDiQL9IEwMYGJA14w4wMTAwMDw/z8DAwMTAwMDAwPDeRRDqIE0CqBp5IcZ/jOcxacZpiSGFpAYN9AMoqkBZEYoAABmEx/15U0f4AAAAABJRU5ErkJggg==';
    const iconBuffer = Buffer.from(trayIconBase64, 'base64');
    icon = nativeImage.createFromBuffer(iconBuffer);
  }
  
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  updateTrayMenu();

  tray.setToolTip('SpyHero — AI Prompt Enhancer');
  
  tray.on('double-click', () => {
    openSettingsWindow();
  });
}

// Register global keyboard shortcut
function registerGlobalShortcut() {
  globalShortcut.unregisterAll();
  
  const keybind = settings.shortcut || 'CommandOrControl+Shift+P';
  try {
    const registered = globalShortcut.register(keybind, () => {
      triggerEnhanceFlow();
    });
    
    if (!registered) {
      console.error(`Shortcut registration failed for keybind: ${keybind}`);
    }
  } catch (e) {
    console.error(`Error registering keybind ${keybind}:`, e);
  }
}

// Simulate keystrokes to copy selection using ultra-fast native VBScript
function simulateKeystrokeCopy(callback) {
  const originalClipboard = clipboard.readText();
  clipboard.clear();

  const copyVbsPath = path.join(app.getPath('userData'), 'copy.vbs');
  try {
    fs.writeFileSync(copyVbsPath, 'Set WshShell = CreateObject("WScript.Shell")\nWshShell.SendKeys "^c"');
  } catch (e) {
    console.error('Failed to write copy.vbs', e);
  }
  
  exec(`wscript.exe "${copyVbsPath}"`, () => {
    // Wait slightly for the OS to update the clipboard
    setTimeout(() => {
      const selectedText = clipboard.readText();
      
      // Clean up copy VBScript
      try { fs.unlinkSync(copyVbsPath); } catch (e) {}

      if (selectedText && selectedText.trim()) {
        callback(selectedText, originalClipboard);
      } else {
        // Fallback: restore original clipboard and tell overlay to show input form
        clipboard.writeText(originalClipboard);
        callback(null, originalClipboard);
      }
    }, 120);
  });
}

// Simulate pasting enhanced result using ultra-fast native VBScript
function simulateKeystrokePaste(text) {
  clipboard.writeText(text);
  
  const pasteVbsPath = path.join(app.getPath('userData'), 'paste.vbs');
  try {
    fs.writeFileSync(pasteVbsPath, 'Set WshShell = CreateObject("WScript.Shell")\nWshShell.SendKeys "^v"');
  } catch (e) {
    console.error('Failed to write paste.vbs', e);
  }

  // Wait a small focus-settling delay (180ms is perfect for all system speeds), then trigger silent VBScript paste
  setTimeout(() => {
    exec(`wscript.exe "${pasteVbsPath}"`, () => {
      // Clean up paste VBScript
      try { fs.unlinkSync(pasteVbsPath); } catch (e) {}
    });
  }, 180);
}


// Core Trigger Flow
function triggerEnhanceFlow() {
  simulateKeystrokeCopy((capturedText, originalClipboard) => {
    createOverlayWindow();
    
    // Position window centered on active monitor
    // If text was selected, show inactive to prevent stealing editor focus and losing highlight
    if (capturedText && capturedText.trim()) {
      overlayWindow.showInactive();
    } else {
      overlayWindow.show();
      overlayWindow.focus();
    }
    
    // Wait until frontend is ready to receive data
    setTimeout(() => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('enhance-text', {
          text: capturedText || '',
          originalClipboard: originalClipboard
        });
      }
    }, 200);
  });
}

// Create Overlay Window
function createOverlayWindow() {
  if (overlayWindow) {
    overlayWindow.show();
    overlayWindow.focus();
    return;
  }

  overlayWindow = new BrowserWindow({
    width: 620,
    height: 440,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    overlayWindow.loadURL('http://localhost:5173');
    // overlayWindow.webContents.openDevTools({ mode: 'detach' }); // Uncomment to debug overlay
  } else {
    overlayWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  overlayWindow.on('blur', () => {
    if (overlayWindow) {
      overlayWindow.hide();
    }
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

// Create Settings Window
function openSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 820,
    height: 620,
    show: false,
    title: 'SpyHero Settings',
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Remove default menu
  settingsWindow.setMenu(null);

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    settingsWindow.loadURL('http://localhost:5173?view=settings');
  } else {
    settingsWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'settings' });
  }

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// IPC Receivers
ipcMain.handle('get-settings', () => {
  return settings;
});

ipcMain.on('save-settings', (event, newSettings) => {
  saveSettings(newSettings);
});

ipcMain.on('hide-overlay', () => {
  if (overlayWindow) {
    overlayWindow.hide();
  }
});

ipcMain.on('copy-clipboard', (event, text) => {
  clipboard.writeText(text);
});

ipcMain.on('open-settings', () => {
  if (overlayWindow) {
    overlayWindow.hide();
  }
  openSettingsWindow();
});

ipcMain.on('auto-paste', (event, text) => {
  if (overlayWindow) {
    if (overlayWindow.isFocused()) {
      overlayWindow.minimize();
    }
    overlayWindow.hide();
  }
  simulateKeystrokePaste(text);
});


ipcMain.on('toggle-startup', (event, enable) => {
  toggleStartupLauncher(enable);
});

// IPC: splash-ready (kept for compatibility, no-op now)
ipcMain.on('splash-ready', () => {});

// App Lifecycle — instant startup, no splash delay
app.disableHardwareAcceleration(); // reduces memory overhead for a non-GPU tray app

app.whenReady().then(() => {
  loadSettings();
  createTray();
  registerGlobalShortcut();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOverlayWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', (e) => {
  // Keep app running in tray background
  e.preventDefault();
});
