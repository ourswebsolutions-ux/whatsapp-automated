# WhatsApp Bulk Sender

Production-ready desktop application for sending personalised WhatsApp messages to multiple contacts, built with Electron, React, SQLite and Baileys.

---

## Technology Stack

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Shell        | Electron 31                       |
| UI           | React 18 + Vite + Tailwind CSS    |
| State        | Zustand                           |
| WhatsApp     | Baileys (@whiskeysockets/baileys) |
| Database     | SQLite via better-sqlite3         |
| IPC          | Electron contextBridge (secure)   |

---

## Project Structure

```
whatsapp-sender/
├── electron/
│   ├── main/
│   │   ├── index.js        ← Electron main process + IPC handlers
│   │   ├── database.js     ← SQLite wrapper (contacts, settings, session)
│   │   └── whatsapp.js     ← Baileys WhatsApp service
│   └── preload/
│       └── index.js        ← Secure contextBridge IPC bridge
│
├── src/
│   ├── components/
│   │   ├── Dashboard/      ← Status overview
│   │   ├── Contacts/       ← Contact list, search, select, import/export
│   │   ├── Composer/       ← Message editor with variables + emoji
│   │   ├── Queue/          ← Send queue with live progress
│   │   └── Settings/       ← Delay, batch, retry configuration
│   ├── hooks/
│   │   ├── useWhatsApp.js  ← WA connection lifecycle
│   │   └── useQueue.js     ← Sending engine (sequential, delay, batch)
│   ├── store/
│   │   └── index.js        ← Zustand global state
│   └── utils/
│       └── ipc.js          ← Type-safe IPC wrapper
│
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A WhatsApp account on your phone

### Installation

```bash
npm install
```

> **Note:** `better-sqlite3` requires native compilation. On Windows, install
> [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools).
> On macOS/Linux, Xcode Command Line Tools / build-essential are needed.

### Development

```bash
npm run dev
```

This starts Vite (port 5173) and Electron simultaneously. The app will open with DevTools enabled.

### Production Build

```bash
npm run build
```

Outputs:
- `dist/` — compiled React app
- `dist-electron/` — platform installer (`.exe` / `.dmg` / `.AppImage`)

---

## Architecture

### Security Model

- **contextIsolation: true** — renderer cannot access Node.js APIs directly
- **nodeIntegration: false** — no direct Node in renderer
- **preload.js whitelist** — only explicitly allowed IPC channels are exposed
- All IPC inputs are validated in the main process before use

### IPC Channel Map

| Channel                    | Direction     | Purpose                        |
|----------------------------|---------------|--------------------------------|
| `wa:init`                  | renderer→main | Initialise / reconnect WA      |
| `wa:logout`                | renderer→main | Log out and clear session      |
| `wa:sendMessage`           | renderer→main | Send a single message          |
| `wa:loadContacts`          | renderer→main | Sync contacts from WA          |
| `wa:qr`                    | main→renderer | QR code data URL               |
| `wa:connected`             | main→renderer | Connected + user info          |
| `wa:disconnected`          | main→renderer | Session ended                  |
| `contacts:getAll`          | renderer→main | Fetch all DB contacts          |
| `contacts:search`          | renderer→main | Search contacts                |
| `contacts:importCsv`       | renderer→main | Bulk import from CSV           |
| `contacts:exportVcf`       | renderer→main | Export selected to VCF         |
| `contacts:removeDuplicates`| renderer→main | Deduplicate by phone           |
| `settings:get`             | renderer→main | Load settings from DB          |
| `settings:save`            | renderer→main | Persist settings to DB         |

### Database Schema

```sql
-- Contacts loaded from WhatsApp or imported via CSV
CREATE TABLE contacts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  jid        TEXT    NOT NULL UNIQUE,   -- WhatsApp JID e.g. 447911123456@s.whatsapp.net
  name       TEXT    NOT NULL DEFAULT '',
  phone      TEXT    NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Key-value settings store
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Single-row WhatsApp session cache (id = 1 always)
CREATE TABLE session (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  data       TEXT    NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
```

### Sending Queue Engine

The queue engine (`src/hooks/useQueue.js`) enforces:

1. **Sequential delivery** — one message at a time, never concurrent
2. **Message delay** — configurable fixed or random delay after each send
3. **Batch pause** — longer pause after every N messages
4. **Pause / Resume** — halts between messages; resumes from same position
5. **Stop** — requires double-confirm to prevent accidents
6. **Retry failed** — re-queues only the failed contacts

### Variable Interpolation

Messages support two built-in variables:

| Variable    | Replaced with                         |
|-------------|---------------------------------------|
| `{{name}}`  | Contact's name (falls back to phone)  |
| `{{phone}}` | Contact's phone number                |

### CSV Import Format

Expected columns (header row, comma-separated):

```csv
name,phone
John Doe,447911123456
Jane Smith,447922234567
```

- Column names are matched case-insensitively
- Phone numbers should not include `+` or spaces (they are stripped automatically)

---

## Settings Reference

| Setting           | Default | Description                                     |
|-------------------|---------|-------------------------------------------------|
| `delayMin`        | 2s      | Minimum delay between messages                  |
| `delayMax`        | 5s      | Maximum delay (only used with random delay on)  |
| `randomDelay`     | true    | Randomise delay within min–max range            |
| `batchSize`       | 30      | Messages per batch before long pause            |
| `batchPause`      | 600s    | Pause duration between batches (10 minutes)     |
| `retryAttempts`   | 3       | Times to retry a failed message                 |
| `autoReconnect`   | true    | Reconnect automatically on drop                 |

---

## Platform Support

| Platform | Format      | Notes                                 |
|----------|-------------|---------------------------------------|
| Windows  | NSIS `.exe` | Requires Visual C++ Build Tools       |
| macOS    | `.dmg`      | Requires Xcode CLI Tools              |
| Linux    | `.AppImage` | No install needed, self-contained     |

---

## WhatsApp Session

- Session files are stored in `<userData>/wa-session/` using Baileys `useMultiFileAuthState`
- On first launch: QR code is shown for scanning
- On subsequent launches: session is restored automatically (no re-scan)
- Logout clears the session directory and requires a new QR scan

---

## Legal Notice

This software is for legitimate business use only. Ensure you comply with WhatsApp's Terms of Service and applicable anti-spam laws (CAN-SPAM, GDPR, etc.) in your jurisdiction. Always obtain explicit consent before sending messages.
