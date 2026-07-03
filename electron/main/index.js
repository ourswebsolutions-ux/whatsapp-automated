'use strict'
const { autoUpdater } = require('electron-updater')
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs   = require('fs')
console.count("MAIN PROCESS LOADED");
console.log("PID:", process.pid);
console.log("FILE:", __filename);
const isDev = process.env.NODE_ENV === 'development'

// ── Singletons (lazy-loaded after app ready) ──────────────────────────────────
let db, waService, mainWindow

function getDb() {
 

  if (!db) {
    try {
      const { Database } = require("./database");
      db = new Database();
      console.log("Database created successfully");
    } catch (err) {
      console.error("Database creation failed:", err);
      throw err;
    }

  }

  
  return db;
}
function getWA() {
  if (!waService) {
    const { WhatsAppService } = require('./whatsapp')
    waService = new WhatsAppService(mainWindow)
  }
  return waService
}

// ── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
  width: 1280,
  height: 800,
  minWidth: 1024,
  minHeight: 680,
  frame: false,
  titleBarStyle: 'hidden',
  backgroundColor: '#1a1a2e',

  icon: path.join(__dirname, '../../build/logo.png'),

  webPreferences: {
    preload: path.join(__dirname, '../preload/index.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,
    webSecurity: true,
  },

  show: false,
})

  mainWindow.once('ready-to-show', () => mainWindow.show())

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // mainWindow.webContents.openDevTools()   // comment out unless debugging
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  createWindow()

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', async () => {
  if (waService) await waService.disconnect()
  if (db) db.close()
})

autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...')
})

autoUpdater.on('update-available', info => {
  console.log('Update available:', info.version)
})

autoUpdater.on('update-not-available', () => {
  console.log('App is up to date')
})

autoUpdater.on('download-progress', progress => {
  console.log(`Downloading ${Math.round(progress.percent)}%`)
})

autoUpdater.on('update-downloaded', info => {
  console.log('Update downloaded:', info.version)

  autoUpdater.quitAndInstall()
})

autoUpdater.on('error', err => {
  console.error('Auto Update Error:', err)
})
// ═══════════════════════════════════════════════════════════════════════════════
// WINDOW CONTROLS
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize()
})
ipcMain.handle('window:close', () => mainWindow?.close())

// ═══════════════════════════════════════════════════════════════════════════════
// WHATSAPP IPC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * wa:checkSession — does a saved session exist on disk?
 * Renderer calls this on startup to decide whether to show "Connect" button
 * or immediately begin reconnection.
 */
ipcMain.handle('wa:checkSession', () => {
  try {
    return { hasSession: getWA().hasSession() }
  } catch (_) {
    return { hasSession: false }
  }
})

/**
 * wa:connect — user pressed "Connect WhatsApp".
 * Starts Baileys; QR or auto-reconnect fires via IPC events.
 */
ipcMain.handle('wa:connect', async () => {
  try {
    return await getWA().initialize()
  } catch (err) {
    return { success: false, error: err.message }
  }
})

/**
 * wa:getStatus — current connection snapshot.
 */
ipcMain.handle('wa:getStatus', () => {
  try {
    return getWA().getStatus()
  } catch (_) {
    return { connected: false, qr: null, user: null, reconnecting: false }
  }
})

/**
 * wa:logout — sign out and delete session files.
 */
ipcMain.handle('wa:logout', async () => {
  try {
    await getWA().logout()
    waService = null   // allow fresh instance on next connect
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

/**
 * wa:loadContacts — refresh contacts from WhatsApp and return count.
 */
ipcMain.handle('wa:loadContacts', async () => {
  try {
    return await getWA().loadContacts()
  } catch (err) {
    return { success: false, error: err.message }
  }
})

/**
 * wa:sendMessage — send a single text message to one JID.
 */
ipcMain.handle('wa:sendMessage', async (_, { jid, message }) => {
  if (!jid || typeof message !== 'string' || message.trim().length === 0) {
    return { success: false, error: 'Invalid parameters' }
  }
  try {
    return await getWA().sendMessage(jid, message)
  } catch (err) {
    return { success: false, error: err.message }
  }
})

/**
 * wa:sendMedia — send image / video / document / audio to one JID.
 * payload: { jid, type, buffer (base64), mimetype, filename, caption }
 */
ipcMain.handle('wa:sendMedia', async (_, { jid, type, bufferB64, mimetype, filename, caption }) => {
  if (!jid || !type || !bufferB64) {
    return { success: false, error: 'Invalid media parameters' }
  }
  try {
    const buffer = Buffer.from(bufferB64, 'base64')
    return await getWA().sendMedia(jid, { type, buffer, mimetype, filename, caption })
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACTS IPC
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('contacts:getAll', () => {
  try { return getDb().getAllContacts() }
  catch (_) { return [] }
})

ipcMain.handle('contacts:search', (_, query) => {
  if (typeof query !== 'string') return []
  try { return getDb().searchContacts(query) }
  catch (_) { return [] }
})

ipcMain.handle('contacts:openCsvDialog', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    filters   : [{ name: 'CSV', extensions: ['csv'] }],
    properties: ['openFile'],
  })
  return filePaths?.[0] || null
})

ipcMain.handle('contacts:importCsv', (_, csvPath) => {
  try {
    const content  = fs.readFileSync(csvPath, 'utf-8')
    const lines    = content.split('\n').filter(l => l.trim())
    const headers  = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/["']/g, ''))
    const nameIdx  = headers.findIndex(h => h.includes('name'))
    const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('number') || h.includes('mobile'))

    if (phoneIdx === -1) return { success: false, error: 'No phone/number column found' }

    let imported = 0
    for (let i = 1; i < lines.length; i++) {
      const cols  = lines[i].split(',').map(c => c.trim().replace(/["']/g, ''))
      const rawPhone = cols[phoneIdx]?.replace(/\D/g, '') || ''
      const name  = nameIdx !== -1 ? cols[nameIdx] || '' : ''
      if (rawPhone.length >= 7) {
        getDb().upsertContact({
          phone: rawPhone,
          name,
          jid: `${rawPhone}@s.whatsapp.net`,
        })
        imported++
      }
    }
    return { success: true, imported }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('contacts:exportVcf', async (_, contacts) => {
  if (!Array.isArray(contacts)) return { success: false, error: 'Invalid contacts' }
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'contacts.vcf',
      filters    : [{ name: 'VCard', extensions: ['vcf'] }],
    })
    if (!filePath) return { success: false, error: 'Cancelled' }

    const vcf = contacts.map(c => [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${c.name || c.phone}`,
      `TEL;TYPE=CELL:+${c.phone}`,
      'END:VCARD',
    ].join('\r\n')).join('\r\n\r\n')

    fs.writeFileSync(filePath, vcf, 'utf-8')
    return { success: true, path: filePath }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('contacts:removeDuplicates', () => {
  try {
    const removed = getDb().removeDuplicateContacts()
    return { success: true, removed }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS IPC
// ═══════════════════════════════════════════════════════════════════════════════
ipcMain.handle('settings:get', () => {
  try { return getDb().getSettings() }
  catch (_) { return {} }
})

ipcMain.handle('settings:save', (_, settings) => {
  if (typeof settings !== 'object' || settings === null) {
    return { success: false, error: 'Invalid settings' }
  }
  try {
    getDb().saveSettings(settings)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})
