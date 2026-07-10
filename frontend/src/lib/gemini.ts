export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`

export function geminiConfigured() {
  return Boolean(GEMINI_API_KEY)
}

async function callGemini(prompt: string, temperature = 0.2): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('VITE_GEMINI_API_KEY is not set.')

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature },
    }),
  })

  if (!res.ok) throw new Error(`Gemini request failed (${res.status})`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// ── Meeting analysis ──────────────────────────────────────

export interface GeminiLog {
  type: 'action' | 'decision' | 'architecture' | 'risk' | 'culture'
  title: string
  body: string
  owner: string | null
  due_date: string | null
  priority: 'high' | 'medium' | 'low'
}

export interface GeminiAnalysis {
  summary: string
  logs: GeminiLog[]
}

export async function analyzeTranscript(
  lines: { speaker: string; text: string }[]
): Promise<GeminiAnalysis> {
  const transcript = lines.map(l => `${l.speaker}: ${l.text}`).join('\n').slice(0, 16000)

  const prompt = `Analyze this meeting transcript and return ONLY valid JSON (no markdown, no code fences):

{
  "summary": "2-3 concise sentences covering what was discussed and decided",
  "logs": [
    {
      "type": "action|decision|architecture|risk|culture",
      "title": "short actionable title (max 10 words)",
      "body": "full detail of the item",
      "owner": "person name or null",
      "due_date": "YYYY-MM-DD or null",
      "priority": "high|medium|low"
    }
  ]
}

Log type definitions:
- action: tasks, commitments, next steps assigned to someone
- decision: choices made or agreed upon during the meeting
- architecture: technical design, infrastructure, or system decisions
- risk: blockers, concerns, risks, or issues raised
- culture: team dynamics, morale, process feedback, praise

Transcript:
${transcript}`

  const raw = await callGemini(prompt, 0.15)

  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON found')
    const parsed = JSON.parse(match[0]) as GeminiAnalysis
    return {
      summary: parsed.summary ?? '',
      logs: (parsed.logs ?? []).filter(l =>
        ['action', 'decision', 'architecture', 'risk', 'culture'].includes(l.type)
      ),
    }
  } catch {
    return { summary: raw.slice(0, 500), logs: [] }
  }
}

// ── Query across meetings ─────────────────────────────────

export async function askAboutMeetings(
  question: string,
  meetingSummaries: { title: string; date: string; summary: string | null }[],
  logs: { type: string; title: string; body: string; owner: string | null; meetings: { title: string; date: string } | null }[]
): Promise<string> {
  const meetingCtx = meetingSummaries
    .map(m => `• ${m.title} (${new Date(m.date).toLocaleDateString()})${m.summary ? ': ' + m.summary : ''}`)
    .join('\n')

  const logCtx = logs
    .map(l => `[${l.type.toUpperCase()}] ${l.title} — ${l.body}${l.owner ? ' (Owner: ' + l.owner + ')' : ''}${l.meetings ? ' · Meeting: ' + l.meetings.title : ''}`)
    .join('\n')

  const prompt = `You are an AI assistant for a meeting intelligence tool called Roo. Answer the user's question based on the meeting data below. Be specific, cite meetings and log entries by name. If the data doesn't contain enough information, say so.

MEETINGS (${meetingSummaries.length}):
${meetingCtx || '(none yet)'}

LOG ENTRIES (${logs.length}):
${logCtx || '(none yet)'}

QUESTION: ${question}

Answer:`

  return callGemini(prompt, 0.4)
}
