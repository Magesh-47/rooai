const DEEPGRAM_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY as string | undefined

export function deepgramConfigured() {
  return Boolean(DEEPGRAM_KEY)
}

// ── Shared types ──────────────────────────────────────────

export interface TranscriptLine {
  speaker: string    // "Speaker 1", "Speaker 2", ...
  text: string
  start: number      // seconds
  language: string
}

interface DGWord {
  word: string
  punctuated_word?: string
  start: number
  speaker?: number
}

// ── Group DG word array into speaker-turn lines ───────────

export function groupWords(words: DGWord[], lang = 'en'): TranscriptLine[] {
  const lines: TranscriptLine[] = []
  let cur: { speaker: number; words: string[]; start: number } | null = null

  for (const w of words) {
    const sp = w.speaker ?? 0
    if (!cur || cur.speaker !== sp) {
      if (cur) lines.push({ speaker: `Speaker ${cur.speaker + 1}`, text: cur.words.join(' '), start: cur.start, language: lang })
      cur = { speaker: sp, words: [w.punctuated_word ?? w.word], start: w.start }
    } else {
      cur.words.push(w.punctuated_word ?? w.word)
    }
  }
  if (cur) lines.push({ speaker: `Speaker ${cur.speaker + 1}`, text: cur.words.join(' '), start: cur.start, language: lang })
  return lines
}

// ── File transcription (Upload flow) ─────────────────────

export function transcribeFile(file: File): Promise<{ lines: TranscriptLine[]; duration: number; language: string }> {
  if (!DEEPGRAM_KEY) return Promise.reject(new Error('VITE_DEEPGRAM_API_KEY is not set.'))

  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      model:           'nova-2',
      diarize:         'true',
      punctuate:       'true',
      smart_format:    'true',
      detect_language: 'true',
      interim_results: 'false',
    })

    const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, ['token', DEEPGRAM_KEY!])
    const allWords: DGWord[] = []
    let metaDuration = 0
    let detectedLang = 'en'

    ws.onopen = async () => {
      try {
        const buf = await file.arrayBuffer()
        const CHUNK = 65536
        for (let i = 0; i < buf.byteLength; i += CHUNK) {
          if (ws.readyState === WebSocket.OPEN) ws.send(buf.slice(i, i + CHUNK))
        }
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'CloseStream' }))
      } catch (e) { reject(e) }
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string)
        if (msg.type === 'Metadata') {
          metaDuration = msg.duration ?? 0
        }
        if (msg.type === 'Results' && msg.is_final) {
          const alt = msg.channel?.alternatives?.[0]
          const words: DGWord[] = alt?.words ?? []
          if (alt?.detected_language) detectedLang = alt.detected_language
          allWords.push(...words)
        }
      } catch { /* ignore */ }
    }

    ws.onerror = () => reject(new Error('Deepgram WebSocket error — check your API key.'))

    ws.onclose = (ev) => {
      if (ev.code === 1006) { reject(new Error('Deepgram connection closed abnormally. Verify your API key.')); return }
      const last = allWords[allWords.length - 1]
      const duration = metaDuration || (last ? last.start + 1 : 0)
      resolve({ lines: groupWords(allWords, detectedLang), duration, language: detectedLang })
    }
  })
}

// ── Live transcription (Record flow) ─────────────────────

export interface LiveTranscriptionHandlers {
  onInterim: (speaker: string, text: string) => void
  onFinal:   (line: TranscriptLine) => void
  onError:   (msg: string) => void
}

export interface LiveSession {
  stop: () => Promise<TranscriptLine[]>
}

export async function startLiveTranscription(handlers: LiveTranscriptionHandlers): Promise<LiveSession> {
  if (!DEEPGRAM_KEY) throw new Error('VITE_DEEPGRAM_API_KEY is not set.')

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })

  const params = new URLSearchParams({
    model:           'nova-2',
    diarize:         'true',
    punctuate:       'true',
    smart_format:    'true',
    detect_language: 'true',
    interim_results: 'true',
    endpointing:     '300',
  })

  const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, ['token', DEEPGRAM_KEY!])
  const finalLines: TranscriptLine[] = []
  let detectedLang = 'en'

  ws.onerror = () => handlers.onError('Deepgram WebSocket error — check your API key.')

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data as string)
      if (msg.type !== 'Results') return

      const alt = msg.channel?.alternatives?.[0]
      if (!alt) return
      if (alt.detected_language) detectedLang = alt.detected_language

      const words: DGWord[] = alt.words ?? []
      const text: string = alt.transcript ?? ''
      if (!text.trim()) return

      if (msg.is_final) {
        const lines = groupWords(words, detectedLang)
        lines.forEach(l => { finalLines.push(l); handlers.onFinal(l) })
      } else {
        const sp = words[0]?.speaker ?? 0
        handlers.onInterim(`Speaker ${sp + 1}`, text)
      }
    } catch { /* ignore */ }
  }

  await new Promise<void>((res, rej) => {
    ws.onopen = () => res()
    setTimeout(() => rej(new Error('Deepgram connection timed out')), 8000)
  })

  const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
  recorder.ondataavailable = (e) => {
    if (ws.readyState === WebSocket.OPEN && e.data.size > 0) ws.send(e.data)
  }
  recorder.start(500)

  async function stop(): Promise<TranscriptLine[]> {
    return new Promise((resolve) => {
      recorder.stop()
      stream.getTracks().forEach(t => t.stop())

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'CloseStream' }))
        ws.onclose = () => resolve(finalLines)
        setTimeout(() => resolve(finalLines), 4000) // fallback
      } else {
        resolve(finalLines)
      }
    })
  }

  return { stop }
}
