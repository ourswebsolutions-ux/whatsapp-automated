import { useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '../store'
import { waAPI, contactsAPI, settingsAPI } from '../utils/ipc'

/**
 * useWhatsApp
 *
 * Lifecycle:
 *   1. On mount → load settings, check for saved session on disk.
 *   2. If session exists  → auto-call connect() (will restore without QR).
 *   3. If no session      → set phase:'disconnected' (shows Connect button).
 *   4. User presses Connect → call connect() explicitly.
 *   5. Baileys emits QR   → set phase:'qr', store qr data-url.
 *   6. User scans QR      → Baileys emits connected → load contacts.
 *   7. Any disconnect     → phase:'reconnecting' or 'disconnected'.
 */
export function useWhatsApp() {
  const setWaStatus  = useAppStore((s) => s.setWaStatus)
  const setContacts  = useAppStore((s) => s.setContacts)
  const setSettings  = useAppStore((s) => s.setSettings)
  const mountedRef   = useRef(true)

  // ── Helper: pull contacts from DB and put them in store ────────────────────
  const refreshContacts = useCallback(async () => {
    const all = await contactsAPI.getAll()
    if (mountedRef.current && Array.isArray(all)) {
      setContacts(all)
    }
  }, [setContacts])

  // ── Load persisted settings from DB ────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    const raw = await settingsAPI.get()
    if (!raw || !mountedRef.current) return
    setSettings({
      delayMin     : Number(raw.delayMin)      || 2,
      delayMax     : Number(raw.delayMax)      || 5,
      randomDelay  : raw.randomDelay           !== 'false',
      batchSize    : Number(raw.batchSize)     || 30,
      batchPause   : Number(raw.batchPause)    || 600,
      retryAttempts: Number(raw.retryAttempts) || 3,
      autoReconnect: raw.autoReconnect         !== 'false',
    })
  }, [setSettings])

  // ── Start WhatsApp (called either automatically or by user click) ──────────
  const connect = useCallback(async () => {
    setWaStatus({ phase: 'connecting', error: null })
    const result = await waAPI.connect()
    if (!mountedRef.current) return
    if (!result?.success && result?.error) {
      setWaStatus({ phase: 'disconnected', error: result.error })
    }
    // Connected or QR states are pushed via IPC events (see listeners below)
  }, [setWaStatus])

  // ── Logout ─────────────────────────────────────────────────────────────────
const logout = useCallback(async () => {
  try {
    const phone = useAppStore.getState().waStatus?.user?.phone

    // 1. Update DB (your Next.js API)
    if (phone) {
      await fetch("https://https://outreach.axorawebsolutions.com/api/hello", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      })
    }

    // 2. Logout from WhatsApp IPC
    await waAPI.logout()

    // 3. Clear UI state
    if (!mountedRef.current) return
    setWaStatus({
      phase: "disconnected",
      connected: false,
      user: null,
      qr: null,
      error: null,
    })

    setContacts([])
  } catch (err) {
    console.error("Logout failed:", err)
  }
}, [setWaStatus, setContacts])
  // ── Mount effect: attach IPC listeners then boot ───────────────────────────
  useEffect(() => {
    mountedRef.current = true

    // ── IPC listeners ─────────────────────────────────────────────────────────
    const offQr = waAPI.onQr((qr) => {
      if (!mountedRef.current) return
      setWaStatus({ phase: 'qr', qr, connected: false, error: null })
    })

    const offConnected = waAPI.onConnected(async (user) => {
      if (!mountedRef.current) return
      setWaStatus({ phase: 'connected', connected: true, user, qr: null, error: null })
      await refreshContacts()
    })

    const offDisconnected = waAPI.onDisconnected(() => {
      if (!mountedRef.current) return
      setWaStatus({ phase: 'disconnected', connected: false, user: null, qr: null })
      setContacts([])
    })

    const offReconnecting = waAPI.onReconnecting(() => {
      if (!mountedRef.current) return
      setWaStatus({ phase: 'reconnecting', connected: false })
    })

    const offContactsUpdate = waAPI.onContactsUpdate(async () => {
      if (mountedRef.current) await refreshContacts()
    })

    // ── Bootstrap ─────────────────────────────────────────────────────────────
    ;(async () => {
      await loadSettings()

      // Check if we already have an active socket (e.g. hot-reload in dev)
      const status = await waAPI.getStatus()
      if (!mountedRef.current) return

      if (status?.connected) {
        setWaStatus({ phase: 'connected', connected: true, user: status.user, qr: null })
        await refreshContacts()
        return
      }

      // Check whether a saved session (creds.json) exists on disk
      const { hasSession } = (await waAPI.checkSession()) || {}
      if (!mountedRef.current) return

      if (hasSession) {
        // Saved session → auto-reconnect without asking user to scan again
        await connect()
      } else {
        // No session → show Connect button
        setWaStatus({ phase: 'disconnected' })
      }
    })()

    return () => {
      mountedRef.current = false
      offQr?.()
      offConnected?.()
      offDisconnected?.()
      offReconnecting?.()
      offContactsUpdate?.()
    }
  }, [])   // run once

  return { connect, logout, refreshContacts }
}
