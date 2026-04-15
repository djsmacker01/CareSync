import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import TimeoutWarning from './TimeoutWarning'

const NAV_ITEMS = [
  { to: '/mar',       label: 'MAR',           roles: ['staff', 'supervisor', 'manager', 'readonly'] },
  { to: '/stock',     label: 'Stock',          roles: ['staff', 'supervisor', 'manager'] },
  { to: '/tasks',     label: 'Tasks',          roles: ['staff', 'supervisor', 'manager'] },
  { to: '/fire',      label: 'Fire Safety',    roles: ['staff', 'supervisor', 'manager', 'readonly'] },
  { to: '/visitors',  label: 'Visitors',       roles: ['staff', 'supervisor', 'manager', 'readonly'] },
  { to: '/clients',   label: 'Service Users',  roles: ['staff', 'supervisor', 'manager'] },
  { to: '/dashboard', label: 'Dashboard',      roles: ['manager'] },
  { to: '/staff',     label: 'Staff',          roles: ['manager'] },
]

const NAV_ICONS = {
  '/mar':       '💊',
  '/stock':     '📦',
  '/tasks':     '✅',
  '/fire':      '🔥',
  '/visitors':  '👤',
  '/clients':   '🏠',
  '/dashboard': '📊',
  '/staff':     '👥',
}

const ROLE_BADGE = {
  staff:      { label: 'Staff',      color: 'bg-blue-100 text-blue-800' },
  supervisor: { label: 'Supervisor', color: 'bg-purple-100 text-purple-800' },
  manager:    { label: 'Manager',    color: 'bg-green-100 text-green-800' },
  readonly:   { label: 'Read only',  color: 'bg-gray-100 text-gray-600' },
}

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(user?.role))

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const badge = ROLE_BADGE[user?.role] || ROLE_BADGE.readonly

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TimeoutWarning />

      {/* ── Top bar ── */}
      <header className="bg-navy text-white px-3 sm:px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="sm:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
            aria-label="Open navigation"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="3" y1="5.5" x2="19" y2="5.5"/>
              <line x1="3" y1="11" x2="19" y2="11"/>
              <line x1="3" y1="16.5" x2="19" y2="16.5"/>
            </svg>
          </button>
          <span className="font-bold text-lg tracking-tight text-teal2">CareSync</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.color}`}>
            {badge.label}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-sm text-gray-300 hidden sm:block truncate max-w-[160px]">{user?.full_name}</span>
          <button
            onClick={handleLogout}
            className="min-h-[44px] min-w-[44px] px-3 sm:px-4 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-sm font-semibold transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      {/* ── Horizontal nav — tablet & desktop only ── */}
      <nav className="hidden sm:flex bg-white border-b border-gray-200 px-2 overflow-x-auto sticky top-[56px] z-20 scrollbar-hide">
        {visibleNav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `min-h-[44px] px-4 flex items-center text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-teal text-teal'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 sm:hidden flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div className="relative w-72 max-w-[85vw] bg-navy flex flex-col shadow-2xl">
            {/* Drawer header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-bold text-lg text-teal2 tracking-tight">CareSync</div>
                <div className="text-sm text-gray-300 mt-0.5 truncate">{user?.full_name}</div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/60 hover:text-white active:text-white/40 transition-colors ml-2"
                aria-label="Close menu"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="2" y1="2" x2="16" y2="16"/>
                  <line x1="16" y1="2" x2="2" y2="16"/>
                </svg>
              </button>
            </div>

            {/* Role badge */}
            <div className="px-5 py-3 border-b border-white/10">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.color}`}>
                {badge.label}
              </span>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto py-2">
              {visibleNav.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-5 py-3.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'text-teal2 bg-white/10 border-l-4 border-teal2'
                        : 'text-gray-300 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
                    }`
                  }
                >
                  <span className="text-lg w-6 text-center shrink-0">{NAV_ICONS[item.to]}</span>
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Logout */}
            <div className="px-5 py-4 border-t border-white/10">
              <button
                onClick={() => { setDrawerOpen(false); handleLogout() }}
                className="w-full min-h-[48px] rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-semibold text-sm transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page content ── */}
      <main className="flex-1 p-3 sm:p-4 max-w-4xl mx-auto w-full pb-safe">
        {children}
      </main>
    </div>
  )
}
