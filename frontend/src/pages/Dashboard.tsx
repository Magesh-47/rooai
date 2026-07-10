import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Upload, Clock, ArrowRight } from 'lucide-react'
import { getMeetings, type DBMeeting } from '../lib/meetings'

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m} min`
}

const statusMeta: Record<string, { label: string; bg: string; color: string }> = {
  ready:      { label: 'Ready',      bg: '#EEFBF3', color: '#276749' },
  processing: { label: 'Processing', bg: '#FFFBEB', color: '#975A16' },
  live:       { label: 'Live',       bg: '#FEF0F0', color: '#C53030' },
}

export function Dashboard() {
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState<DBMeeting[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    getMeetings(5)
      .then(setMeetings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{
        height: 52, borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 24px',
        background: 'var(--bg)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
          Meetings
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>

          {/* Action cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }} className="fade-up">
            <div
              onClick={() => navigate('/record')}
              style={{ background: 'var(--ink)', borderRadius: 12, padding: '26px 22px 28px', cursor: 'pointer', transition: 'opacity 0.14s', display: 'flex', flexDirection: 'column' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.87')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <div style={{ marginBottom: 18 }}>
                <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', marginBottom: 7, lineHeight: 1.2 }}>
                Record a meeting
              </div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.42)', letterSpacing: '-0.01em', lineHeight: 1.55 }}>
                Capture live audio and transcribe in real time
              </div>
            </div>

            <div
              onClick={() => navigate('/upload')}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '26px 22px 28px', cursor: 'pointer', transition: 'border-color 0.14s', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{ marginBottom: 18 }}>
                <span style={{ color: 'var(--ink3)', display: 'inline-flex' }}>
                  <Upload size={17} strokeWidth={1.6} />
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 7, lineHeight: 1.2 }}>
                Upload a file
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink3)', letterSpacing: '-0.01em', lineHeight: 1.55 }}>
                Process an existing audio or video recording
              </div>
            </div>
          </div>

          {/* Recent meetings */}
          {(loading || meetings.length > 0) && (
            <div className="fade-up">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink3)' }}>
                  Recent meetings
                </span>
                <Link to="/history" style={{ fontSize: 12, color: 'var(--ink3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--ink)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--ink3)'}
                >
                  View all <ArrowRight size={11} />
                </Link>
              </div>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ height: 64, borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {meetings.map(m => {
                    const meta = statusMeta[m.status] ?? statusMeta.ready
                    return (
                      <Link key={m.id} to={`/meetings/${m.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg3)', transition: 'all 0.12s' }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border2)'; el.style.boxShadow = 'var(--shadow-sm)' }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.boxShadow = 'none' }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{ fontSize: 9.5, fontWeight: 500, padding: '1px 6px', borderRadius: 4, background: meta.bg, color: meta.color }}>{meta.label}</span>
                            <span style={{ fontSize: 11.5, color: 'var(--ink3)' }}>{formatDate(m.date)}</span>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.title}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--ink3)' }}>
                            <Clock size={11} strokeWidth={1.8} />{formatDuration(m.duration)}
                          </span>
                          {(m.log_count ?? 0) > 0 && (
                            <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{m.log_count} logs</span>
                          )}
                          <ArrowRight size={12} strokeWidth={1.8} style={{ color: 'var(--ink3)' }} />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
