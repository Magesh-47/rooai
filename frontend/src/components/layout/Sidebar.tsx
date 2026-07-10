import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutGrid, Search, History, LogOut, Users, PanelLeftClose, PanelLeft, Plug } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import rooLogo from '../../assets/roo-logo.png'

const nav = [
  { to: '/meetings', Icon: LayoutGrid, label: 'Meetings', exact: true },
  { to: '/history',  Icon: History,    label: 'History'              },
  { to: '/query',    Icon: Search,     label: 'Query'                },
]

function NavItem({ to, Icon, label, exact, collapsed }: {
  to: string
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  label: string
  exact?: boolean
  collapsed?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={exact}
      title={collapsed ? label : undefined}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 9,
        padding: collapsed ? '8px 0' : '7px 10px',
        borderRadius: 8,
        textDecoration: 'none',
        fontSize: 13,
        color: isActive ? 'var(--ink)' : 'var(--ink2)',
        background: isActive ? 'rgba(10,22,40,0.06)' : 'transparent',
        fontWeight: isActive ? 500 : 400,
        position: 'relative',
        transition: 'background 0.1s',
        letterSpacing: '-0.01em',
        cursor: 'pointer',
      })}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        if (!el.getAttribute('aria-current')) el.style.background = 'rgba(0,0,0,0.04)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        if (!el.getAttribute('aria-current')) el.style.background = 'transparent'
      }}
    >
      {({ isActive }) => (
        <>
          {isActive && !collapsed && (
            <div style={{
              position: 'absolute', left: -6,
              top: '50%', transform: 'translateY(-50%)',
              width: 2, height: '52%',
              background: 'var(--ink)', borderRadius: '0 2px 2px 0',
            }} />
          )}
          <Icon size={collapsed ? 16 : 14} strokeWidth={isActive ? 2 : 1.75} />
          {!collapsed && <span>{label}</span>}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar({ collapsed, onToggle }: { collapsed?: boolean; onToggle?: () => void }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside style={{
      width: collapsed ? 52 : 210,
      minWidth: collapsed ? 52 : 210,
      background: 'var(--bg2)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', height: '100%',
      transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1)',
    }}>

      {/* Brand */}
      <div style={{
        height: 52, flexShrink: 0,
        padding: collapsed ? '0' : '0 10px 0 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 8,
      }}>
        {!collapsed && (
          <>
            <img src={rooLogo} alt="Roo" style={{ width: 20, height: 20, flexShrink: 0, objectFit: 'contain' }} />
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 16, flex: 1,
              letterSpacing: '-0.4px', color: 'var(--ink)', fontWeight: 500,
            }}>
              Roo
            </span>
          </>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? 'Open sidebar' : 'Close sidebar'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--ink3)', padding: '4px', borderRadius: 6,
            display: 'flex', alignItems: 'center', transition: 'all 0.1s', flexShrink: 0,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.05)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--ink)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'none'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--ink3)'
          }}
        >
          {collapsed
            ? <PanelLeft size={15} strokeWidth={1.75} />
            : <PanelLeftClose size={15} strokeWidth={1.75} />
          }
        </button>
      </div>

      {/* Nav */}
      <div style={{
        flex: 1,
        padding: collapsed ? '8px 6px' : '8px 6px',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 1,
      }}>
        {nav.map(item => (
          <NavItem key={item.to} to={item.to} Icon={item.Icon} label={item.label} exact={item.exact} collapsed={collapsed} />
        ))}
        {profile?.role === 'admin' && (
          <NavItem to="/admin/users"        Icon={Users} label="Users"        collapsed={collapsed} />
        )}
        {profile?.role === 'admin' && (
          <NavItem to="/admin/integrations" Icon={Plug}  label="Integrations" collapsed={collapsed} />
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: collapsed ? '10px 0 14px' : '10px 16px 14px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 9,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 600, color: 'var(--bg)',
          flexShrink: 0, letterSpacing: 0, cursor: collapsed ? 'default' : 'auto',
        }}>
          {initials}
        </div>

        {!collapsed && (
          <>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.name ?? '—'}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--ink3)', letterSpacing: '-0.01em' }}>PointOneZero</div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--ink3)', display: 'flex', alignItems: 'center',
                padding: '4px', borderRadius: 6, transition: 'all 0.1s', flexShrink: 0,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--ink)'
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.05)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--ink3)'
                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <LogOut size={13} strokeWidth={1.75} />
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
