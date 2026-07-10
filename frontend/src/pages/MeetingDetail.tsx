import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Clock, Users, AlertTriangle, Play, Pause,
  SkipBack, SkipForward, Download, ChevronDown,
  CheckCircle2, ShieldAlert, Cpu, Heart,
} from 'lucide-react'
import { getMeeting, type DBMeeting, type DBSegment, type DBLog } from '../lib/meetings'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
function formatTimestamp(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
function formatDuration(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m} min`
}
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const logIcon: Record<string, React.ReactNode> = {
  action:       <CheckCircle2 size={12} strokeWidth={2} style={{ color: 'var(--sage2)' }} />,
  decision:     <CheckCircle2 size={12} strokeWidth={2} style={{ color: 'var(--ink)' }} />,
  architecture: <Cpu size={12} strokeWidth={2} style={{ color: 'var(--violet2)' }} />,
  risk:         <ShieldAlert size={12} strokeWidth={2} style={{ color: 'var(--clay2)' }} />,
  culture:      <Heart size={12} strokeWidth={2} style={{ color: 'var(--rose2)' }} />,
}

const logStatusMeta: Record<string, { label: string; bg: string; color: string }> = {
  open:          { label: 'Open',        bg: '#FEF0F0', color: '#C53030' },
  'in-progress': { label: 'In Progress', bg: '#FFFBEB', color: '#975A16' },
  resolved:      { label: 'Resolved',    bg: '#EEFBF3', color: '#276749' },
}

const meetingStatusMeta: Record<string, { label: string; bg: string; color: string }> = {
  ready:      { label: 'Ready',      bg: '#EEFBF3', color: '#276749' },
  processing: { label: 'Processing', bg: '#FFFBEB', color: '#975A16' },
  live:       { label: 'Live',       bg: '#FEF0F0', color: '#C53030' },
}

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--ink)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 600, color: 'var(--bg)',
      flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  )
}

function AudioPlayer({ duration }: { duration: number }) {
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setPosition(p => {
        if (p >= 100) { setPlaying(false); return 100 }
        return p + (100 / (duration * 60 * 10))
      })
    }, 100)
    return () => clearInterval(id)
  }, [playing, duration])

  const currentSecs = Math.floor((position / 100) * duration * 60)
  const totalSecs = duration * 60

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '10px 20px', flexShrink: 0,
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg3)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => setPosition(p => Math.max(0, p - 5))}
          style={{ padding: 6, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink2)', display: 'flex' }}
        >
          <SkipBack size={12} strokeWidth={1.8} />
        </button>
        <button
          onClick={() => setPlaying(p => !p)}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--ink)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'opacity 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {playing
            ? <Pause size={12} fill="#FAF8F4" strokeWidth={0} style={{ color: '#FAF8F4' }} />
            : <Play size={12} fill="#FAF8F4" strokeWidth={0} style={{ color: '#FAF8F4', marginLeft: 1 }} />
          }
        </button>
        <button
          onClick={() => setPosition(p => Math.min(100, p + 5))}
          style={{ padding: 6, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink2)', display: 'flex' }}
        >
          <SkipForward size={12} strokeWidth={1.8} />
        </button>
      </div>

      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink3)', minWidth: 36 }}>
        {formatTimestamp(currentSecs)}
      </span>

      <div
        style={{ flex: 1, height: 28, display: 'flex', alignItems: 'center', gap: '1px', cursor: 'pointer' }}
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect()
          setPosition(((e.clientX - rect.left) / rect.width) * 100)
        }}
      >
        {Array.from({ length: 80 }, (_, i) => {
          const h = 0.2 + Math.sin(i * 0.4) * 0.3 + Math.sin(i * 1.2) * 0.2 + 0.3
          const filled = (i / 80) * 100 < position
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${Math.max(15, h * 100)}%`,
                borderRadius: 3,
                background: filled ? 'var(--ink)' : 'var(--bg5)',
                transition: 'background 0.05s',
              }}
            />
          )
        })}
      </div>

      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink3)', minWidth: 36, textAlign: 'right' }}>
        {formatTimestamp(totalSecs)}
      </span>
    </div>
  )
}

function TranscriptItem({ seg }: { seg: DBSegment }) {
  const name = seg.speaker_name ?? seg.speaker_label
  return (
    <div style={{ display: 'flex', gap: 12, paddingBottom: 18, borderBottom: '1px solid var(--border)' }}>
      <Avatar name={name} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{name}</span>
          <span style={{ marginLeft: 'auto', fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--ink3)' }}>
            {formatTimestamp(seg.timestamp_seconds)}
          </span>
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink2)' }}>{seg.text}</p>
      </div>
    </div>
  )
}

function LogCard({ log }: { log: DBLog }) {
  const sm = logStatusMeta[log.status] ?? logStatusMeta.open
  return (
    <div style={{
      borderRadius: 10, padding: 14,
      background: 'var(--bg)', border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {logIcon[log.type]}
          <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'capitalize', color: 'var(--ink2)' }}>
            {log.type}
          </span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: sm.bg, color: sm.color }}>
          {sm.label}
        </span>
      </div>
      <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, marginBottom: 6 }}>
        {log.title}
      </p>
      <p style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.6 }}>{log.body}</p>
      {(log.owner || log.due_date) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginTop: 10,
          paddingTop: 10, borderTop: '1px solid var(--border)',
        }}>
          {log.owner && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ink3)' }}>
              <Avatar name={log.owner} size={14} />
              {log.owner}
            </span>
          )}
          {log.due_date && (
            <span style={{ fontSize: 11, color: 'var(--ink3)' }}>
              Due {new Date(log.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export function MeetingDetail() {
  const { id } = useParams<{ id: string }>()
  const [meeting,  setMeeting]  = useState<DBMeeting | null>(null)
  const [segments, setSegments] = useState<DBSegment[]>([])
  const [logs,     setLogs]     = useState<DBLog[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    getMeeting(id)
      .then(({ meeting, segments, logs }) => {
        setMeeting(meeting)
        setSegments(segments)
        setLogs(logs)
      })
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          border: '2px solid var(--border2)', borderTopColor: 'var(--ink3)',
          animation: 'spin 0.75s linear infinite',
        }} />
      </div>
    )
  }

  if (error || !meeting) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        background: 'var(--bg)',
      }}>
        <AlertTriangle size={28} strokeWidth={1.4} style={{ color: 'var(--ink3)' }} />
        <p style={{ fontSize: 13.5, color: 'var(--ink2)' }}>{error ?? 'Meeting not found.'}</p>
        <Link to="/" style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, textDecoration: 'none' }}>
          ← Back to meetings
        </Link>
      </div>
    )
  }

  const logsByType = logs.reduce((acc, l) => {
    if (!acc[l.type]) acc[l.type] = []
    acc[l.type].push(l)
    return acc
  }, {} as Record<string, DBLog[]>)

  const ms = meetingStatusMeta[meeting.status] ?? meetingStatusMeta.ready

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Top bar */}
      <div style={{
        height: 52, flexShrink: 0,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg3)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px',
      }}>
        <Link
          to="/"
          style={{ padding: 6, borderRadius: 7, display: 'flex', color: 'var(--ink2)', textDecoration: 'none', transition: 'all 0.1s' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg4)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <ArrowLeft size={15} strokeWidth={1.8} />
        </Link>

        <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: ms.bg, color: ms.color, flexShrink: 0 }}>
          {ms.label}
        </span>

        <h1 style={{
          flex: 1, minWidth: 0,
          fontSize: 14, fontWeight: 600, color: 'var(--ink)',
          letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {meeting.title}
        </h1>

        <span style={{ fontSize: 12, color: 'var(--ink3)', flexShrink: 0 }}>
          {formatDate(meeting.date)} · {formatDuration(meeting.duration)}
        </span>

        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--ink3)', flexShrink: 0 }}>
          <Users size={11} strokeWidth={1.8} />
          {meeting.participant_count} speaker{meeting.participant_count !== 1 ? 's' : ''}
        </span>

        {/* Export dropdown */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setExportOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 8,
              fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
              background: 'var(--bg3)', color: 'var(--ink2)',
              border: '1px solid var(--border)', fontFamily: 'var(--font-body)',
              transition: 'border-color 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <Download size={11} strokeWidth={1.8} />
            Export
            <ChevronDown size={10} />
          </button>
          {exportOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 40, width: 148,
              borderRadius: 10, zIndex: 20,
              background: 'var(--bg3)', border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
            }}>
              {['Markdown', 'JSON'].map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setExportOpen(false)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                    padding: '9px 14px', textAlign: 'left',
                    fontSize: 12.5, color: 'var(--ink)', background: 'transparent',
                    border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Download size={11} strokeWidth={1.8} style={{ color: 'var(--ink3)' }} />
                  {fmt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audio player */}
      <AudioPlayer duration={meeting.duration} />

      {/* Split layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: summary + transcript */}
        <div style={{ flex: 1, overflowY: 'auto', borderRight: '1px solid var(--border)' }}>
          {meeting.summary && (
            <div style={{
              margin: '20px 20px 4px',
              padding: '14px 16px',
              borderRadius: 12,
              background: 'var(--ink)',
            }}>
              <p style={{
                fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'rgba(250,248,244,0.4)', marginBottom: 7,
              }}>
                AI Summary
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(250,248,244,0.88)' }}>
                {meeting.summary}
              </p>
            </div>
          )}

          <div style={{ padding: '16px 20px 24px' }}>
            <p style={{
              fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.07em', color: 'var(--ink3)', marginBottom: 16,
            }}>
              Transcript · {segments.length} segments
            </p>
            {segments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {segments.map(seg => <TranscriptItem key={seg.id} seg={seg} />)}
              </div>
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '48px 0', gap: 10,
                color: 'var(--ink3)',
              }}>
                <Clock size={24} strokeWidth={1.3} />
                <p style={{ fontSize: 13 }}>No transcript available</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: logs panel */}
        <div style={{ width: 320, flexShrink: 0, overflowY: 'auto', background: 'var(--bg2)' }}>
          <div style={{ padding: '16px 16px 24px' }}>
            <p style={{
              fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.07em', color: 'var(--ink3)', marginBottom: 14,
            }}>
              Reconciled logs · {logs.length}
            </p>

            {Object.entries(logsByType).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {Object.entries(logsByType).map(([type, typeLogs]) => (
                  <div key={type}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <p style={{
                        fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.07em', color: 'var(--ink3)',
                      }}>
                        {type}
                      </p>
                      <span style={{
                        fontSize: 9.5, fontWeight: 500, padding: '1px 5px', borderRadius: 3,
                        background: 'var(--bg4)', color: 'var(--ink3)',
                      }}>
                        {typeLogs.length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {typeLogs.map(log => <LogCard key={log.id} log={log} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '48px 0', gap: 10,
                color: 'var(--ink3)',
              }}>
                <CheckCircle2 size={24} strokeWidth={1.3} />
                <p style={{ fontSize: 13 }}>No logs extracted yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {exportOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setExportOpen(false)} />
      )}
    </div>
  )
}
