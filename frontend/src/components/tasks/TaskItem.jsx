export default function TaskItem({ task, shift, onComplete, onUncomplete, onDeactivate, canManage, submitting }) {
  const { id, title, description, completed, completion } = task

  const time = completion?.completed_at
    ? new Date(completion.completed_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border-2 transition-all ${
      completed ? 'border-given/30 bg-given/5' : 'border-gray-200 bg-white'
    }`}>
      {/* Checkbox */}
      <button
        onClick={() => completed ? onUncomplete(task) : onComplete(task)}
        disabled={submitting}
        className={`shrink-0 w-7 h-7 mt-0.5 rounded-lg border-2 flex items-center justify-center transition-all active:scale-90 ${
          completed
            ? 'bg-given border-given text-white'
            : 'border-gray-300 hover:border-teal'
        }`}
        aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {completed && <span className="text-sm font-black">✓</span>}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`font-semibold text-sm leading-snug ${completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {title}
        </div>
        {description && !completed && (
          <div className="text-xs text-gray-400 mt-0.5">{description}</div>
        )}
        {completed && completion && (
          <div className="text-xs text-given mt-0.5">
            {completion.users?.full_name || 'Staff'} · {time}
            {completion.notes && <span className="text-gray-400 ml-1">— {completion.notes}</span>}
          </div>
        )}
      </div>

      {/* Manager deactivate */}
      {canManage && !completed && (
        <button
          onClick={() => onDeactivate(task)}
          className="shrink-0 min-h-[32px] min-w-[32px] rounded-lg text-gray-300 hover:text-refused hover:bg-refused/5 transition-colors text-xs"
          title="Remove task"
        >
          ✕
        </button>
      )}
    </div>
  )
}
