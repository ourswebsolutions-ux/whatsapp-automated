'use strict'

console.log("Electron:", process.versions.electron)
console.log("Node:", process.versions.node)
console.log("Modules ABI:", process.versions.modules)

// const Database = require("better-sqlite3")

const path = require('path')
const { app } = require('electron')
const Database = require('better-sqlite3')

console.log("better-sqlite3 loaded successfully")

const DB_PATH = path.join(app.getPath('userData'), 'whasender.db')

class AppDatabase {
  constructor() {  
console.count("AppDatabase Created")
       console.trace("Database Constructor")

    this.db = new Database(DB_PATH)

  console.log("SQLite Database Created")
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this._migrate()
  }

  _migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS contacts (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        jid        TEXT    NOT NULL UNIQUE,
        name       TEXT    NOT NULL DEFAULT '',
        phone      TEXT    NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
      );

      CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
      CREATE INDEX IF NOT EXISTS idx_contacts_name  ON contacts(name);

      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS session (
        id         INTEGER PRIMARY KEY CHECK (id = 1),
        data       TEXT    NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
      );
    `)

    // Seed default settings
    const defaults = {
      delayMin: '2',
      delayMax: '5',
      randomDelay: 'true',
      batchSize: '30',
      batchPause: '600',
      retryAttempts: '3',
      autoReconnect: 'true',
    }
    const insert = this.db.prepare(
      `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`
    )
    const insertMany = this.db.transaction((entries) => {
      for (const [k, v] of entries) insert.run(k, v)
    })
    insertMany(Object.entries(defaults))
  }

  // ─── Contacts ──────────────────────────────────────────────────────────────
  getAllContacts() {
    return this.db.prepare(
      `SELECT id, jid, name, phone FROM contacts ORDER BY name ASC, phone ASC`
    ).all()
  }

  searchContacts(query) {
    const q = `%${query}%`
    return this.db.prepare(
      `SELECT id, jid, name, phone FROM contacts
       WHERE name LIKE ? OR phone LIKE ?
       ORDER BY name ASC LIMIT 500`
    ).all(q, q)
  }

  upsertContact({ jid, name, phone }) {
    return this.db.prepare(
      `INSERT INTO contacts (jid, name, phone) VALUES (?, ?, ?)
       ON CONFLICT(jid) DO UPDATE SET name = excluded.name, phone = excluded.phone`
    ).run(jid, name || '', phone)
  }

  upsertContacts(contacts) {
    const stmt = this.db.prepare(
      `INSERT INTO contacts (jid, name, phone) VALUES (?, ?, ?)
       ON CONFLICT(jid) DO UPDATE SET name = excluded.name, phone = excluded.phone`
    )
    const run = this.db.transaction((list) => {
      for (const c of list) stmt.run(c.jid, c.name || '', c.phone)
    })
    run(contacts)
  }

  removeDuplicateContacts() {
    const result = this.db.prepare(`
      DELETE FROM contacts
      WHERE id NOT IN (
        SELECT MIN(id) FROM contacts GROUP BY phone
      )
    `).run()
    return result.changes
  }

  // ─── Settings ──────────────────────────────────────────────────────────────
  getSettings() {
    const rows = this.db.prepare(`SELECT key, value FROM settings`).all()
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  }

  saveSettings(settings) {
    const stmt = this.db.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    const run = this.db.transaction((entries) => {
      for (const [k, v] of entries) stmt.run(k, String(v))
    })
    run(Object.entries(settings))
  }

  // ─── Session ───────────────────────────────────────────────────────────────
  getSession() {
    const row = this.db.prepare(`SELECT data FROM session WHERE id = 1`).get()
    if (!row) return null
    try { return JSON.parse(row.data) } catch { return null }
  }

  saveSession(data) {
    this.db.prepare(
      `INSERT INTO session (id, data, updated_at) VALUES (1, ?, strftime('%s','now'))
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
    ).run(JSON.stringify(data))
  }

  clearSession() {
    this.db.prepare(`DELETE FROM session WHERE id = 1`).run()
  }

  close() {
    this.db.close()
  }
}

module.exports = { Database: AppDatabase }
