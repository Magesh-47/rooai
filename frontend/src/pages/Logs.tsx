import { useState } from 'react'
import { Link } from 'react-router-dom'
import { allLogs } from '../data/mock'
import { LogBadge, StatusBadge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Avatar'
import type { LogType } from '../types'
import { Search, ArrowRight } from 'lucide-react'

const typeFilters: { id: LogType | 'all'; label: string }[] = [
  { id: 'all',          label: 'All' },
  { id: 'action',       label: 'Actions' },
  { id: 'decision',     label: 'Decisions' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'risk',         label: 'Risks' },
  { id: 'culture',      label: 'Culture' },
]

const statusFilters = [
  { id: 'all',         label: 'All' },
  { id: 'open',        label: 'Open' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'resolved',    label: 'Resolved' },
]

export function Logs() {
  const [typeFilter, setTypeFilter] = useState<LogType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [query, setQuery] = useState('')

  const filtered = allLogs.filter(l => {
    const typeOk = typeFilter === 'all' || l.type === typeFilter
    const statusOk = statusFilter === 'all' || l.status === statusFilter
    const queryOk = !query || l.title.toLowerCase().includes(query.toLowerCase()) || l.body.toLowerCase().includes(query.toLowerCase())
    return typeOk && statusOk && queryOk
  })

  const openCount = allLogs.filter(l => l.status === 'open').length
  const resolvedCount = allLogs.filter(l => l.status === 'resolved').length
  const inProgressCount = allLogs.filter(l => l.status === 'in-progress').length

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--color-cream)' }}>
      <div className="max-w-[800px] mx-auto px-8 py-8">

        {/* Header */}
        <div className="mb-7">
          <h1
            className="text-[24px] font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-navy)' }}
          >
            Log Ledger
          </h1>
          <p className="text-[14px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            Every action, decision, and insight extracted from your meetings.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-7">
          {[
            { label: 'Open', value: openCount, color: 'var(--color-cream-alt)' },
            { label: 'In Progress', value: inProgressCount, color: 'var(--color-navy-subtle)' },
            { label: 'Resolved', value: resolvedCount, color: 'var(--color-navy)' },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-[14px] px-4 py-4 flex items-center justify-between"
              style={{
                background: s.color,
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <div>
                <p
                  className="text-[24px] font-semibold tracking-tight leading-none mb-1"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: s.label === 'Resolved' ? '#FAF8F4' : 'var(--color-navy)',
                  }}
                >
                  {s.value}
                </p>
                <p
                  className="text-[12px] font-medium"
                  style={{ color: s.label === 'Resolved' ? 'rgba(250,248,244,0.6)' : 'var(--color-text-secondary)' }}
                >
                  {s.label}
                </p>
              </div>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: s.label === 'Resolved' ? 'rgba(250,248,244,0.1)' : 'rgba(11,31,58,0.06)',
                }}
              >
                <span
                  className="text-[13px]"
                  style={{ color: s.label === 'Resolved' ? 'rgba(250,248,244,0.5)' : 'var(--color-text-tertiary)' }}
                >
                  {s.label === 'Open' ? '○' : s.label === 'In Progress' ? '◐' : '●'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Search bar */}
        <div
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-[12px] border mb-4"
          style={{
            background: 'var(--color-cream-surface)',
            borderColor: 'var(--color-border-subtle)',
          }}
        >
          <Search size={13} style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search logs…"
            className="flex-1 text-[13.5px] bg-transparent outline-none"
            style={{ color: 'var(--color-navy)', fontFamily: 'var(--font-body)' }}
          />
        </div>

        {/* Type filter tabs */}
        <div
          className="flex items-center gap-1 p-1 rounded-[12px] mb-3 w-fit"
          style={{ background: 'var(--color-cream-surface)', border: '1px solid var(--color-border-subtle)' }}
        >
          {typeFilters.map(t => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className="px-3 py-1.5 rounded-[9px] text-[12.5px] font-medium transition-all"
              style={{
                background: typeFilter === t.id ? 'var(--color-navy)' : 'transparent',
                color: typeFilter === t.id ? '#FAF8F4' : 'var(--color-text-secondary)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>Status:</span>
          {statusFilters.map(s => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className="px-2.5 py-1 rounded-[8px] text-[12px] font-medium border transition-all"
              style={{
                background: statusFilter === s.id ? 'var(--color-navy)' : 'transparent',
                borderColor: statusFilter === s.id ? 'var(--color-navy)' : 'var(--color-border-subtle)',
                color: statusFilter === s.id ? '#FAF8F4' : 'var(--color-text-secondary)',
              }}
            >
              {s.label}
            </button>
          ))}
          {filtered.length > 0 && (
            <span className="ml-auto text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Log list */}
        <div className="flex flex-col gap-2.5">
          {filtered.length === 0 && (
            <div className="text-center py-16" style={{ color: 'var(--color-text-tertiary)' }}>
              <p className="text-[14px]">No logs match this filter.</p>
            </div>
          )}
          {filtered.map(log => (
            <div
              key={log.id}
              className="rounded-[14px] border p-4 transition-all hover:shadow-[var(--shadow-sm)]"
              style={{ background: 'var(--color-cream-surface)', borderColor: 'var(--color-border-subtle)' }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <LogBadge type={log.type} />
                    <Link
                      to={`/meetings/${log.meetingId}`}
                      className="text-[11.5px] hover:underline truncate max-w-[200px]"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      {log.meetingTitle}
                    </Link>
                  </div>
                  <p className="text-[14px] font-semibold leading-snug" style={{ color: 'var(--color-navy)' }}>
                    {log.title}
                  </p>
                  <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {log.body}
                  </p>
                  {(log.owner || log.dueDate) && (
                    <div
                      className="flex items-center gap-4 mt-3 pt-3"
                      style={{ borderTop: '1px solid var(--color-border-subtle)' }}
                    >
                      {log.owner && (
                        <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                          <Avatar name={log.owner} size={18} />
                          {log.owner}
                        </span>
                      )}
                      {log.dueDate && (
                        <span className="text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>
                          Due {new Date(log.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                      <Link
                        to={`/meetings/${log.meetingId}`}
                        className="ml-auto flex items-center gap-1 text-[12px] font-medium transition-opacity hover:opacity-70"
                        style={{ color: 'var(--color-navy-2)' }}
                      >
                        View meeting <ArrowRight size={11} />
                      </Link>
                    </div>
                  )}
                </div>
                <StatusBadge status={log.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
