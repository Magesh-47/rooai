export type LogType = 'action' | 'decision' | 'architecture' | 'risk' | 'culture'
export type LogVerification = 'unverified' | 'verified' | 'rejected'
export type LogPriority = 'high' | 'medium' | 'low'

export interface Speaker {
  id: string
  name: string
  avatar?: string
  role?: string
  voiceLabel?: string   // "Speaker 1"
  confidence?: number   // 0-100
}

export interface TranscriptSegment {
  id: string
  speaker: Speaker
  text: string
  timestamp: number   // seconds from start
  detectedLanguage?: string
  autocorrected?: string  // "Saggitha → Sangeetha"
}

export interface AutoCorrection {
  from: string
  to: string
}

export interface LogEntry {
  id: string
  type: LogType
  title: string
  body: string
  owner?: string
  dueDate?: string
  status: 'open' | 'resolved' | 'in-progress'
  meetingId: string
  meetingTitle: string
  createdAt: string
  verification?: LogVerification
  priority?: LogPriority
  source?: string       // raw transcript quote
  sourceTimestamp?: string  // "01:23:44"
  sourceAuthor?: string
}

export interface Meeting {
  id: string
  title: string
  date: string
  duration: number   // minutes
  participants: Speaker[]
  transcript: TranscriptSegment[]
  logs: LogEntry[]
  summary?: string
  status: 'processing' | 'ready' | 'live'
  autoCorrections?: AutoCorrection[]
  participantCount?: number  // for processing files where speakers not yet identified
  language?: string
}

export interface PreBriefPoint {
  id: string
  index: number
  text: string
  type: LogType | 'commitment'
  meetingTitle: string
}

export interface QueryAnswer {
  text: string
  sources: { date: string; text: string }[]
}
