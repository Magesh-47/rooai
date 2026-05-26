import { useState } from 'react'
import { Search, ArrowRight, Zap, CheckCircle2, AlertTriangle, Layers } from 'lucide-react'

const exampleQueries = [
  'What was decided about the vector database?',
  "What are Sridhar's open action items?",
  'Which risks were flagged more than once?',
  'What happened with mobile notifications?',
  'Summarise last 3 Architecture Syncs',
  'Who owns the contractor list review?',
]

const categories = [
  { Icon: Zap,           label: 'Decisions',    desc: 'What was decided and when?' },
  { Icon: CheckCircle2,  label: 'Actions',       desc: 'Open tasks, owners, deadlines' },
  { Icon: AlertTriangle, label: 'Risks',         desc: 'Repeated flags, unresolved blockers' },
  { Icon: Layers,        label: 'Architecture',  desc: 'Tech choices and infrastructure decisions' },
]

export function Query() {
  const [query, setQuery]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [searched, setSearched] = useState(false)

  function askQuery(q: string) {
    if (!q.trim()) return
    setLoading(true)
    setSearched(false)
    setTimeout(() => {
      setLoading(false)
      setSearched(true)
    }, 700)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', letterSpacing: '-0.01em' }}>

      {/* Top bar */}
      <div style={{
        height: 52,
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 12,
        background: 'var(--bg)',
        flexShrink: 0,
      }}>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
          Historical Query
        </div>
        <span className="tag t-violet" style={{ letterSpacing: '-0.01em' }}>RAG · 147 meetings</span>
        <span className="tag t-sage"   style={{ letterSpacing: '-0.01em' }}>Gemini 3</span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px' }} className="fade-up">
        <div style={{ maxWidth: 700, margin: '0 auto' }}>

          {/* ── Search bar ── */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: 13,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}>
                <Search size={15} color="var(--ink3)" strokeWidth={1.8} />
              </div>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') askQuery(query) }}
                placeholder="Ask anything about your meetings…"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 40px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: 9,
                  fontSize: 14,
                  color: 'var(--ink)',
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                  letterSpacing: '-0.01em',
                  boxShadow: 'var(--shadow-sm)',
                  boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--border2)')}
                onBlur={e =>  (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Ask button */}
            <button
              onClick={() => askQuery(query)}
              disabled={loading || !query.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 20px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 500,
                cursor: query.trim() && !loading ? 'pointer' : 'default',
                background: query.trim() && !loading ? '#0A1628' : 'var(--bg4)',
                color: query.trim() && !loading ? '#fff' : 'var(--ink3)',
                border: 'none',
                fontFamily: 'var(--font-body)',
                transition: 'all 0.12s',
                flexShrink: 0,
                opacity: loading ? 0.75 : 1,
                letterSpacing: '-0.01em',
                boxShadow: query.trim() && !loading ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {loading
                ? <span className="spinner" style={{ width: 10, height: 10, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                : <ArrowRight size={13} strokeWidth={2} />
              }
              {loading ? 'Thinking…' : 'Ask'}
            </button>
          </div>

          {/* ── Example query chips ── */}
          {!searched && !loading && (
            <div style={{ marginBottom: 26 }}>
              <div style={{
                fontSize: 11,
                color: 'var(--ink3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 500,
                marginBottom: 10,
              }}>
                Try asking
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {exampleQueries.map(q => (
                  <button
                    key={q}
                    onClick={() => { setQuery(q); askQuery(q) }}
                    style={{
                      padding: '6px 13px',
                      borderRadius: 20,
                      fontSize: 12.5,
                      color: 'var(--ink2)',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                      transition: 'all 0.12s',
                      letterSpacing: '-0.01em',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.borderColor = 'var(--border2)'
                      el.style.color = 'var(--ink)'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.borderColor = 'var(--border)'
                      el.style.color = 'var(--ink2)'
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Loading state ── */}
          {loading && (
            <div
              className="fade-up"
              style={{
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '22px 22px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#0A1628',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 12, color: '#fff', fontWeight: 700, lineHeight: 1 }}>R</span>
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Roo AI</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', letterSpacing: '-0.01em' }}>Searching 147 meetings</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="wv-bar"
                    style={{
                      display: 'inline-block',
                      width: 4,
                      height: 16,
                      borderRadius: 2,
                      background: 'var(--ink3)',
                      animation: `wv 0.8s ease-in-out ${i * 0.15}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── No results state ── */}
          {searched && !loading && (
            <div className="fade-up" style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '32px 28px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--bg2)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <span style={{ color: 'var(--ink3)', display: 'flex' }}><Search size={16} strokeWidth={1.6} /></span>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', marginBottom: 5, letterSpacing: '-0.01em' }}>
                No meetings to search
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink3)', letterSpacing: '-0.01em' }}>
                Record or upload meetings to start building your knowledge base.
              </div>
            </div>
          )}

          {/* ── Empty state category cards ── */}
          {!searched && !loading && (
            <div style={{ marginTop: 4 }}>
              <div style={{
                fontSize: 11,
                color: 'var(--ink3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 500,
                marginBottom: 12,
              }}>
                What you can ask
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {categories.map(cat => (
                  <div key={cat.label} style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '16px 18px',
                    display: 'flex',
                    gap: 13,
                    alignItems: 'flex-start',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'border-color 0.12s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'var(--bg2)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <cat.Icon size={15} color="var(--ink3)" strokeWidth={1.6} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 3, letterSpacing: '-0.01em' }}>
                        {cat.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.55, letterSpacing: '-0.01em' }}>
                        {cat.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
