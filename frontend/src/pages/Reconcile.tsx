import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  CheckCircle2,
  Zap,
  Layers,
  AlertTriangle,
  Heart,
  Check,
  X,
  User,
  Calendar,
  FileText,
  Quote,
  ArrowUpRight,
} from 'lucide-react'
import { meetings, allLogs } from '../data/mock'
import { LogBadge, PriorityBadge, VerificationBadge } from '../components/ui/Badge'
import type { LogType, LogVerification } from '../types'

type TabType = LogType

interface TabDef {
  type: TabType
  label: string
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
}

const tabs: TabDef[] = [
  { type: 'action',       label: 'Actions',      Icon: CheckCircle2 },
  { type: 'decision',     label: 'Decisions',    Icon: Zap },
  { type: 'architecture', label: 'Architecture', Icon: Layers },
  { type: 'risk',         label: 'Risks',        Icon: AlertTriangle },
  { type: 'culture',      label: 'Culture',      Icon: Heart },
]

const tabColor: Record<TabType, string> = {
  action:       'var(--sage2)',
  decision:     'var(--violet2)',
  architecture: 'var(--clay2)',
  risk:         'var(--gold2)',
  culture:      'var(--rose2)',
}

const tabBg: Record<TabType, string> = {
  action:       '#EEFBF3',
  decision:     '#F2EFFE',
  architecture: '#FEF4EB',
  risk:         '#FFFBEB',
  culture:      '#FEF0F6',
}

function priorityOrder(p?: string) {
  if (p === 'high') return 0
  if (p === 'medium') return 1
  return 2
}

export function Reconcile() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<TabType>('action')
  const [verifications, setVerifications] = useState<Record<string, LogVerification>>({})

  const meeting = id ? meetings.find(m => m.id === id) : null
  const sourceLogs = meeting ? meeting.logs : allLogs
  const displayName = meeting ? meeting.title : 'All Meetings'

  const tabLogs = sourceLogs
    .filter(l => l.type === activeTab)
    .sort((a, b) => priorityOrder(a.priority) - priorityOrder(b.priority))

  const verifiedCount = sourceLogs.filter(
    l => (verifications[l.id] ?? l.verification) === 'verified'
  ).length
  const totalCount = sourceLogs.length

  function setVerification(logId: string, v: LogVerification) {
    setVerifications(prev => ({ ...prev, [logId]: v }))
  }

  const tabCounts: Record<TabType, number> = {
    action:       sourceLogs.filter(l => l.type === 'action').length,
    decision:     sourceLogs.filter(l => l.type === 'decision').length,
    architecture: sourceLogs.filter(l => l.type === 'architecture').length,
    risk:         sourceLogs.filter(l => l.type === 'risk').length,
    culture:      sourceLogs.filter(l => l.type === 'culture').length,
  }

  const autoCorrections = meeting?.autoCorrections ?? []
  const progressPct = totalCount > 0 ? (verifiedCount / totalCount) * 100 : 0

  const activeTabDef = tabs.find(t => t.type === activeTab)!

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Top bar ── */}
      <div
        style={{
          height: 52,
          flexShrink: 0,
          background: 'var(--bg3)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 22px',
          gap: 16,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Breadcrumb */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: 'var(--ink3)',
              fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
            }}
          >
            Reconcile
          </span>
          <span style={{ fontSize: 13, color: 'var(--border2)' }}>/</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--ink)',
              fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {displayName}
          </span>
        </div>

        {/* Verified count */}
        <div
          style={{
            fontSize: 12,
            color: 'var(--ink3)',
            fontFamily: 'var(--font-body)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: 'var(--sage2)', fontWeight: 600 }}>{verifiedCount}</span>
          <span style={{ color: 'var(--ink3)' }}> / {totalCount} verified</span>
        </div>

        {/* Push button */}
        <button
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 500,
            cursor: 'pointer',
            background: '#0A1628',
            color: '#FFFFFF',
            border: 'none',
            fontFamily: 'var(--font-body)',
            transition: 'opacity 0.12s',
            letterSpacing: '0.01em',
            boxShadow: '0 1px 3px rgba(10,22,40,0.18)',
            flexShrink: 0,
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
        >
          Push to Master Tracker
          <ArrowUpRight size={13} strokeWidth={2.2} />
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left sidebar ── */}
        <div
          style={{
            width: 236,
            flexShrink: 0,
            background: 'var(--bg2)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Progress section */}
          <div
            style={{
              padding: '14px 16px 16px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 9,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--ink3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.9px',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Verify Progress
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--ink3)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {verifiedCount}/{totalCount}
              </span>
            </div>
            <div
              style={{
                height: 4,
                background: 'var(--bg4)',
                borderRadius: 4,
                overflow: 'hidden',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: 4,
                  background: 'var(--sage2)',
                  width: `${progressPct}%`,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          {/* Log type nav */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 0' }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--ink3)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                padding: '6px 6px 8px',
                fontFamily: 'var(--font-body)',
              }}
            >
              Log Types
            </div>

            {tabs.map(tab => {
              const isActive = activeTab === tab.type
              const { Icon } = tab
              return (
                <button
                  key={tab.type}
                  onClick={() => setActiveTab(tab.type)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '9px 10px 9px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: isActive ? tabBg[tab.type] : 'transparent',
                    border: 'none',
                    fontFamily: 'var(--font-body)',
                    transition: 'background 0.12s',
                    marginBottom: 2,
                    textAlign: 'left',
                    position: 'relative',
                    outline: 'none',
                  }}
                  onMouseEnter={e => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.background = 'rgba(10,22,40,0.04)'
                  }}
                  onMouseLeave={e => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  {/* Active left border */}
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 2,
                        height: '58%',
                        background: '#0A1628',
                        borderRadius: '0 2px 2px 0',
                      }}
                    />
                  )}

                  <span style={{ color: isActive ? tabColor[tab.type] : 'var(--ink3)', display: 'flex' }}>
                    <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                  </span>

                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? 'var(--ink)' : 'var(--ink2)',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {tab.label}
                  </span>

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '1px 7px',
                      borderRadius: 10,
                      background: isActive ? 'rgba(10,22,40,0.07)' : 'var(--bg4)',
                      color: isActive ? tabColor[tab.type] : 'var(--ink3)',
                      fontFamily: 'var(--font-mono)',
                      border: `1px solid ${isActive ? 'var(--border2)' : 'var(--border)'}`,
                    }}
                  >
                    {tabCounts[tab.type]}
                  </span>
                </button>
              )
            })}

            {/* Auto-corrections */}
            {autoCorrections.length > 0 && (
              <div style={{ marginTop: 10, paddingBottom: 14 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--ink3)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    padding: '12px 6px 8px',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Auto-Corrections
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '0 4px' }}>
                  {autoCorrections.map((ac, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 10px',
                        background: 'var(--bg3)',
                        borderRadius: 7,
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <X size={10} color="#C53030" />
                      <span
                        style={{
                          fontSize: 11,
                          color: '#C53030',
                          textDecoration: 'line-through',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {ac.from}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--ink3)' }}>→</span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--sage2)',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 500,
                        }}
                      >
                        {ac.to}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Main content area ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

          {/* Section header */}
          <div
            style={{
              padding: '11px 22px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
              background: 'var(--bg3)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span style={{ color: tabColor[activeTab], display: 'flex' }}>
              <activeTabDef.Icon size={15} strokeWidth={2} />
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--ink)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {activeTabDef.label}
            </span>
            <span
              style={{
                fontSize: 11.5,
                color: 'var(--ink3)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {tabCounts[activeTab]} {tabCounts[activeTab] === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {/* Log entries */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '18px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {tabLogs.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ink3)',
                  gap: 10,
                  padding: '72px 0',
                }}
              >
                <span style={{ color: 'var(--border2)', display: 'flex' }}>
                  <activeTabDef.Icon size={32} strokeWidth={1.4} />
                </span>
                <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--ink3)' }}>
                  No {activeTab} entries for this meeting
                </span>
              </div>
            ) : (
              tabLogs.map(log => {
                const currentVerification = verifications[log.id] ?? log.verification ?? 'unverified'
                const isVerified = currentVerification === 'verified'
                const isRejected = currentVerification === 'rejected'

                let cardBorderColor = 'var(--border)'
                if (isVerified) cardBorderColor = 'rgba(47,133,90,0.18)'
                if (isRejected) cardBorderColor = 'rgba(197,48,48,0.18)'

                return (
                  <div
                    key={log.id}
                    className="fade-up"
                    style={{
                      background: 'var(--bg3)',
                      border: `1px solid ${cardBorderColor}`,
                      borderRadius: 12,
                      padding: '16px 18px',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                      boxShadow: isVerified
                        ? '0 1px 6px rgba(47,133,90,0.08)'
                        : isRejected
                        ? '0 1px 6px rgba(197,48,48,0.06)'
                        : 'var(--shadow-sm)',
                    }}
                  >
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Badge row */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flexWrap: 'wrap',
                            marginBottom: 7,
                          }}
                        >
                          <LogBadge type={log.type} />
                          {log.priority && <PriorityBadge priority={log.priority} />}
                          {currentVerification !== 'unverified' && (
                            <VerificationBadge verification={currentVerification} />
                          )}
                        </div>
                        {/* Title */}
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: 'var(--ink)',
                            lineHeight: 1.5,
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          {log.title}
                        </div>
                      </div>

                      {/* Verify / Reject controls */}
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {/* Verify button */}
                        <button
                          onClick={() =>
                            setVerification(log.id, isVerified ? 'unverified' : 'verified')
                          }
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '5px 11px',
                            borderRadius: 7,
                            fontSize: 11.5,
                            fontWeight: 500,
                            cursor: 'pointer',
                            fontFamily: 'var(--font-body)',
                            transition: 'all 0.12s',
                            background: isVerified ? '#EEFBF3' : 'var(--bg4)',
                            color: isVerified ? 'var(--sage2)' : 'var(--ink3)',
                            border: `1px solid ${isVerified ? 'rgba(47,133,90,0.2)' : 'var(--border)'}`,
                            outline: 'none',
                          }}
                          onMouseEnter={e => {
                            if (!isVerified) {
                              const el = e.currentTarget as HTMLElement
                              el.style.background = '#EEFBF3'
                              el.style.color = 'var(--sage2)'
                              el.style.borderColor = 'rgba(47,133,90,0.2)'
                            }
                          }}
                          onMouseLeave={e => {
                            if (!isVerified) {
                              const el = e.currentTarget as HTMLElement
                              el.style.background = 'var(--bg4)'
                              el.style.color = 'var(--ink3)'
                              el.style.borderColor = 'var(--border)'
                            }
                          }}
                        >
                          <Check size={12} strokeWidth={2.4} />
                          {isVerified ? 'Verified' : 'Verify'}
                        </button>

                        {/* Reject button */}
                        <button
                          onClick={() =>
                            setVerification(log.id, isRejected ? 'unverified' : 'rejected')
                          }
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '5px 11px',
                            borderRadius: 7,
                            fontSize: 11.5,
                            fontWeight: 500,
                            cursor: 'pointer',
                            fontFamily: 'var(--font-body)',
                            transition: 'all 0.12s',
                            background: isRejected ? '#FEF0F0' : 'var(--bg4)',
                            color: isRejected ? '#C53030' : 'var(--ink3)',
                            border: `1px solid ${isRejected ? 'rgba(197,48,48,0.2)' : 'var(--border)'}`,
                            outline: 'none',
                          }}
                          onMouseEnter={e => {
                            if (!isRejected) {
                              const el = e.currentTarget as HTMLElement
                              el.style.background = '#FEF0F0'
                              el.style.color = '#C53030'
                              el.style.borderColor = 'rgba(197,48,48,0.2)'
                            }
                          }}
                          onMouseLeave={e => {
                            if (!isRejected) {
                              const el = e.currentTarget as HTMLElement
                              el.style.background = 'var(--bg4)'
                              el.style.color = 'var(--ink3)'
                              el.style.borderColor = 'var(--border)'
                            }
                          }}
                        >
                          <X size={12} strokeWidth={2.4} />
                          {isRejected ? 'Rejected' : 'Reject'}
                        </button>
                      </div>
                    </div>

                    {/* Body text */}
                    {log.body && (
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--ink2)',
                          lineHeight: 1.65,
                          marginBottom: 11,
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {log.body}
                      </div>
                    )}

                    {/* Meta row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        flexWrap: 'wrap',
                      }}
                    >
                      {log.owner && (
                        <span
                          style={{
                            fontSize: 11.5,
                            color: 'var(--ink3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          <User size={11} strokeWidth={1.8} />
                          {log.owner}
                        </span>
                      )}
                      {log.dueDate && (
                        <span
                          style={{
                            fontSize: 11.5,
                            color: 'var(--ink3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          <Calendar size={11} strokeWidth={1.8} />
                          {log.dueDate}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 11.5,
                          color: 'var(--ink3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        <FileText size={11} strokeWidth={1.8} />
                        {log.meetingTitle}
                      </span>
                    </div>

                    {/* Source quote */}
                    {log.source && (
                      <div
                        style={{
                          marginTop: 13,
                          padding: '10px 13px 10px 14px',
                          borderLeft: '2px solid var(--border2)',
                          background: 'var(--bg4)',
                          borderRadius: '0 8px 8px 0',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 7,
                            marginBottom: log.sourceTimestamp || log.sourceAuthor ? 5 : 0,
                          }}
                        >
                          <Quote
                            size={11}
                            strokeWidth={1.8}
                            style={{ color: 'var(--ink3)', flexShrink: 0, marginTop: 2 }}
                          />
                          <span
                            style={{
                              fontSize: 12,
                              color: 'var(--ink2)',
                              fontStyle: 'italic',
                              lineHeight: 1.6,
                              fontFamily: 'var(--font-body)',
                            }}
                          >
                            {log.source}
                          </span>
                        </div>
                        {(log.sourceAuthor || log.sourceTimestamp) && (
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--ink3)',
                              paddingLeft: 18,
                              fontFamily: 'var(--font-body)',
                            }}
                          >
                            {log.sourceAuthor && (
                              <span style={{ fontWeight: 500 }}>{log.sourceAuthor}</span>
                            )}
                            {log.sourceAuthor && log.sourceTimestamp && (
                              <span style={{ margin: '0 4px' }}>·</span>
                            )}
                            {log.sourceTimestamp && (
                              <span style={{ fontFamily: 'var(--font-mono)' }}>
                                {log.sourceTimestamp}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
