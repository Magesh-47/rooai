import { useState, useEffect, FormEvent } from 'react'
import { UserPlus, Pencil, Trash2, X, Search, ShieldCheck, Code2, Palette, Settings2, Users2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Role = 'admin' | 'developer' | 'designer' | 'operation_manager' | 'team_lead'

interface UserRow {
  id: string
  name: string
  email: string
  role: Role
  is_active: boolean
  created_at: string
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const roleMeta: Record<Role, { label: string; bg: string; color: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }> = {
  admin:             { label: 'Admin',            bg: '#EBF8FF', color: '#2B6CB0', Icon: ShieldCheck },
  developer:         { label: 'Developer',        bg: '#EEFBF3', color: '#276749', Icon: Code2       },
  designer:          { label: 'Designer',         bg: '#FFF5F7', color: '#97266D', Icon: Palette     },
  operation_manager: { label: 'Ops Manager',      bg: '#FFFAF0', color: '#C05621', Icon: Settings2   },
  team_lead:         { label: 'Team Lead',        bg: '#FAF5FF', color: '#6B46C1', Icon: Users2      },
}

interface UserForm { name: string; email: string; password: string; role: Role; department: string }
const emptyForm: UserForm = { name: '', email: '', password: '', role: 'developer', department: '' }

function UserModal({
  mode, initial, onClose, onSave,
}: {
  mode: 'add' | 'edit'
  initial: UserForm & { id?: string }
  onClose: () => void
  onSave: (data: UserForm & { id?: string }) => Promise<void>
}) {
  const [form, setForm] = useState<UserForm & { id?: string }>(initial)
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState<string | null>(null)

  function field(key: keyof UserForm, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(null)
    try { await onSave(form) }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed') }
    finally { setBusy(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(10,22,40,0.4)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--bg3)', borderRadius: 16, padding: '24px 26px 28px',
          width: 420, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)',
        }}
        onClick={e => e.stopPropagation()}
        className="fade-up"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
            {mode === 'add' ? 'Add user' : 'Edit user'}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink3)', display: 'flex' }}>
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Full name</label>
            <input value={form.name} onChange={e => field('name', e.target.value)} required placeholder="Priya Sharma"
              style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={form.email} onChange={e => field('email', e.target.value)} required
              disabled={mode === 'edit'} placeholder="priya@pointonezero.com"
              style={{ ...inputStyle, opacity: mode === 'edit' ? 0.6 : 1 }}
              onFocus={focusBorder} onBlur={blurBorder} />
          </div>

          {mode === 'add' && (
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" value={form.password} onChange={e => field('password', e.target.value)}
                required minLength={6} placeholder="min. 6 characters"
                style={inputStyle} onFocus={focusBorder} onBlur={blurBorder} />
            </div>
          )}

          <div>
            <label style={labelStyle}>Role</label>
            <select value={form.role}
              style={{ ...inputStyle, cursor: 'pointer' }}
              onChange={e => field('role', e.target.value as Role)}>
              <option value="developer">Developer</option>
              <option value="designer">Designer</option>
              <option value="operation_manager">Operation Manager</option>
              <option value="team_lead">Team Lead</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {err && (
            <div style={{ fontSize: 12, color: '#C53030', background: '#FFF5F5', border: '1px solid #FEB2B2', borderRadius: 8, padding: '8px 12px' }}>
              {err}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ ...btnBase, flex: 1, background: 'transparent', color: 'var(--ink2)', border: '1px solid var(--border)' }}>
              Cancel
            </button>
            <button type="submit" disabled={busy}
              style={{ ...btnBase, flex: 2, background: 'var(--ink)', color: '#fff', border: 'none', opacity: busy ? 0.65 : 1 }}>
              {busy ? 'Saving…' : mode === 'add' ? 'Add user' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 500, color: 'var(--ink2)', display: 'block', marginBottom: 5,
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--ink)', fontSize: 13, fontFamily: 'var(--font-body)',
  outline: 'none', boxSizing: 'border-box', letterSpacing: '-0.01em',
}
const btnBase: React.CSSProperties = {
  padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 500,
  cursor: 'pointer', fontFamily: 'var(--font-body)', letterSpacing: '-0.01em', transition: 'opacity 0.12s',
}
function focusBorder(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = 'var(--border3)'
}
function blurBorder(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = 'var(--border)'
}

// ── Main page ─────────────────────────────────────────────
export function Users() {
  const [users, setUsers]       = useState<UserRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [query, setQuery]       = useState('')
  const [modal, setModal]       = useState<{ mode: 'add' | 'edit'; data: UserForm & { id?: string } } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)

  async function fetchUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at')
    if (error) setError(error.message)
    else setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  )

  async function handleSave(data: UserForm & { id?: string }) {
    if (modal?.mode === 'add') {
      const { error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
          department: data.department,
        },
      })
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.functions.invoke('admin-user-ops', {
        body: { action: 'update', id: data.id, name: data.name, role: data.role },
      })
      if (error) throw new Error(error.message)
    }
    setModal(null)
    fetchUsers()
  }

  async function handleDelete(id: string) {
    setError(null)
    const { error } = await supabase.functions.invoke('admin-user-ops', {
      body: { action: 'delete', id },
    })
    if (error) { setError(error.message); return }
    setDeleteId(null)
    fetchUsers()
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{
        height: 52, flexShrink: 0,
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 24px',
        background: 'var(--bg3)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
          Users
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Search + count + add */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--bg3)',
            }}>
              <Search size={13} strokeWidth={1.8} style={{ color: 'var(--ink3)', flexShrink: 0 }} />
              <input
                value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search by name or email…"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 13.5, color: 'var(--ink)', fontFamily: 'var(--font-body)',
                }}
              />
            </div>
            <span style={{ fontSize: 12, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>{users.length} total</span>
            <button
              onClick={() => setModal({ mode: 'add', data: { ...emptyForm } })}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, whiteSpace: 'nowrap',
                fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                background: 'var(--ink)', color: '#fff',
                border: 'none', fontFamily: 'var(--font-body)',
                letterSpacing: '-0.01em', transition: 'opacity 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <UserPlus size={13} strokeWidth={1.8} />
              Add user
            </button>
          </div>

          {error && (
            <div style={{ fontSize: 12.5, color: '#C53030', background: '#FFF5F5', border: '1px solid #FEB2B2', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
              {error}
            </div>
          )}

          {/* Table */}
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 130px 64px',
              padding: '10px 16px', borderBottom: '1px solid var(--border)',
              background: 'var(--bg2)',
            }}>
              {['User', 'Email', 'Role', ''].map(h => (
                <span key={h} style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {h}
                </span>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 13, color: 'var(--ink3)' }}>
                {query ? `No users match "${query}"` : 'No users yet.'}
              </div>
            ) : (
              filtered.map((u, i) => {
                const rm = roleMeta[u.role]
                const RoleIcon = rm.Icon
                return (
                  <div
                    key={u.id}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr 130px 64px',
                      padding: '12px 16px', alignItems: 'center',
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                      transition: 'background 0.1s',
                      opacity: u.is_active ? 1 : 0.5,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: 'var(--ink)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10.5, fontWeight: 600, color: 'var(--bg)',
                      }}>
                        {initials(u.name)}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.name}
                      </span>
                    </div>

                    <span style={{ fontSize: 12.5, color: 'var(--ink2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.email}
                    </span>

                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 6,
                      background: rm.bg, color: rm.color, width: 'fit-content',
                    }}>
                      <RoleIcon size={10} strokeWidth={2} />
                      {rm.label}
                    </span>

                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setModal({ mode: 'edit', data: { id: u.id, name: u.name, email: u.email, password: '', role: u.role, department: '' } })}
                        style={{ padding: 6, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink3)', display: 'flex', transition: 'all 0.1s' }}
                        onMouseEnter={e => { (e.currentTarget.style.background = 'var(--bg4)'); (e.currentTarget.style.color = 'var(--ink)') }}
                        onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = 'var(--ink3)') }}
                      >
                        <Pencil size={13} strokeWidth={1.8} />
                      </button>
                      {u.is_active && (
                        <button
                          onClick={() => setDeleteId(u.id)}
                          style={{ padding: 6, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink3)', display: 'flex', transition: 'all 0.1s' }}
                          onMouseEnter={e => { (e.currentTarget.style.background = '#FFF5F5'); (e.currentTarget.style.color = '#C53030') }}
                          onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = 'var(--ink3)') }}
                        >
                          <Trash2 size={13} strokeWidth={1.8} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

        </div>
      </div>

      {modal && (
        <UserModal
          mode={modal.mode}
          initial={modal.data}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {deleteId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(10,22,40,0.4)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setDeleteId(null)}>
          <div
            style={{ background: 'var(--bg3)', borderRadius: 14, padding: '24px 26px', width: 340, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
            className="fade-up"
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Deactivate user?</h3>
            <p style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.55, marginBottom: 20 }}>
              This user will be marked inactive and will no longer be able to log in.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteId(null)}
                style={{ ...btnBase, flex: 1, background: 'transparent', color: 'var(--ink2)', border: '1px solid var(--border)' }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)}
                style={{ ...btnBase, flex: 1, background: '#C53030', color: '#fff', border: 'none' }}>
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
