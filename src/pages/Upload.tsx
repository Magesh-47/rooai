import { useState, useRef, useCallback } from 'react'
import {
  Upload as UploadIcon, Send, RotateCcw,
  CheckCircle2, AlertCircle, FileAudio, FileVideo,
} from 'lucide-react'

// ── Env ───────────────────────────────────────────────────────────────────────

const DEEPGRAM_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY as string | undefined
const GEMINI_KEY   = import.meta.env.VITE_GEMINI_API_KEY   as string | undefined

// ── Types ─────────────────────────────────────────────────────────────────────

interface TranscriptLine {
  speaker: string
  text: string
  start: number
}

interface MeetingResult {
  fileName: string
  fileType: 'audio' | 'video'
  duration: number
  transcript: TranscriptLine[]
  summary: string
  actionItems: string[]
  decisions: string[]
}

interface ChatMsg {
  role: 'user' | 'assistant'
  text: string
}

type Phase = 'idle' | 'transcribing' | 'analyzing' | 'done' | 'error'
type Tab   = 'summary' | 'notes' | 'chat'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}


const SPEAKER_COLORS = ['var(--ink)', 'var(--violet2)', 'var(--sage2)', 'var(--gold2)', 'var(--rose2)']

// ── API ───────────────────────────────────────────────────────────────────────

type DGWord = { word: string; punctuated_word?: string; start: number; speaker?: number }

function groupWords(allWords: DGWord[]): TranscriptLine[] {
  const lines: TranscriptLine[] = []
  let cur: { speaker: number; words: string[]; start: number } | null = null
  for (const w of allWords) {
    const sp = w.speaker ?? 0
    if (!cur || cur.speaker !== sp) {
      if (cur) lines.push({ speaker: `Speaker ${cur.speaker + 1}`, text: cur.words.join(' '), start: cur.start })
      cur = { speaker: sp, words: [w.punctuated_word ?? w.word], start: w.start }
    } else {
      cur.words.push(w.punctuated_word ?? w.word)
    }
  }
  if (cur) lines.push({ speaker: `Speaker ${cur.speaker + 1}`, text: cur.words.join(' '), start: cur.start })
  return lines
}

async function transcribeWithDeeepgram(file: File): Promise<{ lines: TranscriptLine[]; duration: number }> {
  if (!DEEPGRAM_KEY) throw new Error('VITE_DEEPGRAM_API_KEY is not set. Add it to your .env file.')

  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      model:           'nova-2',
      diarize:         'true',
      punctuate:       'true',
      smart_format:    'true',
      interim_results: 'false',
    })

    // Deepgram browser auth via subprotocol (their SDK convention)
    const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, ['token', DEEPGRAM_KEY!])

    const allWords: DGWord[] = []
    let metaDuration = 0

    ws.onopen = async () => {
      try {
        const buffer = await file.arrayBuffer()
        const CHUNK  = 65536 // 64 KB chunks — keeps the connection alive
        for (let i = 0; i < buffer.byteLength; i += CHUNK) {
          if (ws.readyState === WebSocket.OPEN) ws.send(buffer.slice(i, i + CHUNK))
        }
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'CloseStream' }))
      } catch (e) {
        reject(e)
      }
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string)
        if (msg.type === 'Metadata')              metaDuration = msg.duration ?? 0
        if (msg.type === 'Results' && msg.is_final) {
          const words: DGWord[] = msg.channel?.alternatives?.[0]?.words ?? []
          allWords.push(...words)
        }
      } catch { /* ignore non-JSON pings */ }
    }

    ws.onerror = () => reject(new Error('Deepgram WebSocket failed — check your API key.'))

    ws.onclose = (ev) => {
      // code 1006 = abnormal closure (e.g. auth failure)
      if (ev.code === 1006) {
        reject(new Error('Deepgram connection closed abnormally. Verify your API key.'))
        return
      }
      const lastWord = allWords[allWords.length - 1]
      const duration = metaDuration || (lastWord ? lastWord.start + 1 : 0)
      resolve({ lines: groupWords(allWords), duration })
    }
  })
}

async function analyzeWithGemini(
  transcript: TranscriptLine[]
): Promise<{ summary: string; actionItems: string[]; decisions: string[] }> {
  if (!GEMINI_KEY) return { summary: '', actionItems: [], decisions: [] }

  const text   = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n').slice(0, 14000)
  const prompt = `Analyze this meeting transcript. Return ONLY valid JSON, no markdown:
{"summary":"2-3 concise sentences","actionItems":["..."],"decisions":["..."]}

Transcript:
${text}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini analysis failed (${res.status})`)

  const data = await res.json()
  const raw: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : { summary: raw, actionItems: [], decisions: [] }
  } catch {
    return { summary: raw, actionItems: [], decisions: [] }
  }
}

async function askGemini(
  transcript: TranscriptLine[],
  history: ChatMsg[],
  question: string
): Promise<string> {
  if (!GEMINI_KEY) return 'AI assistant requires VITE_GEMINI_API_KEY — add it to your .env file.'

  const ctx  = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n').slice(0, 10000)
  const hist = history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n')

  const prompt = `You help users understand a meeting. Answer concisely and specifically.

Transcript:
${ctx}
${hist ? `\nPrior conversation:\n${hist}` : ''}

User: ${question}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5 },
      }),
    }
  )
  if (!res.ok) return `Request failed (${res.status}). Please try again.`
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response generated.'
}

// ── Spinner div (reuses @keyframes spin from index.css) ───────────────────────

function Spinner({ size = 28 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `${size > 20 ? 2.5 : 1.5}px solid var(--border2)`,
      borderTopColor: 'var(--ink3)',
      animation: 'spin 0.75s linear infinite',
      flexShrink: 0,
    }} />
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function Upload() {
  const [phase,       setPhase]       = useState<Phase>('idle')
  const [stageLabel,  setStageLabel]  = useState('')
  const [result,      setResult]      = useState<MeetingResult | null>(null)
  const [errorMsg,    setErrorMsg]    = useState('')
  const [dragging,    setDragging]    = useState(false)
  const [tab,         setTab]         = useState<Tab>('summary')
  const [chatMsgs,    setChatMsgs]    = useState<ChatMsg[]>([])
  const [chatInput,   setChatInput]   = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const inputRef  = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  async function processFile(file: File) {
    setPhase('transcribing')
    setStageLabel('Transcribing audio with Deepgram…')
    setErrorMsg('')
    setResult(null)
    setChatMsgs([])

    try {
      const { lines, duration } = await transcribeWithDeeepgram(file)

      setPhase('analyzing')
      setStageLabel('Extracting insights with AI…')

      const analysis = await analyzeWithGemini(lines)

      setResult({
        fileName: file.name,
        fileType: file.type.startsWith('video') ? 'video' : 'audio',
        duration,
        transcript: lines,
        ...analysis,
      })
      setPhase('done')
      setTab('summary')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e))
      setPhase('error')
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }, [])

  async function sendChat() {
    if (!chatInput.trim() || !result || chatLoading) return
    const q = chatInput.trim()
    setChatInput('')
    const next: ChatMsg[] = [...chatMsgs, { role: 'user', text: q }]
    setChatMsgs(next)
    setChatLoading(true)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    const answer = await askGemini(result.transcript, chatMsgs, q)
    setChatMsgs([...next, { role: 'assistant', text: answer }])
    setChatLoading(false)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  // ── Phase: idle / error ───────────────────────────────────────────────────

  if (phase === 'idle' || phase === 'error') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', letterSpacing: '-0.01em' }}>

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

  // ── Phase: processing ─────────────────────────────────────────────────────

  if (phase === 'transcribing' || phase === 'analyzing') {
    const STAGES = [
      'Transcribing audio with Deepgram…',
      'Extracting insights with AI…',
    ]
    const activeIdx = STAGES.indexOf(stageLabel)

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', letterSpacing: '-0.01em' }}>
        <div style={{ height: 52, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px', background: 'var(--bg)', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Upload & Process</div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="fade-up">
          <div style={{ textAlign: 'center', maxWidth: 360, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <Spinner size={32} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 22 }}>
              Processing your meeting
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STAGES.map((s, i) => {
                const done   = i < activeIdx
                const active = i === activeIdx
                return (
                  <div
                    key={s}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 11,
                      padding: '10px 15px', borderRadius: 9,
                      background: active ? 'var(--bg3)' : 'transparent',
                      border: active ? '1px solid var(--border)' : '1px solid transparent',
                    }}
                  >
                    {done
                      ? <CheckCircle2 size={14} color="var(--sage2)" strokeWidth={2.2} />
                      : active
                        ? <Spinner size={14} />
                        : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid var(--border2)', flexShrink: 0 }} />
                    }
                    <span style={{
                      fontSize: 13, letterSpacing: '-0.01em',
                      color: active ? 'var(--ink)' : 'var(--ink3)',
                      fontWeight: active ? 500 : 400,
                      opacity: !done && !active ? 0.4 : 1,
                    }}>
                      {s.replace('…', '')}
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

  // ── Phase: done ───────────────────────────────────────────────────────────

  const r          = result!
  const speakerSet = [...new Set(r.transcript.map(t => t.speaker))]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', letterSpacing: '-0.01em' }}>

      {/* Topbar */}
      <div style={{ height: 52, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, background: 'var(--bg)', flexShrink: 0 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--ink3)', flexShrink: 0 }}>
          {r.fileType === 'video'
            ? <FileVideo size={14} strokeWidth={1.6} />
            : <FileAudio size={14} strokeWidth={1.6} />
          }
        </span>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r.fileName}
        </span>
        {r.duration > 0 && (
          <span style={{ fontSize: 12, color: 'var(--ink3)', letterSpacing: '-0.01em', flexShrink: 0 }}>
            {fmtTime(r.duration)}
          </span>
        )}
        {speakerSet.length > 0 && (
          <span className="tag t-slate" style={{ flexShrink: 0 }}>
            {speakerSet.length} speaker{speakerSet.length !== 1 ? 's' : ''}
          </span>
        )}
        <button
          onClick={() => { setPhase('idle'); setResult(null); setChatMsgs([]) }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', background: 'transparent', color: 'var(--ink2)', border: '1px solid var(--border)', fontFamily: 'var(--font-body)', letterSpacing: '-0.01em', flexShrink: 0, transition: 'border-color 0.1s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <RotateCcw size={12} strokeWidth={2} />
          New upload
        </button>
      </div>

      {/* Two-column body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left — Transcript */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 14 }}>
            Transcript
          </div>

          {r.transcript.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ink3)', textAlign: 'center', marginTop: 48 }}>No speech detected in this file.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {r.transcript.map((line, i) => {
                const colorIdx = speakerSet.indexOf(line.speaker)
                return (
                  <div
                    key={i}
                    style={{ padding: '9px 13px', borderRadius: 9, transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: SPEAKER_COLORS[colorIdx % SPEAKER_COLORS.length], letterSpacing: '-0.01em' }}>
                        {line.speaker}
                      </span>
                      <span style={{ fontSize: 10.5, color: 'var(--ink3)', fontFamily: 'var(--font-mono)' }}>
                        {fmtTime(line.start)}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.65, letterSpacing: '-0.01em' }}>
                      {line.text}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right — Tabs */}
        <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px', gap: 2, flexShrink: 0 }}>
            {([
              { key: 'summary' as Tab, label: 'Summary' },
              { key: 'notes'   as Tab, label: 'Notes'   },
              { key: 'chat'    as Tab, label: 'AI Chat' },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '13px 10px 11px',
                  fontSize: 12.5, fontWeight: tab === t.key ? 600 : 400,
                  color: tab === t.key ? 'var(--ink)' : 'var(--ink3)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', letterSpacing: '-0.01em',
                  borderBottom: tab === t.key ? '2px solid var(--ink)' : '2px solid transparent',
                  transition: 'all 0.1s', marginBottom: -1,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Summary */}
          {tab === 'summary' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px' }} className="fade-up">
              {r.summary ? (
                <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.75, letterSpacing: '-0.01em' }}>
                  {r.summary}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--ink3)' }}>
                  {GEMINI_KEY ? 'No summary generated.' : 'Add VITE_GEMINI_API_KEY to enable AI summaries.'}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {tab === 'notes' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px' }} className="fade-up">
              {r.actionItems.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 10 }}>Action Items</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 22 }}>
                    {r.actionItems.map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ink3)', marginTop: 8, flexShrink: 0 }} />
                        <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, letterSpacing: '-0.01em' }}>{item}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {r.decisions.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 10 }}>Decisions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {r.decisions.map((d, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--sage2)', marginTop: 8, flexShrink: 0 }} />
                        <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, letterSpacing: '-0.01em' }}>{d}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {r.actionItems.length === 0 && r.decisions.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--ink3)' }}>
                  {GEMINI_KEY ? 'No action items or decisions detected.' : 'Add VITE_GEMINI_API_KEY to enable notes extraction.'}
                </div>
              )}
            </div>
          )}

          {/* Chat */}
          {tab === 'chat' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }} className="fade-up">
                {chatMsgs.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--ink3)', fontSize: 12.5, marginTop: 24, letterSpacing: '-0.01em', lineHeight: 1.6 }}>
                    Ask anything about this meeting
                  </div>
                )}
                {chatMsgs.map((m, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                    <div style={{
                      maxWidth: '84%', padding: '9px 13px',
                      borderRadius: m.role === 'user' ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
                      background: m.role === 'user' ? 'var(--ink)' : 'var(--bg3)',
                      border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                      fontSize: 12.5, color: m.role === 'user' ? '#fff' : 'var(--ink)',
                      lineHeight: 1.65, letterSpacing: '-0.01em',
                    }}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: 'flex' }}>
                    <div style={{ padding: '9px 14px', borderRadius: '10px 10px 10px 3px', background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Spinner size={12} />
                      <span style={{ fontSize: 12, color: 'var(--ink3)', letterSpacing: '-0.01em' }}>Thinking…</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                <textarea
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                  placeholder="Ask about this meeting…"
                  rows={2}
                  style={{
                    flex: 1, padding: '9px 11px', borderRadius: 9,
                    border: '1px solid var(--border)', background: 'var(--bg)',
                    fontSize: 12.5, color: 'var(--ink)', fontFamily: 'var(--font-body)',
                    letterSpacing: '-0.01em', outline: 'none', resize: 'none', lineHeight: 1.5,
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--border2)')}
                  onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
                />
                <button
                  onClick={sendChat}
                  disabled={!chatInput.trim() || chatLoading}
                  style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: chatInput.trim() && !chatLoading ? 'var(--ink)' : 'var(--bg4)',
                    border: 'none', cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'default',
                    transition: 'background 0.12s',
                  }}
                >
                  <Send size={14} color={chatInput.trim() && !chatLoading ? '#fff' : 'var(--ink3)'} strokeWidth={1.8} />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

