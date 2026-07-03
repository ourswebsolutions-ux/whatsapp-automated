import React from 'react'
import { useAppStore } from '../store'
import Logo from '../assets/logo.png'

/**
 * QR Code overlay — shown when phase is 'qr' or 'reconnecting'.
 * onCancel → logs out and returns to ConnectScreen.
 */
export default function QrModal({ onCancel }) {
  const waStatus = useAppStore((s) => s.waStatus)
  const isReconnecting = waStatus.phase === 'reconnecting'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-card border border-white/10 rounded-2xl p-8 w-96 flex flex-col items-center gap-5 shadow-2xl">

        {/* Header */}
        <div className="text-center">
          <div className="w-20 h-20  flex items-center justify-center mx-auto mb-3">
            <img
                src={Logo}
                alt="WhatsApp Automated"
                className="w-20 h-20 object-contain"
                draggable={false}
              />
          </div>
          <h2 className="text-lg font-bold text-white">
            {isReconnecting ? 'Reconnecting…' : 'Scan QR Code'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isReconnecting
              ? 'Re-establishing your WhatsApp session'
              : 'Open WhatsApp on your phone and scan this code'}
          </p>
        </div>

        {/* QR box */}
        <div className="relative w-56 h-56 flex items-center justify-center bg-white rounded-xl overflow-hidden shadow-inner">
          {waStatus.qr ? (
            <img
              src={waStatus.qr}
              alt="WhatsApp QR Code"
              className="w-full h-full object-contain p-1"
              draggable={false}
            />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <svg className="w-10 h-10 animate-spin text-accent-green" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              <span className="text-xs text-slate-600 font-medium">Generating QR…</span>
            </div>
          )}
          {/* Corner decorations */}
          {waStatus.qr && (
            <>
              <span className="absolute top-2 left-2  w-4 h-4 border-t-2 border-l-2 border-accent-green rounded-tl" />
              <span className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-accent-green rounded-tr" />
              <span className="absolute bottom-2 left-2  w-4 h-4 border-b-2 border-l-2 border-accent-green rounded-bl" />
              <span className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-accent-green rounded-br" />
            </>
          )}
        </div>

        {/* Steps */}
        {!isReconnecting && (
          <ol className="w-full space-y-1.5">
            {[
              'Open WhatsApp on your phone',
              'Tap ⋮ Menu → Linked Devices',
              'Tap "Link a Device"',
              'Point your camera at the QR code',
            ].map((step, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-4 h-4 rounded-full bg-accent-green/20 text-accent-green text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        )}

        {/* Footer note + cancel */}
        <div className="w-full space-y-2 pt-1">
          <p className="text-[11px] text-slate-600 text-center">
            {isReconnecting
              ? 'Your previous session is being restored automatically.'
              : 'Session saved locally — no re-scan needed on next launch.'}
          </p>
          <button
            onClick={onCancel}
            className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
          >
            Cancel and go back
          </button>
        </div>
      </div>
    </div>
  )
}
