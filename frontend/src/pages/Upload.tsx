import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload as UploadIcon, RotateCcw,
  CheckCircle2, AlertCircle, FileAudio, FileVideo,
} from 'lucide-react'
import { transcribeFile }    from '../lib/deepgram'
import { analyzeTranscript } from '../lib/gemini'
import { saveMeeting }        from '../lib/meetings'

type Phase = 'idle' | 'transcribing' | 'analyzing' | 'saving' | 'error'

const STAGES = [
  { key: 'transcribing', label: 'Transcribing with Deepgram' },
  { key: 'analyzing',    label: 'Extracting insights with Gemini' },
  { key: 'saving',       label: 'Saving to database' },
]

function Spinner({ size = 28 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `${size > 20 ? 2.5 : 1.5}px solid var(--border2)`,
      borderTopColor: 'var(--ink3)',
      animation: 'spin 0.75s linear infinite', flexShrink: 0,
    }} />
  )
}

export function Upload() {
  const navigate    = useNavigate()
  const [phase,     setPhase]     = useState<Phase>('idle')
  const [activeStage, setStage]   = useState('')
  const [errorMsg,  setErrorMsg]  = useState('')
  const [dragging,  setDragging]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function processFile(file: File) {
    setPhase('transcribing')
    setStage('transcribing')
    setErrorMsg('')

    try {
      // 1. Deepgram transcription
      const { lines, duration, language } = await transcribeFile(file)

      // 2. Gemini analysis
      setPhase('analyzing')
      setStage('analyzing')
      const analysis = await analyzeTranscript(lines)

      // 3. Save to Supabase
      setPhase('saving')
      setStage('saving')

      const speakerSet = [...new Set(lines.map(l => l.speaker))]
      const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')

      const meetingId = await saveMeeting({
        title,
        durationSeconds: duration,
        summary:         analysis.summary,
        language,
        participantCount: speakerSet.length,
        segments: lines.map((l, i) => ({
          speaker_label:    l.speaker,
          speaker_name:     null,
          text:             l.text,
          timestamp_seconds: l.start,
          detected_language: l.language,
          seq_order:        i,
        })),
        logs: analysis.logs,
      })

      navigate(`/meetings/${meetingId}`)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e))
      setPhase('error')
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }, [])

  // ── Idle / Error ─────────────────────────────────────────

  if (phase === 'idle' || phase === 'error') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ height: 52, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px', background: 'var(--bg)', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Upload & Process</div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} className="fade-up">
          <div style={{ width: '100%', maxWidth: 500 }}>

            {phase === 'error' && (
              <div style={{ marginBottom: 16, padding: '11px 15px', borderRadius: 9, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertCircle size={14} color="#e05252" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12.5, color: '#e05252', letterSpacing: '-0.01em', lineHeight: 1.5 }}>{errorMsg}</div>
              </div>
            )}

            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              style={{
                borderRadius: 14,
                border: `2px dashed ${dragging ? 'var(--border2)' : 'var(--border)'}`,
                background: dragging ? 'var(--bg2)' : 'var(--bg3)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '56px 28px', cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <input ref={inputRef} type="file" accept="audio/*,video/*" style={{ display: 'none' }} onChange={handleFileInput} />

              <div style={{ width: 52, height: 52, borderRadius: 13, background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <UploadIcon size={22} color="var(--ink3)" strokeWidth={1.6} />
              </div>

              <div style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 6, letterSpacing: '-0.02em' }}>
                {dragging ? 'Release to process' : 'Drop your recording'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 20, letterSpacing: '-0.01em' }}>
                or click to browse · up to 250 MB
              </div>

              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['MP3', 'MP4', 'WAV', 'M4A', 'WebM', 'OGG'].map(f => (
                  <span key={f} style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 5, background: 'var(--bg4)', color: 'var(--ink3)', border: '1px solid var(--border)', letterSpacing: '0.01em', fontFamily: 'var(--font-mono)' }}>{f}</span>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    )
  }

  // ── Processing ────────────────────────────────────────────

  const activeIdx = STAGES.findIndex(s => s.key === activeStage)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 52, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px', background: 'var(--bg)', flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Upload & Process</div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="fade-up">
        <div style={{ textAlign: 'center', maxWidth: 360, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <Spinner size={32} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 22 }}>
            Processing your meeting…
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {STAGES.map((s, i) => {
              const done   = i < activeIdx
              const active = i === activeIdx
              return (
                <div key={s.key} style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '10px 15px', borderRadius: 9,
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
                    fontWeight: active ? 500 : 400,
                    opacity: !done && !active ? 0.45 : 1,
                  }}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// keep FileAudio / FileVideo / RotateCcw in scope to avoid unused-import warnings
void FileAudio; void FileVideo; void RotateCcw
