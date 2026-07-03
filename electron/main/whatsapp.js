'use strict'



const path  = require('path')
const fs    = require('fs')
const { app } = require('electron')
const pino  = require('pino')

const SESSION_DIR = path.join(app.getPath('userData'), 'wa-session')

// Silent logger – Baileys is extremely verbose at any other level
const logger = pino({ level: 'silent' })

// ─── helpers ─────────────────────────────────────────────────────────────────
function parseJid(raw) {
  if (!raw) return null
  return raw.includes(':') ? raw.split(':')[0] + '@s.whatsapp.net' : raw
}

function phoneFromJid(jid) {
  return (jid || '').split('@')[0].split(':')[0].replace(/\D/g, '')
}

function isPersonalJid(jid) {
  return jid &&
    jid.endsWith('@s.whatsapp.net') &&
    !jid.includes('@g.us') &&
    !jid.includes('@broadcast') &&
    !jid.includes('@newsletter')
}

// ─── WhatsAppService ─────────────────────────────────────────────────────────
class WhatsAppService {
  constructor(mainWindow) {
    this.mainWindow   = mainWindow
    this.sock         = null
    this.saveCreds    = null
    this._connecting  = false
    this._stopReconnect = false

    // In-memory contact store (jid → {jid, name, phone})
    this._contacts    = new Map()

    this.status = {
      connected   : false,
      qr          : null,
      user        : null,
      reconnecting: false,
    }
  }

  // ── IPC emit helper ────────────────────────────────────────────────────────
  _emit(channel, data) {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(channel, data)
      }
    } catch (_) {}
  }

  // ── Public status snapshot ─────────────────────────────────────────────────
  getStatus() {
    return {
      connected   : this.status.connected,
      user        : this.status.user,
      qr          : this.status.qr,
      reconnecting: this.status.reconnecting,
    }
  }

  // ── Database (lazy) ────────────────────────────────────────────────────────
  _db() {
    if (!this.__db) {
      const { Database } = require('./database')
      this.__db = new Database()
    }
    return this.__db
  }

  // ── Save contacts to SQLite and emit update event ──────────────────────────
  _persistContacts(list) {
    if (!list || list.length === 0) return
    const valid = list.filter(c => isPersonalJid(c.jid))
    if (valid.length === 0) return
    try {
      this._db().upsertContacts(valid)
      this._emit('wa:contactsUpdated', valid.length)
    } catch (err) {
      console.error('[WA] DB upsert error:', err.message)
    }
  }

  // ── Core initialise / reconnect ────────────────────────────────────────────
  async initialize() {
    if (this._connecting) return { success: true, status: this.getStatus() }
    this._connecting    = true
    this._stopReconnect = false

    try {
const baileys = await import("@whiskeysockets/baileys")
      const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
} = baileys

      if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true })
      }

      const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)
      this.saveCreds = saveCreds

      const { version } = await fetchLatestBaileysVersion()

      this.sock = makeWASocket({
        version,
        logger,
        auth: {
          creds: state.creds,
          keys : makeCacheableSignalKeyStore(state.keys, logger),
        },
        browser                   : Browsers.macOS('Desktop'),
        printQRInTerminal         : false,
        generateHighQualityLinkPreview: false,
        syncFullHistory           : false,
        markOnlineOnConnect       : false,
        connectTimeoutMs          : 60_000,
        keepAliveIntervalMs       : 25_000,
        retryRequestDelayMs       : 2_000,
        maxMsgRetryCount          : 3,
        fireInitQueries           : true,
        emitOwnEvents             : true,
        shouldIgnoreJid: (jid) => !isPersonalJid(jid) && !jid.endsWith('@g.us'),
        getMessage: async () => undefined,
      })

      // ── Persist credentials on every change ────────────────────────────────
      this.sock.ev.on('creds.update', saveCreds)

      // ── Connection lifecycle ───────────────────────────────────────────────
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        // ── QR code generated ───────────────────────────────────────────────
        if (qr) {
          const QRCode   = require('qrcode')
          const qrDataUrl = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            margin : 2,
            width  : 300,
            color  : { dark: '#000000', light: '#ffffff' },
          })
          this.status.qr          = qrDataUrl
          this.status.connected   = false
          this.status.reconnecting = false
          this._emit('wa:qr', qrDataUrl)
        }

        // ── Successfully connected ──────────────────────────────────────────
        if (connection === 'open') {
          this._connecting          = false
          this.status.connected     = true
          this.status.qr           = null
          this.status.reconnecting  = false

          const me = this.sock.user
          this.status.user = {
            name : me?.name || me?.verifiedName || me?.notify || 'WhatsApp User',
            phone: phoneFromJid(me?.id || ''),
            jid  : parseJid(me?.id || ''),
          }

          this._emit('wa:connected', this.status.user)

          // Immediately fetch and sync all contacts after connection
          await this._syncAllContacts()
        }

        // ── Connection closed ───────────────────────────────────────────────
        if (connection === 'close') {
          this._connecting       = false
          this.status.connected  = false
          this.status.user       = null

          const statusCode = lastDisconnect?.error?.output?.statusCode
          const loggedOut  = statusCode === DisconnectReason.loggedOut

          if (loggedOut || this._stopReconnect) {
            this.status.qr          = null
            this.status.reconnecting = false
            this._emit('wa:disconnected', { reason: loggedOut ? 'logged_out' : 'stopped' })
            if (loggedOut) this._clearSession()
          } else {
            // Transient disconnect — reconnect after delay
            this.status.reconnecting = true
            this._emit('wa:reconnecting', { code: statusCode })
            setTimeout(() => {
              if (!this._stopReconnect) this.initialize()
            }, 5_000)
          }
        }
      })

      // ── contacts.upsert  (initial bulk load on first connection) ───────────
      this.sock.ev.on('contacts.upsert', (contacts) => {
        const mapped = contacts
          .filter(c => isPersonalJid(c.id))
          .map(c => ({
            jid  : c.id,
            name : c.name || c.notify || c.verifiedName || '',
            phone: phoneFromJid(c.id),
          }))
        mapped.forEach(c => this._contacts.set(c.jid, c))
        this._persistContacts(mapped)
      })

      // ── contacts.update  (name changes, status updates) ────────────────────
      this.sock.ev.on('contacts.update', (updates) => {
        const mapped = updates
          .filter(c => isPersonalJid(c.id))
          .map(c => {
            const existing = this._contacts.get(c.id) || {}
            const merged = {
              jid  : c.id,
              name : c.name || c.notify || c.verifiedName || existing.name || '',
              phone: phoneFromJid(c.id),
            }
            this._contacts.set(c.id, merged)
            return merged
          })
        this._persistContacts(mapped)
      })

      // ── chats.set — extract participants as contacts ────────────────────────
      this.sock.ev.on('chats.set', ({ chats }) => {
        const fromChats = []
        for (const chat of (chats || [])) {
          if (!chat.id) continue
          if (isPersonalJid(chat.id)) {
            fromChats.push({
              jid  : chat.id,
              name : chat.name || '',
              phone: phoneFromJid(chat.id),
            })
          }
        }
        if (fromChats.length > 0) {
          fromChats.forEach(c => this._contacts.set(c.jid, c))
          this._persistContacts(fromChats)
        }
      })

      // ── messages.upsert — extract sender as contact ────────────────────────
      this.sock.ev.on('messages.upsert', ({ messages }) => {
        const fromMsgs = []
        for (const msg of (messages || [])) {
          const jid = msg.key?.remoteJid
          if (!jid || !isPersonalJid(jid) || msg.key?.fromMe) continue
          const pushName = msg.pushName || ''
          if (!this._contacts.has(jid)) {
            const c = { jid, name: pushName, phone: phoneFromJid(jid) }
            this._contacts.set(jid, c)
            fromMsgs.push(c)
          } else if (pushName) {
            const existing = this._contacts.get(jid)
            if (!existing.name && pushName) {
              existing.name = pushName
              fromMsgs.push(existing)
            }
          }
        }
        if (fromMsgs.length > 0) this._persistContacts(fromMsgs)
      })

      this._connecting = false
      return { success: true, status: this.getStatus() }

    } catch (err) {
      this._connecting = false
      console.error('[WA] initialize error:', err)
      return { success: false, error: err.message }
    }
  }

  // ── Sync all contacts on fresh connection ──────────────────────────────────
  async _syncAllContacts() {
    try {
      // contacts.upsert fires automatically on connection for existing sessions.
      // For a brand-new session we trigger onWhatsApp queries or rely on chat
      // history sync.  We also read whatever Baileys already has in its store.
      const store = this.sock?.store
      if (store?.contacts) {
        const mapped = Object.values(store.contacts)
          .filter(c => isPersonalJid(c.id))
          .map(c => ({
            jid  : c.id,
            name : c.name || c.notify || c.verifiedName || '',
            phone: phoneFromJid(c.id),
          }))
        mapped.forEach(c => this._contacts.set(c.jid, c))
        this._persistContacts(mapped)
      }
    } catch (_) {}
  }

  // ── Public: explicit contact refresh ──────────────────────────────────────
  async loadContacts() {
    if (!this.sock || !this.status.connected) {
      return { success: false, error: 'Not connected' }
    }
    try {
      // Return everything we have collected in the DB
      const all = this._db().getAllContacts()
      return { success: true, count: all.length }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // ── Send a text message ────────────────────────────────────────────────────
  async sendMessage(jid, text) {
    if (!this.sock || !this.status.connected) {
      return { success: false, error: 'Not connected' }
    }
    try {
      // Normalise JID
      const target = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`
      await this.sock.sendMessage(target, { text })
      return { success: true }
    } catch (err) {
      console.error('[WA] sendMessage error:', err.message)
      return { success: false, error: err.message }
    }
  }

  // ── Send a media message (image / video / document / audio) ───────────────
  async sendMedia(jid, { type, buffer, mimetype, filename, caption }) {
    if (!this.sock || !this.status.connected) {
      return { success: false, error: 'Not connected' }
    }
    try {
      const target  = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`
      const content = {}

      switch (type) {
        case 'image':
          content.image   = buffer
          content.mimetype = mimetype || 'image/jpeg'
          if (caption) content.caption = caption
          break
        case 'video':
          content.video   = buffer
          content.mimetype = mimetype || 'video/mp4'
          if (caption) content.caption = caption
          break
        case 'audio':
          content.audio   = buffer
          content.mimetype = mimetype || 'audio/mpeg'
          content.ptt      = false
          break
        case 'document':
        default:
          content.document = buffer
          content.mimetype = mimetype || 'application/octet-stream'
          content.fileName = filename || 'file'
          if (caption) content.caption = caption
          break
      }

      await this.sock.sendMessage(target, content)
      return { success: true }
    } catch (err) {
      console.error('[WA] sendMedia error:', err.message)
      return { success: false, error: err.message }
    }
  }

  // ── Logout and clear session ───────────────────────────────────────────────
  async logout() {
    this._stopReconnect = true
    try {
      if (this.sock && this.status.connected) {
        await this.sock.logout()
      }
    } catch (_) {}
    this._teardown()
    this._clearSession()
  }

  // ── Graceful shutdown (app quit) ───────────────────────────────────────────
  async disconnect() {
    this._stopReconnect = true
    this._teardown()
  }

  // ── Internal: destroy socket ───────────────────────────────────────────────
  _teardown() {
    try {
      this.sock?.ev?.removeAllListeners()
      this.sock?.end?.()
    } catch (_) {}
    this.sock         = null
    this.status       = { connected: false, qr: null, user: null, reconnecting: false }
    this._connecting  = false
    this._contacts.clear()
  }

  // ── Internal: wipe session files ──────────────────────────────────────────
  _clearSession() {
    try {
      if (fs.existsSync(SESSION_DIR)) {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true })
      }
    } catch (_) {}
  }

  // ── Check whether a saved session exists ──────────────────────────────────
  hasSession() {
    try {
      const creds = path.join(SESSION_DIR, 'creds.json')
      return fs.existsSync(creds)
    } catch (_) {
      return false
    }
  }
}

module.exports = { WhatsAppService }
