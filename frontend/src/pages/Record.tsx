import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mic, MicOff, Pause, Play, Square, CheckCircle2, ChevronDown, AlertCircle,
} from 'lucide-react'
import { startLiveTranscription, type TranscriptLine, type LiveSession } from '../lib/deepgram'
import { analyzeTranscript } from '../lib/gemini'
import { saveMeeting } from '../lib/meetings'

type RecordState = 'idle' | 'recording' | 'processing' | 'error'

interface LiveLine {
  id: string
  speaker: string
  text: string
  isFinal: boolean
}

const STAGES = [
  { key: 'analyzing', label: 'Extracting insights with Gemini' },
  { key: 'saving',    label: 'Saving to database' },
]

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
            display: 'block', width: 3, borderRadius: 3,
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
  display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--ink3)',
  textTransform: 'uppercase', letterSpacing: '0.85px', marginBottom: 8, fontFamily: 'var(--font-body)',
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `${size > 16 ? 2.5 : 1.5}px solid var(--border2)`,
      borderTopColor: 'var(--ink3)', animation: 'spin 0.75s linear infinite', flexShrink: 0,
    }} />
  )
}

export function Record() {
  const navigate = useNavigate()
  const [state,       setState]       = useState<RecordState>('idle')
  const [timer,       setTimer]       = useState(0)
  const [title,       setTitle]       = useState('')
  const [liveLines,   setLiveLines]   = useState<LiveLine[]>([])
  const [activeStage, setActiveStage] = useState('')
  const [muted,       setMuted]       = useState(false)
  const [paused,      setPaused]      = useState(false)
  const [errorMsg,    setErrorMsg]    = useState('')
  const sessionRef    = useRef<LiveSession | null>(null)
  const finalLinesRef = useRef<TranscriptLine[]>([])
  const transcriptRef = useRef<HTMLDivElement>(null)
  const startTimeRef  = useRef<number>(0)

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

  const startRecording = useCallback(async () => {
    setErrorMsg('')
    try {
      const session = await startLiveTranscription({
        onInterim: (speaker, text) => {
          setLiveLines(prev => {
            const next = prev.filter(l => l.isFinal)
            return [...next, { id: 'interim', speaker, text, isFinal: false }]
          })
        },
        onFinal: (line) => {
          finalLinesRef.current.push(line)
          setLiveLines(prev => {
            const next = prev.filter(l => l.isFinal)
            return [...next, { id: `f-${prev.length}`, speaker: line.speaker, text: line.text, isFinal: true }]
          })
        },
        onError: (msg) => {
          setErrorMsg(msg)
          setState('error')
        },
      })
      sessionRef.current = session
      startTimeRef.current = Date.now()
      setState('recording')
      setTimer(0)
      setLiveLines([])
      finalLinesRef.current = []
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e))
      setState('error')
    }
  }, [])

  const stopRecording = useCallback(async () => {
    if (!sessionRef.current) return
    setState('processing')
    setPaused(false)

    try {
      const lines = await sessionRef.current.stop()
      sessionRef.current = null

      const allLines = lines.length > 0 ? lines : finalLinesRef.current
      const durationSeconds = (Date.now() - startTimeRef.current) / 1000

      setActiveStage('analyzing')
      const analysis = await analyzeTranscript(allLines)

      setActiveStage('saving')
      const speakerSet = [...new Set(allLines.map(l => l.speaker))]
      const meetingTitle = title.trim() || `Recording ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`

      const meetingId = await saveMeeting({
        title: meetingTitle,
        durationSeconds,
        summary: analysis.summary,
        language: allLines[0]?.language ?? 'en',
        participantCount: speakerSet.length,
        segments: allLines.map((l, i) => ({
          speaker_label: l.speaker,
          speaker_name:  null,
          text:          l.text,
          timestamp_seconds: l.start,
          detected_language: l.language,
          seq_order:     i,
        })),
        logs: analysis.logs,
      })

      navigate(`/meetings/${meetingId}`)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e))
      setState('error')
    }
  }, [title, navigate])

  // ── Idle / Error ────────────────────────────────────────
  if (state === 'idle' || state === 'error') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
        <div style={{
          height: 52, borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12,
          background: 'var(--bg)', flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>
            Live Record
          </span>
          <span className="tag t-violet" style={{ fontSize: 10.5, fontWeight: 500 }}>Deepgram nova-2</span>
          <span className="tag t-slate"  style={{ fontSize: 10.5, fontWeight: 500 }}>140 Languages</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }} className="fade-up">
          <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>

            {state === 'error' && (
              <div style={{
                padding: '11px 15px', borderRadius: 9,
                background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <AlertCircle size={14} color="#e05252" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12.5, color: '#e05252', letterSpacing: '-0.01em', lineHeight: 1.5 }}>{errorMsg}</div>
              </div>
            )}

            <div>
              <label style={labelStyle}>Meeting Title <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Architecture Sync · Sprint Planning"
                style={{
                  width: '100%', padding: '11px 14px',
                  background: 'var(--bg3)', border: '1px solid var(--border2)',
                  borderRadius: 10, fontSize: 13.5, color: 'var(--ink)', outline: 'none',
                  fontFamily: 'var(--font-body)', boxSizing: 'border-box',
                  transition: 'border-color 0.12s', boxShadow: 'var(--shadow-sm)', letterSpacing: '-0.01em',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--border3)')}
                onBlur={e =>  (e.target.style.borderColor = 'var(--border2)')}
              />
            </div>

            <div>
              <label style={labelStyle}>Microphone</label>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: 'var(--bg3)',
                border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-sm)',
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

            <button
              onClick={startRecording}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '13px 0', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
                cursor: 'pointer', background: 'var(--ink)', color: '#FFFFFF',
                border: 'none', fontFamily: 'var(--font-body)', letterSpacing: '0.1px',
                transition: 'opacity 0.14s', boxShadow: '0 2px 8px rgba(10,22,40,0.18)',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />
              Start Recording
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Recording ───────────────────────────────────────────
  if (state === 'recording') {
    const detectedSpeakers = [...new Set(liveLines.filter(l => l.isFinal).map(l => l.speaker))]

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

        {/* Recording top bar */}
        <div style={{
          height: 52, borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14,
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
            >
              {paused ? <Play size={13} strokeWidth={2} /> : <Pause size={13} strokeWidth={2} />}
            </button>

            <button
              onClick={stopRecording}
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
            width: 220, flexShrink: 0, borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg2)',
          }}>
            <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ ...labelStyle, marginBottom: 12 }}>Audio Input</div>
              <Waveform active={!muted && !paused} />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
              <div style={{ ...labelStyle, marginBottom: 10 }}>Detected Speakers</div>
              {detectedSpeakers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {detectedSpeakers.map(sp => (
                    <div key={sp} style={{
                      padding: '7px 10px', background: 'var(--bg3)',
                      border: '1px solid var(--border)', borderRadius: 8,
                      fontSize: 12, color: 'var(--ink2)', fontFamily: 'var(--font-body)',
                    }}>
                      {sp}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.5, letterSpacing: '-0.01em' }}>
                  Speakers detected automatically
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
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)', fontFamily: 'var(--font-body)' }}>Live Transcript</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--font-mono)' }}>
                {liveLines.filter(l => l.isFinal).length} segments
              </span>
            </div>

            <div
              ref={transcriptRef}
              style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              {liveLines.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ink3)', gap: 10, paddingTop: 60 }}>
                  <span style={{ color: 'var(--border2)', display: 'flex' }}><Mic size={28} strokeWidth={1.4} /></span>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', letterSpacing: '-0.01em' }}>
                    {paused ? 'Recording paused' : muted ? 'Microphone muted' : 'Listening for speech…'}
                  </span>
                </div>
              ) : (
                liveLines.map((line, i) => (
                  <div key={line.id + i} style={{ display: 'flex', flexDirection: 'column', gap: 3, opacity: line.isFinal ? 1 : 0.6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', fontFamily: 'var(--font-mono)' }}>
                      {line.speaker}
                    </span>
                    <p style={{ fontSize: 13, lineHeight: 1.6, color: line.isFinal ? 'var(--ink)' : 'var(--ink2)', margin: 0 }}>
                      {line.text}
                      {!line.isFinal && <span style={{ animation: 'pulse 1s ease-in-out infinite', display: 'inline-block', marginLeft: 2 }}>▋</span>}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Processing ──────────────────────────────────────────
  const activeIdx = STAGES.findIndex(s => s.key === activeStage)

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', width: '100%', maxWidth: 380, padding: '0 24px' }} className="fade-up">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <Spinner size={32} />
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)', marginBottom: 6, letterSpacing: '-0.3px' }}>
          Processing your meeting
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 26, fontFamily: 'var(--font-body)' }}>
          {formatTimer(timer)} recorded
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {STAGES.map((s, i) => {
            const done   = i < activeIdx
            const active = i === activeIdx
            return (
              <div key={s.key} style={{
                display: 'flex', alignItems: 'center', gap: 11, padding: '10px 15px', borderRadius: 9,
                background: active ? 'var(--bg3)' : 'transparent',
                border: active ? '1px solid var(--border)' : '1px solid transparent',
              }}>
                {done
                  ? <CheckCircle2 size={14} color="var(--sage2)" strokeWidth={2.2} />
                  : active
                    ? <Spinner size={14} />
                    : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid var(--border2)', flexShrink: 0 }} />
                }
                <span style={{
                  fontSize: 13, letterSpacing: '-0.01em',
                  color: active ? 'var(--ink)' : done ? 'var(--ink2)' : 'var(--ink3)',
                  fontWeight: active ? 500 : 400, opacity: !done && !active ? 0.45 : 1,
                }}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
