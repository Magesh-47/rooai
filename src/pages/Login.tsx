import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

type LoginRole = 'employee' | 'admin'

export function Login() {
  const { signIn, loading } = useAuth()
  const navigate = useNavigate()

  const [role, setRole]       = useState<LoginRole>('employee')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [busy, setBusy]       = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const { error } = await signIn(email, password)
    if (error) {
      setError(error)
      setBusy(false)
      return
    }

    // Role check happens via profile — redirect accordingly after auth state updates
    // The App router will handle the final redirect based on profile.role
    navigate(role === 'admin' ? '/admin/users' : '/', { replace: true })
  }

  if (loading) return null

  return (
    <div style={{
      height: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', fontFamily: 'var(--font-body)',
    }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 20px' }} className="fade-up">

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div className="breathe" style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--ink)', opacity: 0.7,
            }} />
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 22,
              fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.4px',
            }}>
              Roo
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink3)', letterSpacing: '-0.01em' }}>
            Reconciliation Engine
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '28px 28px 32px',
          boxShadow: 'var(--shadow-lg)',
        }}>

          {/* Role toggle */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            background: 'var(--bg2)', borderRadius: 10, padding: 4,
            marginBottom: 24, gap: 4,
          }}>
            {(['employee', 'admin'] as LoginRole[]).map(r => (
              <button
                key={r}
                onClick={() => { setRole(r); setError(null) }}
                style={{
                  padding: '8px 0', borderRadius: 8, border: 'none',
                  fontSize: 13, fontWeight: role === r ? 600 : 400,
                  cursor: 'pointer', letterSpacing: '-0.01em',
                  fontFamily: 'var(--font-body)',
                  background: role === r ? 'var(--bg3)' : 'transparent',
                  color: role === r ? 'var(--ink)' : 'var(--ink3)',
                  boxShadow: role === r ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          <p style={{
            fontSize: 16, fontWeight: 600, color: 'var(--ink)',
            letterSpacing: '-0.02em', marginBottom: 20,
          }}>
            {role === 'admin' ? 'Admin sign in' : 'Sign in'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Email */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink2)', display: 'block', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@pointonezero.com"
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--ink)',
                  fontSize: 13.5, fontFamily: 'var(--font-body)',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.12s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--border3)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink2)', display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--ink)',
                  fontSize: 13.5, fontFamily: 'var(--font-body)',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.12s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--border3)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                fontSize: 12.5, color: '#C53030',
                background: '#FFF5F5', border: '1px solid #FEB2B2',
                borderRadius: 8, padding: '8px 12px',
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              style={{
                marginTop: 4, padding: '10px 0', borderRadius: 8,
                fontSize: 13.5, fontWeight: 600, cursor: busy ? 'default' : 'pointer',
                background: 'var(--ink)', color: '#fff',
                border: 'none', fontFamily: 'var(--font-body)',
                letterSpacing: '-0.01em', opacity: busy ? 0.65 : 1,
                transition: 'opacity 0.12s',
              }}
              onMouseEnter={e => { if (!busy) (e.currentTarget.style.opacity = '0.85') }}
              onMouseLeave={e => { if (!busy) (e.currentTarget.style.opacity = '1') }}
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink3)', marginTop: 20 }}>
          PointOneZero · Roo v1
        </p>
      </div>
    </div>
  )
}
