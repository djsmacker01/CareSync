import { useEffect, useState } from 'react'
import { X, CheckCircle2 } from 'lucide-react'

export default function HandoverModal({ shift, fetchHandoverData, onSave, onClose, userId, loading: saving }) {
  const [handoverData, setHD]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadErr] = useState(null)
  const [saveError, setSaveErr] = useState(null)
  const [notes, setNotes]       = useState('')
  const [saved, setSaved]       = useState(false)
  const draftKey = `caresync:handover-draft:${userId}:${shift}`

  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey)
    if (savedDraft) setNotes(savedDraft)
    fetchHandoverData(shift)
      .then(d => {
        setHD(d)
        if (!savedDraft) {
          if (d.existing?.content) setNotes(d.existing.content)
          else setNotes(buildAutoContent(d))
        }
      })
      .catch(err => setLoadErr(err.message || 'Failed to load handover data.'))
      .finally(() => setLoading(false))
  }, [shift, fetchHandoverData, draftKey])

  useEffect(() => {
    const id = setTimeout(() => {
      if (!notes.trim()) return
      localStorage.setItem(draftKey, notes)
    }, 400)
    return () => clearTimeout(id)
  }, [notes, draftKey])

  useEffect(() => {
    const persistOnRequest = () => {
      if (notes.trim()) localStorage.setItem(draftKey, notes)
    }
    const persistOnUnload = () => persistOnRequest()
    window.addEventListener('caresync:autosave-requested', persistOnRequest)
    window.addEventListener('beforeunload', persistOnUnload)
    return () => {
      window.removeEventListener('caresync:autosave-requested', persistOnRequest)
      window.removeEventListener('beforeunload', persistOnUnload)
    }
  }, [notes, draftKey])

  function buildAutoContent(d) {
    const lines = []
    if (d.incompleteTasks.length) {
      lines.push('INCOMPLETE TASKS:')
      d.incompleteTasks.forEach(t => lines.push(`  • ${t.title}`))
    }
    if (d.refusals.length) {
      lines.push('\nMEDICATION REFUSALS:')
      d.refusals.forEach(r => lines.push(`  • ${r.clients?.full_name}: ${r.medications?.medication_name} — ${r.refusal_reason}`))
    }
    if (d.stockAlerts.length) {
      lines.push('\nLOW STOCK ALERTS:')
      d.stockAlerts.forEach(s => lines.push(`  • ${s.clients?.full_name}: ${s.medications?.medication_name} — ${s.current_quantity} ${s.unit} remaining`))
    }
    if (lines.length === 0) lines.push('All tasks completed. No medication refusals. No stock alerts.')
    return lines.join('\n')
  }

  function buildFlags(d) {
    const flags = []
    if (d.incompleteTasks.length)  flags.push('incomplete_tasks')
    if (d.refusals.length)         flags.push('med_refused')
    if (d.stockAlerts.length)      flags.push('low_stock')
    return flags
  }

  async function handleSave() {
    if (!handoverData) return
    setSaveErr(null)
    try {
      await onSave({ shift, content: notes, flags: buildFlags(handoverData), userId })
      localStorage.removeItem(draftKey)
      setSaved(true)
    } catch (err) {
      setSaveErr(err.message || 'Failed to save handover note.')
    }
  }

  const nextShift = shift === 'AM' ? 'PM' : 'AM'
  const shiftLabel = shift === 'AM' ? 'Morning' : 'Afternoon'
  const nextShiftLabel = nextShift === 'AM' ? 'Morning' : 'Afternoon'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <div className="text-xs font-bold text-pending uppercase tracking-wider mb-1">Shift Handover</div>
            <h2 className="text-lg font-bold text-gray-900">{shiftLabel} → {nextShiftLabel} Handover Note</h2>
          </div>
          <button onClick={onClose} className="min-h-[44px] min-w-[44px] rounded-xl border-2 border-gray-200 text-gray-400 hover:bg-gray-50 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {loading && <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />}

          {loadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {loadError}
            </div>
          )}

          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {saveError}
            </div>
          )}

          {!loading && handoverData && (
            <>
              {/* Summary pills */}
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${handoverData.incompleteTasks.length ? 'bg-pending/10 text-pending' : 'bg-given/10 text-given'}`}>
                  {handoverData.incompleteTasks.length} incomplete tasks
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${handoverData.refusals.length ? 'bg-refused/10 text-refused' : 'bg-given/10 text-given'}`}>
                  {handoverData.refusals.length} refusals
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${handoverData.stockAlerts.length ? 'bg-refused/10 text-refused' : 'bg-given/10 text-given'}`}>
                  {handoverData.stockAlerts.length} stock alerts
                </span>
              </div>

              {/* Editable note */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Handover notes
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={10}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm text-gray-900 font-mono resize-none focus:outline-none focus:border-teal transition-colors"
                  placeholder="Add your handover notes here…"
                />
              </div>

              {saved && (
                <div className="bg-given/10 border border-given/20 text-given text-sm rounded-xl px-4 py-3 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Handover note saved — {nextShiftLabel} staff will see this on login.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-3 border-t border-gray-100 flex gap-3 shrink-0">
          <button onClick={onClose}
            className="flex-1 min-h-[52px] rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors">
            {saved ? 'Close' : 'Cancel'}
          </button>
          {!saved && (
            <button onClick={handleSave} disabled={saving || loading || !notes.trim()}
              className="flex-1 min-h-[52px] rounded-xl bg-teal text-white font-bold text-sm hover:bg-teal/90 transition-colors disabled:opacity-40">
              {saving ? 'Saving…' : 'Save Handover Note'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
