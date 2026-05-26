import { useState } from 'react'
import { Mic, Cpu, Trash2, Link2, Link2Off, Plug } from 'lucide-react'

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: checked ? 'var(--sage2)' : 'var(--bg5)',
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.2s', flexShrink: 0,
        border: '1px solid transparent',
      }}
    >
      <div style={{
        position: 'absolute', top: 2,
        left: checked ? 17 : 2,
        width: 15, height: 15, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
      }} />
    </div>
  )
}

function Section({
  icon: Icon, title, children,
}: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'var(--bg4)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={14} color="var(--ink3)" strokeWidth={1.8} />
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
          {title}
        </div>
      </div>
      <div style={{
        background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
      }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, desc, last, children }: {
  label: string; desc?: string; last?: boolean; children?: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, padding: '13px 18px',
      borderBottom: last ? undefined : '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{label}</div>
        {desc && <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 2, letterSpacing: '-0.01em' }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 7, padding: '7px 10px', fontSize: 13,
  color: 'var(--ink2)', outline: 'none',
  fontFamily: 'var(--font-body)', width: 200, letterSpacing: '-0.01em',
  cursor: 'pointer',
}


/* ── Logos as inline SVGs (no external images needed) ── */
function TeamsLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect width="18" height="18" rx="4" fill="#4B53BC"/>
      <path d="M10.5 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" fill="white"/>
      <path d="M13 7h-5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Z" fill="white" opacity=".9"/>
      <path d="M7.5 7.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" fill="white"/>
      <path d="M5 8.5h4v4.5H6a1 1 0 0 1-1-1V8.5Z" fill="white" opacity=".75"/>
    </svg>
  )
}

function OutlookLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect width="18" height="18" rx="4" fill="#0078D4"/>
      <rect x="2" y="5" width="9" height="8" rx="1" fill="white"/>
      <rect x="9" y="6.5" width="7" height="5" rx="1" fill="#50A0D8"/>
      <path d="M9 6.5l3.5 3 3.5-3" stroke="#0078D4" strokeWidth="1" strokeLinecap="round"/>
      <circle cx="6.5" cy="9" r="2" fill="#0078D4"/>
    </svg>
  )
}

function ClaudeLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect width="18" height="18" rx="4" fill="#CC785C"/>
      <path d="M9 3.5C6.51 3.5 4.5 5.51 4.5 8c0 1.5.7 2.84 1.8 3.7L5.5 14.5h7l-.8-2.8A4.5 4.5 0 0 0 13.5 8c0-2.49-2.01-4.5-4.5-4.5Z" fill="white" opacity=".9"/>
    </svg>
  )
}

interface Integration {
  id: string
  name: string
  desc: string
  Logo: React.FC
  connected: boolean
}

export function Settings() {
  const [multilingual, setMultilingual] = useState(true)
  const [noiseCancel,  setNoiseCancel]  = useState(true)
  const [diarization,  setDiarization]  = useState(false)
  const [preMeeting,   setPreMeeting]   = useState(true)
  const [autoExport,   setAutoExport]   = useState(false)

  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: 'teams',   name: 'Microsoft Teams',   desc: 'Import meetings and send summaries to Teams channels', Logo: TeamsLogo,   connected: false },
    { id: 'outlook', name: 'Outlook Calendar',  desc: 'Sync meeting schedule and auto-join recordings',        Logo: OutlookLogo, connected: false },
    { id: 'claude',  name: 'Claude MCP',         desc: 'Connect Claude as an AI agent for advanced reasoning', Logo: ClaudeLogo,  connected: false },
  ])

  function toggleIntegration(id: string) {
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, connected: !i.connected } : i))
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', letterSpacing: '-0.01em' }}>

      {/* Top bar */}
      <div style={{
        height: 52, borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12,
        background: 'var(--bg)', flexShrink: 0,
      }}>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Settings</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }} className="fade-up">
        <div style={{ maxWidth: 600, margin: '0 auto' }}>

          {/* ── Integrations ── */}
          <Section icon={Plug} title="Integrations">
            {integrations.map((intg, idx) => (
              <div
                key={intg.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px',
                  borderBottom: idx < integrations.length - 1 ? '1px solid var(--border)' : undefined,
                }}
              >
                {/* Logo */}
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <intg.Logo />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 2 }}>
                    {intg.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink3)', letterSpacing: '-0.01em', lineHeight: 1.4 }}>
                    {intg.desc}
                  </div>
                </div>

                {/* Status + button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {intg.connected && (
                    <span style={{ fontSize: 11.5, color: 'var(--sage2)', fontWeight: 500, letterSpacing: '-0.01em' }}>
                      Connected
                    </span>
                  )}
                  <button
                    onClick={() => toggleIntegration(intg.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 13px', borderRadius: 7,
                      fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                      fontFamily: 'var(--font-body)', letterSpacing: '-0.01em',
                      transition: 'all 0.12s',
                      background: intg.connected ? 'transparent' : 'var(--ink)',
                      color:      intg.connected ? '#e05252' : '#fff',
                      border:     intg.connected ? '1px solid rgba(248,113,113,0.3)' : 'none',
                    }}
                    onMouseEnter={e => {
                      if (intg.connected) (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.06)'
                      else                (e.currentTarget as HTMLElement).style.opacity = '0.85'
                    }}
                    onMouseLeave={e => {
                      if (intg.connected) (e.currentTarget as HTMLElement).style.background = 'transparent'
                      else                (e.currentTarget as HTMLElement).style.opacity = '1'
                    }}
                  >
                    {intg.connected
                      ? <><Link2Off size={12} strokeWidth={2} /> Disconnect</>
                      : <><Link2 size={12} strokeWidth={2} /> Connect</>
                    }
                  </button>
                </div>
              </div>
            ))}
          </Section>

          {/* ── Transcription ── */}
          <Section icon={Mic} title="Recording & Transcription">
            <Row label="Primary language" desc="Language used for transcription">
              <select
                style={selectStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--border2)')}
                onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
              >
                <option>Tamil + English</option>
                <option>English Only</option>
                <option>Hindi + English</option>
                <option>Auto-detect</option>
              </select>
            </Row>
            <Row label="Multilingual mode" desc="Optimised for code-switching between languages">
              <Toggle checked={multilingual} onChange={() => setMultilingual(v => !v)} />
            </Row>
            <Row label="Noise cancellation" desc="Filter background noise during recording">
              <Toggle checked={noiseCancel} onChange={() => setNoiseCancel(v => !v)} />
            </Row>
            <Row label="Speaker diarization" desc="Identify and label each speaker automatically" last>
              <Toggle checked={diarization} onChange={() => setDiarization(v => !v)} />
            </Row>
          </Section>

          {/* ── Reconciliation Engine ── */}
          <Section icon={Cpu} title="Reconciliation Engine">
            <Row label="Pre-meeting briefing" desc="Generate context from recent meetings before each call">
              <Toggle checked={preMeeting} onChange={() => setPreMeeting(v => !v)} />
            </Row>
            <Row label="Auto-export on complete" desc="Push updated logs to Excel after each meeting ends" last>
              <Toggle checked={autoExport} onChange={() => setAutoExport(v => !v)} />
            </Row>
          </Section>

          {/* ── Danger zone ── */}
          <div style={{
            background: 'var(--bg3)',
            border: '1px solid rgba(248,113,113,0.22)',
            borderRadius: 10, overflow: 'hidden',
            marginBottom: 32, boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ padding: '10px 18px', borderBottom: '1px solid rgba(248,113,113,0.15)', background: 'rgba(248,113,113,0.04)' }}>
              <div style={{ fontSize: 11, color: '#e05252', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                Danger Zone
              </div>
            </div>
            <div style={{ padding: '15px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 2, letterSpacing: '-0.01em' }}>Delete all meetings</div>
                <div style={{ fontSize: 12, color: 'var(--ink3)', letterSpacing: '-0.01em' }}>Permanently remove all recordings, transcripts, and logs</div>
              </div>
              <button
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer',
                  background: 'transparent', color: '#e05252',
                  border: '1px solid rgba(248,113,113,0.3)', fontFamily: 'var(--font-body)',
                  transition: 'all 0.12s', letterSpacing: '-0.01em', fontWeight: 500, flexShrink: 0,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Trash2 size={13} strokeWidth={1.8} />
                Delete all
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
