import React, { useRef, useState } from 'react'
import { useAppStore } from '../../store'

const EMOJIS = [
  '😊','😂','❤️','👍','🙏','🔥','✅','💪','🎉','👋',
  '😍','🥰','😎','🤝','💯','📱','⭐','🚀','💬','📢',
]

const VARIABLES = [
  { label: '{{name}}',  desc: 'Contact name' },
  { label: '{{phone}}', desc: 'Phone number' },
]

export default function Composer() {
  const message     = useAppStore((s) => s.message)
  const setMessage  = useAppStore((s) => s.setMessage)
  const selectedIds = useAppStore((s) => s.selectedIds)
  const contacts    = useAppStore((s) => s.contacts)
  const setTab      = useAppStore((s) => s.setActiveTab)

  const textareaRef  = useRef(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [preview, setPreview]     = useState(false)

  const selectedContacts = contacts.filter((c) => selectedIds.has(c.id))
  const previewContact   = selectedContacts[0]

  const insertAtCursor = (text) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end   = el.selectionEnd
    const next  = message.slice(0, start) + text + message.slice(end)
    setMessage(next)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + text.length, start + text.length)
    }, 0)
  }

  const interpolate = (text, contact) => {
    if (!contact) return text
    return text
      .replace(/\{\{name\}\}/g, contact.name || contact.phone)
      .replace(/\{\{phone\}\}/g, contact.phone)
  }

  const charCount     = message.length
  const wordCount     = message.trim() ? message.trim().split(/\s+/).length : 0
  const canSend       = message.trim().length > 0 && selectedIds.size > 0

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-white/5">
        <h1 className="text-lg font-bold text-white">Compose Message</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {selectedIds.size > 0
            ? `Will send to ${selectedIds.size} contact${selectedIds.size !== 1 ? 's' : ''}`
            : 'No contacts selected — go to Contacts first'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Recipients summary */}
        {selectedIds.size === 0 && (
          <div className="card border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
            <svg className="w-5 h-5 text-accent-amber flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div className="flex-1 text-sm text-amber-300">
              No contacts selected.{' '}
              <button onClick={() => setTab('contacts')} className="underline hover:no-underline">
                Go to Contacts
              </button>{' '}
              to select recipients.
            </div>
          </div>
        )}

        {/* Composer card */}
        <div className="card space-y-3">
          {/* Variables bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 font-medium">Variables:</span>
            {VARIABLES.map((v) => (
              <button
                key={v.label}
                onClick={() => insertAtCursor(v.label)}
                title={v.desc}
                className="px-2 py-0.5 text-xs font-mono bg-surface-secondary border border-white/10 rounded
                           text-accent-blue hover:border-accent-blue/50 hover:bg-accent-blue/10 transition-colors"
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here…

Use {{name}} to personalise with the contact's name.
Use {{phone}} to include their phone number."
              rows={10}
              className="input resize-none font-sans leading-relaxed"
              style={{ minHeight: '220px' }}
            />
          </div>

          {/* Footer toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Emoji picker toggle */}
              <div className="relative">
                <button
                  onClick={() => setShowEmoji((s) => !s)}
                  className="btn-ghost text-xs py-1 px-2 text-lg leading-none"
                  title="Insert emoji"
                >
                  😊
                </button>
                {showEmoji && (
                  <div className="absolute bottom-10 left-0 bg-surface-card border border-white/10 rounded-xl p-3 z-20 shadow-2xl w-64">
                    <div className="grid grid-cols-10 gap-1">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          onClick={() => { insertAtCursor(e); setShowEmoji(false) }}
                          className="text-xl hover:scale-125 transition-transform leading-none p-0.5"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setMessage('')} className="btn-ghost text-xs py-1 px-2">
                Clear
              </button>
            </div>
            <div className="text-xs text-slate-600">
              {charCount} chars · {wordCount} words
            </div>
          </div>
        </div>

        {/* Preview toggle */}
        {message.trim() && (
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300">Message Preview</h3>
              <button
                onClick={() => setPreview((s) => !s)}
                className="text-xs text-accent-blue hover:underline"
              >
                {preview ? 'Hide' : 'Show preview'}
              </button>
            </div>

            {preview && (
              <div className="space-y-3">
                {previewContact ? (
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5">
                      Preview for: <span className="text-slate-300">{previewContact.name || previewContact.phone}</span>
                    </p>
                    <div className="bg-wa-light/10 border border-wa-light/20 rounded-xl rounded-tl-none px-4 py-3 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed max-w-sm">
                      {interpolate(message, previewContact)}
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface-secondary rounded-xl rounded-tl-none px-4 py-3 text-sm text-slate-400 whitespace-pre-wrap leading-relaxed max-w-sm">
                    {message}
                    <p className="text-xs text-slate-600 mt-2 italic">
                      Select a contact to see personalised preview
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Send button */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-white/5 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {canSend
            ? `Ready to send to ${selectedIds.size} recipient${selectedIds.size !== 1 ? 's' : ''}`
            : 'Write a message and select contacts to continue'}
        </p>
        <button
          disabled={!canSend}
          onClick={() => setTab('queue')}
          className="btn-primary"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
          Go to Queue
        </button>
      </div>
    </div>
  )
}
