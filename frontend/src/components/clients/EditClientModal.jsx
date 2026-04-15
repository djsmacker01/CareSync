import { useState } from 'react'

export default function EditClientModal({ client, onSave, onClose, submitting }) {
  const [form, setForm] = useState({
    full_name:     client.full_name     || '',
    room_number:   client.room_number   || '',
    date_of_birth: client.date_of_birth || '',
    notes:         client.notes         || '',
  })
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.full_name.trim())    { setError('Name is required.'); return }
    if (!form.room_number.trim())  { setError('Flat number is required.'); return }
    try {
      await onSave(form)
    } catch (err) {
      setError(err.message || 'Failed to update details.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-900">Edit Service User</h2>
            <p className="text-xs text-gray-400 mt-0.5">{client.full_name}</p>
          </div>
          <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-3 text-gray-900 text-sm focus:border-teal focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Flat Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.room_number}
              onChange={e => set('room_number', e.target.value)}
              placeholder="e.g. Flat 1"
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-3 text-gray-900 text-sm focus:border-teal focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Date of Birth</label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={e => set('date_of_birth', e.target.value)}
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-3 text-gray-900 text-sm focus:border-teal focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Care Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-gray-900 text-sm focus:border-teal focus:outline-none resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 min-h-[48px] rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 min-h-[48px] rounded-xl bg-teal text-white text-sm font-bold hover:bg-teal/90 transition-colors disabled:opacity-50">
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
