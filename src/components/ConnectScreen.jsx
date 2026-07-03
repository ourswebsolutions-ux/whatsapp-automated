import React from 'react'
import Logo from '../assets/logo.png'
const WA_ICON = (
  <img
    src={Logo}
    alt="WhatsApp Automated"
    className="w-24 h-24 object-contain"
    draggable={false}
  />
)

/**
 * Full-screen landing shown before any WhatsApp session exists.
 * Props:
 *   onConnect  — called when user clicks "Connect WhatsApp"
 *   connecting — true while initializing (disables button, shows spinner)
 *   error      — optional error string to surface
 */
export default function ConnectScreen({ onConnect, connecting = false, error }) {
  return (
    <div className="flex flex-col items-center gap-8 px-6 text-center max-w-sm mx-auto animate-fade-in">
      {/* Logo */}
      <div className="relative">
  <div className="w-40 h-40 flex items-center justify-center">
    {WA_ICON}
  </div>
</div>
      {/* Copy */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">WhatsApp Sender</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Connect your WhatsApp account to start sending personalised messages
          to your contacts.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2">
        {[
          'One-by-one delivery',
          'Smart delay',
          'Batch sending',
          'CSV import',
        ].map(f => (
          <span key={f} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-400">
            {f}
          </span>
        ))}
      </div>

      {/* CTA */}
      <div className="w-full space-y-3">
        <button
          onClick={onConnect}
          disabled={connecting}
          className="btn-primary w-full justify-center py-3 text-base font-semibold"
        >
          {connecting ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Connecting…
            </>
          ) : (
            <>
              <img
    src={Logo}
    alt="WhatsApp Automated"
    className="w-8 h-8 object-contain"
    draggable={false}
  />
              Connect WhatsApp
            </>
          )}
        </button>

        {error && (
          <p className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <p className="text-xs text-slate-600">
          Your session is stored locally. No data is shared with any server.
        </p>
      </div>

      {/* How it works */}
      <div className="w-full bg-surface-card border border-white/5 rounded-xl p-4 text-left space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">How it works</p>
        <ol className="space-y-2">
          {[
            'Click "Connect WhatsApp" to generate a QR code',
            'Open WhatsApp on your phone → Linked Devices → Link a Device',
            'Scan the QR code — your contacts load automatically',
            'Start composing and sending messages',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-accent-green/20 text-accent-green text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-xs text-slate-400">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
