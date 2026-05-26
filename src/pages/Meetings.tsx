import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Users, ArrowRight, Search, Mic, Upload, SlidersHorizontal } from 'lucide-react'
import { meetings } from '../data/mock'
import { Avatar } from '../components/ui/Avatar'
import { LogBadge, MeetingStatusBadge } from '../components/ui/Badge'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

type SortKey = 'date' | 'duration' | 'title'

export function Meetings() {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('date')

  const filtered = meetings
    .filter(m => m.title.toLowerCase().includes(query.toLowerCase()) || m.summary?.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime()
      if (sort === 'duration') return b.duration - a.duration
      return a.title.localeCompare(b.title)
    })

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--color-cream)' }}>
      <div className="max-w-[760px] mx-auto px-8 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1
              className="text-[24px] font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-navy)' }}
            >
              Meetings
            </h1>
            <p className="text-[14px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {meetings.length} sessions · all transcripts and notes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/upload"
              className="flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[13px] font-medium border transition-all hover:shadow-[var(--shadow-sm)]"
              style={{
                background: 'var(--color-cream-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-navy-2)',
              }}
            >
              <Upload size={13} strokeWidth={1.8} />
              Upload
            </Link>
            <Link
              to="/record"
              className="flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[13px] font-semibold transition-all hover:opacity-90"
              style={{ background: 'var(--color-navy)', color: '#FAF8F4' }}
            >
              <Mic size={13} strokeWidth={1.8} />
              Record
            </Link>
          </div>
        </div>

        {/* Search + sort bar */}
        <div className="flex items-center gap-2 mb-5">
          <div
            className="flex items-center gap-2 flex-1 px-3.5 py-2.5 rounded-[12px] border transition-all"
            style={{
              background: 'var(--color-cream-surface)',
              borderColor: 'var(--color-border-subtle)',
            }}
          >
            <Search size={13} style={{ color: 'var(--color-text-tertiary)' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search meetings…"
              className="flex-1 text-[13.5px] bg-transparent outline-none"
              style={{ color: 'var(--color-navy)', fontFamily: 'var(--font-body)' }}
            />
          </div>
          <div
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[12px] border text-[13px] font-medium cursor-pointer"
            style={{
              background: 'var(--color-cream-surface)',
              borderColor: 'var(--color-border-subtle)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <SlidersHorizontal size={13} />
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="bg-transparent outline-none cursor-pointer text-[13px]"
              style={{ color: 'var(--color-navy)' }}
            >
              <option value="date">Newest first</option>
              <option value="duration">Longest first</option>
              <option value="title">A → Z</option>
            </select>
          </div>
        </div>

        {/* Stats strip */}
        <div
          className="flex items-center gap-5 px-4 py-3 rounded-[12px] mb-5 text-[12.5px]"
          style={{ background: 'var(--color-cream-alt)', border: '1px solid var(--color-border-subtle)' }}
        >
          <span style={{ color: 'var(--color-text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--color-navy)' }}>{meetings.reduce((s, m) => s + m.duration, 0)}</span> min recorded
          </span>
          <span className="w-px h-3.5" style={{ background: 'var(--color-border)' }} />
          <span style={{ color: 'var(--color-text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--color-navy)' }}>{meetings.reduce((s, m) => s + m.transcript.length, 0)}</span> transcript segments
          </span>
          <span className="w-px h-3.5" style={{ background: 'var(--color-border)' }} />
          <span style={{ color: 'var(--color-text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--color-navy)' }}>{meetings.reduce((s, m) => s + m.logs.length, 0)}</span> logs extracted
          </span>
        </div>

        {/* List */}
        <div className="flex flex-col gap-3">
          {filtered.length === 0 && (
            <div className="text-center py-16" style={{ color: 'var(--color-text-tertiary)' }}>
              <Search size={28} strokeWidth={1.3} className="mx-auto mb-3" />
              <p className="text-[14px]">No meetings match "{query}"</p>
            </div>
          )}
          {filtered.map(m => (
            <Link
              key={m.id}
              to={`/meetings/${m.id}`}
              className="rounded-[16px] border p-5 group transition-all hover:shadow-[var(--shadow-md)]"
              style={{ background: 'var(--color-cream-surface)', borderColor: 'var(--color-border-subtle)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-2">
                    <MeetingStatusBadge status={m.status} />
                    <span className="text-[11.5px]" style={{ color: 'var(--color-text-tertiary)' }}>
                      {formatDate(m.date)} · {formatTime(m.date)}
                    </span>
                  </div>
                  <h2
                    className="text-[15.5px] font-semibold tracking-tight"
                    style={{ color: 'var(--color-navy)' }}
                  >
                    {m.title}
                  </h2>
                  {m.summary && (
                    <p
                      className="text-[13px] mt-1.5 line-clamp-2 leading-relaxed"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {m.summary}
                    </p>
                  )}
                </div>
                <ArrowRight
                  size={14}
                  className="shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform"
                  style={{ color: 'var(--color-text-tertiary)' }}
                />
              </div>

              <div
                className="flex items-center justify-between mt-4 pt-4"
                style={{ borderTop: '1px solid var(--color-border-subtle)' }}
              >
                <div className="flex items-center gap-4">
                  <span
                    className="flex items-center gap-1.5 text-[12px]"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    <Clock size={11} strokeWidth={1.8} />
                    {m.duration} min
                  </span>
                  <span
                    className="flex items-center gap-1.5 text-[12px]"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    <Users size={11} strokeWidth={1.8} />
                    <div className="flex -space-x-1.5">
                      {m.participants.slice(0, 4).map(p => <Avatar key={p.id} name={p.name} size={20} />)}
                    </div>
                    {m.participants.length > 4 && (
                      <span>+{m.participants.length - 4}</span>
                    )}
                  </span>
                  {m.transcript.length > 0 && (
                    <span className="text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>
                      {m.transcript.length} segments
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {[...new Set(m.logs.map(l => l.type))].slice(0, 3).map(type => (
                    <LogBadge key={type} type={type} />
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
