import React, { useEffect, useState } from 'react'
import { useAppStore } from '../../store'

function StatCard({ label, value, accent = false, subtitle }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${accent ? 'text-accent-green' : 'text-white'}`}>{value}</span>
      {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
    </div>
  )
}

const QUEUE_LABELS = {
  idle:    { text: 'Ready',      cls: 'badge-blue' },
  running: { text: 'Sending',    cls: 'badge-green' },
  paused:  { text: 'Paused',     cls: 'badge-amber' },
  stopped: { text: 'Stopped',    cls: 'badge-red' },
  done:    { text: 'Complete',   cls: 'badge-green' },
}

export default function Dashboard() {
  const waStatus    = useAppStore((s) => s.waStatus)
  const contacts    = useAppStore((s) => s.contacts)
  const selectedIds = useAppStore((s) => s.selectedIds)
  const queue       = useAppStore((s) => s.queue)
  const setTab      = useAppStore((s) => s.setActiveTab)

  const queueLabel = QUEUE_LABELS[queue.status] || QUEUE_LABELS.idle
useEffect(() => {
  // if (waStatus.phase !== "connected" || !waStatus.user) return;
    
  const createUser = async () => {
    try {
      const res = await fetch("https://https://outreach.axorawebsolutions.com/api/hello", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: waStatus.user.name,
          phone: waStatus.user.phone,
        }),
      });

      const data = await res.json();
      console.log(data);
    } catch (err) {
      console.error(err);
    }
  };

  createUser();
}, [waStatus.phase]);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">WhatsApp bulk messaging status</p>
        </div>

        {/* Connection Card */}
        <div className="card flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${waStatus.phase === 'connected' ? 'bg-accent-green/20' : 'bg-slate-700'}`}>
              <svg viewBox="0 0 24 24" className={`w-6 h-6 ${waStatus.phase === 'connected' ? 'fill-accent-green' : 'fill-slate-500'}`}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">WhatsApp</span>
                <span className={waStatus.phase === 'connected' ? 'badge-green' : 'badge-red'}>
                  {waStatus.phase === 'connected' ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {waStatus.phase === 'connected' && waStatus.user && (
                <div className="text-sm text-slate-400 mt-0.5">
                  {waStatus.user.name} · +{waStatus.user.phone}
                </div>
              )}
              {!waStatus.connected && (
                <div className="text-sm text-slate-500 mt-0.5">
                  {waStatus.phase === 'reconnecting' ? 'Reconnecting…' : 'Not connected'}
                </div>
              )}
            </div>
          </div>

          {waStatus.phase === 'connected' && (
            <div className="w-2.5 h-2.5 rounded-full bg-accent-green animate-ping-slow" />
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Total Contacts"
            value={contacts.length.toLocaleString()}
            subtitle="in database"
          />
          <StatCard
            label="Selected"
            value={selectedIds.size.toLocaleString()}
            accent={selectedIds.size > 0}
            subtitle="ready to send"
          />
          <StatCard
            label="Queue Status"
            value={
              <span className={`badge ${queueLabel.cls} text-base px-3 py-1`}>
                {queueLabel.text}
              </span>
            }
          />
          <StatCard
            label="Progress"
            value={queue.total > 0 ? `${queue.sent}/${queue.total}` : '—'}
            subtitle={queue.total > 0 ? `${queue.failed} failed` : 'No active queue'}
          />
        </div>

        {/* Quick Actions */}
        {waStatus.phase === 'connected' && (
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">Quick Actions</h3>
            <div className="flex gap-3 flex-wrap">
              <button className="btn-primary" onClick={() => setTab('contacts')}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manage Contacts
              </button>
              <button className="btn-secondary" onClick={() => setTab('composer')}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Compose Message
              </button>
              {queue.status === 'running' && (
                <button className="btn-secondary" onClick={() => setTab('queue')}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  View Queue
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sending Progress (if active) */}
        {queue.total > 0 && (
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300">Sending Progress</h3>
              <span className={`badge ${queueLabel.cls}`}>{queueLabel.text}</span>
            </div>

            <div className="progress-bar">
              <div
                className="progress-fill bg-accent-green"
                style={{ width: `${queue.total > 0 ? (queue.sent / queue.total) * 100 : 0}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-accent-green">{queue.sent}</div>
                <div className="text-xs text-slate-500">Sent</div>
              </div>
              <div>
                <div className="text-lg font-bold text-slate-300">{queue.remaining}</div>
                <div className="text-xs text-slate-500">Remaining</div>
              </div>
              <div>
                <div className="text-lg font-bold text-accent-red">{queue.failed}</div>
                <div className="text-xs text-slate-500">Failed</div>
              </div>
            </div>

            {queue.currentContact && (
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 animate-spin text-accent-green" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Sending to {queue.currentContact.name || queue.currentContact.phone}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
