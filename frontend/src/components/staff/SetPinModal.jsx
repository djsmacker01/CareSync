import { useState } from 'react'

export default function SetPinModal({ member, onSave, onClose }) {
  const [pin, setPin]       = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  const [mode, setMode]     = useState(member.has_pin ? 'choice' : 'set')
  // mode: 'choice' | 'set' | 'clear-confirm'

  async function handleSet(e) {
    e.preventDefault()
    setError(null)
    if (!/^\d{6}$/.test(pin))    return setError('PIN must be exactly 6 digits.')
    if (pin !== confirm)          return setError('PINs do not match.')

    setSaving(true)
    try {
      await onSave(pin)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  async function handleClear() {
    setSaving(true)
    try {
      await onSave(null)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  function PinInput({ value, onChange, placeholder }) {
    return (
      <div className="flex gap-2 justify-center">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={`h-12 w-10 rounded-xl border-2 flex items-center justify-center text-xl font-black transition-colors ${
              value[i]
                ? 'border-teal bg-teal/5 text-teal'
                : 'border-gray-200 text-gray-200'
            }`}
          >
            {value[i] ? '●' : '○'}
          </div>
        ))}
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={value}
          onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
          placeholder={placeholder}
          className="sr-only"
          aria-label={placeholder}
          autoFocus
        />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900">
              {mode === 'clear-confirm' ? 'Clear PIN' : member.has_pin ? 'Reset PIN' : 'Set PIN'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{member.full_name}</p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {/* Choice: reset vs clear */}
          {mode === 'choice' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 text-center">
                {member.full_name} already has a PIN. What would you like to do?
              </p>
              <button
                onClick={() => setMode('set')}
                className="w-full min-h-[48px] rounded-xl bg-teal text-white font-bold text-sm hover:bg-teal/90 transition-colors"
              >
                🔄 Set a new PIN
              </button>
              <button
                onClick={() => setMode('clear-confirm')}
                className="w-full min-h-[48px] rounded-xl border-2 border-red-200 text-red-500 font-bold text-sm hover:bg-red-50 transition-colors"
              >
                🗑️ Clear PIN (disable PIN login)
              </button>
              <button
                onClick={onClose}
                className="w-full min-h-[44px] text-gray-400 text-sm hover:text-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Confirm clear */}
          {mode === 'clear-confirm' && (
            <div className="space-y-4 text-center">
              <div className="text-4xl">🔓</div>
              <p className="text-sm text-gray-600">
                This will remove {member.full_name}'s PIN. They will only be able to log in with their email and password.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode('choice')}
                  className="flex-1 min-h-[48px] rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleClear}
                  disabled={saving}
                  className="flex-1 min-h-[48px] rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Clearing…' : 'Clear PIN'}
                </button>
              </div>
            </div>
          )}

          {/* Set new PIN */}
          {mode === 'set' && (
            <form onSubmit={handleSet} className="space-y-5">
              <div className="text-center">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">New PIN</p>
                <PinInput value={pin} onChange={setPin} placeholder="Enter 6-digit PIN" />
              </div>

              <div className="text-center">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Confirm PIN</p>
                <PinInput value={confirm} onChange={setConfirm} placeholder="Confirm PIN" />
              </div>

              {/* Tap-in numeric keypad for easier entry on mobile */}
              <div className="grid grid-cols-3 gap-2">
                {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => {
                  if (k === '') return <div key={i} />
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        const active = pin.length < 6 ? 'pin' : confirm.length < 6 ? 'confirm' : null
                        if (!active) return
                        if (k === '⌫') {
                          if (active === 'confirm' && confirm.length > 0) setConfirm(c => c.slice(0, -1))
                          else if (active === 'pin' || confirm.length === 0) setPin(p => p.slice(0, -1))
                        } else {
                          if (active === 'pin') setPin(p => p + k)
                          else setConfirm(c => c + k)
                        }
                      }}
                      className="min-h-[52px] rounded-2xl bg-gray-100 text-gray-800 text-xl font-black hover:bg-gray-200 active:bg-gray-300 transition-colors"
                    >
                      {k}
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setPin(''); setConfirm(''); setMode(member.has_pin ? 'choice' : 'set') }}
                  className="flex-1 min-h-[48px] rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
                >
                  {member.has_pin ? 'Back' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={saving || pin.length < 6 || confirm.length < 6}
                  className="flex-1 min-h-[48px] rounded-xl bg-teal text-white font-bold text-sm hover:bg-teal/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : 'Set PIN'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
