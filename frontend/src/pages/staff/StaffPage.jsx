import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useStaff } from '../../hooks/useStaff'
import AddStaffModal from '../../components/staff/AddStaffModal'
import EditStaffModal from '../../components/staff/EditStaffModal'
import SetPinModal from '../../components/staff/SetPinModal'
import { Search, Users, AlertTriangle, Pencil, Lock, LockOpen, RefreshCw } from 'lucide-react'

const ROLE_BADGE = {
  staff:      { label: 'Staff',      color: 'bg-blue-100 text-blue-800'     },
  supervisor: { label: 'Supervisor', color: 'bg-purple-100 text-purple-800' },
  manager:    { label: 'Manager',    color: 'bg-green-100 text-green-800'   },
  readonly:   { label: 'Read Only',  color: 'bg-gray-100 text-gray-500'     },
}

export default function StaffPage() {
  const { user } = useAuth()
  const {
    staff, loading, error,
    fetchStaff, createStaff, updateStaff,
    deactivateStaff, reactivateStaff, setPin,
  } = useStaff()

  const [search, setSearch]             = useState('')
  const [showAdd, setShowAdd]           = useState(false)
  const [editTarget, setEditTarget]     = useState(null)
  const [pinTarget, setPinTarget]       = useState(null)
  const [confirmDeact, setConfirmDeact] = useState(null)
  const [toast, setToast]               = useState(null)
  const [filter, setFilter]             = useState('active')  // 'active' | 'inactive' | 'all'

  useEffect(() => { fetchStaff() }, [fetchStaff])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Filtering & sorting ──────────────────────────────────────────
  const visible = (staff || []).filter(s => {
    const term = search.trim().toLowerCase()
    const matchSearch =
      !term ||
      s.full_name.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      s.role.toLowerCase().includes(term)

    const matchFilter =
      filter === 'all' ||
      (filter === 'active' && s.is_active) ||
      (filter === 'inactive' && !s.is_active)

    return matchSearch && matchFilter
  }).sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
    return a.full_name.localeCompare(b.full_name)
  })

  const activeCount   = (staff || []).filter(s => s.is_active).length
  const inactiveCount = (staff || []).filter(s => !s.is_active).length

  // ── Action handlers ──────────────────────────────────────────────
  async function handleAdd(form) {
    // Return the full result (with tempPassword) so the modal can show credentials.
    // The modal calls onCreated() when the user clicks Done, which is when we close.
    return await createStaff(form)
  }

  function handleAddCreated(member) {
    showToast(`${member.full_name} added successfully`)
    setShowAdd(false)
  }

  async function handleEdit(updates) {
    const updated = await updateStaff(editTarget.id, updates)
    showToast(`${updated.full_name} updated`)
    setEditTarget(null)
  }

  async function handlePin(pinValue) {
    const hasPinNow = await setPin(pinTarget.id, pinValue)
    showToast(
      hasPinNow
        ? `PIN set for ${pinTarget.full_name}`
        : `PIN cleared for ${pinTarget.full_name}`
    )
    setPinTarget(null)
  }

  async function handleDeactivate() {
    try {
      await deactivateStaff(confirmDeact.id)
      showToast(`${confirmDeact.full_name} deactivated`)
      setConfirmDeact(null)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function handleReactivate(member) {
    try {
      await reactivateStaff(member.id)
      showToast(`${member.full_name} reactivated`)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-y-2 gap-x-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">Staff Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading
              ? 'Loading…'
              : `${activeCount} active · ${inactiveCount} inactive`}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="min-h-[44px] px-5 rounded-xl bg-teal text-white text-sm font-bold hover:bg-teal/90 transition-colors flex-shrink-0"
        >
          + Add Staff
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
          toast.type === 'error'
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}{' '}
          <button onClick={fetchStaff} className="underline font-semibold ml-1">
            Retry
          </button>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          <input
            type="search"
            placeholder="Search by name, email or role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border-2 border-gray-200 pl-9 pr-4 text-sm text-gray-900 focus:border-teal focus:outline-none"
          />
        </div>
        <div className="flex rounded-xl border-2 border-gray-200 overflow-hidden shrink-0">
          {[
            { key: 'active',   label: `Active (${activeCount})`     },
            { key: 'inactive', label: `Inactive (${inactiveCount})` },
            { key: 'all',      label: 'All'                          },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`min-h-[44px] px-3 text-xs font-bold transition-colors ${
                filter === f.key
                  ? 'bg-teal text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Staff list */}
      {!loading && (
        <div className="space-y-3">
          {visible.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              {search
                ? <p className="text-sm">No staff match &ldquo;{search}&rdquo;</p>
                : <p className="text-sm">No staff in this filter</p>
              }
            </div>
          )}

          {visible.map(member => {
            const rb    = ROLE_BADGE[member.role] || ROLE_BADGE.readonly
            const isSelf = member.id === user?.id
            const initial = member.full_name.charAt(0).toUpperCase()

            return (
              <div
                key={member.id}
                className={`bg-white rounded-2xl border-2 p-4 transition-all ${
                  member.is_active ? 'border-gray-200' : 'border-dashed border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${
                    member.is_active ? 'bg-teal/15' : 'bg-gray-100'
                  }`}>
                    <span className={`text-base font-black ${
                      member.is_active ? 'text-teal' : 'text-gray-400'
                    }`}>
                      {initial}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-gray-900 text-sm">{member.full_name}</span>
                      {isSelf && (
                        <span className="text-[10px] font-black text-teal bg-teal/10 px-1.5 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                      {!member.is_active && (
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{member.email}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${rb.color}`}>
                        {rb.label}
                      </span>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        {member.has_pin ? <Lock className="w-3 h-3" /> : <LockOpen className="w-3 h-3" />}
                        {member.has_pin ? 'PIN set' : 'No PIN'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => setEditTarget(member)}
                      className="min-h-[34px] px-3 rounded-lg border border-gray-200 text-gray-600 text-[11px] font-bold hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => setPinTarget(member)}
                      className="min-h-[34px] px-3 rounded-lg border border-gray-200 text-gray-600 text-[11px] font-bold hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      {member.has_pin ? <RefreshCw className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      PIN
                    </button>
                    {!isSelf && (
                      member.is_active ? (
                        <button
                          onClick={() => setConfirmDeact(member)}
                          className="min-h-[34px] px-3 rounded-lg border border-red-200 text-red-500 text-[11px] font-bold hover:bg-red-50 transition-colors"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(member)}
                          className="min-h-[34px] px-3 rounded-lg border border-green-200 text-green-600 text-[11px] font-bold hover:bg-green-50 transition-colors"
                        >
                          Reactivate
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirm deactivate */}
      {confirmDeact && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-amber-500" />
                </div>
              </div>
              <h2 className="text-lg font-black text-gray-900">
                Deactivate {confirmDeact.full_name}?
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                They will not be able to log in. All their records are preserved and the account can be reactivated later.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeact(null)}
                className="flex-1 min-h-[48px] rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                className="flex-1 min-h-[48px] rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <AddStaffModal
          onSave={handleAdd}
          onCreated={handleAddCreated}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Edit modal */}
      {editTarget && (
        <EditStaffModal
          member={editTarget}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* PIN modal */}
      {pinTarget && (
        <SetPinModal
          member={pinTarget}
          onSave={handlePin}
          onClose={() => setPinTarget(null)}
        />
      )}
    </div>
  )
}
