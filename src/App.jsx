import React from 'react'
import { useAppStore } from './store'
import { useWhatsApp } from './hooks/useWhatsApp'
import TitleBar    from './components/TitleBar'
import Sidebar     from './components/Sidebar'
import Dashboard   from './components/Dashboard/Dashboard'
import Contacts    from './components/Contacts/Contacts'
import Composer    from './components/Composer/Composer'
import QueueView   from './components/Queue/QueueView'
import SettingsView from './components/Settings/SettingsView'
import ConnectScreen from './components/ConnectScreen'
import QrModal      from './components/QrModal'

const VIEWS = {
  dashboard: Dashboard,
  contacts : Contacts,
  composer : Composer,
  queue    : QueueView,
  settings : SettingsView,
}

export default function App() {
  const activeTab = useAppStore((s) => s.activeTab)
  const waStatus  = useAppStore((s) => s.waStatus)
  const { connect, logout } = useWhatsApp()

  const ActiveView = VIEWS[activeTab] || Dashboard
  const phase      = waStatus.phase   // 'idle'|'disconnected'|'connecting'|'qr'|'reconnecting'|'connected'

  // ── Full-screen states (before connection) ────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="flex flex-col h-screen bg-surface overflow-hidden">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <svg className="w-8 h-8 animate-spin text-accent-green" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span className="text-sm">Starting…</span>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'disconnected') {
    return (
      <div className="flex flex-col h-screen bg-surface overflow-hidden">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center">
          <ConnectScreen onConnect={connect} error={waStatus.error} />
        </div>
      </div>
    )
  }

  // QR / reconnecting — show overlay on top of connect screen
  if (phase === 'connecting' || phase === 'qr' || phase === 'reconnecting') {
    return (
      <div className="flex flex-col h-screen bg-surface overflow-hidden">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center">
          <ConnectScreen onConnect={connect} connecting />
        </div>
        {/* QR modal slides in once QR is ready */}
        {(phase === 'qr' || phase === 'reconnecting') && <QrModal onCancel={logout} />}
      </div>
    )
  }

  // ── Connected — full app layout ───────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar onLogout={logout} />
        <main className="flex-1 min-h-0 overflow-hidden bg-surface">
          <ActiveView />
        </main>
      </div>
    </div>
  )
}
