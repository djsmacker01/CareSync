import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * Handles the password-reset callback from Supabase.
 *
 * Flow:
 *   1. Staff clicks "Forgot password?" on Login page
 *   2. Supabase emails a magic link pointing to /reset-password
 *   3. Supabase appends #access_token=...&type=recovery to the URL
 *   4. onAuthStateChange fires with event = 'PASSWORD_RECOVERY'
 *   5. Staff enters and confirms their new password
 *   6. supabase.auth.updateUser() sets the password, then we sign out
 *      and redirect to /login with a success flag
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate()

  const [ready, setReady]         = useState(false)   // waiting for PASSWORD_RECOVERY event
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [showPw, setShowPw]       = useState(false)

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when it detects type=recovery in the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })

    // If already in a recovery session (page reload after Supabase set the session)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      return setError('Password must be at least 8 characters.')
    }
    if (password !== confirm) {
      return setError('Passwords do not match.')
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      // Sign out so the staff member logs in fresh with the new password
      await supabase.auth.signOut()
      navigate('/login?passwordReset=true', { replace: true })
    } catch (err) {
      setError(err.message || 'Failed to update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="text-4xl font-black tracking-tight text-white mb-1">
          Care<span className="text-teal">Sync</span>
        </div>
        <div className="text-gray-400 text-xs uppercase tracking-widest">
          Password Reset
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
        <h2 className="text-xl font-black text-gray-900 mb-1">Set a new password</h2>
        <p className="text-sm text-gray-500 mb-6">
          Choose a strong password you haven't used before.
        </p>

        {!ready && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl animate-pulse mb-3">🔒</div>
            <p className="text-sm">Verifying your reset link…</p>
          </div>
        )}

        {ready && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                  className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 pr-12 text-gray-900 focus:outline-none focus:border-teal transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
                  tabIndex={-1}
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="Re-enter new password"
                autoComplete="new-password"
                className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-gray-900 focus:outline-none focus:border-teal transition-colors"
              />
            </div>

            {/* Strength hint */}
            {password.length > 0 && (
              <StrengthBar password={password} />
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              className="w-full min-h-[52px] rounded-xl bg-teal text-white font-bold text-base hover:bg-teal/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Updating…' : 'Set New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function StrengthBar({ password }) {
  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const levels = [
    { label: 'Very weak', color: 'bg-red-400'    },
    { label: 'Weak',      color: 'bg-orange-400' },
    { label: 'Fair',      color: 'bg-yellow-400' },
    { label: 'Good',      color: 'bg-blue-400'   },
    { label: 'Strong',    color: 'bg-green-500'  },
  ]
  const level = levels[Math.min(score, 4)]

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {levels.map((l, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full transition-colors ${
              i <= score - 1 ? level.color : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-400">{level.label}</p>
    </div>
  )
}
