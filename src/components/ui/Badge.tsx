import type { LogType, LogPriority, LogVerification } from '../../types'

type TagColor = 'sage' | 'clay' | 'gold' | 'violet' | 'rose' | 'slate' | 'red'

const logTypeColor: Record<LogType, TagColor> = {
  action:       'sage',
  decision:     'violet',
  architecture: 'clay',
  risk:         'gold',
  culture:      'rose',
}

const logTypeLabel: Record<LogType, string> = {
  action:       'Action',
  decision:     'Decision',
  architecture: 'Architecture',
  risk:         'Risk',
  culture:      'Culture',
}

const priorityColor: Record<LogPriority, TagColor> = {
  high:   'red',
  medium: 'gold',
  low:    'slate',
}

const priorityLabel: Record<LogPriority, string> = {
  high:   'High',
  medium: 'Medium',
  low:    'Low',
}

function Tag({ color, children }: { color: TagColor; children: React.ReactNode }) {
  return <span className={`tag t-${color}`}>{children}</span>
}

export function LogBadge({ type }: { type: LogType }) {
  return <Tag color={logTypeColor[type]}>{logTypeLabel[type]}</Tag>
}

export function PriorityBadge({ priority }: { priority: LogPriority }) {
  return <Tag color={priorityColor[priority]}>{priorityLabel[priority]}</Tag>
}

export function VerificationBadge({ verification }: { verification: LogVerification }) {
  if (verification === 'verified') return <Tag color="sage">Verified</Tag>
  if (verification === 'rejected') return <Tag color="red">Rejected</Tag>
  return null
}

export function StatusBadge({ status }: { status: 'open' | 'resolved' | 'in-progress' }) {
  const map = {
    open:          { color: 'slate' as TagColor, label: 'Open' },
    resolved:      { color: 'sage' as TagColor,  label: 'Resolved' },
    'in-progress': { color: 'violet' as TagColor, label: 'In Progress' },
  }
  const { color, label } = map[status]
  return <Tag color={color}>{label}</Tag>
}

export function MeetingStatusBadge({ status }: { status: 'processing' | 'ready' | 'live' }) {
  const map = {
    ready:      { color: 'sage' as TagColor,  label: 'Reconciled' },
    processing: { color: 'gold' as TagColor,  label: 'Processing' },
    live:       { color: 'red'  as TagColor,  label: 'Live' },
  }
  const { color, label } = map[status]
  return <Tag color={color}>{label}</Tag>
}
