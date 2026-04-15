import { useState } from 'react'

const ROLES = [
  { value: 'staff',      label: 'Staff',       desc: 'Can record MAR, tasks, fire checks and visitors'   },
  { value: 'supervisor', label: 'Supervisor',   desc: 'All staff rights plus stock management'            },
  { value: 'manager',    label: 'Manager',      desc: 'Full access including dashboard and staff management' },
  { value: 'readonly',   label: 'Read Only',    desc: 'Can view MAR, fire checks and visitors only'       },
]

export default function AddStaffModal({ onSave, onCreated, onClose }) {
  const [form, setForm] = useState({
    full_name: '',
    email:     '',
    role:      'staff',
    pin:       '',
  })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const [created, setCreated]   = useState(null)   // { staff, tempPassword }

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.full_name.trim()) return setError('Full name is required.')
    if (!form.email.trim())     return setError('Email address is required.')
    if (form.pin && !/^\d{6}$/.test(form.pin)) return setError('PIN must be exactly 6 digits.')

    setSaving(true)
    try {
      const result = await onSave({
        full_name: form.full_name.trim(),
        email:     form.email.trim().toLowerCase(),
        role:      form.role,
        pin:       form.pin || undefined,
      })
      setCreated(result)   // show the credentials screen
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Credentials reveal screen ────────────────────────────────────
  if (created) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5">
          <div className="text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-xl font-black text-gray-900">Account created!</h2>
            <p className="text-sm text-gray-500 mt-1">
              Share these credentials with <span className="font-semibold text-gray-700">{created.staff.full_name}</span>
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-sm">
            <Credential label="Email"    value={created.staff.email}    />
            <Credential label="Password" value={created.tempPassword}   secret />
            {form.pin && <Credential label="PIN" value={form.pin} secret />}
          </div>

          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            ⚠️ Write these down now — the password won't be shown again. The staff member should change it on first login.
          </p>

          <button
            onClick={() => onCreated ? onCreated(created.staff) : onClose()}
            className="w-full min-h-[48px] rounded-xl bg-teal text-white font-bold text-sm hover:bg-teal/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  // ── Create form ──────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="add-staff-title" className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <h2 id="add-staff-title" className="text-xl font-black text-gray-900">Add Staff Member</h2>
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
            <label htmlFor="staff-full-name" className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Full Name
            </label>
            <input
              id="staff-full-name"
              type="text"
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              placeholder="e.g. Sarah Nurse"
              required
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 focus:border-teal focus:outline-none"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="sarah@example.com"
              required
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 focus:border-teal focus:outline-none"
            />
          </div>

          {/* Role */}
          <div>
            <label htmlFor="staff-role" className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Role
            </label>
            <select
              id="staff-role"
              value={form.role}
              onChange={e => set('role', e.target.value)}
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 focus:border-teal focus:outline-none"
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
              ))}
            </select>
          </div>

          {/* Optional PIN */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              PIN (Optional)
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={form.pin}
              onChange={e => set('pin', e.target.value.replace(/\D/g, ''))}
              placeholder="6-digit PIN (leave blank to set later)"
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 focus:border-teal focus:outline-none tracking-[0.3em] font-mono"
            />
          </div>

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
              {saving ? 'Creating…' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Credential({ label, value, secret }) {
  const [visible, setVisible] = useState(!secret)
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500 font-medium w-20 shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
        <span className={`font-mono text-gray-900 text-right break-all ${!visible ? 'blur-sm select-none' : ''}`}>
          {value}
        </span>
        {secret && (
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            className="text-gray-400 hover:text-gray-600 text-lg shrink-0"
            title={visible ? 'Hide' : 'Show'}
          >
            {visible ? '🙈' : '👁️'}
          </button>
        )}
      </div>
    </div>
  )
}
