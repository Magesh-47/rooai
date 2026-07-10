import type { Meeting, Speaker } from '../types'

export const speakers: Speaker[] = [
  { id: 'sp1', name: 'Migavel', role: 'Product' },
  { id: 'sp2', name: 'Priya', role: 'Engineering' },
  { id: 'sp3', name: 'Arjun', role: 'Design' },
  { id: 'sp4', name: 'Keerthana', role: 'QA' },
]

export const meetings: Meeting[] = [
  {
    id: 'm1',
    title: 'Sprint Planning — Q2 Week 4',
    date: '2026-05-19T10:00:00',
    duration: 52,
    status: 'ready',
    participants: [speakers[0], speakers[1], speakers[2]],
    summary: 'Finalized scope for the reconciliation engine. Migavel confirmed the API contracts. Priya will lead backend sprint, Arjun handles the updated component library.',
    transcript: [
      { id: 't1', speaker: speakers[0], text: "Let's start with the sprint goals. We need to close the Gemini integration this week.", timestamp: 0 },
      { id: 't2', speaker: speakers[1], text: "Backend endpoints are ready. I'll need the API contract from Migavel by EOD.", timestamp: 18 },
      { id: 't3', speaker: speakers[0], text: "I'll send it over after this call. Arjun, how is the component library coming along?", timestamp: 42 },
      { id: 't4', speaker: speakers[2], text: "The new card components are done. I'll push them to the design branch this afternoon.", timestamp: 55 },
    ],
    logs: [
      { id: 'l1', type: 'action', title: 'Send API contract to Priya', body: 'Migavel to share the finalized Gemini API contract document by end of day.', owner: 'Migavel', dueDate: '2026-05-19', status: 'resolved', meetingId: 'm1', meetingTitle: 'Sprint Planning — Q2 Week 4', createdAt: '2026-05-19T10:52:00' },
      { id: 'l2', type: 'decision', title: 'Gemini API selected for transcription engine', body: 'Team agreed to proceed with Gemini 1.5 Pro for multilingual transcription over Whisper, citing better Tamil/Telugu support.', status: 'resolved', meetingId: 'm1', meetingTitle: 'Sprint Planning — Q2 Week 4', createdAt: '2026-05-19T10:52:00' },
      { id: 'l3', type: 'action', title: 'Push component library updates', body: 'Arjun to push updated card components to the design branch.', owner: 'Arjun', dueDate: '2026-05-19', status: 'resolved', meetingId: 'm1', meetingTitle: 'Sprint Planning — Q2 Week 4', createdAt: '2026-05-19T10:52:00' },
    ],
  },
  {
    id: 'm2',
    title: 'Architecture Review — Log Ledger Schema',
    date: '2026-05-16T14:30:00',
    duration: 38,
    status: 'ready',
    participants: [speakers[0], speakers[1]],
    summary: 'Reviewed the Supabase schema for log ledger entries. Decided to use pgvector for semantic search. Action items assigned for indexing strategy.',
    transcript: [
      { id: 't5', speaker: speakers[1], text: 'The schema looks solid. My only concern is the vector index size at scale.', timestamp: 0 },
      { id: 't6', speaker: speakers[0], text: 'We can start with HNSW and revisit. Data sovereignty is the main reason we chose pgvector over Pinecone.', timestamp: 24 },
    ],
    logs: [
      { id: 'l4', type: 'architecture', title: 'pgvector with HNSW index for semantic search', body: 'Decision to use Supabase pgvector with HNSW indexing for log entry semantic search. Chosen over Pinecone for data sovereignty.', status: 'resolved', meetingId: 'm2', meetingTitle: 'Architecture Review — Log Ledger Schema', createdAt: '2026-05-16T15:08:00' },
      { id: 'l5', type: 'risk', title: 'Vector index performance at scale not validated', body: 'HNSW index selected as starting point but not benchmarked against >100k log entries. Monitor query latency post-launch.', status: 'open', meetingId: 'm2', meetingTitle: 'Architecture Review — Log Ledger Schema', createdAt: '2026-05-16T15:08:00' },
    ],
  },
  {
    id: 'm3',
    title: 'Daily Standup',
    date: '2026-05-21T09:15:00',
    duration: 15,
    status: 'ready',
    participants: [speakers[0], speakers[1], speakers[2], speakers[3]],
    summary: 'Quick sync. Keerthana flagged a regression in the upload queue. Priya blocked on API keys. No blockers for Migavel or Arjun.',
    transcript: [
      { id: 't7', speaker: speakers[3], text: 'I found a regression in the upload progress shimmer — it breaks on files larger than 50MB.', timestamp: 0 },
      { id: 't8', speaker: speakers[1], text: "I'm blocked until I get the Gemini API key provisioned. I've raised the request.", timestamp: 35 },
      { id: 't9', speaker: speakers[0], text: "I'll escalate the API key. Keerthana, can you file the upload bug?", timestamp: 52 },
    ],
    logs: [
      { id: 'l6', type: 'action', title: 'File upload regression bug for >50MB files', body: 'Keerthana to file a bug report for the upload queue shimmer regression on files larger than 50MB.', owner: 'Keerthana', dueDate: '2026-05-21', status: 'open', meetingId: 'm3', meetingTitle: 'Daily Standup', createdAt: '2026-05-21T09:30:00' },
      { id: 'l7', type: 'action', title: 'Escalate Gemini API key provisioning', body: "Migavel to escalate the Gemini API key request to unblock Priya's backend work.", owner: 'Migavel', dueDate: '2026-05-21', status: 'in-progress', meetingId: 'm3', meetingTitle: 'Daily Standup', createdAt: '2026-05-21T09:30:00' },
    ],
  },
  {
    id: 'm4',
    title: 'Design Review — Reconcile Page',
    date: '2026-05-14T11:00:00',
    duration: 29,
    status: 'ready',
    participants: [speakers[0], speakers[2]],
    summary: 'Reviewed the reconcile page layout. Agreed on a two-column split with transcript on the left and extracted logs on the right. Minor spacing adjustments needed.',
    transcript: [
      { id: 't10', speaker: speakers[2], text: 'The two-column layout works well but the log cards feel cramped at 320px width.', timestamp: 0 },
      { id: 't11', speaker: speakers[0], text: "Let's bump it to 340 and tighten the padding inside each card instead.", timestamp: 18 },
      { id: 't12', speaker: speakers[2], text: "That works. I'll update the components and share a Figma preview by tomorrow.", timestamp: 32 },
    ],
    logs: [
      { id: 'l8', type: 'action', title: 'Update log panel width to 340px', body: 'Arjun to update the reconcile page log panel from 320px to 340px and reduce internal card padding.', owner: 'Arjun', dueDate: '2026-05-15', status: 'resolved', meetingId: 'm4', meetingTitle: 'Design Review — Reconcile Page', createdAt: '2026-05-14T11:29:00' },
      { id: 'l9', type: 'decision', title: 'Two-column split layout adopted for reconcile view', body: 'Transcript on the left, extracted logs on the right. Decided against tabbed layout for faster review flow.', status: 'resolved', meetingId: 'm4', meetingTitle: 'Design Review — Reconcile Page', createdAt: '2026-05-14T11:29:00' },
    ],
  },
]

export const allLogs = meetings.flatMap(m => m.logs)
