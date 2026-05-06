import { useState } from 'react'
import { useCapacityConsent } from '../../hooks/useCapacityConsent'
import {
  Plus, X, CheckCircle2, XCircle, AlertTriangle,
  Scale, FileCheck, ChevronDown, ChevronUp, Clock,
} from 'lucide-react'

// ── Common decision topics used in UK care / supported living ──────────────
const TOPIC_SUGGESTIONS = [
  'Medication and medical treatment',
  'Financial decisions',
  'Living arrangements',
  'Personal care',
  'Sharing information / data',
  'Eating and drinking',
  'Social activities',
  'Contact with others',
]

const CONSENT_TYPE_LABELS = {
  informed_consent:  'Informed Consent',
  informed_refusal:  'Informed Refusal',
  best_interest:     'Best Interest Decision',
  advance_directive: 'Advance Directive / ADRT',
}

const CONSENT_TYPE_COLOURS = {
  informed_consent:  'bg-given/10 text-given border-given/30',
  informed_refusal:  'bg-refused/10 text-refused border-refused/30',
  best_interest:     'bg-blue-100 text-blue-700 border-blue-200',
  advance_directive: 'bg-purple-100 text-purple-700 border-purple-200',
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function OverdueBadge({ reviewDate }) {
  if (!reviewDate) return null
  const overdue = new Date(reviewDate) < new Date()
  if (!overdue) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-refused/10 text-refused border border-refused/20">
      <AlertTriangle className="w-3 h-3" /> Review overdue
    </span>
  )
}

// ── Add Capacity Assessment Modal ──────────────────────────────────────────
function AddAssessmentModal({ onSave, onClose, loading }) {
  const [form, setForm] = useState({
    decision_topic:  '',
    has_capacity:    true,
    evidence:        '',
    review_date:     '',
    assessment_date: new Date().toISOString().slice(0, 10),
  })
  const [error, setError] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.decision_topic.trim()) { setError('Decision topic is required'); return }
    if (!form.evidence.trim())       { setError('Evidence / rationale is required'); return }
    setError(null)
    try {
      await onSave({
        ...form,
        review_date: form.review_date || null,
      })
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Scale className="w-5 h-5 text-teal" /> New Capacity Assessment
          </h2>
          <button type="button" onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-refused/10 border border-refused/20 px-4 py-2 text-sm text-refused font-medium">{error}</div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Decision topic *</label>
          <input
            list="topics"
            value={form.decision_topic}
            onChange={e => set('decision_topic', e.target.value)}
            placeholder="e.g. Medication and medical treatment"
            className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-teal"
          />
          <datalist id="topics">
            {TOPIC_SUGGESTIONS.map(t => <option key={t} value={t} />)}
          </datalist>
          <p className="text-xs text-gray-400 mt-1">Type or choose from common topics</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Does this person have capacity for this decision? *</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => set('has_capacity', true)}
              className={`min-h-[52px] rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                form.has_capacity
                  ? 'border-given bg-given/10 text-given'
                  : 'border-gray-200 text-gray-400 hover:border-gray-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" /> Has Capacity
            </button>
            <button
              type="button"
              onClick={() => set('has_capacity', false)}
              className={`min-h-[52px] rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                !form.has_capacity
                  ? 'border-refused bg-refused/10 text-refused'
                  : 'border-gray-200 text-gray-400 hover:border-gray-300'
              }`}
            >
              <XCircle className="w-4 h-4" /> Lacks Capacity
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Evidence & rationale *</label>
          <textarea
            value={form.evidence}
            onChange={e => set('evidence', e.target.value)}
            rows={4}
            placeholder="Describe the evidence used to reach this conclusion. Include how the person was assessed, who was present, what information was provided, and what the person communicated…"
            className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-teal resize-none leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Assessment date</label>
            <input
              type="date"
              value={form.assessment_date}
              onChange={e => set('assessment_date', e.target.value)}
              className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-teal"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Review date</label>
            <input
              type="date"
              value={form.review_date}
              onChange={e => set('review_date', e.target.value)}
              className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-teal"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[52px] rounded-xl bg-teal text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save Assessment'}
        </button>
      </form>
    </div>
  )
}

// ── Add Consent Record Modal ───────────────────────────────────────────────
function AddConsentModal({ onSave, onClose, loading }) {
  const [form, setForm] = useState({
    intervention:   '',
    consent_type:   'informed_consent',
    consent_given:  true,
    decision_maker: '',
    rationale:      '',
    witnessed_by:   '',
    valid_from:     new Date().toISOString().slice(0, 10),
    valid_until:    '',
  })
  const [error, setError] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.intervention.trim()) { setError('Intervention is required'); return }
    if (!form.rationale.trim())    { setError('Rationale is required'); return }
    if (form.consent_type === 'best_interest' && !form.decision_maker.trim()) {
      setError('Decision maker is required for best interest decisions'); return
    }
    setError(null)
    try {
      await onSave({
        ...form,
        valid_until:    form.valid_until || null,
        decision_maker: form.decision_maker || null,
        witnessed_by:   form.witnessed_by || null,
      })
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  const isBestInterest = form.consent_type === 'best_interest'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-teal" /> New Consent Record
          </h2>
          <button type="button" onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-refused/10 border border-refused/20 px-4 py-2 text-sm text-refused font-medium">{error}</div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Intervention / treatment *</label>
          <input
            value={form.intervention}
            onChange={e => set('intervention', e.target.value)}
            placeholder="e.g. Administration of medication, Blood test, Sharing info with GP"
            className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-teal"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Consent type *</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(CONSENT_TYPE_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => set('consent_type', key)}
                className={`min-h-[44px] rounded-xl border-2 font-bold text-xs px-2 text-center transition-all ${
                  form.consent_type === key
                    ? CONSENT_TYPE_COLOURS[key]
                    : 'border-gray-200 text-gray-400 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Outcome</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => set('consent_given', true)}
              className={`min-h-[44px] rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                form.consent_given ? 'border-given bg-given/10 text-given' : 'border-gray-200 text-gray-400'
              }`}>
              <CheckCircle2 className="w-4 h-4" /> Agreed / Consented
            </button>
            <button type="button" onClick={() => set('consent_given', false)}
              className={`min-h-[44px] rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                !form.consent_given ? 'border-refused bg-refused/10 text-refused' : 'border-gray-200 text-gray-400'
              }`}>
              <XCircle className="w-4 h-4" /> Declined / Refused
            </button>
          </div>
        </div>

        {isBestInterest && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Decision maker *</label>
            <input
              value={form.decision_maker}
              onChange={e => set('decision_maker', e.target.value)}
              placeholder="Name and role of the person making this best interest decision"
              className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-teal"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Rationale *</label>
          <textarea
            value={form.rationale}
            onChange={e => set('rationale', e.target.value)}
            rows={3}
            placeholder="Why was this decision made? What information was given? What did the person say?"
            className="w-full rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-teal resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Valid from</label>
            <input type="date" value={form.valid_from} onChange={e => set('valid_from', e.target.value)}
              className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-teal" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Valid until</label>
            <input type="date" value={form.valid_until} onChange={e => set('valid_until', e.target.value)}
              placeholder="Leave blank = indefinite"
              className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-teal" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Witnessed by (optional)</label>
          <input
            value={form.witnessed_by}
            onChange={e => set('witnessed_by', e.target.value)}
            placeholder="Name of witness"
            className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-3 text-sm focus:outline-none focus:border-teal"
          />
        </div>

        <button type="submit" disabled={loading}
          className="w-full min-h-[52px] rounded-xl bg-teal text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? 'Saving…' : 'Save Consent Record'}
        </button>
      </form>
    </div>
  )
}

// ── Assessment Card ────────────────────────────────────────────────────────
function AssessmentCard({ assessment }) {
  const [expanded, setExpanded] = useState(false)
  const isOverdue = assessment.review_date && new Date(assessment.review_date) < new Date()

  return (
    <div className={`rounded-2xl border-2 p-4 transition-all ${
      isOverdue
        ? 'border-refused/30 bg-refused/5'
        : assessment.has_capacity
        ? 'border-given/30 bg-given/5'
        : 'border-pending/30 bg-pending/5'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
            assessment.has_capacity ? 'bg-given/20' : 'bg-pending/20'
          }`}>
            {assessment.has_capacity
              ? <CheckCircle2 className="w-5 h-5 text-given" />
              : <XCircle className="w-5 h-5 text-pending" />}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 text-sm">{assessment.decision_topic}</div>
            <div className={`text-xs font-bold mt-0.5 ${assessment.has_capacity ? 'text-given' : 'text-pending'}`}>
              {assessment.has_capacity ? 'Has Capacity' : 'Lacks Capacity'}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              Assessed {formatDate(assessment.assessment_date)}
              {assessment.assessor?.full_name && ` by ${assessment.assessor.full_name}`}
            </div>
            {assessment.review_date && (
              <div className={`text-xs mt-0.5 ${isOverdue ? 'text-refused font-bold' : 'text-gray-400'}`}>
                Review: {formatDate(assessment.review_date)}
                {isOverdue && ' — OVERDUE'}
              </div>
            )}
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-400 hover:text-gray-600">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Evidence & Rationale</p>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{assessment.evidence}</p>
        </div>
      )}
    </div>
  )
}

// ── Consent Card ───────────────────────────────────────────────────────────
function ConsentCard({ consent }) {
  const [expanded, setExpanded] = useState(false)
  const isExpired = consent.valid_until && new Date(consent.valid_until) < new Date()

  return (
    <div className={`rounded-2xl border-2 p-4 ${isExpired ? 'opacity-60 bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${CONSENT_TYPE_COLOURS[consent.consent_type]}`}>
              {CONSENT_TYPE_LABELS[consent.consent_type]}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              consent.consent_given ? 'bg-given/10 text-given' : 'bg-refused/10 text-refused'
            }`}>
              {consent.consent_given ? '✓ Consented' : '✗ Declined'}
            </span>
            {isExpired && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">Expired</span>
            )}
          </div>
          <div className="font-bold text-gray-900 text-sm">{consent.intervention}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            Recorded {formatDate(consent.created_at)}
            {consent.recorder?.full_name && ` by ${consent.recorder.full_name}`}
          </div>
          {consent.valid_until && (
            <div className="text-xs text-gray-400">
              Valid: {formatDate(consent.valid_from)} → {formatDate(consent.valid_until)}
            </div>
          )}
        </div>
        <button onClick={() => setExpanded(v => !v)}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-400 hover:text-gray-600">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Rationale</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{consent.rationale}</p>
          </div>
          {consent.decision_maker && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Decision maker</p>
              <p className="text-sm text-gray-700">{consent.decision_maker}</p>
            </div>
          )}
          {consent.witnessed_by && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Witnessed by</p>
              <p className="text-sm text-gray-700">{consent.witnessed_by}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function CapacityConsent({ clientId, token, canEdit }) {
  const { assessments, consents, loading, error, addAssessment, addConsent } = useCapacityConsent(clientId, token)

  const [showAssessModal, setShowAssessModal] = useState(false)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [actionLoading, setActionLoading]      = useState(false)
  const [toast, setToast]                      = useState(null)
  const [subTab, setSubTab]                    = useState('assessments')

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAddAssessment(payload) {
    setActionLoading(true)
    try {
      await addAssessment(payload)
      setShowAssessModal(false)
      showToast('Capacity assessment saved')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleAddConsent(payload) {
    setActionLoading(true)
    try {
      await addConsent(payload)
      setShowConsentModal(false)
      showToast('Consent record saved')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const overdueAssessments = assessments.filter(
    a => a.review_date && new Date(a.review_date) < new Date()
  )

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-refused/10 border border-refused/20 px-4 py-3 text-sm text-refused">
        Failed to load: {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
          toast.type === 'error'
            ? 'bg-refused/10 text-refused border border-refused/20'
            : 'bg-given/10 text-given border border-given/20'
        }`}>{toast.msg}</div>
      )}

      {/* Overdue banner */}
      {overdueAssessments.length > 0 && (
        <div className="rounded-2xl bg-refused/10 border-2 border-refused/30 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-refused shrink-0" />
          <div>
            <div className="font-bold text-refused text-sm">
              {overdueAssessments.length} capacity {overdueAssessments.length === 1 ? 'assessment' : 'assessments'} overdue for review
            </div>
            <div className="text-xs text-refused/70">
              {overdueAssessments.map(a => a.decision_topic).join(' · ')}
            </div>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex rounded-xl bg-gray-100 p-1">
        <button
          onClick={() => setSubTab('assessments')}
          className={`flex-1 min-h-[38px] rounded-lg text-sm font-bold transition-all ${
            subTab === 'assessments' ? 'bg-white text-navy shadow' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Scale className="w-3.5 h-3.5 inline mr-1.5" />
          Capacity ({assessments.length})
        </button>
        <button
          onClick={() => setSubTab('consent')}
          className={`flex-1 min-h-[38px] rounded-lg text-sm font-bold transition-all ${
            subTab === 'consent' ? 'bg-white text-navy shadow' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5 inline mr-1.5" />
          Consent ({consents.length})
        </button>
      </div>

      {/* ── Capacity assessments ── */}
      {subTab === 'assessments' && (
        <>
          {canEdit && (
            <button
              onClick={() => setShowAssessModal(true)}
              className="w-full min-h-[48px] rounded-xl border-2 border-dashed border-teal/40 text-teal font-bold text-sm flex items-center justify-center gap-2 hover:bg-teal/5 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Capacity Assessment
            </button>
          )}
          {assessments.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-12 text-center text-gray-400">
              <Scale className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-semibold">No capacity assessments recorded</p>
              {canEdit && <p className="text-sm mt-1">Assessments are required under the Mental Capacity Act 2005</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {assessments.map(a => <AssessmentCard key={a.id} assessment={a} />)}
            </div>
          )}
        </>
      )}

      {/* ── Consent records ── */}
      {subTab === 'consent' && (
        <>
          {canEdit && (
            <button
              onClick={() => setShowConsentModal(true)}
              className="w-full min-h-[48px] rounded-xl border-2 border-dashed border-teal/40 text-teal font-bold text-sm flex items-center justify-center gap-2 hover:bg-teal/5 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Consent Record
            </button>
          )}
          {consents.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-12 text-center text-gray-400">
              <FileCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-semibold">No consent records yet</p>
              {canEdit && <p className="text-sm mt-1">Record informed consent, refusals, and best interest decisions here</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {consents.map(c => <ConsentCard key={c.id} consent={c} />)}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showAssessModal && (
        <AddAssessmentModal
          onSave={handleAddAssessment}
          onClose={() => setShowAssessModal(false)}
          loading={actionLoading}
        />
      )}
      {showConsentModal && (
        <AddConsentModal
          onSave={handleAddConsent}
          onClose={() => setShowConsentModal(false)}
          loading={actionLoading}
        />
      )}
    </div>
  )
}
