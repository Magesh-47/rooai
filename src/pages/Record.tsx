import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mic, MicOff, Pause, Play, Square, Flag, FileText, ChevronDown, User, X,
} from 'lucide-react'
import { speakers } from '../data/mock'
import type { Speaker } from '../types'

type RecordState = 'idle' | 'recording' | 'processing' | 'done'

interface LiveLine {
  id: string
  speaker: Speaker
  text: string
  timestamp: number
  detectedLanguage?: string
}

const processingStages = [
  'Audio captured',
  'Generating transcript',
  'Speaker diarization',
  'Extracting log entries',
  'Building summary',
]

const speakerChipColors = [
  { bg: 'rgba(47,133,90,0.09)',   color: 'var(--sage2)',   border: 'rgba(47,133,90,0.22)' },
  { bg: 'rgba(107,70,193,0.09)',  color: 'var(--violet2)', border: 'rgba(107,70,193,0.22)' },
  { bg: 'rgba(192,86,33,0.09)',   color: 'var(--clay2)',   border: 'rgba(192,86,33,0.22)' },
  { bg: 'rgba(151,90,22,0.09)',   color: 'var(--gold2)',   border: 'rgba(151,90,22,0.22)' },
  { bg: 'rgba(197,48,48,0.09)',   color: '#C53030',        border: 'rgba(197,48,48,0.22)' },
]

function confidenceClass(c: number) {
  if (c >= 85) return 't-sage'
  if (c >= 60) return 't-gold'
  return 't-clay'
}

function formatTimer(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`
}


function Waveform({ active }: { active: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 64 }}>
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          className={active ? 'wv-bar' : undefined}
          style={{
            display: 'block',
            width: 3,
            borderRadius: 3,
            background: active ? 'var(--sage2)' : 'var(--border2)',
            height: active ? undefined : 4,
            opacity: active ? 0.7 : 1,
            animationDelay: active ? `${(i % 5) * 0.09}s` : undefined,
            transformOrigin: 'center',
          }}
        />
      ))}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10.5,
  fontWeight: 600,
  color: 'var(--ink3)',
  textTransform: 'uppercase',
  letterSpacing: '0.85px',
  marginBottom: 8,
  fontFamily: 'var(--font-body)',
}

export function Record() {
  const navigate = useNavigate()
  const [state, setState] = useState<RecordState>('idle')
  const [timer, setTimer] = useState(0)
  const [title, setTitle] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<Speaker[]>([])
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({})
  const [liveLines, setLiveLines] = useState<LiveLine[]>([])
  const [processingStage, setProcessingStage] = useState(0)
  const [muted, setMuted] = useState(false)
  const [paused, setPaused] = useState(false)
  const transcriptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (state !== 'recording' || paused) return
    const id = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [state, paused])

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [liveLines])

  useEffect(() => {
    if (state !== 'processing') { setProcessingStage(0); return }
    let stage = 0
    const id = setInterval(() => {
      stage++
      setProcessingStage(stage)
      if (stage >= processingStages.length) {
        clearInterval(id)
        setTimeout(() => setState('done'), 700)
      }
    }, 1100)
    return () => clearInterval(id)
  }, [state])

  const unselectedSpeakers = speakers.filter(s => !selectedParticipants.find(p => p.id === s.id))

  // ─────────────────────────────────────────────
  // IDLE
  // ─────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

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
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>
            Live Record
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="tag t-violet" style={{ fontSize: 10.5, fontWeight: 500 }}>Gemini 3</span>
            <span className="tag t-slate" style={{ fontSize: 10.5, fontWeight: 500 }}>140 Languages</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }} className="fade-up">
          <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Meeting title */}
            <div>
              <label style={labelStyle}>Meeting Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Architecture Sync · Sprint Planning"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border2)',
                  borderRadius: 10,
                  fontSize: 13.5,
                  color: 'var(--ink)',
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.12s',
                  boxShadow: 'var(--shadow-sm)',
                  letterSpacing: '-0.01em',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--border3)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border2)')}
              />
            </div>

            {/* Participants */}
            <div>
              <label style={labelStyle}>Expected Participants</label>
              <div style={{
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '12px 14px',
                boxShadow: 'var(--shadow-sm)',
                minHeight: 52,
              }}>
                {selectedParticipants.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
                    {selectedParticipants.map((p, i) => {
                      const c = speakerChipColors[i % 5]
                      return (
                        <div
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '4px 8px 4px 9px',
                            borderRadius: 20,
                            background: c.bg,
                            border: `1px solid ${c.border}`,
                          }}
                        >
                          <span style={{ color: c.color, display: 'flex' }}><User size={11} strokeWidth={2} /></span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: c.color, fontFamily: 'var(--font-body)' }}>
                            {p.name}
                          </span>
                          <button
                            onClick={() => setSelectedParticipants(prev => prev.filter(x => x.id !== p.id))}
                            style={{ marginLeft: 2, display: 'flex', alignItems: 'center', cursor: 'pointer', background: 'none', border: 'none', padding: 1, color: 'var(--ink3)', lineHeight: 1 }}
                          >
                            <X size={10} strokeWidth={2.2} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                {unselectedSpeakers.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {unselectedSpeakers.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedParticipants(prev => [...prev, s])}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px', borderRadius: 20, fontSize: 12,
                          color: 'var(--ink3)', background: 'var(--bg4)',
                          border: '1px solid var(--border)', cursor: 'pointer',
                          fontFamily: 'var(--font-body)', transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--ink2)'; el.style.borderColor = 'var(--border2)' }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--ink3)'; el.style.borderColor = 'var(--border)' }}
                      >
                        <span style={{ fontSize: 13, lineHeight: 1 }}>+</span> {s.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: 'var(--ink3)', fontFamily: 'var(--font-body)', letterSpacing: '-0.01em' }}>
                    No speakers in dictionary — add them in Settings
                  </div>
                )}
              </div>
            </div>

            {/* Mic selector */}
            <div>
              <label style={labelStyle}>Microphone</label>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: 'var(--bg3)',
                border: '1px solid var(--border)', borderRadius: 10,
                cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ color: 'var(--ink3)', display: 'flex' }}><Mic size={15} strokeWidth={1.8} /></span>
                  <span style={{ fontSize: 13, color: 'var(--ink2)', fontFamily: 'var(--font-body)', letterSpacing: '-0.01em' }}>
                    Default Microphone
                  </span>
                </div>
                <span style={{ color: 'var(--ink3)', display: 'flex' }}><ChevronDown size={14} strokeWidth={2} /></span>
              </div>
            </div>

            {/* Start button */}
            <button
              onClick={() => { setState('recording'); setTimer(0); setLiveLines([]) }}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '13px 0', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
                cursor: 'pointer', background: 'var(--ink)', color: '#FFFFFF',
                border: 'none', fontFamily: 'var(--font-body)', letterSpacing: '0.1px',
                transition: 'opacity 0.14s', boxShadow: '0 2px 8px rgba(10,22,40,0.18)',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <span
                className="pulse-dot"
                style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', display: 'inline-block' }}
              />
              Start Recording
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // RECORDING
  // ─────────────────────────────────────────────
  if (state === 'recording') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

        {/* Recording top bar */}
        <div style={{
          height: 52,
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 14,
          background: 'var(--bg)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#E53E3E', display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#E53E3E', fontFamily: 'var(--font-body)', letterSpacing: '0.1px' }}>
              Recording
            </span>
          </div>

          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.6px', lineHeight: 1 }}>
            {formatTimer(timer)}
          </span>

          <span className="tag t-violet" style={{ fontSize: 10.5, fontWeight: 500 }}>Gemini 3 Active</span>
          <span className="tag t-sage" style={{ fontSize: 10.5, fontWeight: 500 }}>Live</span>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setMuted(m => !m)}
              title={muted ? 'Unmute' : 'Mute'}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                background: muted ? 'var(--bg4)' : 'transparent',
                color: muted ? 'var(--ink)' : 'var(--ink3)',
                border: `1px solid ${muted ? 'var(--border2)' : 'var(--border)'}`,
                fontFamily: 'var(--font-body)', transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (!muted) { (e.currentTarget as HTMLElement).style.background = 'var(--bg3)' } }}
              onMouseLeave={e => { if (!muted) { (e.currentTarget as HTMLElement).style.background = 'transparent' } }}
            >
              {muted ? <MicOff size={13} strokeWidth={2} /> : <Mic size={13} strokeWidth={2} />}
            </button>

            <button
              onClick={() => setPaused(p => !p)}
              title={paused ? 'Resume' : 'Pause'}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                background: paused ? 'var(--bg4)' : 'transparent',
                color: paused ? 'var(--ink)' : 'var(--ink3)',
                border: `1px solid ${paused ? 'var(--border2)' : 'var(--border)'}`,
                fontFamily: 'var(--font-body)', transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (!paused) { (e.currentTarget as HTMLElement).style.background = 'var(--bg3)' } }}
              onMouseLeave={e => { if (!paused) { (e.currentTarget as HTMLElement).style.background = 'transparent' } }}
            >
              {paused ? <Play size={13} strokeWidth={2} /> : <Pause size={13} strokeWidth={2} />}
            </button>

            <button
              title="Add marker"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                background: 'transparent', color: 'var(--ink3)',
                border: '1px solid var(--border)', fontFamily: 'var(--font-body)', transition: 'all 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; (e.currentTarget as HTMLElement).style.color = 'var(--ink2)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ink3)' }}
            >
              <Flag size={13} strokeWidth={2} />
            </button>

            <button
              title="Add note"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                background: 'transparent', color: 'var(--ink3)',
                border: '1px solid var(--border)', fontFamily: 'var(--font-body)', transition: 'all 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; (e.currentTarget as HTMLElement).style.color = 'var(--ink2)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ink3)' }}
            >
              <FileText size={13} strokeWidth={2} />
            </button>

            <button
              onClick={() => setState('processing')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                background: 'rgba(229,62,62,0.1)', color: '#E53E3E',
                border: '1px solid rgba(229,62,62,0.22)', fontFamily: 'var(--font-body)', transition: 'all 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(229,62,62,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(229,62,62,0.1)')}
            >
              <Square size={12} strokeWidth={2.5} fill="#E53E3E" />
              Stop
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Left panel */}
          <div style={{
            width: 240, flexShrink: 0,
            borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', background: 'var(--bg2)',
          }}>
            <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ ...labelStyle, marginBottom: 12 }}>Audio Input</div>
              <Waveform active={!muted && !paused} />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
              <div style={{ ...labelStyle, marginBottom: 12 }}>Speaker Mapping</div>
              {selectedParticipants.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedParticipants.map((sp, idx) => {
                    const conf = sp.confidence ?? 90
                    const cc = confidenceClass(conf)
                    return (
                      <div
                        key={sp.id}
                        style={{
                          display: 'flex', flexDirection: 'column', gap: 7,
                          padding: '10px 11px', background: 'var(--bg3)',
                          border: '1px solid var(--border)', borderRadius: 9, boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 10.5, color: 'var(--ink3)', fontFamily: 'var(--font-mono)' }}>
                            Speaker {idx + 1}
                          </span>
                          <span className={`tag ${cc}`} style={{ fontSize: 9.5, padding: '1px 6px' }}>
                            {conf}%
                          </span>
                        </div>
                        <input
                          value={speakerNames[sp.id] ?? sp.name}
                          onChange={e => setSpeakerNames(prev => ({ ...prev, [sp.id]: e.target.value }))}
                          style={{
                            width: '100%', padding: '5px 8px', fontSize: 12,
                            color: 'var(--ink)', background: 'var(--bg4)',
                            border: '1px solid var(--border)', borderRadius: 6,
                            outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box', transition: 'border-color 0.12s',
                          }}
                          onFocus={e => (e.target.style.borderColor = 'var(--border2)')}
                          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                        />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--ink3)', fontFamily: 'var(--font-body)', lineHeight: 1.5, letterSpacing: '-0.01em' }}>
                  Speakers will be detected automatically
                </div>
              )}
            </div>
          </div>

          {/* Live transcript */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
            <div style={{
              padding: '10px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, background: 'var(--bg)',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--sage2)', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)', fontFamily: 'var(--font-body)' }}>
                Live Transcript
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--font-mono)' }}>
                {liveLines.length} segments
              </span>
            </div>

            <div
              ref={transcriptRef}
              style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ink3)', gap: 10, paddingTop: 60 }}>
                <span style={{ color: 'var(--border2)', display: 'flex' }}><Mic size={28} strokeWidth={1.4} /></span>
                <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', letterSpacing: '-0.01em' }}>
                  {paused ? 'Recording paused' : muted ? 'Microphone muted' : 'Listening for speech…'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // PROCESSING
  // ─────────────────────────────────────────────
  if (state === 'processing') {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center', width: '100%', maxWidth: 420, padding: '0 24px' }} className="fade-up">
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--bg3)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div className="spinner" style={{ width: 22, height: 22 }} />
          </div>

          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', marginBottom: 6, letterSpacing: '-0.3px' }}>
            Processing your meeting
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 26, fontFamily: 'var(--font-body)' }}>
            {formatTimer(timer)} recorded · {selectedParticipants.length} participants
          </div>

          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            {processingStages.map((stage, i) => {
              const done = i < processingStage
              const active = i === processingStage
              return (
                <div
                  key={stage}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 18px',
                    borderBottom: i < processingStages.length - 1 ? '1px solid var(--border)' : undefined,
                    background: active ? 'var(--bg2)' : 'transparent',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? 'rgba(47,133,90,0.12)' : 'var(--bg4)',
                    border: `1px solid ${done ? 'rgba(47,133,90,0.3)' : 'var(--border)'}`,
                  }}>
                    {done ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.2 2.2L8 3" stroke="var(--sage2)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : active ? (
                      <div className="spinner" style={{ width: 10, height: 10 }} />
                    ) : null}
                  </div>
                  <span style={{ fontSize: 13, color: done ? 'var(--ink)' : active ? 'var(--ink2)' : 'var(--ink3)', fontFamily: 'var(--font-body)', flex: 1, textAlign: 'left' }}>
                    {stage}
                  </span>
                  {done && <span style={{ fontSize: 11, color: 'var(--sage2)', fontFamily: 'var(--font-body)', fontWeight: 500 }}>Done</span>}
                  {active && <span style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--font-body)' }}>Working…</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // DONE
  // ─────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }} className="fade-up">
      <div style={{ textAlign: 'center', width: '100%', maxWidth: 400, padding: '0 24px' }}>
        <div style={{
          width: 58, height: 58, borderRadius: '50%',
          background: 'rgba(47,133,90,0.1)', border: '1px solid rgba(47,133,90,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 22px',
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M5 11l4 4L17 7" stroke="var(--sage2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div style={{ fontFamily: 'var(--font-display)', fontSize: 23, color: 'var(--ink)', marginBottom: 6, letterSpacing: '-0.3px' }}>
          Meeting processed
        </div>

        <div style={{ fontSize: 13.5, color: 'var(--ink2)', marginBottom: 4, fontFamily: 'var(--font-body)' }}>
          {title || 'Untitled meeting'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 28 }}>
          {[
            { label: 'Duration',     value: formatTimer(timer) },
            { label: 'Participants', value: String(selectedParticipants.length) },
          ].map(stat => (
            <div key={stat.label} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '10px 18px', background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 8, boxShadow: 'var(--shadow-sm)',
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)', letterSpacing: '-0.3px' }}>
                {stat.value}
              </span>
              <span style={{ fontSize: 10.5, color: 'var(--ink3)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/reconcile')}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '13px 0', borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            background: 'var(--ink)', color: '#FFFFFF', border: 'none',
            fontFamily: 'var(--font-body)', marginBottom: 10, transition: 'opacity 0.14s',
            boxShadow: '0 2px 8px rgba(10,22,40,0.18)',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Open in Reconcile View
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7h8M8 4l3 3-3 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          onClick={() => { setState('idle'); setTimer(0); setLiveLines([]) }}
          style={{
            width: '100%', padding: '10px 0', fontSize: 13, color: 'var(--ink3)',
            cursor: 'pointer', background: 'none', border: 'none',
            fontFamily: 'var(--font-body)', transition: 'color 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink2)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink3)')}
        >
          Record another meeting
        </button>
      </div>
    </div>
  )
}
