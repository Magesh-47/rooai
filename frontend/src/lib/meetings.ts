import { supabase } from './supabase'

// ── DB row shapes ─────────────────────────────────────────

export interface DBMeeting {
  id: string
  title: string
  date: string
  duration: number          // minutes
  status: 'processing' | 'ready' | 'live'
  summary: string | null
  language: string | null
  participant_count: number
  created_by: string | null
  created_at: string
  updated_at: string
  log_count?: number
  segment_count?: number
}

export interface DBSegment {
  id: string
  meeting_id: string
  speaker_label: string
  speaker_name: string | null
  text: string
  timestamp_seconds: number
  detected_language: string | null
  seq_order: number
}

export interface DBLog {
  id: string
  meeting_id: string
  meeting_title: string
  type: 'action' | 'decision' | 'architecture' | 'risk' | 'culture'
  title: string
  body: string
  owner: string | null
  due_date: string | null
  status: 'open' | 'in-progress' | 'resolved'
  priority: 'high' | 'medium' | 'low'
  verification: 'unverified' | 'verified' | 'rejected'
  source_quote: string | null
  created_at: string
}

// ── Write ─────────────────────────────────────────────────

export interface SaveMeetingParams {
  title: string
  durationSeconds: number
  summary: string
  language: string
  participantCount: number
  segments: {
    speaker_label: string
    speaker_name: string | null
    text: string
    timestamp_seconds: number
    detected_language: string | null
    seq_order: number
  }[]
  logs: {
    type: string
    title: string
    body: string
    owner: string | null
    due_date: string | null
    priority: string
  }[]
}

export async function saveMeeting(params: SaveMeetingParams): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: meeting, error: mErr } = await supabase
    .from('meetings')
    .insert({
      title:           params.title,
      date:            new Date().toISOString(),
      duration:        Math.max(1, Math.round(params.durationSeconds / 60)),
      status:          'ready',
      summary:         params.summary || null,
      language:        params.language || 'en',
      participant_count: params.participantCount,
      created_by:      user?.id ?? null,
    })
    .select('id')
    .single()

  if (mErr) throw new Error(mErr.message)
  const mid = meeting.id

  if (params.segments.length > 0) {
    const { error: sErr } = await supabase
      .from('transcript_segments')
      .insert(params.segments.map(s => ({ ...s, meeting_id: mid })))
    if (sErr) throw new Error(sErr.message)
  }

  if (params.logs.length > 0) {
    const { error: lErr } = await supabase
      .from('log_entries')
      .insert(params.logs.map(l => ({
        meeting_id:    mid,
        meeting_title: params.title,
        type:          l.type,
        title:         l.title,
        body:          l.body,
        owner:         l.owner ?? null,
        due_date:      l.due_date ?? null,
        priority:      l.priority ?? 'medium',
        status:        'open',
        verification:  'unverified',
      })))
    if (lErr) throw new Error(lErr.message)
  }

  return mid
}

// ── Read ──────────────────────────────────────────────────

export async function getMeetings(limit = 50): Promise<DBMeeting[]> {
  const { data, error } = await supabase
    .from('meetings')
    .select('*, log_entries(count), transcript_segments(count)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return (data ?? []).map(m => ({
    ...m,
    log_count:     (m.log_entries     as unknown as { count: number }[])[0]?.count ?? 0,
    segment_count: (m.transcript_segments as unknown as { count: number }[])[0]?.count ?? 0,
  })) as DBMeeting[]
}

export async function getMeeting(id: string): Promise<{
  meeting: DBMeeting
  segments: DBSegment[]
  logs: DBLog[]
}> {
  const [mRes, sRes, lRes] = await Promise.all([
    supabase.from('meetings').select('*').eq('id', id).single(),
    supabase.from('transcript_segments').select('*').eq('meeting_id', id).order('seq_order'),
    supabase.from('log_entries').select('*').eq('meeting_id', id).order('type').order('created_at'),
  ])

  if (mRes.error) throw new Error(mRes.error.message)

  return {
    meeting:  mRes.data as DBMeeting,
    segments: (sRes.data ?? []) as DBSegment[],
    logs:     (lRes.data ?? []) as DBLog[],
  }
}

export async function getLogsContext(limit = 200) {
  const { data, error } = await supabase
    .from('log_entries')
    .select('type, title, body, owner, due_date, status, meetings(title, date)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getMeetingSummaries(limit = 30) {
  const { data, error } = await supabase
    .from('meetings')
    .select('title, date, summary, duration, participant_count')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data ?? []
}
