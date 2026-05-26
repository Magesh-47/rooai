import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Clock, Users, ArrowRight, SlidersHorizontal } from 'lucide-react'
import { meetings } from '../data/mock'

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'long' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m} min`
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const statusMeta: Record<string, { label: string; bg: string; color: string }> = {
  ready:      { label: 'Ready',      bg: '#EEFBF3', color: '#276749' },
  processing: { label: 'Processing', bg: '#FFFBEB', color: '#975A16' },
  live:       { label: 'Live',       bg: '#FEF0F0', color: '#C53030' },
}

const logTypeDot: Record<string, string> = {
  action:       '#276749',
  decision:     '#0A1628',
  architecture: '#6B46C1',
  risk:         '#C05621',
  culture:      '#97266D',
}

type SortKey = 'date' | 'duration' | 'title'

function AvatarStack({ names }: { names: string[] }) {
  const shown = names.slice(0, 4)
  const rest = names.length - shown.length
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((name, i) => (
        <div
          key={name}
          title={name}
          style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 600, color: 'var(--bg)',
            border: '1.5px solid var(--bg2)',
            marginLeft: i === 0 ? 0 : -6,
            zIndex: shown.length - i, position: 'relative',
          }}
        >
          {initials(name)}
        </div>
      ))}
      {rest > 0 && (
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--bg4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 600, color: 'var(--ink2)',
          border: '1.5px solid var(--bg2)', marginLeft: -6,
        }}>
          +{rest}
        </div>
      )}
    </div>
  )
}

export function History() {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('date')

  const filtered = meetings
    .filter(m =>
      m.title.toLowerCase().includes(query.toLowerCase()) ||
      m.summary?.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === 'date')     return new Date(b.date).getTime() - new Date(a.date).getTime()
      if (sort === 'duration') return b.duration - a.duration
      return a.title.localeCompare(b.title)
    })

  const totalMins = meetings.reduce((s, m) => s + m.duration, 0)
  const totalLogs = meetings.reduce((s, m) => s + m.logs.length, 0)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{
        height: 52, flexShrink: 0,
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 12,
        background: 'var(--bg)',
      }}>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
          History
        </span>

        {/* Sort */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg3)', cursor: 'pointer',
        }}>
          <SlidersHorizontal size={12} strokeWidth={1.8} style={{ color: 'var(--ink3)' }} />
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              fontSize: 12.5, color: 'var(--ink)', cursor: 'pointer',
              fontFamily: 'var(--font-body)', letterSpacing: '-0.01em',
            }}
          >
            <option value="date">Newest first</option>
            <option value="duration">Longest first</option>
            <option value="title">A → Z</option>
          </select>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 24px 32px' }}>

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--bg3)', marginBottom: 16,
          }}>
            <Search size={13} strokeWidth={1.8} style={{ color: 'var(--ink3)', flexShrink: 0 }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search meetings…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 13.5, color: 'var(--ink)', fontFamily: 'var(--font-body)',
                letterSpacing: '-0.01em',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: 11, color: 'var(--ink3)', padding: '0 2px',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Stats strip */}
          {!query && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '9px 14px', borderRadius: 10, marginBottom: 16,
              background: 'var(--bg3)', border: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 12, color: 'var(--ink2)' }}>
                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{meetings.length}</span> sessions
              </span>
              <div style={{ width: 1, height: 14, background: 'var(--border2)' }} />
              <span style={{ fontSize: 12, color: 'var(--ink2)' }}>
                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{totalMins}</span> min recorded
              </span>
              <div style={{ width: 1, height: 14, background: 'var(--border2)' }} />
              <span style={{ fontSize: 12, color: 'var(--ink2)' }}>
                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{totalLogs}</span> logs extracted
              </span>
            </div>
          )}

          {/* Meeting list */}
          {filtered.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '64px 0', gap: 10,
              color: 'var(--ink3)',
            }}>
              <Search size={26} strokeWidth={1.3} />
              <p style={{ fontSize: 13.5 }}>No meetings match "{query}"</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {filtered.map(m => {
                const meta = statusMeta[m.status] ?? statusMeta.ready
                const logTypes = [...new Set(m.logs.map(l => l.type))]
                return (
                  <Link
                    key={m.id}
                    to={`/meetings/${m.id}`}
                    className="fade-up"
                    style={{
                      display: 'block',
                      padding: '14px 16px',
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                      background: 'var(--bg3)',
                      textDecoration: 'none',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.borderColor = 'var(--border2)'
                      el.style.boxShadow = 'var(--shadow-md)'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.borderColor = 'var(--border)'
                      el.style.boxShadow = 'none'
                    }}
                  >
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 500, padding: '1.5px 6px',
                            borderRadius: 4, background: meta.bg, color: meta.color,
                          }}>
                            {meta.label}
                          </span>
                          <span style={{ fontSize: 11.5, color: 'var(--ink3)' }}>
                            {formatDate(m.date)}
                          </span>
                          <span style={{ fontSize: 11.5, color: 'var(--border2)' }}>·</span>
                          <span style={{ fontSize: 11.5, color: 'var(--ink3)' }}>
                            {formatTime(m.date)}
                          </span>
                        </div>
                        <h2 style={{
                          fontSize: 14, fontWeight: 600, color: 'var(--ink)',
                          letterSpacing: '-0.01em', lineHeight: 1.3,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {m.title}
                        </h2>
                        {m.summary && (
                          <p style={{
                            fontSize: 12.5, color: 'var(--ink2)', marginTop: 4,
                            lineHeight: 1.55,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          } as React.CSSProperties}>
                            {m.summary}
                          </p>
                        )}
                      </div>
                      <ArrowRight size={13} strokeWidth={1.8} style={{ color: 'var(--ink3)', flexShrink: 0, marginTop: 2 }} />
                    </div>

                    {/* Bottom row */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginTop: 12, paddingTop: 12,
                      borderTop: '1px solid var(--border)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ink3)' }}>
                          <Clock size={11} strokeWidth={1.8} />
                          {formatDuration(m.duration)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink3)' }}>
                          <Users size={11} strokeWidth={1.8} />
                          <AvatarStack names={m.participants.map(p => p.name)} />
                        </span>
                        {m.transcript.length > 0 && (
                          <span style={{ fontSize: 11.5, color: 'var(--ink3)' }}>
                            {m.transcript.length} segments
                          </span>
                        )}
                      </div>
                      {logTypes.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          {logTypes.slice(0, 5).map(type => (
                            <div
                              key={type}
                              title={type}
                              style={{
                                width: 7, height: 7, borderRadius: '50%',
                                background: logTypeDot[type] ?? 'var(--ink3)',
                              }}
                            />
                          ))}
                          <span style={{ fontSize: 11, color: 'var(--ink3)', marginLeft: 2 }}>
                            {m.logs.length} logs
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
