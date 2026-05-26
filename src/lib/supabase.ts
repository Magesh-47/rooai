import { createClient } from '@supabase/supabase-js'

const url     = import.meta.env.VITE_SUPABASE_URL      as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, anonKey)

// Ephemeral client for admin user-creation — isolated storage key so it
// never displaces the current admin session and avoids the multi-instance warning.
export function makeTempClient() {
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: `roo-temp-${Date.now()}`,
    },
  })
}

// ── Types ─────────────────────────────────────────────────

export type Role = 'admin' | 'developer' | 'designer' | 'operation_manager' | 'team_lead'

export interface Profile {
  id: string
  name: string
  email: string
  role: Role
  department: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Meeting {
  id: string
  title: string
  date: string
  duration: number
  status: 'processing' | 'ready' | 'live'
  summary: string | null
  language: string | null
  audio_url: string | null
  participant_count: number
  created_by: string
  created_at: string
  updated_at: string
  participants?: MeetingParticipant[]
  transcript?: TranscriptSegment[]
  logs?: LogEntry[]
  notes?: MeetingNote[]
}

export interface MeetingParticipant {
  id: string
  meeting_id: string
  speaker_label: string | null
  speaker_name: string
  speaker_role: string | null
}

export interface TranscriptSegment {
  id: string
  meeting_id: string
  speaker_label: string
  speaker_name: string | null
  text: string
  timestamp_seconds: number
  detected_language: string | null
  seq_order: number
}

export interface MeetingNote {
  id: string
  meeting_id: string
  content: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface LogEntry {
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
  source_timestamp: string | null
  created_at: string
  updated_at: string
}

export interface AIChatMessage {
  id: string
  meeting_id: string | null
  role: 'user' | 'assistant'
  content: string
  created_by: string
  created_at: string
}
