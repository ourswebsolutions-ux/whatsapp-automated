import React, { useState, useEffect } from 'react'
import { useAppStore } from '../../store'
import { settingsAPI } from '../../utils/ipc'

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5">
        <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
        <div className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-accent-green' : 'bg-slate-700'}`}/>
        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}/>
      </div>
      <div>
        <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{label}</div>
        {description && <div className="text-xs text-slate-500 mt-0.5">{description}</div>}
      </div>
    </label>
  )
}

function NumberInput({ label, description, value, onChange, min = 1, max = 9999, unit }) {
  return (
    <div className="space-y-1.5">
      <div>
        <label className="text-sm font-medium text-slate-200">{label}</label>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
          className="input w-28 text-center"
        />
        {unit && <span className="text-xs text-slate-500">{unit}</span>}
      </div>
    </div>
  )
}

export default function SettingsView() {
  const { settings, setSettings } = useAppStore()
  const [local, setLocal]   = useState({ ...settings })
  const [saved, setSaved]   = useState(false)
  const [dirty, setDirty]   = useState(false)

  useEffect(() => {
    setLocal({ ...settings })
  }, [settings])

  const update = (key, value) => {
    setLocal((s) => ({ ...s, [key]: value }))
    setDirty(true)
  }

  const handleSave = async () => {
    const toSave = {
      delayMin:      String(local.delayMin),
      delayMax:      String(local.delayMax),
      randomDelay:   String(local.randomDelay),
      batchSize:     String(local.batchSize),
      batchPause:    String(local.batchPause),
      retryAttempts: String(local.retryAttempts),
      autoReconnect: String(local.autoReconnect),
    }
    await settingsAPI.save(toSave)
    setSettings(local)
    setSaved(true)
    setDirty(false)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleReset = () => {
    const defaults = {
      delayMin:      2,
      delayMax:      5,
      randomDelay:   true,
      batchSize:     30,
      batchPause:    600,
      retryAttempts: 3,
      autoReconnect: true,
    }
    setLocal(defaults)
    setDirty(true)
  }

  const batchPauseMinutes = Math.floor(local.batchPause / 60)
  const batchPauseSeconds = local.batchPause % 60

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">Configure sending behaviour</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button onClick={handleReset} className="btn-ghost text-xs">
              Reset defaults
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty}
            className="btn-primary"
          >
            {saved ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                Saved
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

        {/* ── Delay Between Messages ── */}
        <section className="card space-y-5">
          <div>
            <h2 className="text-sm font-bold text-white">Delay Between Messages</h2>
            <p className="text-xs text-slate-500 mt-0.5">Controls the wait time after each message is sent</p>
          </div>

          <Toggle
            checked={local.randomDelay}
            onChange={(e) => update('randomDelay', e.target.checked)}
            label="Random Delay"
            description="Randomise delay within the min–max range to appear more natural"
          />

          <div className="grid grid-cols-2 gap-4">
            <NumberInput
              label="Minimum Delay"
              description={local.randomDelay ? 'Shortest possible wait' : 'Fixed delay after each message'}
              value={local.delayMin}
              onChange={(v) => update('delayMin', v)}
              min={1}
              max={300}
              unit="seconds"
            />
            {local.randomDelay && (
              <NumberInput
                label="Maximum Delay"
                description="Longest possible wait"
                value={local.delayMax}
                onChange={(v) => update('delayMax', Math.max(v, local.delayMin))}
                min={local.delayMin}
                max={600}
                unit="seconds"
              />
            )}
          </div>

          {/* Visual preview */}
          <div className="bg-surface-secondary rounded-lg px-4 py-3 text-xs text-slate-400">
            <span className="text-slate-500">Example: </span>
            {local.randomDelay
              ? `Messages will wait between ${local.delayMin}s and ${local.delayMax}s before the next send`
              : `Messages will wait exactly ${local.delayMin}s before the next send`}
          </div>
        </section>

        {/* ── Batch Sending ── */}
        <section className="card space-y-5">
          <div>
            <h2 className="text-sm font-bold text-white">Batch Sending</h2>
            <p className="text-xs text-slate-500 mt-0.5">Send messages in groups with a longer pause between batches</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NumberInput
              label="Messages Per Batch"
              description="How many messages to send before pausing"
              value={local.batchSize}
              onChange={(v) => update('batchSize', v)}
              min={1}
              max={500}
              unit="messages"
            />
            <div className="space-y-1.5">
              <div>
                <label className="text-sm font-medium text-slate-200">Pause Duration</label>
                <p className="text-xs text-slate-500 mt-0.5">How long to wait between batches</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={batchPauseMinutes}
                  min={0}
                  max={120}
                  onChange={(e) => update('batchPause', Number(e.target.value) * 60 + batchPauseSeconds)}
                  className="input w-20 text-center"
                />
                <span className="text-xs text-slate-500">min</span>
                <input
                  type="number"
                  value={batchPauseSeconds}
                  min={0}
                  max={59}
                  onChange={(e) => update('batchPause', batchPauseMinutes * 60 + Number(e.target.value))}
                  className="input w-20 text-center"
                />
                <span className="text-xs text-slate-500">sec</span>
              </div>
            </div>
          </div>

          {/* Visual preview */}
          <div className="bg-surface-secondary rounded-lg px-4 py-3 text-xs text-slate-400">
            <span className="text-slate-500">Example: </span>
            Send {local.batchSize} messages, then pause for{' '}
            {local.batchPause >= 60
              ? `${Math.floor(local.batchPause / 60)}m ${local.batchPause % 60 > 0 ? `${local.batchPause % 60}s` : ''}`.trim()
              : `${local.batchPause}s`}, then repeat
          </div>
        </section>

        {/* ── Reliability ── */}
        <section className="card space-y-5">
          <div>
            <h2 className="text-sm font-bold text-white">Reliability</h2>
            <p className="text-xs text-slate-500 mt-0.5">Error handling and connection settings</p>
          </div>

          <NumberInput
            label="Retry Attempts"
            description="How many times to retry a failed message before marking it as failed"
            value={local.retryAttempts}
            onChange={(v) => update('retryAttempts', v)}
            min={0}
            max={10}
            unit="times"
          />

          <Toggle
            checked={local.autoReconnect}
            onChange={(e) => update('autoReconnect', e.target.checked)}
            label="Auto Reconnect"
            description="Automatically reconnect to WhatsApp if the connection drops"
          />
        </section>

      </div>
    </div>
  )
}
