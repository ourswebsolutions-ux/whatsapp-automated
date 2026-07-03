import { create } from 'zustand'

export const useAppStore = create((set) => ({
  // ── Navigation ──────────────────────────────────────────────────────────────
  activeTab  : 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // ── WhatsApp connection ────────────────────────────────────────────────────
  // phase:
  //   'idle'         → app just opened, checking for saved session
  //   'disconnected' → no session / logged out — show Connect button
  //   'connecting'   → user clicked Connect, waiting for QR or open
  //   'qr'           → QR is displayed, waiting for scan
  //   'reconnecting' → transient drop, auto-reconnecting
  //   'connected'    → fully connected
  waStatus: {
    phase       : 'idle',   // see above
    connected   : false,
    user        : null,     // { name, phone, jid }
    qr          : null,     // base64 data-url
    error       : null,
  },
  setWaStatus: (patch) =>
    set((s) => ({ waStatus: { ...s.waStatus, ...patch } })),

  // ── Contacts ────────────────────────────────────────────────────────────────
  contacts    : [],
  selectedIds : new Set(),
  setContacts : (contacts) => set({ contacts }),
  toggleContact: (id) => set((s) => {
    const next = new Set(s.selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    return { selectedIds: next }
  }),
  selectAll  : () => set((s) => ({
    selectedIds: new Set(s.contacts.map(c => c.id)),
  })),
  deselectAll: () => set({ selectedIds: new Set() }),

  // ── Message ─────────────────────────────────────────────────────────────────
  message   : '',
  setMessage: (message) => set({ message }),

  // ── Settings ────────────────────────────────────────────────────────────────
  settings: {
    delayMin     : 2,
    delayMax     : 5,
    randomDelay  : true,
    batchSize    : 30,
    batchPause   : 600,
    retryAttempts: 3,
    autoReconnect: true,
  },
  setSettings: (settings) => set({ settings }),

  // ── Queue / sending ─────────────────────────────────────────────────────────
  queue: {
    status        : 'idle',   // idle | running | paused | stopped | done
    total         : 0,
    sent          : 0,
    failed        : 0,
    remaining     : 0,
    currentContact: null,
    countdown     : 0,
    failedContacts: [],
  },
  setQueue  : (patch) => set((s) => ({ queue: { ...s.queue, ...patch } })),
  resetQueue: () => set({
    queue: {
      status: 'idle', total: 0, sent: 0, failed: 0,
      remaining: 0, currentContact: null, countdown: 0, failedContacts: [],
    },
  }),
}))
