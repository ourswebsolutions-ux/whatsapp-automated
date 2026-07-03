import React from 'react'
import { windowAPI } from '../utils/ipc'
import { useAppStore } from '../store'
import Logo from '../assets/logo.png'

export default function TitleBar() {
  const waStatus = useAppStore((s) => s.waStatus)
  const platform = window.electronAPI?.platform || 'win32'
  const isMac = platform === 'darwin'

  return (
    <div className="h-10 flex items-center justify-between bg-surface-secondary border-b border-white/5 flex-shrink-0 titlebar-drag select-none">
      {/* macOS traffic lights sit on the left */}
      {isMac && (
        <div className="flex items-center gap-1.5 px-4 no-drag">
          <button
            onClick={() => windowAPI.close()}
            className="w-3 h-3 rounded-full bg-accent-red hover:brightness-90 transition-all"
            title="Close"
          />
          <button
            onClick={() => windowAPI.minimize()}
            className="w-3 h-3 rounded-full bg-accent-amber hover:brightness-90 transition-all"
            title="Minimize"
          />
          <button
            onClick={() => windowAPI.maximize()}
            className="w-3 h-3 rounded-full bg-accent-green hover:brightness-90 transition-all"
            title="Maximize"
          />
        </div>
      )}

      {/* App title */}
      <div className={`flex items-center gap-2 ${isMac ? 'absolute left-1/2 -translate-x-1/2' : 'px-4'}`}>
        <div className="w-5 h-5 bg-accent-green rounded-full flex items-center justify-center">
          <img
            src={Logo}
            alt="WhatsApp Automated"
            className="w-20 h-20 object-contain"
            draggable={false}
          />
        </div>
        <span className="text-sm font-semibold text-white/90">WhatsApp Sender</span>
        {waStatus.phase === 'connected' && (
          <span className="badge-green text-xs">Connected</span>
        )}
      </div>

      {/* Windows controls on the right */}
      {!isMac && (
        <div className="flex items-center ml-auto">
          <button
            onClick={() => windowAPI.minimize()}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Minimize"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={() => windowAPI.maximize()}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Maximize"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="4" y="4" width="16" height="16" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
          <button
            onClick={() => windowAPI.close()}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-accent-red hover:text-white transition-colors"
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
