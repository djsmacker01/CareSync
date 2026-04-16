import { useState } from 'react'

export default function AddTaskModal({ onConfirm, onCancel, loading }) {
  const [title, setTitle]         = useState('')
  const [description, setDesc]    = useState('')
  const [shift, setShift]         = useState('AM')
  const [recurring, setRecurring] = useState(true)

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onConfirm({ title: title.trim(), description: description.trim() || null, shift, is_recurring: recurring })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">New Task</div>
          <h2 className="text-lg font-bold text-gray-900">Add to checklist</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Task title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              autoFocus
              placeholder="e.g. Check fire exits"
              className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-gray-900 focus:outline-none focus:border-teal transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="Additional instructions"
              className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 focus:outline-none focus:border-teal transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Shift
            </label>
            <div className="flex gap-2">
              {['AM', 'PM', 'BOTH'].map(s => (
                <button key={s} type="button" onClick={() => setShift(s)}
                  className={`flex-1 min-h-[44px] rounded-xl border-2 text-sm font-bold transition-all ${
                    shift === s ? 'border-teal bg-teal/5 text-teal' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  {s === 'AM' ? 'Morning' : s === 'PM' ? 'Afternoon' : 'Both'}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setRecurring(!recurring)}
              className={`w-12 h-6 rounded-full transition-colors relative ${recurring ? 'bg-teal' : 'bg-gray-200'}`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${recurring ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700">Recurring daily</span>
          </label>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} disabled={loading}
              className="flex-1 min-h-[52px] rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={loading || !title.trim()}
              className="flex-1 min-h-[52px] rounded-xl bg-teal text-white font-bold text-sm hover:bg-teal/90 transition-colors disabled:opacity-40">
              {loading ? 'Adding…' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
