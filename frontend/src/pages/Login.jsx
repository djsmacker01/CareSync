import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ROLE_HOME } from '../components/ProtectedRoute'
import { supabase } from '../lib/supabase'

// ── PIN Keypad ─────────────────────────────────────────────
function PinKeypad({ value, onChange, maxLength = 6 }) {
  const digits = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  function press(key) {
    if (key === '⌫') {
      onChange(value.slice(0, -1))
    } else if (key !== '' && value.length < maxLength) {
      onChange(value + key)
    }
  }

  return (
    <div className="space-y-3">
      {/* PIN dots display */}
      <div className="flex justify-center gap-3 py-2">
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all ${
              i < value.length
                ? 'bg-teal border-teal scale-110'
                : 'bg-transparent border-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Keypad grid */}
      <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto">
        {digits.map((key, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => key !== '' && press(key)}
            disabled={key === ''}
            className={`
              min-h-[64px] rounded-2xl text-2xl font-bold transition-all active:scale-95
              ${key === '' ? 'invisible' : ''}
              ${key === '⌫'
                ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                : 'bg-white text-navy border-2 border-gray-200 hover:border-teal hover:text-teal shadow-sm'
              }
            `}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Login Page ─────────────────────────────────────────────
export default function Login() {
  const { signInWithPassword, signInWithPin, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [mode, setMode]             = useState('password')  // 'password' | 'pin' | 'forgot'
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [pin, setPin]               = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [resetSent, setResetSent]   = useState(false)
  const [successMsg, setSuccessMsg] = useState(
    searchParams.get('passwordReset') === 'true'
      ? 'Password updated successfully. Please sign in with your new password.'
      : null
  )

  // Redirect when user becomes available — done in an effect to avoid
  // side-effects during render (which React 18 Strict Mode double-invokes).
  useEffect(() => {
    if (user) navigate(ROLE_HOME[user.role] || '/mar', { replace: true })
  }, [user, navigate])

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithPassword(email.trim(), password)
      // Navigation is handled by the "already logged in" guard above —
      // once AuthContext sets user, this component re-renders and redirects.
    } catch (err) {
      setError(err.message || 'Login failed. Check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePinSubmit(e) {
    e.preventDefault()
    if (pin.length < 6) { setError('Please enter your full 6-digit PIN.'); return }
    setError('')
    setLoading(true)
    try {
      await signInWithPin(email.trim(), pin)
      // Navigation handled by the "already logged in" guard once user state is set
    } catch (err) {
      setPin('')
      setError(err.message || 'PIN login failed.')
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit when 6 digits entered in PIN mode
  function handlePinChange(val) {
    setPin(val)
    setError('')
    if (val.length === 6 && email.trim()) {
      setTimeout(() => {
        document.getElementById('pin-submit-btn')?.click()
      }, 80)
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    setError('')
    if (!email.trim()) return setError('Please enter your email address first.')
    setLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/reset-password` },
      )
      if (resetError) throw resetError
      setResetSent(true)
    } catch (err) {
      setError(err.message || 'Could not send reset email. Please try again.')
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
          Care Home Management
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">

        {/* Success banner (after password reset) */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 mb-4">
            ✅ {successMsg}
          </div>
        )}

        {/* Mode toggle — hide when showing forgot-password */}
        {mode !== 'forgot' && (
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode('password'); setError(''); setPin(''); setSuccessMsg(null) }}
              className={`flex-1 min-h-[44px] rounded-lg text-sm font-bold transition-all ${
                mode === 'password'
                  ? 'bg-white text-navy shadow'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Email login
            </button>
            <button
              type="button"
              onClick={() => { setMode('pin'); setError(''); setPassword(''); setSuccessMsg(null) }}
              className={`flex-1 min-h-[44px] rounded-lg text-sm font-bold transition-all ${
                mode === 'pin'
                  ? 'bg-white text-navy shadow'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              PIN login
            </button>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* ── Password form ── */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@caresync.com"
                className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal transition-colors"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(''); setResetSent(false) }}
                className="text-xs text-teal font-semibold hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[52px] rounded-xl bg-teal text-white font-bold text-base hover:bg-teal/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        {/* ── PIN form ── */}
        {mode === 'pin' && (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@caresync.com"
                className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 text-center">
                Enter 6-digit PIN
              </label>
              <PinKeypad value={pin} onChange={handlePinChange} />
            </div>

            <button
              id="pin-submit-btn"
              type="submit"
              disabled={loading || pin.length < 6 || !email}
              className="w-full min-h-[52px] rounded-xl bg-teal text-white font-bold text-base hover:bg-teal/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying…' : 'Sign in with PIN'}
            </button>
          </form>
        )}
        {/* ── Forgot-password form ── */}
        {mode === 'forgot' && (
          <div>
            <button
              type="button"
              onClick={() => { setMode('password'); setError(''); setResetSent(false) }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-5"
            >
              ← Back to login
            </button>

            {resetSent ? (
              <div className="text-center space-y-3 py-4">
                <div className="text-4xl">📧</div>
                <p className="font-bold text-gray-900">Check your email</p>
                <p className="text-sm text-gray-500">
                  A password reset link has been sent to{' '}
                  <span className="font-semibold text-gray-700">{email}</span>.
                  Click the link in the email to set a new password.
                </p>
                <button
                  type="button"
                  onClick={() => { setMode('password'); setResetSent(false) }}
                  className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors mt-2"
                >
                  Back to login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@caresync.com"
                    className="w-full min-h-[48px] rounded-xl border-2 border-gray-200 px-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full min-h-[52px] rounded-xl bg-teal text-white font-bold text-base hover:bg-teal/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <p className="mt-6 text-gray-600 text-xs text-center">
        CareSync · UK Regulated · GDPR Compliant
      </p>
    </div>
  )
}
