import { useState } from 'react'

const CD_FORMS  = ['Oral Solution', 'Tablets', 'Capsules', 'Patches', 'Injection', 'Suppositories', 'Other']
const CD_UNITS  = ['ml', 'mg', 'tablets', 'patches', 'mcg', 'units']

export default function AddDrugModal({ clientName, onSave, onClose }) {
  const [form, setForm] = useState({
    name:          '',
    strength:      '',
    form:          'Oral Solution',
    cd_schedule:   2,
    unit:          'ml',
    initial_stock: '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim())     return setError('Drug name is required.')
    if (!form.strength.trim()) return setError('Strength is required.')
    setSaving(true)
    try {
      await onSave({
        name:          form.name.trim(),
        strength:      form.strength.trim(),
        form:          form.form,
        cd_schedule:   Number(form.cd_schedule),
        unit:          form.unit,
        initial_stock: form.initial_stock ? Number(form.initial_stock) : 0,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="add-drug-title"
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md">

        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 id="add-drug-title" className="text-lg font-black text-gray-900">Add CD Drug</h2>
            <p className="text-xs text-gray-400 mt-0.5">{clientName}</p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* CD Schedule badge */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                Schedule
              </label>
              <div className="flex gap-2">
                {[2, 3].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('cd_schedule', s)}
                    className={`flex-1 min-h-[44px] rounded-xl text-sm font-bold border-2 transition-colors ${
                      form.cd_schedule === s
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'border-gray-200 text-gray-500 hover:border-amber-300'
                    }`}
                  >
                    Sch {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                Unit
              </label>
              <select
                value={form.unit}
                onChange={e => set('unit', e.target.value)}
                className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-3 text-sm text-gray-900 focus:border-teal focus:outline-none"
              >
                {CD_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Drug name */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Drug Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Morphine Sulphate"
              required
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 focus:border-teal focus:outline-none"
            />
          </div>

          {/* Strength */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Strength
            </label>
            <input
              type="text"
              value={form.strength}
              onChange={e => set('strength', e.target.value)}
              placeholder="e.g. 10 mg/5 ml"
              required
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 focus:border-teal focus:outline-none"
            />
          </div>

          {/* Form */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Formulation
            </label>
            <select
              value={form.form}
              onChange={e => set('form', e.target.value)}
              className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-3 text-sm text-gray-900 focus:border-teal focus:outline-none"
            >
              {CD_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {/* Initial stock */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Opening Balance ({form.unit})
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.initial_stock}
              onChange={e => set('initial_stock', e.target.value)}
              placeholder="0"
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 focus:border-teal focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Current quantity held (from last physical count)
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 min-h-[48px] rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 min-h-[48px] rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 disabled:opacity-50">
              {saving ? 'Saving…' : 'Add Drug'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
