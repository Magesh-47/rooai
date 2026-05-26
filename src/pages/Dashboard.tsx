import { useNavigate } from 'react-router-dom'
import { Upload } from 'lucide-react'

export function Dashboard() {
  const navigate = useNavigate()

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{
        height: 52,
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 24px',
        background: 'var(--bg)', flexShrink: 0,
      }}>
        <span style={{
          fontSize: 14, fontWeight: 600,
          color: 'var(--ink)', letterSpacing: '-0.01em',
        }}>
          Meetings
        </span>
      </div>

      {/* Centered action cards */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{ width: '100%', maxWidth: 460 }} className="fade-up">

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 10, marginBottom: 16,
          }}>

            {/* Record */}
            <div
              onClick={() => navigate('/record')}
              style={{
                background: 'var(--ink)', borderRadius: 12,
                padding: '26px 22px 28px',
                cursor: 'pointer', transition: 'opacity 0.14s',
                display: 'flex', flexDirection: 'column',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.87')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <div style={{ marginBottom: 18 }}>
                <span className="pulse-dot" style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#f87171', display: 'inline-block',
                }} />
              </div>
              <div style={{
                fontSize: 14, fontWeight: 600, color: '#fff',
                letterSpacing: '-0.02em', marginBottom: 7, lineHeight: 1.2,
              }}>
                Record a meeting
              </div>
              <div style={{
                fontSize: 12.5, color: 'rgba(255,255,255,0.42)',
                letterSpacing: '-0.01em', lineHeight: 1.55,
              }}>
                Capture live audio and transcribe in real time
              </div>
            </div>

            {/* Upload */}
            <div
              onClick={() => navigate('/upload')}
              style={{
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: 12, padding: '26px 22px 28px',
                cursor: 'pointer', transition: 'border-color 0.14s',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex', flexDirection: 'column',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{ marginBottom: 18 }}>
                <span style={{ color: 'var(--ink3)', display: 'inline-flex' }}>
                  <Upload size={17} strokeWidth={1.6} />
                </span>
              </div>
              <div style={{
                fontSize: 14, fontWeight: 600, color: 'var(--ink)',
                letterSpacing: '-0.02em', marginBottom: 7, lineHeight: 1.2,
              }}>
                Upload a file
              </div>
              <div style={{
                fontSize: 12.5, color: 'var(--ink3)',
                letterSpacing: '-0.01em', lineHeight: 1.55,
              }}>
                Process an existing audio or video recording
              </div>
            </div>
          </div>

          {/* Format chips */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 6, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 11.5, color: 'var(--ink3)', letterSpacing: '-0.01em', marginRight: 2 }}>
              Supports
            </span>
            {['MP3', 'MP4', 'WAV', 'M4A', 'WebM'].map(fmt => (
              <span key={fmt} style={{
                fontSize: 10.5, padding: '2px 7px',
                borderRadius: 4, background: 'var(--bg3)',
                color: 'var(--ink3)', border: '1px solid var(--border)',
                fontFamily: 'var(--font-mono)',
              }}>
                {fmt}
              </span>
            ))}
          </div>

        </div>
      </div>

    </div>
  )
}
