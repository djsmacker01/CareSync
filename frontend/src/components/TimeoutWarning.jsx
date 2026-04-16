import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function TimeoutWarning() {
  const { showTimeoutWarn, warnDeadline, dismissTimeoutWarn, signOut } = useAuth()
  const [remainingMs, setRemainingMs] = useState(0)

  useEffect(() => {
    if (!showTimeoutWarn || !warnDeadline) return
    const tick = () => setRemainingMs(Math.max(0, warnDeadline - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [showTimeoutWarn, warnDeadline])

  const minutesLeft = useMemo(() => Math.max(1, Math.ceil(remainingMs / 60_000)), [remainingMs])

  if (!showTimeoutWarn) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full text-center">
        <div className="text-5xl mb-4">⏱</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Still there?</h2>
        <p className="text-gray-500 text-sm mb-6">
          You will be logged out in <span className="font-bold text-amber-600">{minutesLeft} minute{minutesLeft === 1 ? '' : 's'}</span> due to inactivity.
          Open forms are being autosaved.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => signOut({ reason: 'inactivity-warning' })}
            className="flex-1 min-h-[44px] rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Log out now
          </button>
          <button
            onClick={dismissTimeoutWarn}
            className="flex-1 min-h-[44px] rounded-xl bg-teal text-white font-bold text-sm hover:bg-teal/90 transition-colors"
          >
            Stay logged in
          </button>
        </div>
      </div>
    </div>
  )
}
