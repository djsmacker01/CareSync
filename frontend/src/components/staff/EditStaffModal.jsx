import { useState } from 'react'

const ROLES = [
  { value: 'staff',      label: 'Staff'      },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'manager',    label: 'Manager'    },
  { value: 'readonly',   label: 'Read Only'  },
]

export default function EditStaffModal({ member, onSave, onClose }) {
  const [fullName, setFullName] = useState(member.full_name)
  const [role, setRole]         = useState(member.role)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) return setError('Full name is required.')

    setSaving(true)
    try {
      await onSave({ full_name: fullName.trim(), role })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900">Edit Staff</h2>
            <p className="text-xs text-gray-400 mt-0.5">{member.email}</p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Full name */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 focus:border-teal focus:outline-none"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Role
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 focus:border-teal focus:outline-none bg-white"
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Email hint */}
          <p className="text-xs text-gray-400">
            Email cannot be changed here. Contact Supabase admin for email changes.
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[48px] rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 min-h-[48px] rounded-xl bg-teal text-white font-bold text-sm hover:bg-teal/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
