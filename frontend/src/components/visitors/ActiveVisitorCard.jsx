import { useState } from 'react'

function elapsed(signInTime) {
  const mins = Math.floor((Date.now() - new Date(signInTime)) / 60000)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function ActiveVisitorCard({ visitor, onSignOut, readonly }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy]             = useState(false)

  const client  = visitor.clients
  const staff   = visitor.users?.full_name || 'Staff'

  async function handleSignOut() {
    setBusy(true)
    try {
      await onSignOut(visitor.id)
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <div className="bg-white border-2 border-orange-200 rounded-2xl p-4 space-y-3">
      {/* Name + elapsed time */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold text-gray-900">{visitor.visitor_name}</div>
          <div className="text-xs text-gray-500">
            Visiting <span className="font-semibold">{client?.full_name}</span>
            {client?.room_number && <span className="text-gray-400"> · Flat {String(client.room_number).replace(/\D/g, '')}</span>}
          </div>
        </div>
        <span className="text-xs font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-700 shrink-0 tabular-nums">
          {elapsed(visitor.sign_in_time)}
        </span>
      </div>

      {/* Purpose + signed in details */}
      <div className="text-xs text-gray-500 space-y-0.5">
        <div>Purpose: <span className="font-medium text-gray-700">{visitor.purpose}</span></div>
        <div>Signed in at <span className="font-medium">{formatTime(visitor.sign_in_time)}</span> by {staff}</div>
      </div>

      {/* Sign out button / confirmation */}
      {!readonly && (
        confirming ? (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 min-h-[44px] rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSignOut}
              disabled={busy}
              className="flex-1 min-h-[44px] rounded-xl bg-navy text-white text-sm font-bold hover:bg-navy/90 active:scale-95 transition-all disabled:opacity-50"
            >
              {busy ? 'Signing out…' : 'Confirm sign out'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="w-full min-h-[44px] rounded-xl border-2 border-gray-300 text-gray-700 text-sm font-bold hover:border-navy hover:text-navy transition-colors"
          >
            Sign Out
          </button>
        )
      )}
    </div>
  )
}
