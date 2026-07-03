/**
 * Type-safe IPC bridge.
 * Wraps window.electronAPI exposed by preload/index.js.
 * Gracefully no-ops when running outside Electron (browser preview).
 */

const api = window.electronAPI || null

function invoke(channel, ...args) {
  if (!api) {
    console.warn('[IPC] No electronAPI – not in Electron?', channel)
    return Promise.resolve(null)
  }
  return api.invoke(channel, ...args)
}

function listen(channel, callback) {
  if (!api) return () => {}
  return api.on(channel, callback)   // returns unsubscribe fn
}

// ─── Window ────────────────────────────────────────────────────────────────────
export const windowAPI = {
  minimize: () => invoke('window:minimize'),
  maximize: () => invoke('window:maximize'),
  close   : () => invoke('window:close'),
}

// ─── WhatsApp ──────────────────────────────────────────────────────────────────
export const waAPI = {
  // One-time calls
  checkSession: ()            => invoke('wa:checkSession'),
  connect     : ()            => invoke('wa:connect'),
  getStatus   : ()            => invoke('wa:getStatus'),
  logout      : ()            => invoke('wa:logout'),
  loadContacts: ()            => invoke('wa:loadContacts'),
  sendMessage : (jid, msg)    => invoke('wa:sendMessage', { jid, message: msg }),
  sendMedia   : (jid, media)  => invoke('wa:sendMedia',  { jid, ...media }),

  // Event streams
  onQr            : (cb) => listen('wa:qr',             cb),
  onConnected     : (cb) => listen('wa:connected',       cb),
  onDisconnected  : (cb) => listen('wa:disconnected',    cb),
  onReconnecting  : (cb) => listen('wa:reconnecting',    cb),
  onContactsUpdate: (cb) => listen('wa:contactsUpdated', cb),
}

// ─── Contacts ──────────────────────────────────────────────────────────────────
export const contactsAPI = {
  getAll          : ()          => invoke('contacts:getAll'),
  search          : (q)         => invoke('contacts:search', q),
  openCsvDialog   : ()          => invoke('contacts:openCsvDialog'),
  importCsv       : (p)         => invoke('contacts:importCsv', p),
  exportVcf       : (contacts)  => invoke('contacts:exportVcf', contacts),
  removeDuplicates: ()          => invoke('contacts:removeDuplicates'),
}

// ─── Settings ──────────────────────────────────────────────────────────────────
export const settingsAPI = {
  get : ()     => invoke('settings:get'),
  save: (data) => invoke('settings:save', data),
}
