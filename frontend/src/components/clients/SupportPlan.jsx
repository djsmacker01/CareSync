import { useState } from 'react'
import { useSupportPlan } from '../../hooks/useSupportPlan'
import {
  Pencil, Save, X, Clock, ChevronDown, ChevronUp,
  User, CalendarDays, Heart, Shield, Target, AlertTriangle, Phone,
} from 'lucide-react'

const SECTION_ICONS = {
  about_me:           User,
  daily_routine:      CalendarDays,
  how_to_support:     Heart,
  health_overview:    Shield,
  goals:              Target,
  risks_alerts:       AlertTriangle,
  emergency_contacts: Phone,
}

const SECTION_HINTS = {
  about_me:
    'Personal background, interests, hobbies, cultural or religious preferences, important life history…',
  daily_routine:
    'Preferred wake-up time, morning routine, mealtimes, evening wind-down, bedtime…',
  how_to_support:
    'Communication style, how they like to be approached, physical support preferences, decision-making…',
  health_overview:
    'Diagnosed conditions, allergies, GP details, regular appointments, mobility…',
  goals:
    'Short-term goals (this month), long-term aspirations, steps toward independence…',
  risks_alerts:
    'Known risks, triggers, behaviours of concern, safeguarding notes, environmental hazards…',
  emergency_contacts:
    'Next of kin, advocate, social worker, GP, out-of-hours contacts…',
}

function formatDateTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function SectionCard({ section, canEdit, onSave }) {
  const [editing, setEditing]       = useState(false)
  const [draft, setDraft]           = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory]       = useState(null)

  const Icon = SECTION_ICONS[section.section_key] || User
  const isEmpty = !section.content?.trim()

  function startEdit() {
    setDraft(section.content || '')
    setEditing(true)
    setError(null)
  }

  function cancelEdit() {
    setEditing(false)
    setDraft('')
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await onSave(section.section_key, draft)
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`rounded-2xl border-2 transition-all ${
      editing ? 'border-teal/40 bg-teal/5' : 'border-gray-200 bg-white'
    }`}>
      <div className="p-4">
        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isEmpty ? 'bg-gray-100' : 'bg-teal/10'
            }`}>
              <Icon className={`w-4 h-4 ${isEmpty ? 'text-gray-400' : 'text-teal'}`} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{section.title}</h3>
              {section.updated_at && !editing && (
                <p className="text-xs text-gray-400">
                  v{section.version} · Updated {formatDateTime(section.updated_at)}
                  {section.users?.full_name && ` by ${section.users.full_name}`}
                </p>
              )}
            </div>
          </div>
          {canEdit && !editing && (
            <button
              onClick={startEdit}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border-2 border-gray-200 text-gray-400 hover:border-teal hover:text-teal transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Content or editor */}
        {editing ? (
          <div className="space-y-3">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={6}
              placeholder={SECTION_HINTS[section.section_key] || 'Enter details…'}
              className="w-full rounded-xl border-2 border-teal/30 px-3 py-2 text-sm focus:outline-none focus:border-teal resize-y leading-relaxed"
              autoFocus
            />
            {error && (
              <div className="text-xs text-refused font-medium">{error}</div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 min-h-[44px] rounded-xl bg-teal text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="min-h-[44px] px-4 rounded-xl border-2 border-gray-200 text-gray-500 font-bold text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div>
            {isEmpty ? (
              <p className="text-sm text-gray-400 italic leading-relaxed">
                {canEdit
                  ? `Nothing recorded yet. Tap the pencil to add details.`
                  : 'Nothing recorded yet.'}
              </p>
            ) : (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{section.content}</p>
            )}
          </div>
        )}
      </div>

      {/* History toggle */}
      {!editing && section.version > 1 && (
        <div className="border-t border-gray-100 px-4 py-2">
          <button
            onClick={async () => {
              if (!showHistory && !history) {
                const h = await section._fetchHistory?.()
                setHistory(h || [])
              }
              setShowHistory(v => !v)
            }}
            className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600"
          >
            <Clock className="w-3 h-3" />
            {showHistory ? 'Hide' : 'Show'} version history
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showHistory && history && (
            <div className="mt-2 space-y-2">
              {history.slice(1).map(h => (
                <div key={h.id} className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                  <div className="text-xs text-gray-400 mb-1">
                    v{h.version} · {formatDateTime(h.updated_at)}
                    {h.users?.full_name && ` by ${h.users.full_name}`}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {h.content || <em>Empty</em>}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SupportPlan({ clientId, token, canEdit }) {
  const { sections, loading, error, saveSection, fetchHistory } = useSupportPlan(clientId, token)

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-refused/10 border border-refused/20 px-4 py-3 text-sm text-refused">
        Failed to load support plan: {error}
      </div>
    )
  }

  const hasContent = sections.some(s => s.content?.trim())

  return (
    <div className="space-y-3">
      {!hasContent && !canEdit && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-12 text-center text-gray-400">
          <div className="text-4xl mb-2">📋</div>
          <p className="font-semibold">Support plan not yet created</p>
          <p className="text-sm mt-1">A manager or supervisor will complete this.</p>
        </div>
      )}

      {sections.map(section => (
        <SectionCard
          key={section.section_key}
          section={{
            ...section,
            _fetchHistory: () => fetchHistory(section.section_key),
          }}
          canEdit={canEdit}
          onSave={saveSection}
        />
      ))}
    </div>
  )
}
