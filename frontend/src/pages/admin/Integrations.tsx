import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, Copy, Check, RefreshCw, ExternalLink, Loader } from 'lucide-react'
import { apiFetch } from '../../lib/api'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// ── Types ─────────────────────────────────────────────────

interface IntegrationsStatus {
  teams: {
    connected: boolean
    configured: boolean
    account: string | null
    tenant: string | null
    connected_at: string | null
  }
  mcp: {
    connected: boolean
    server_url: string
    active_sessions: number
    connected_at: string | null
  }
}

// ── Small utilities ────────────────────────────────────────

function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return { copied, copy }
}

function StatusBadge({ connected, label }: { connected: boolean; label?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 500,
      color: connected ? '#16a34a' : '#9ca3af',
      background: connected ? '#f0fdf4' : '#f9fafb',
      border: `1px solid ${connected ? '#bbf7d0' : '#e5e7eb'}`,
      borderRadius: 20, padding: '2px 9px',
    }}>
      {connected
        ? <CheckCircle2 size={10} strokeWidth={2.5} />
        : <AlertCircle  size={10} strokeWidth={2.5} />}
      {label ?? (connected ? 'Connected' : 'Disconnected')}
    </span>
  )
}

// ── Integration card shell ─────────────────────────────────

function Card({ logo, name, description, badge, action, children }: {
  logo: React.ReactNode
  name: string
  description: string
  badge: React.ReactNode
  action: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '20px 22px',
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          border: '1px solid var(--border)', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {logo}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{name}</span>
            {badge}
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.5 }}>{description}</p>
        </div>
        {action}
      </div>
      {children && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          {children}
        </div>
      )}
    </div>
  )
}

function ActionBtn({
  onClick, disabled, loading, children, variant = 'primary',
}: {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  variant?: 'primary' | 'ghost'
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        flexShrink: 0, padding: '6px 14px', borderRadius: 8,
        fontSize: 12.5, fontWeight: 500, cursor: disabled || loading ? 'not-allowed' : 'pointer',
        border: variant === 'primary' ? '1px solid var(--ink)' : '1px solid var(--border)',
        background: variant === 'primary' ? 'var(--ink)' : 'transparent',
        color: variant === 'primary' ? 'var(--bg)' : 'var(--ink2)',
        opacity: disabled ? 0.5 : 1,
        display: 'flex', alignItems: 'center', gap: 6,
        transition: 'opacity 0.1s',
      }}
    >
      {loading && <Loader size={12} style={{ animation: 'spin 0.8s linear infinite' }} />}
      {children}
    </button>
  )
}

// ── Teams logo ─────────────────────────────────────────────

function TeamsLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 2228 2073" xmlns="http://www.w3.org/2000/svg">
      <path d="M1554.6 777.5h575.7c54.4 0 98.5 44.1 98.5 98.5v524.4c0 199.9-162.1 362-362 362h-1.7c-199.9 0-362-162.1-362-362V829a51.5 51.5 0 0151.5-51.5z" fill="#5059C9"/>
      <circle cx="1943.8" cy="440.6" r="233.3" fill="#5059C9"/>
      <circle cx="1218.1" cy="336.9" r="336.9" fill="#7B83EB"/>
      <path d="M1667.3 777.5H717c-53 1.4-95.3 45.4-93.9 98.5v524.9c0 393.9 319 713 713 713s713-319.1 713-713V876.1c1.4-53.1-41-97.2-94.8-98.6z" fill="#7B83EB"/>
      <path d="M1196 777.5v885.1a105 105 0 01-8.4 40.8c-18 41.1-57.9 67.9-102.5 68.2H712a712.2 712.2 0 01-63-371.6V876.1c-1.4-53.1 40.8-97.1 93.9-98.5L1196 777.5z" fill="rgba(0,0,0,.1)"/>
      <path d="M1102 777.5H742.9C689.8 778.9 647.6 822.9 649 876v885.5h391a105 105 0 0040.8-8.4c41.1-18 67.9-57.9 68.2-102.5V777.5z" fill="rgba(0,0,0,.2)"/>
      <path d="M820.2 733.8H630.1V1243h-135.6V733.8H304.3V619.7H820.2v114.1z" fill="#fff"/>
    </svg>
  )
}

// ── Claude logo ────────────────────────────────────────────

function ClaudeLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#D97757"/>
      <path d="M14.6 7c-.34-.9-1.67-.9-2.01 0L8.5 17h1.79l.9-2.4h4.62l.9 2.4H18.5L14.6 7zm-3.04 6.24 1.78-4.73 1.78 4.73H11.56z" fill="#fff"/>
    </svg>
  )
}

// ── Code block with copy ───────────────────────────────────

function CodeBlock({ code }: { code: string }) {
  const { copied, copy } = useCopy(code)
  return (
    <div style={{ position: 'relative' }}>
      <pre style={{
        margin: 0, padding: '12px 14px',
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 8, fontSize: 11.5, color: 'var(--ink2)',
        lineHeight: 1.65, overflowX: 'auto', fontFamily: 'monospace',
      }}>
        {code}
      </pre>
      <button
        onClick={copy}
        title="Copy"
        style={{
          position: 'absolute', top: 8, right: 8,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 6, cursor: 'pointer',
          padding: '3px 7px', display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 11, color: 'var(--ink3)',
        }}
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────

export function Integrations() {
  const [status, setStatus]     = useState<IntegrationsStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [teamsLoading,  setTeamsLoading]  = useState(false)
  const [teamsError,    setTeamsError]    = useState<string | null>(null)
  const [mcpTesting,    setMcpTesting]    = useState(false)
  const [mcpError,      setMcpError]      = useState<string | null>(null)
  const popupRef = useRef<Window | null>(null)

  async function loadStatus() {
    setLoadingStatus(true)
    try {
      const data = await apiFetch<IntegrationsStatus>('/integrations')
      setStatus(data)
    } catch {
      // backend not reachable
    } finally {
      setLoadingStatus(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  // Listen for the OAuth popup callback
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== API_BASE && e.origin !== window.location.origin) return
      if (e.data?.type === 'teams-auth-success') {
        setTeamsLoading(false)
        loadStatus()
      }
      if (e.data?.type === 'teams-auth-error') {
        setTeamsLoading(false)
        setTeamsError(e.data.message ?? 'Authorization failed')
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  function handleTeamsConnect() {
    setTeamsError(null)
    setTeamsLoading(true)
    const w = 520
    const h = 640
    const left = window.screenX + (window.outerWidth  - w) / 2
    const top  = window.screenY + (window.outerHeight - h) / 2
    const popup = window.open(
      `${API_BASE}/integrations/teams/authorize`,
      'teams-oauth',
      `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no`,
    )
    popupRef.current = popup

    // Fallback: if popup closes without postMessage (e.g. user closed it)
    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer)
        setTeamsLoading(false)
        loadStatus()
      }
    }, 800)
  }

  async function handleTeamsDisconnect() {
    setTeamsLoading(true)
    try {
      await apiFetch('/integrations/teams', { method: 'DELETE' })
      await loadStatus()
    } catch (e: unknown) {
      setTeamsError(e instanceof Error ? e.message : 'Failed to disconnect')
    } finally {
      setTeamsLoading(false)
    }
  }

  async function testMcp() {
    setMcpTesting(true)
    setMcpError(null)
    try {
      await apiFetch('/integrations/mcp/status')
    } catch {
      setMcpError('MCP server unreachable — is the backend running?')
    } finally {
      setMcpTesting(false)
    }
  }

  const mcpServerUrl = status?.mcp.server_url ?? `${API_BASE}/mcp/sse`
  const mcpConfigJson = JSON.stringify(
    { mcpServers: { roo: { url: mcpServerUrl, type: 'sse' } } },
    null, 2,
  )

  if (loadingStatus) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 14, height: 14 }} />
      </div>
    )
  }

  const teamsConnected  = status?.teams.connected  ?? false
  const teamsConfigured = status?.teams.configured ?? false
  const mcpConnected    = status?.mcp.connected    ?? false

  return (
    <div style={{
      flex: 1, overflowY: 'auto',
      padding: '28px 32px',
      display: 'flex', flexDirection: 'column', gap: 24,
      maxWidth: 760,
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            Integrations
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink3)' }}>
            Connect external tools to Roo.
          </p>
        </div>
        <button
          onClick={loadStatus}
          title="Refresh"
          style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 8,
            cursor: 'pointer', color: 'var(--ink3)', padding: '5px 10px',
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
          }}
        >
          <RefreshCw size={12} strokeWidth={1.75} /> Refresh
        </button>
      </div>

      {/* ── Microsoft Teams ── */}
      <Card
        logo={<TeamsLogo />}
        name="Microsoft Teams"
        description="Import meetings from Teams, sync participants, and post summaries to channels."
        badge={<StatusBadge connected={teamsConnected} />}
        action={
          teamsConnected ? (
            <ActionBtn variant="ghost" onClick={handleTeamsDisconnect} loading={teamsLoading}>
              Disconnect
            </ActionBtn>
          ) : (
            <ActionBtn
              onClick={handleTeamsConnect}
              loading={teamsLoading}
              disabled={!teamsConfigured}
            >
              Connect
            </ActionBtn>
          )
        }
      >
        {!teamsConfigured && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '10px 12px', borderRadius: 8,
            background: '#fffbeb', border: '1px solid #fde68a',
          }}>
            <AlertCircle size={14} style={{ color: '#d97706', marginTop: 1, flexShrink: 0 }} />
            <div style={{ fontSize: 12.5, color: '#92400e', lineHeight: 1.5 }}>
              Azure AD credentials not configured.{' '}
              <a
                href="https://portal.azure.com"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#b45309', fontWeight: 500 }}
              >
                Register an app in Azure <ExternalLink size={10} style={{ verticalAlign: 'middle' }} />
              </a>{' '}
              then set <code style={{ fontFamily: 'monospace', background: '#fef3c7', padding: '0 4px', borderRadius: 3 }}>MS_CLIENT_ID</code> and{' '}
              <code style={{ fontFamily: 'monospace', background: '#fef3c7', padding: '0 4px', borderRadius: 3 }}>MS_CLIENT_SECRET</code> in <code style={{ fontFamily: 'monospace', background: '#fef3c7', padding: '0 4px', borderRadius: 3 }}>backend/.env</code>.
            </div>
          </div>
        )}
        {teamsConnected && status?.teams && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12.5, color: 'var(--ink2)' }}>
              Signed in as <strong>{status.teams.account}</strong>
            </div>
            {status.teams.connected_at && (
              <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>
                Connected {new Date(status.teams.connected_at).toLocaleString()}
              </div>
            )}
          </div>
        )}
        {teamsError && (
          <div style={{ fontSize: 12.5, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={13} /> {teamsError}
          </div>
        )}
      </Card>

      {/* ── Claude MCP ── */}
      <Card
        logo={<ClaudeLogo />}
        name="Claude MCP"
        description="Roo exposes a Model Context Protocol server so Claude Desktop can query your meetings, transcripts, and log entries."
        badge={<StatusBadge connected={mcpConnected} label={mcpConnected ? 'Running' : 'Offline'} />}
        action={
          <ActionBtn variant="ghost" onClick={testMcp} loading={mcpTesting}>
            Test
          </ActionBtn>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 12.5, fontWeight: 500, color: 'var(--ink2)' }}>
              Add to <code style={{ fontFamily: 'monospace', fontSize: 12 }}>claude_desktop_config.json</code>:
            </p>
            <CodeBlock code={mcpConfigJson} />
          </div>

          <div>
            <p style={{ margin: '0 0 6px', fontSize: 12.5, fontWeight: 500, color: 'var(--ink2)' }}>
              SSE endpoint:
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 12px', borderRadius: 8,
              background: 'var(--bg)', border: '1px solid var(--border)',
            }}>
              <code style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', color: 'var(--ink2)' }}>
                {mcpServerUrl}
              </code>
              <CopyBtn text={mcpServerUrl} />
            </div>
          </div>

          <div style={{
            padding: '10px 12px', borderRadius: 8,
            background: '#f0f9ff', border: '1px solid #bae6fd',
            fontSize: 12.5, color: '#0369a1', lineHeight: 1.5,
          }}>
            <strong>Available tools:</strong> list_meetings · get_meeting · get_transcript · search_logs
          </div>

          {mcpError && (
            <div style={{ fontSize: 12.5, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={13} /> {mcpError}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

function CopyBtn({ text }: { text: string }) {
  const { copied, copy } = useCopy(text)
  return (
    <button
      onClick={copy}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: copied ? '#16a34a' : 'var(--ink3)',
        display: 'flex', alignItems: 'center', padding: 0,
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}
