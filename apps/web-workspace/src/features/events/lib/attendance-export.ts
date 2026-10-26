import ExcelJS from 'exceljs'

import {
  XLSX_MIME,
  buildCsv,
  safeFilename,
  triggerDownload,
} from './export-utils'

/**
 * Row shape consumed by both Excel and CSV exporters.
 *
 * `cells` is indexed by ISO date (matching the `dates` array passed alongside)
 * with values 'present' | 'absent' | undefined (no record for that day).
 */
export type AttendanceExportRow = {
  fullName: string
  email: string
  cells: Record<string, 'present' | 'absent' | undefined>
  attendedDays: number
  totalDays: number
}

export type AttendanceExportLabels = {
  sheetName: string
  attendee: string
  email: string
  attended: string // e.g. "Посещено"
  present: string // "Да"
  absent: string // "Нет"
}

function cellLabel(
  status: AttendanceExportRow['cells'][string],
  labels: AttendanceExportLabels,
): string {
  if (status === 'present') return labels.present
  if (status === 'absent') return labels.absent
  return '—'
}

export async function exportAttendanceToExcel(opts: {
  rows: AttendanceExportRow[]
  dates: string[]
  fileStem: string
  labels: AttendanceExportLabels
  /** Optional formatter for date column headers (e.g. "5 мая"). */
  formatDateHeader?: (isoDate: string) => string
}): Promise<void> {
  const { rows, dates, fileStem, labels, formatDateHeader } = opts
  const wb = new ExcelJS.Workbook()
  wb.creator = 'EventFlow'
  wb.created = new Date()
  const ws = wb.addWorksheet(labels.sheetName)

  const dateHeaders = dates.map(d =>
    formatDateHeader ? formatDateHeader(d) : d,
  )
  ws.columns = [
    { header: labels.attendee, key: 'fullName', width: 32 },
    { header: labels.email, key: 'email', width: 32 },
    ...dates.map((iso, idx) => ({
      header: dateHeaders[idx],
      key: `day_${iso}`,
      width: 14,
    })),
    { header: labels.attended, key: 'attended', width: 14 },
  ]
  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true }
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' }
  ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 2 }]

  for (const row of rows) {
    const record: Record<string, string> = {
      fullName: row.fullName,
      email: row.email,
      attended: `${row.attendedDays} / ${row.totalDays}`,
    }
    for (const iso of dates) {
      record[`day_${iso}`] = cellLabel(row.cells[iso], labels)
    }
    ws.addRow(record)
  }

  const buf = await wb.xlsx.writeBuffer()
  triggerDownload(new Blob([buf], { type: XLSX_MIME }), safeFilename(fileStem, 'xlsx'))
}

export function exportAttendanceToCsv(opts: {
  rows: AttendanceExportRow[]
  dates: string[]
  fileStem: string
  labels: AttendanceExportLabels
  formatDateHeader?: (isoDate: string) => string
}): void {
  const { rows, dates, fileStem, labels, formatDateHeader } = opts
  const dateHeaders = dates.map(d =>
    formatDateHeader ? formatDateHeader(d) : d,
  )
  const headerRow = [labels.attendee, labels.email, ...dateHeaders, labels.attended]
  const bodyRows = rows.map(row => {
    const cells = dates.map(iso => cellLabel(row.cells[iso], labels))
    return [
      row.fullName,
      row.email,
      ...cells,
      `${row.attendedDays} / ${row.totalDays}`,
    ]
  })

  triggerDownload(buildCsv([headerRow, ...bodyRows]), safeFilename(fileStem, 'csv'))
}
