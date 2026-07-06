import React, { useState,useEffect } from 'react'
import { useAppStore } from '../../store'
import { useQueue } from '../../hooks/useQueue'

const STATUS_CONFIG = {
  idle:    { label: 'Ready',     color: 'text-slate-400',    bg: 'bg-slate-700',        dot: 'bg-slate-500' },
  running: { label: 'Sending',   color: 'text-accent-green', bg: 'bg-accent-green/20',  dot: 'bg-accent-green animate-ping-slow' },
  paused:  { label: 'Paused',    color: 'text-accent-amber', bg: 'bg-accent-amber/20',  dot: 'bg-accent-amber animate-pulse' },
  stopped: { label: 'Stopped',   color: 'text-accent-red',   bg: 'bg-accent-red/20',    dot: 'bg-accent-red' },
  done:    { label: 'Complete',  color: 'text-accent-green', bg: 'bg-accent-green/20',  dot: 'bg-accent-green' },
}

function CountdownRing({ seconds, total }) {
  if (!total || seconds === 0) return null
  const radius  = 20
  const circum  = 2 * Math.PI * radius
  const frac    = Math.max(0, Math.min(1, seconds / total))
  const offset  = circum * (1 - frac)

  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r={radius} fill="none" stroke="#1e2a3a" strokeWidth="4"/>
        <circle
          cx="25" cy="25" r={radius} fill="none"
          stroke="#25D366" strokeWidth="4"
          strokeDasharray={circum}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s linear' }}
        />
      </svg>
      <span className="text-sm font-bold text-white z-10">{seconds}</span>
    </div>
  )
}

export default function QueueView() {
  const queue       = useAppStore((s) => s.queue)
  const message     = useAppStore((s) => s.message)
  const selectedIds = useAppStore((s) => s.selectedIds)
  const contacts    = useAppStore((s) => s.contacts)
  const settings    = useAppStore((s) => s.settings)
  const setTab      = useAppStore((s) => s.setActiveTab)
const waStatus = useAppStore((s) => s.waStatus)
  const [user, setUser] = useState(null)

const   phone=waStatus.user.phone
console.log(phone,"this is the wahtsap phone")
useEffect(() => {
  const fetchUser = async () => {
    try {
     const res = await fetch(`//https://outreach.axorawebsolutions.com/api/hello?phone=${phone}`, {
  method: "GET",
});
      const text = await res.text();
console.log("RAW RESPONSE:", text);

const data = JSON.parse(text);

     console.log(data,"helo")
      if (!res.ok) {
        console.error(data.message);
        setUser(null);
        return;
      }

      setUser(data.data);
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    }
  };

  if (phone) {
    fetchUser();
  }
}, []);
console.log(user,"user")

const canSend = user?.status === 'ACTIVE'
console.log(canSend)

  const { start, pause, resume, stop, retry, reset } = useQueue()

  const [confirmStop, setConfirmStop] = useState(false)

  const cfg = STATUS_CONFIG[queue.status] || STATUS_CONFIG.idle

  const selectedContacts = contacts.filter((c) => selectedIds.has(c.id))
  const progress = queue.total > 0 ? Math.round((queue.sent / queue.total) * 100) : 0

  const canStart = queue.status === 'idle' && selectedIds.size > 0 && message.trim().length > 0 && canSend
  const isActive = queue.status === 'running' || queue.status === 'paused'

  // max delay for countdown ring reference
  const maxDelay = Math.max(Number(settings.delayMax) || 5, Number(settings.batchPause) || 600)

  const handleStop = () => {
    if (confirmStop) {
      stop()
      setConfirmStop(false)
    } else {
      setConfirmStop(true)
      setTimeout(() => setConfirmStop(false), 3000)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Send Queue</h1>
            <p className="text-xs text-slate-500 mt-0.5">Monitor and control message delivery</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${cfg.bg}`}>
            <div className={`w-2 h-2 rounded-full ${cfg.dot}`}/>
            <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {/* Pre-flight checks */}
        {queue.status === 'idle' && (
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">Pre-flight Check</h3>
            <div className="space-y-2">
              {[
                {
                  ok: selectedIds.size > 0,
                  pass: `${selectedIds.size} contacts selected`,
                  fail: (
                    <span>No contacts selected —{' '}
                      <button onClick={() => setTab('contacts')} className="underline text-accent-blue">select contacts</button>
                    </span>
                  ),
                },
                {
                  ok: message.trim().length > 0,
                  pass: 'Message is ready',
                  fail: (
                    <span>No message written —{' '}
                      <button onClick={() => setTab('composer')} className="underline text-accent-blue">write a message</button>
                    </span>
                  ),
                },
              ].map((check, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {check.ok
                    ? <svg className="w-4 h-4 text-accent-green flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                    : <svg className="w-4 h-4 text-accent-red flex-shrink-0"   fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                  }
                  <span className={check.ok ? 'text-slate-300' : 'text-slate-400'}>{check.ok ? check.pass : check.fail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Queue Configuration summary */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Sending Configuration</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-secondary rounded-lg p-3">
              <div className="text-xs text-slate-500">Delay</div>
              <div className="text-sm font-semibold text-white mt-0.5">
                {settings.randomDelay
                  ? `${settings.delayMin}–${settings.delayMax}s random`
                  : `${settings.delayMin}s fixed`}
              </div>
            </div>
            <div className="bg-surface-secondary rounded-lg p-3">
              <div className="text-xs text-slate-500">Batch Size</div>
              <div className="text-sm font-semibold text-white mt-0.5">
                {settings.batchSize} messages
              </div>
            </div>
            <div className="bg-surface-secondary rounded-lg p-3">
              <div className="text-xs text-slate-500">Batch Pause</div>
              <div className="text-sm font-semibold text-white mt-0.5">
                {settings.batchPause >= 60
                  ? `${Math.floor(settings.batchPause / 60)}m ${settings.batchPause % 60}s`
                  : `${settings.batchPause}s`}
              </div>
            </div>
            <div className="bg-surface-secondary rounded-lg p-3">
              <div className="text-xs text-slate-500">Retry Attempts</div>
              <div className="text-sm font-semibold text-white mt-0.5">
                {settings.retryAttempts}x
              </div>
            </div>
          </div>
        </div>

        {/* Live Progress */}
        {queue.total > 0 && (
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">Live Progress</h3>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{queue.sent} sent</span>
                <span>{progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill bg-accent-green" style={{ width: `${progress}%` }}/>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Total',     value: queue.total,     color: 'text-white' },
                { label: 'Sent',      value: queue.sent,      color: 'text-accent-green' },
                { label: 'Remaining', value: queue.remaining, color: 'text-slate-300' },
                { label: 'Failed',    value: queue.failed,    color: 'text-accent-red' },
              ].map((s) => (
                <div key={s.label} className="bg-surface-secondary rounded-lg py-2.5 px-1">
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-slate-600 uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Current contact & countdown */}
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                {queue.currentContact ? (
                  <div>
                    <div className="text-xs text-slate-500">Currently sending to</div>
                    <div className="text-sm font-medium text-white truncate mt-0.5">
                      {queue.currentContact.name || queue.currentContact.phone}
                    </div>
                    <div className="text-xs text-slate-600">{queue.currentContact.phone}</div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">
                    {queue.status === 'done' ? 'All messages sent' : 'Waiting…'}
                  </div>
                )}
              </div>

              {queue.countdown > 0 && (
                <div className="flex flex-col items-center gap-1">
                  <CountdownRing seconds={queue.countdown} total={maxDelay} />
                  <span className="text-[10px] text-slate-500">
                    {queue.status === 'paused' ? 'Batch pause' : 'Next in'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Failed contacts list */}
        {queue.failedContacts?.length > 0 && (
          <div className="card space-y-2">
            <h3 className="text-sm font-semibold text-accent-red">
              Failed ({queue.failedContacts.length})
            </h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {queue.failedContacts.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-400 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-red flex-shrink-0"/>
                  <span>{c.name || 'No name'}</span>
                  <span className="text-slate-600">· {c.phone}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Start */}
          {(queue.status === 'idle' || queue.status === 'done' || queue.status === 'stopped') && (
            <button
              onClick={() => start()}
              disabled={!canStart && queue.status === 'idle'}
              className="btn-primary"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
              </svg>
              {queue.status === 'done' || queue.status === 'stopped' ? 'Start Again' : 'Start Sending'}
            </button>
          )}

          {/* Pause */}
          {queue.status === 'running' && (
            <button onClick={pause} className="btn-secondary">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              Pause
            </button>
          )}

          {/* Resume */}
          {queue.status === 'paused' && (
            <button onClick={resume} className="btn-primary">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
              </svg>
              Resume
            </button>
          )}

          {/* Stop */}
          {isActive && (
            <button onClick={handleStop} className={confirmStop ? 'btn-danger' : 'btn-secondary'}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"/>
              </svg>
              {confirmStop ? 'Confirm Stop?' : 'Stop'}
            </button>
          )}

          {/* Retry failed */}
          {queue.failedContacts?.length > 0 && (queue.status === 'done' || queue.status === 'stopped') && (
            <button onClick={retry} className="btn-secondary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Retry Failed ({queue.failedContacts.length})
            </button>
          )}

          {/* Reset */}
          {(queue.status === 'done' || queue.status === 'stopped') && (
            <button onClick={reset} className="btn-ghost ml-auto text-sm">
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
