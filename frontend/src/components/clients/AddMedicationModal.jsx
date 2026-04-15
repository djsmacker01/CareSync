import { useState } from 'react'

const ROUTES = [
  { value: 'oral',       label: 'Oral (swallowed)' },
  { value: 'topical',    label: 'Topical (skin)' },
  { value: 'inhaled',    label: 'Inhaled' },
  { value: 'injection',  label: 'Injection' },
  { value: 'drops',      label: 'Drops (eye/ear/nose)' },
  { value: 'patch',      label: 'Patch (transdermal)' },
  { value: 'other',      label: 'Other' },
]

const UNITS = ['tablets', 'capsules', 'ml', 'patches', 'sachets', 'ampoules', 'other']

const FREQUENCIES = [
  'Once daily (OD)',
  'Twice daily (BD)',
  'Three times daily (TDS)',
  'Four times daily (QDS)',
  'Every 8 hours (TDS)',
  'Every 4-6 hours (PRN)',
  'Once weekly',
  'As required (PRN)',
  'At night (ON)',
  'In the morning (OM)',
]

export default function AddMedicationModal({ clientName, onSave, onClose, submitting }) {
  const [form, setForm] = useState({
    medication_name:   '',
    dosage:            '',
    frequency:         '',
    route:             'oral',
    prescriber:        '',
    start_date:        new Date().toISOString().slice(0, 10),
    initial_quantity:  '',
    unit:              'tablets',
    reorder_threshold: '7',
  })
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.medication_name.trim()) { setError('Medication name is required.'); return }
    if (!form.dosage.trim())          { setError('Dosage is required.'); return }
    if (!form.frequency.trim())       { setError('Frequency is required.'); return }
    if (form.initial_quantity === '')  { setError('Please enter the opening stock quantity (use 0 if none yet).'); return }

    try {
      await onSave(form)
    } catch (err) {
      setError(err.message || 'Failed to add medication.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-black text-gray-900">Add New Medication</h2>
            <p className="text-xs text-gray-400 mt-0.5">GP prescription for {clientName}</p>
          </div>
          <button onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Prescription details section */}
          <div className="bg-blue-50 rounded-xl px-3 py-2">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Prescription Details</p>
          </div>

          {/* Medication name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Medication Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.medication_name}
              onChange={e => set('medication_name', e.target.value)}
              placeholder="e.g. Amlodipine"
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-3 text-gray-900 text-sm focus:border-teal focus:outline-none"
            />
          </div>

          {/* Dosage */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Dosage <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.dosage}
              onChange={e => set('dosage', e.target.value)}
              placeholder="e.g. 5mg, 10mg/5ml"
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-3 text-gray-900 text-sm focus:border-teal focus:outline-none"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Frequency <span className="text-red-500">*</span>
            </label>
            <select
              value={form.frequency}
              onChange={e => set('frequency', e.target.value)}
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-3 text-gray-900 text-sm focus:border-teal focus:outline-none bg-white"
            >
              <option value="">Select frequency…</option>
              {FREQUENCIES.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
              <option value="custom">Other (type below)</option>
            </select>
            {form.frequency === 'custom' && (
              <input
                type="text"
                placeholder="Describe frequency…"
                onChange={e => set('frequency', e.target.value)}
                className="mt-2 w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-3 text-gray-900 text-sm focus:border-teal focus:outline-none"
              />
            )}
          </div>

          {/* Route */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Administration Route</label>
            <div className="grid grid-cols-2 gap-2">
              {ROUTES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set('route', r.value)}
                  className={`min-h-[44px] rounded-xl border-2 text-sm font-medium transition-all text-left px-3 ${
                    form.route === r.value
                      ? 'border-teal bg-teal/10 text-teal font-bold'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prescriber + Start date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Prescriber</label>
              <input
                type="text"
                value={form.prescriber}
                onChange={e => set('prescriber', e.target.value)}
                placeholder="Dr. Smith"
                className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-3 text-gray-900 text-sm focus:border-teal focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-3 text-gray-900 text-sm focus:border-teal focus:outline-none"
              />
            </div>
          </div>

          {/* Stock section */}
          <div className="bg-amber-50 rounded-xl px-3 py-2 mt-2">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Opening Stock</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Initial quantity */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Quantity on hand <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.initial_quantity}
                onChange={e => set('initial_quantity', e.target.value)}
                placeholder="e.g. 28"
                className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-3 text-gray-900 text-sm focus:border-teal focus:outline-none"
              />
            </div>
            {/* Unit */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Unit</label>
              <select
                value={form.unit}
                onChange={e => set('unit', e.target.value)}
                className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-3 text-gray-900 text-sm focus:border-teal focus:outline-none bg-white"
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Reorder threshold */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Reorder alert when below
            </label>
            <p className="text-xs text-gray-400 mb-1.5">Staff will be warned when stock drops to this level</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                value={form.reorder_threshold}
                onChange={e => set('reorder_threshold', e.target.value)}
                className="w-24 min-h-[48px] rounded-xl border-2 border-gray-200 px-3 text-gray-900 text-sm focus:border-teal focus:outline-none"
              />
              <span className="text-sm text-gray-500">{form.unit}</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 min-h-[48px] rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 min-h-[48px] rounded-xl bg-teal text-white text-sm font-bold hover:bg-teal/90 transition-colors disabled:opacity-50">
              {submitting ? 'Saving…' : 'Add Medication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
