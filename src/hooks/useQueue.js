import { useRef, useCallback } from 'react'
import { useAppStore } from '../store'
import { waAPI } from '../utils/ipc'

/**
 * Sequential send-queue engine.
 *
 * Guarantees:
 *  - One message at a time, never concurrent
 *  - Configurable fixed or random inter-message delay
 *  - Batch pause after N messages
 *  - Pause / Resume / Stop / Retry-failed
 *  - Retry on transient failure (up to retryAttempts)
 *  - Live countdown displayed in UI
 */
export function useQueue() {
  const { contacts, selectedIds, message, settings, setQueue, resetQueue } =
    useAppStore()

  const pauseRef    = useRef(false)
  const stopRef     = useRef(false)
  const activeRef   = useRef(false)
  const timerRef    = useRef(null)

  // ── sleep that respects stop signal ────────────────────────────────────────
  const sleep = (ms) =>
    new Promise((res) => {
      timerRef.current = setTimeout(res, ms)
    })

  // ── second-by-second countdown, resolves when seconds reach 0 ─────────────
  const countdown = useCallback(async (seconds) => {
    let remaining = seconds
    setQueue({ countdown: remaining })

    await new Promise((resolve) => {
      const tick = setInterval(() => {
        remaining -= 1
        setQueue({ countdown: Math.max(0, remaining) })
        if (remaining <= 0) {
          clearInterval(tick)
          resolve()
        }
      }, 1_000)
      timerRef.current = tick
    })
  }, [setQueue])

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const getDelay = () => {
    const min = Number(settings.delayMin) || 2
    const max = Number(settings.delayMax) || 5
    if (settings.randomDelay) {
      return Math.floor(Math.random() * (max - min + 1) + min)
    }
    return min
  }

  const interpolate = (text, contact) =>
    text
      .replace(/\{\{name\}\}/g,  contact.name  || contact.phone)
      .replace(/\{\{phone\}\}/g, contact.phone)

  // ── send one message with retry logic ──────────────────────────────────────
  const sendWithRetry = async (contact, text, maxRetries) => {
    let lastError = null
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (stopRef.current) return { success: false, error: 'stopped' }
      const result = await waAPI.sendMessage(contact.jid, text)
      if (result?.success) return { success: true }
      lastError = result?.error || 'Unknown error'
      if (attempt < maxRetries) await sleep(2_000)
    }
    return { success: false, error: lastError }
  }

  // ── main send loop ─────────────────────────────────────────────────────────
  const start = useCallback(async (retryFailed = false) => {
    if (activeRef.current) return

    const storeState = useAppStore.getState()
    const queue      = storeState.queue
    const targets    = retryFailed
      ? queue.failedContacts
      : storeState.contacts.filter((c) => storeState.selectedIds.has(c.id))

    if (targets.length === 0 || !storeState.message.trim()) return

    pauseRef.current  = false
    stopRef.current   = false
    activeRef.current = true

    const total     = targets.length
    const batchSize = Number(settings.batchSize)     || 30
    const batchPause = Number(settings.batchPause)   || 600
    const maxRetries = Number(settings.retryAttempts) || 3

    let sent    = 0
    let failed  = 0
    const failedContacts = []

    setQueue({
      status: 'running', total, sent: 0, failed: 0,
      remaining: total, currentContact: null, countdown: 0,
      failedContacts: [],
    })

    for (let i = 0; i < targets.length; i++) {
      // ── stop ──────────────────────────────────────────────────────────────
      if (stopRef.current) break

      // ── pause ─────────────────────────────────────────────────────────────
      while (pauseRef.current && !stopRef.current) {
        await sleep(300)
      }
      if (stopRef.current) break

      const contact = targets[i]
      const text    = interpolate(useAppStore.getState().message, contact)

      setQueue({ currentContact: contact, remaining: total - i })

      // ── send ──────────────────────────────────────────────────────────────
      const result = await sendWithRetry(contact, text, maxRetries)

      if (result.success) {
        sent++
      } else {
        failed++
        failedContacts.push(contact)
      }
      setQueue({ sent, failed, failedContacts })

      // ── inter-message delay / batch pause ─────────────────────────────────
      const isLast = i === targets.length - 1
      if (!isLast && !stopRef.current) {
        const batchEnd = batchSize > 0 && (i + 1) % batchSize === 0
        if (batchEnd) {
          setQueue({ status: 'paused' })
          await countdown(batchPause)
          if (!stopRef.current) setQueue({ status: 'running' })
        } else {
          await countdown(getDelay())
        }
      }
    }

    clearTimer()
    activeRef.current = false

    setQueue({
      status        : stopRef.current ? 'stopped' : 'done',
      currentContact: null,
      countdown     : 0,
      remaining     : 0,
    })
  }, [settings, setQueue, countdown])

  const pause = useCallback(() => {
    pauseRef.current = true
    clearTimer()
    setQueue({ status: 'paused', countdown: 0 })
  }, [setQueue])

  const resume = useCallback(() => {
    pauseRef.current = false
    setQueue({ status: 'running' })
  }, [setQueue])

  const stop = useCallback(() => {
    stopRef.current   = true
    pauseRef.current  = false
    activeRef.current = false
    clearTimer()
    setQueue({ status: 'stopped', currentContact: null, countdown: 0 })
  }, [setQueue])

  const retry = useCallback(() => {
    start(true)
  }, [start])

  const reset = useCallback(() => {
    stopRef.current   = true
    pauseRef.current  = false
    activeRef.current = false
    clearTimer()
    resetQueue()
  }, [resetQueue])

  return { start, pause, resume, stop, retry, reset }
}
