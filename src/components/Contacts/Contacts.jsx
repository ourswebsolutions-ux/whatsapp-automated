import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAppStore } from '../../store'
import { contactsAPI, waAPI } from '../../utils/ipc'

function getInitials(name, phone) {
  if (name && name.trim()) {
    const parts = name.trim().split(' ')
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase()
  }
  return phone?.slice(-2) || '??'
}

const AVATAR_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-teal-500', 'bg-indigo-500',
  'bg-pink-500', 'bg-orange-500', 'bg-cyan-500', 'bg-emerald-500',
]

function avatarColor(str) {
  let hash = 0
  for (const ch of String(str)) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function Contacts() {
  const contacts    = useAppStore((s) => s.contacts)
  const selectedIds = useAppStore((s) => s.selectedIds)
  const setContacts = useAppStore((s) => s.setContacts)
  const toggleContact = useAppStore((s) => s.toggleContact)
  const selectAll   = useAppStore((s) => s.selectAll)
  const deselectAll = useAppStore((s) => s.deselectAll)

  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [toast, setToast]         = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const reloadContacts = useCallback(async () => {
    const all = await contactsAPI.getAll()
    if (Array.isArray(all)) setContacts(all)
  }, [setContacts])

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts
    const q = search.toLowerCase()
    return contacts.filter(
      (c) => c.name?.toLowerCase().includes(q) || c.phone?.includes(q)
    )
  }, [contacts, search])

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id))

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      filtered.forEach((c) => selectedIds.has(c.id) && toggleContact(c.id))
    } else {
      filtered.forEach((c) => !selectedIds.has(c.id) && toggleContact(c.id))
    }
  }

  const handleLoadFromWhatsApp = async () => {
    setLoading(true)
    const result = await waAPI.loadContacts()
    await reloadContacts()
    setLoading(false)
    if (result?.success) {
      showToast(`Synced ${result.count || 0} contacts from WhatsApp`)
    } else {
      showToast(result?.error || 'Sync failed', 'error')
    }
  }

  const handleImportCsv = async () => {
    const filePath = await contactsAPI.openCsvDialog()
    if (!filePath) return
    setLoading(true)
    const result = await contactsAPI.importCsv(filePath)
    await reloadContacts()
    setLoading(false)
    if (result?.success) {
      showToast(`Imported ${result.imported} contacts`)
    } else {
      showToast(result?.error || 'Import failed', 'error')
    }
  }

  const handleExportVcf = async () => {
    const toExport = contacts.filter((c) => selectedIds.has(c.id))
    if (toExport.length === 0) return showToast('Select contacts first', 'error')
    const result = await contactsAPI.exportVcf(toExport)
    if (result?.success) showToast(`Exported ${toExport.length} contacts`)
    else showToast(result?.error || 'Export failed', 'error')
  }

  const handleRemoveDuplicates = async () => {
    setLoading(true)
    const result = await contactsAPI.removeDuplicates()
    await reloadContacts()
    setLoading(false)
    if (result?.success) showToast(`Removed ${result.removed} duplicates`)
    else showToast(result?.error || 'Failed', 'error')
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Contacts</h1>
            <p className="text-xs text-slate-500">
              {contacts.length.toLocaleString()} total · {selectedIds.size} selected
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleLoadFromWhatsApp} disabled={loading} className="btn-primary text-xs py-1.5 px-3">
              {loading
                ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              }
              Sync WhatsApp
            </button>
            <button onClick={handleImportCsv} disabled={loading} className="btn-secondary text-xs py-1.5 px-3">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/>
              </svg>
              Import CSV
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            className="input pl-9"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        {/* Bulk actions row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleAllFiltered}
                className="w-4 h-4 rounded accent-green-500 cursor-pointer"
              />
              {allFilteredSelected ? 'Deselect all' : `Select all (${filtered.length})`}
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportVcf} disabled={selectedIds.size === 0} className="btn-ghost text-xs py-1 px-2.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              Export VCF
            </button>
            <button onClick={handleRemoveDuplicates} disabled={loading} className="btn-ghost text-xs py-1 px-2.5 text-slate-500">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Remove Duplicates
            </button>
          </div>
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
            <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <p className="text-sm">{search ? 'No contacts match your search' : 'No contacts yet — sync from WhatsApp or import a CSV'}</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((contact) => {
              const selected = selectedIds.has(contact.id)
              return (
                <div
                  key={contact.id}
                  onClick={() => toggleContact(contact.id)}
                  className={selected ? 'contact-row-selected' : 'contact-row'}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleContact(contact.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded accent-green-500 cursor-pointer flex-shrink-0"
                  />
                  <div className={`avatar ${avatarColor(contact.jid)}`}>
                    {getInitials(contact.name, contact.phone)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {contact.name || <span className="text-slate-400 italic">No name</span>}
                    </div>
                    <div className="text-xs text-slate-500 truncate">+{contact.phone}</div>
                  </div>
                  {selected && (
                    <svg className="w-4 h-4 text-accent-green flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 px-4 py-2.5 rounded-lg text-sm font-medium shadow-xl z-50 animate-fade-in
          ${toast.type === 'error' ? 'bg-accent-red text-white' : 'bg-accent-green text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
