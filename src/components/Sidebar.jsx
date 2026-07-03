import React from 'react'
import { useAppStore } from '../store'

const NAV = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'composer',
    label: 'Compose',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    id: 'queue',
    label: 'Queue',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export default function Sidebar({ onLogout }) {
  const activeTab = useAppStore((s) => s.activeTab)
  const waStatus  = useAppStore((s) => s.waStatus)
  const queue     = useAppStore((s) => s.queue)
  const setTab    = useAppStore((s) => s.setActiveTab)

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col bg-surface-secondary border-r border-white/5">
      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={activeTab === item.id ? 'nav-item-active w-full text-left' : 'nav-item-inactive w-full text-left'}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.id === 'queue' && queue.status === 'running' && (
              <span className="ml-auto w-2 h-2 rounded-full bg-accent-green animate-ping-slow" />
            )}
          </button>
        ))}
      </nav>

      {/* Connection status */}
      <div className="p-3 border-t border-white/5 space-y-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className={`status-dot ${
            waStatus.phase === 'connected'    ? 'bg-accent-green animate-ping-slow' :
            waStatus.phase === 'reconnecting' ? 'bg-accent-amber animate-pulse'     :
            waStatus.phase === 'connecting' || waStatus.phase === 'qr'
                                              ? 'bg-accent-blue animate-pulse'      :
            'bg-slate-600'
          }`} />
          <span className="text-xs text-slate-400 truncate">
            {waStatus.phase === 'connected'    ? (waStatus.user?.name || 'Connected') :
             waStatus.phase === 'reconnecting' ? 'Reconnecting…'                       :
             waStatus.phase === 'connecting'   ? 'Connecting…'                         :
             waStatus.phase === 'qr'           ? 'Waiting for scan…'                   :
             'Disconnected'}
          </span>
        </div>

        {waStatus.phase === 'connected' && (
          <button
            onClick={onLogout}
            className="btn-ghost w-full justify-start text-xs py-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        )}
      </div>
    </aside>
  )
}
