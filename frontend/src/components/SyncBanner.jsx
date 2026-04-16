/**
 * SyncBanner — persistent status bar shown in Layout.
 *
 * States:
 *  offline + no pending  → red  "No internet connection"
 *  offline + pending     → red  "Offline · N changes will sync when reconnected"
 *  syncing               → yellow "Syncing N changes…"
 *  done                  → green "All changes synced"  (auto-dismisses)
 *  error                 → orange expandable list of failed items
 */

import { useState } from 'react'
import { WifiOff, RefreshCw, Clock, Check, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'

export default function SyncBanner({ isOnline, pendingCount, syncStatus, syncErrors }) {
  const [expanded, setExpanded] = useState(false)

  // Nothing to show when everything is normal
  if (isOnline && pendingCount === 0 && syncStatus === 'idle') return null

  // ── Offline ──
  if (!isOnline) {
    return (
      <div className="bg-red-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-center gap-2 text-center">
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
        {pendingCount > 0
          ? `Offline · ${pendingCount} ${pendingCount === 1 ? 'change' : 'changes'} will sync when reconnected`
          : 'No internet connection · Read-only mode'}
      </div>
    )
  }

  // ── Syncing ──
  if (syncStatus === 'syncing') {
    return (
      <div className="bg-amber-500 text-white text-xs font-bold px-4 py-2 flex items-center justify-center gap-2">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        Syncing {pendingCount} {pendingCount === 1 ? 'change' : 'changes'}…
      </div>
    )
  }

  // ── Pending (online but not yet flushed) ──
  if (isOnline && pendingCount > 0 && syncStatus === 'idle') {
    return (
      <div className="bg-amber-100 border-b border-amber-200 text-amber-800 text-xs font-bold px-4 py-2 flex items-center justify-center gap-2">
        <Clock className="w-3.5 h-3.5" />
        {pendingCount} {pendingCount === 1 ? 'change' : 'changes'} pending sync
      </div>
    )
  }

  // ── Done ──
  if (syncStatus === 'done') {
    return (
      <div className="bg-green-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-center gap-2">
        <Check className="w-3.5 h-3.5" />
        All changes synced
      </div>
    )
  }

  // ── Error ──
  if (syncStatus === 'error' && syncErrors.length > 0) {
    return (
      <div className="bg-orange-50 border-b border-orange-200 text-orange-800 text-xs font-bold px-4 py-2">
        <button
          className="w-full flex items-center justify-center gap-2"
          onClick={() => setExpanded(v => !v)}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          {syncErrors.length} {syncErrors.length === 1 ? 'change' : 'changes'} failed to sync
          {expanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
        </button>
        {expanded && (
          <div className="mt-2 space-y-1 font-normal">
            {syncErrors.map((e, i) => (
              <div key={i} className="bg-white rounded-lg px-3 py-2 border border-orange-200">
                <span className="font-semibold">{e.label}</span>
                <span className="text-orange-600 ml-2">— {e.serverError}</span>
              </div>
            ))}
            <p className="text-center text-orange-600 mt-1">
              Contact your supervisor if errors persist.
            </p>
          </div>
        )}
      </div>
    )
  }

  return null
}
