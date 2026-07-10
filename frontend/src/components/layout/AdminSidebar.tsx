import { NavLink, useNavigate } from 'react-router-dom'
import { Users, Settings, LogOut, Shield } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const nav = [
  { to: '/admin/users',    Icon: Users,    label: 'Users'    },
  { to: '/admin/settings', Icon: Settings, label: 'Settings' },
]

export function AdminSidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <aside style={{
      width: 210, minWidth: 210,
      background: 'var(--ink)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', height: '100%',
    }}>

      {/* Brand */}
      <div style={{
        padding: '18px 16px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="breathe" style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#f87171', flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 16,
            letterSpacing: '-0.4px', color: '#fff', fontWeight: 500,
          }}>
            Roo
          </span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 10.5, color: 'rgba(255,255,255,0.4)',
          marginTop: 3, paddingLeft: 15, letterSpacing: '0.01em',
        }}>
          <Shield size={9} strokeWidth={2} />
          Admin Console
        </div>
      </div>

      {/* Nav */}
      <div style={{
        flex: 1, padding: '8px 6px',
        overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1,
      }}>
        {nav.map(({ to, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 10px', borderRadius: 8,
              textDecoration: 'none', fontSize: 13,
              color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
              background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
              fontWeight: isActive ? 500 : 400,
              position: 'relative', transition: 'all 0.1s',
              letterSpacing: '-0.01em',
            })}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              if (!el.getAttribute('aria-current')) el.style.background = 'rgba(255,255,255,0.06)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              if (!el.getAttribute('aria-current')) el.style.background = 'transparent'
            }}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div style={{
                    position: 'absolute', left: -6,
                    top: '50%', transform: 'translateY(-50%)',
                    width: 2, height: '52%',
                    background: '#fff', borderRadius: '0 2px 2px 0',
                  }} />
                )}
                <Icon size={14} strokeWidth={isActive ? 2 : 1.75} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px 14px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 600, color: '#fff', flexShrink: 0,
          }}>
            {profile ? initials(profile.name) : 'A'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: '#fff', letterSpacing: '-0.01em', truncate: true } as React.CSSProperties}>
              {profile?.name ?? 'Admin'}
            </div>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', letterSpacing: '-0.01em' }}>
              Administrator
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center',
              padding: 4, borderRadius: 6, transition: 'all 0.1s', flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#fff'
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            <LogOut size={13} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  )
}
