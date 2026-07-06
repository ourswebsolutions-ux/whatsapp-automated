'use strict'

const { contextBridge, ipcRenderer } = require('electron')

// ── Strict whitelists ─────────────────────────────────────────────────────────
const ALLOWED_INVOKE = new Set([
  // Window
  'window:minimize', 'window:maximize', 'window:close',
  // WhatsApp
  'wa:checkSession', 'wa:connect', 'wa:getStatus',
  'wa:logout', 'wa:loadContacts', 'wa:sendMessage', 'wa:sendMedia',
  // Contacts
  'contacts:getAll', 'contacts:search', 'contacts:openCsvDialog',
  'contacts:importCsv', 'contacts:exportVcf', 'contacts:removeDuplicates',
  // Settings
  'settings:get', 'settings:save',
])

const ALLOWED_LISTEN = new Set([
  'wa:qr', 'wa:connected', 'wa:disconnected', 'wa:reconnecting',
  'wa:contactsUpdated',
])

contextBridge.exposeInMainWorld('electronAPI', {
  // ── invoke ─────────────────────────────────────────────────────────────────
  invoke(channel, ...args) {
    if (!ALLOWED_INVOKE.has(channel)) {
      return Promise.reject(new Error(`IPC invoke not allowed: ${channel}`))
    }
    return ipcRenderer.invoke(channel, ...args)
  },

  // ── event listener (returns unsubscribe fn) ────────────────────────────────
  on(channel, callback) {
    if (!ALLOWED_LISTEN.has(channel)) {
      throw new Error(`IPC listen not allowed: ${channel}`)
    }
    const handler = (_, ...args) => callback(...args)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },



  // ── platform info ──────────────────────────────────────────────────────────
  platform: process.platform,

   api: {
    request: (data) => ipcRenderer.invoke('api:request', data)
  }
})


