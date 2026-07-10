import { useState } from 'react'
import { FileText, Download, Check, Loader } from 'lucide-react'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType } from 'docx'
import jsPDF from 'jspdf'
import { meetings } from '../data/mock'

// ── DOCX export ────────────────────────────────────────────
function buildDocx(): Document {
  const children: Paragraph[] = []

  children.push(
    new Paragraph({
      text: 'Roo — Meeting Log Ledger',
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: `Generated ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      spacing: { after: 400 },
      run: { color: '888888', size: 20 },
    })
  )

  for (const meeting of meetings) {
    // Meeting heading
    children.push(
      new Paragraph({
        text: meeting.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 100 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' } },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Date: `, bold: true, size: 20 }),
          new TextRun({ text: new Date(meeting.date).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }), size: 20 }),
          new TextRun({ text: `   Duration: `, bold: true, size: 20 }),
          new TextRun({ text: `${meeting.duration} min`, size: 20 }),
          new TextRun({ text: `   Participants: `, bold: true, size: 20 }),
          new TextRun({ text: meeting.participants.map(p => p.name).join(', '), size: 20 }),
        ],
        spacing: { after: 160 },
      })
    )

    // Summary
    if (meeting.summary) {
      children.push(
        new Paragraph({ text: 'Summary', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }),
        new Paragraph({ text: meeting.summary, spacing: { after: 200 }, run: { size: 22 } })
      )
    }

    // Logs grouped by type
    const byType: Record<string, typeof meeting.logs> = {}
    for (const log of meeting.logs) {
      if (!byType[log.type]) byType[log.type] = []
      byType[log.type].push(log)
    }

    for (const [type, logs] of Object.entries(byType)) {
      children.push(
        new Paragraph({
          text: type.charAt(0).toUpperCase() + type.slice(1) + 's',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      )
      for (const log of logs) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `• ${log.title}`, bold: true, size: 22 }),
              new TextRun({ text: `  [${log.status}]`, color: log.status === 'resolved' ? '276749' : log.status === 'in-progress' ? '975A16' : 'C53030', size: 20 }),
            ],
            spacing: { before: 80, after: 40 },
          }),
          new Paragraph({ text: `  ${log.body}`, spacing: { after: 60 }, run: { size: 20, color: '4A5568' } }),
          ...(log.owner || log.dueDate ? [
            new Paragraph({
              children: [
                ...(log.owner ? [new TextRun({ text: `  Owner: ${log.owner}`, size: 19, color: '718096' })] : []),
                ...(log.dueDate ? [new TextRun({ text: `   Due: ${log.dueDate}`, size: 19, color: '718096' })] : []),
              ],
              spacing: { after: 80 },
            })
          ] : [])
        )
      }
    }

    // Transcript
    if (meeting.transcript.length > 0) {
      children.push(
        new Paragraph({ text: 'Transcript', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } })
      )
      for (const seg of meeting.transcript) {
        const mm = String(Math.floor(seg.timestamp / 60)).padStart(2, '0')
        const ss = String(seg.timestamp % 60).padStart(2, '0')
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `[${mm}:${ss}] `, size: 18, color: '94A3B8' }),
              new TextRun({ text: `${seg.speaker.name}: `, bold: true, size: 20 }),
              new TextRun({ text: seg.text, size: 20, color: '4A5568' }),
            ],
            spacing: { after: 60 },
          })
        )
      }
    }
  }

  return new Document({ sections: [{ children }] })
}

async function exportDocx() {
  const doc = buildDocx()
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `roo-ledger-${new Date().toISOString().slice(0, 10)}.docx`
  a.click()
  URL.revokeObjectURL(url)
}

// ── PDF export ─────────────────────────────────────────────
function exportPdf() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 18
  const pageW = 210
  const contentW = pageW - margin * 2
  let y = margin

  function checkPage(needed = 10) {
    if (y + needed > 282) { doc.addPage(); y = margin }
  }

  function text(str: string, x: number, size: number, color: [number, number, number], bold = false) {
    doc.setFontSize(size)
    doc.setTextColor(...color)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.text(str, x, y)
  }

  // Title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(10, 22, 40)
  doc.text('Roo — Meeting Log Ledger', margin, y)
  y += 8

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text(`Generated ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}`, margin, y)
  y += 12

  for (const meeting of meetings) {
    checkPage(20)

    // Divider
    doc.setDrawColor(226, 232, 240)
    doc.line(margin, y, pageW - margin, y)
    y += 6

    // Meeting title
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(10, 22, 40)
    const titleLines = doc.splitTextToSize(meeting.title, contentW) as string[]
    doc.text(titleLines, margin, y)
    y += titleLines.length * 6 + 2

    // Meta row
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    const metaStr = `${new Date(meeting.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}  ·  ${meeting.duration} min  ·  ${meeting.participants.map(p => p.name).join(', ')}`
    doc.text(metaStr, margin, y)
    y += 7

    // Summary
    if (meeting.summary) {
      checkPage(14)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bolditalic')
      doc.setTextColor(74, 85, 104)
      const sumLines = doc.splitTextToSize(meeting.summary, contentW) as string[]
      doc.text(sumLines, margin, y)
      y += sumLines.length * 4.5 + 5
    }

    // Logs
    const byType: Record<string, typeof meeting.logs> = {}
    for (const log of meeting.logs) {
      if (!byType[log.type]) byType[log.type] = []
      byType[log.type].push(log)
    }

    for (const [type, logs] of Object.entries(byType)) {
      checkPage(12)
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(10, 22, 40)
      doc.text(type.charAt(0).toUpperCase() + type.slice(1) + 's', margin, y)
      y += 5

      for (const log of logs) {
        checkPage(14)
        const statusColor: [number, number, number] =
          log.status === 'resolved' ? [39, 103, 73] :
          log.status === 'in-progress' ? [151, 90, 22] : [197, 48, 48]

        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(10, 22, 40)
        const titleLines2 = doc.splitTextToSize(`• ${log.title}`, contentW - 20) as string[]
        doc.text(titleLines2, margin + 2, y)

        // Status badge (right-aligned)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...statusColor)
        doc.text(log.status, pageW - margin - 2, y, { align: 'right' })

        y += titleLines2.length * 4.5

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(74, 85, 104)
        doc.setFontSize(8)
        const bodyLines = doc.splitTextToSize(log.body, contentW - 4) as string[]
        doc.text(bodyLines, margin + 4, y)
        y += bodyLines.length * 4 + 1

        if (log.owner || log.dueDate) {
          doc.setFontSize(7.5)
          doc.setTextColor(148, 163, 184)
          const ownerStr = [log.owner && `Owner: ${log.owner}`, log.dueDate && `Due: ${log.dueDate}`].filter(Boolean).join('   ')
          doc.text(ownerStr, margin + 4, y)
          y += 4
        }
        y += 2
      }
      y += 3
    }
    y += 6
  }

  doc.save(`roo-ledger-${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ── Component ──────────────────────────────────────────────
const formats = [
  {
    label: 'Word Document',
    ext: '.docx',
    desc: 'Formatted document with all meetings, summaries, logs, and transcripts. Editable in Microsoft Word or Google Docs.',
    icon: '📄',
    accent: '#2B6CB0',
    bg: '#EBF8FF',
    fn: exportDocx,
    async: true,
  },
  {
    label: 'PDF Report',
    ext: '.pdf',
    desc: 'Print-ready A4 report with all meeting logs and transcripts. Ideal for sharing or archiving.',
    icon: '📋',
    accent: '#C53030',
    bg: '#FFF5F5',
    fn: exportPdf,
    async: false,
  },
]

export function Export() {
  const [loading, setLoading] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function handleExport(fmt: typeof formats[number]) {
    setLoading(fmt.ext)
    setDone(null)
    if (fmt.async) {
      await fmt.fn()
    } else {
      fmt.fn()
    }
    setLoading(null)
    setDone(fmt.ext)
    setTimeout(() => setDone(null), 3000)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', letterSpacing: '-0.01em' }}>

      {/* Top bar */}
      <div style={{
        height: 52,
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 24px',
        background: 'var(--bg)', flexShrink: 0,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
          Export
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }} className="fade-up">
        <div style={{ maxWidth: 600, margin: '0 auto' }}>

          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            Export Formats
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {formats.map(fmt => {
              const isLoading = loading === fmt.ext
              const isDone = done === fmt.ext
              return (
                <div
                  key={fmt.ext}
                  style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '20px 22px',
                    display: 'flex', alignItems: 'center', gap: 18,
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'border-color 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  {/* Icon */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: fmt.bg, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22,
                  }}>
                    {fmt.icon}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{fmt.label}</span>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink3)', background: 'var(--bg4)', padding: '1px 6px', borderRadius: 4 }}>
                        {fmt.ext}
                      </span>
                    </div>
                    <p style={{ fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.55 }}>{fmt.desc}</p>
                  </div>

                  {/* Button */}
                  <button
                    onClick={() => handleExport(fmt)}
                    disabled={isLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '9px 18px', borderRadius: 8, flexShrink: 0,
                      fontSize: 13, fontWeight: 500, cursor: isLoading ? 'default' : 'pointer',
                      border: `1.5px solid ${isDone ? '#276749' : fmt.accent}`,
                      background: isDone ? '#EEFBF3' : 'transparent',
                      color: isDone ? '#276749' : fmt.accent,
                      fontFamily: 'var(--font-body)', letterSpacing: '-0.01em',
                      transition: 'all 0.15s', opacity: isLoading ? 0.6 : 1,
                    }}
                  >
                    {isLoading
                      ? <><Loader size={13} strokeWidth={2} style={{ animation: 'spin 0.75s linear infinite' }} /> Generating…</>
                      : isDone
                      ? <><Check size={13} strokeWidth={2.5} /> Downloaded</>
                      : <><Download size={13} strokeWidth={1.8} /> Export {fmt.ext}</>
                    }
                  </button>
                </div>
              )
            })}
          </div>

          {meetings.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--ink3)', textAlign: 'center', marginTop: 32 }}>
              No meetings to export yet.
            </p>
          )}

        </div>
      </div>
    </div>
  )
}
