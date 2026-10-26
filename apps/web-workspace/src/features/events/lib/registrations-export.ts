import ExcelJS from 'exceljs'
import JSZip from 'jszip'

import type { Registration } from '@api/services'
import { getRegistrationPhone } from './registration-phone'
import {
  XLSX_MIME,
  buildCsv,
  safeFilename,
  triggerDownload,
} from './export-utils'

/** A single attached answer file (element of `Registration.fileUploads`). */
type AnswerFile = NonNullable<Registration['fileUploads']>[number]

/**
 * Column headers + cell labels for a registrations export, fully localised.
 * The caller passes localised strings — this module stays i18n-free.
 */
export type RegistrationsExportLabels = {
  sheetName: string
  firstName: string
  lastName: string
  email: string
  phone: string
  status: string
  role: string
  registeredAt: string
  testScore: string
  /**
   * Prefix for dynamic question columns. The export composes column
   * headers as `${questionPrefix} ${idx + 1}: ${question text}` so an
   * organizer can immediately see which question each answer belongs to
   * in Excel — e.g. "Вопрос 1: Участвовали ли вы в National AI
   * Hackathon" or "Question 3: Choose a track".
   */
  questionPrefix: string
  // Status labels (matches RegistrationStatus enum values).
  statusPending: string
  statusApproved: string
  statusConfirmed: string
  statusRejected: string
  statusCancelled: string
  statusWaitlist: string
}

function statusLabel(
  status: Registration['status'],
  labels: RegistrationsExportLabels,
): string {
  switch (status) {
    case 'PENDING':
      return labels.statusPending
    case 'APPROVED':
      return labels.statusApproved
    case 'CONFIRMED':
      return labels.statusConfirmed
    case 'REJECTED':
      return labels.statusRejected
    case 'CANCELLED':
      return labels.statusCancelled
    case 'WAITLIST':
      return labels.statusWaitlist
    default:
      return String(status)
  }
}

function formatDate(
  iso: string | undefined,
  formatter?: (iso: string) => string,
): string {
  if (!iso) return ''
  if (formatter) return formatter(iso)
  return iso
}

/**
 * Walks every registration's `answers` array and builds an ordered list of
 * unique registration-form questions. Order is "first seen wins" — relies
 * on the API returning answers sorted consistently per registration, which
 * matches how the form is presented to attendees. Stable across exports
 * for a given event so column positions don't shuffle between downloads.
 */
function collectQuestions(
  registrations: Registration[],
): Array<{ id: string; text: string }> {
  const seen = new Map<string, { id: string; text: string }>()
  for (const reg of registrations) {
    if (!Array.isArray(reg.answers)) continue
    for (const a of reg.answers) {
      const id = a.question?.id
      if (!id || seen.has(id)) continue
      const text = (a.question?.question ?? '').trim()
      seen.set(id, { id, text: text || id })
    }
  }
  return [...seen.values()]
}

/** Group a registration's attached files by the question they answer. */
function filesByQuestion(reg: Registration): Map<string, AnswerFile[]> {
  const map = new Map<string, AnswerFile[]>()
  for (const f of reg.fileUploads ?? []) {
    const list = map.get(f.questionId) ?? []
    list.push(f)
    map.set(f.questionId, list)
  }
  return map
}

/** Compose answer cells for a single registration keyed by question id. */
function answerLookup(reg: Registration): Map<string, string> {
  const map = new Map<string, string>()
  if (!Array.isArray(reg.answers)) return map
  const files = filesByQuestion(reg)
  for (const a of reg.answers) {
    const id = a.question?.id
    if (!id) continue
    // FILE_UPLOAD answers store file ids server-side — useless in a spreadsheet.
    // Show the human file name(s) instead (the files themselves go in the ZIP).
    if (a.question?.type === 'FILE_UPLOAD') {
      const names = (files.get(id) ?? []).map(f => f.originalName)
      map.set(id, names.join(', '))
      continue
    }
    // `answer` may legitimately be an empty string for unanswered optionals
    // — preserve as `''` rather than dropping (so the row column lines up).
    map.set(id, typeof a.answer === 'string' ? a.answer : String(a.answer ?? ''))
  }
  return map
}

function buildMatrix(
  registrations: Registration[],
  labels: RegistrationsExportLabels,
  formatDateCell?: (iso: string) => string,
  includeTestScore = false,
): { header: string[]; rows: string[][] } {
  const questions = collectQuestions(registrations)
  const questionHeaders = questions.map(
    (q, idx) => `${labels.questionPrefix} ${idx + 1}: ${q.text}`,
  )
  const header = [
    labels.firstName,
    labels.lastName,
    labels.email,
    labels.phone,
    labels.status,
    labels.role,
    labels.registeredAt,
    ...(includeTestScore ? [labels.testScore] : []),
    ...questionHeaders,
  ]
  const rows = registrations.map(r => {
    const base = [
      r.user.firstName ?? '',
      r.user.lastName ?? '',
      r.user.email ?? '',
      getRegistrationPhone(r) ?? '',
      statusLabel(r.status, labels),
      String(r.role ?? ''),
      formatDate(r.createdAt, formatDateCell),
    ]
    if (includeTestScore) {
      base.push(r.testScore == null ? '' : String(r.testScore))
    }
    const lookup = answerLookup(r)
    for (const q of questions) {
      base.push(lookup.get(q.id) ?? '')
    }
    return base
  })
  return { header, rows }
}

/**
 * Build the registrations Q&A matrix as an XLSX Blob. Shared by the plain
 * Excel export and the ZIP bundle (which adds the uploaded files alongside).
 */
async function buildWorkbookBlob(
  registrations: Registration[],
  labels: RegistrationsExportLabels,
  formatDateCell?: (iso: string) => string,
  includeTestScore = false,
): Promise<Blob> {
  const { header, rows } = buildMatrix(
    registrations,
    labels,
    formatDateCell,
    includeTestScore,
  )

  const wb = new ExcelJS.Workbook()
  wb.creator = 'EventFlow'
  wb.created = new Date()
  const ws = wb.addWorksheet(labels.sheetName)
  ws.columns = header.map((h, idx) => {
    // Email gets 32, registeredAt gets 22, defaults to 18; question columns
    // (header starts with the localised prefix like "Вопрос") get 40 so
    // long answers like multi-track choices stay readable in Excel.
    const isQuestionCol = h.startsWith(`${labels.questionPrefix} `)
    let width = 18
    if (idx === 2) width = 32
    else if (idx === 6) width = 22
    if (isQuestionCol) width = 40
    return { header: h, key: `c${idx}`, width }
  })
  ws.getRow(1).font = { bold: true }
  // Wrap long answers + bottom-align so the row height grows naturally.
  ws.getColumn(1).alignment = { vertical: 'top' }
  for (let i = 1; i <= header.length; i += 1) {
    if (header[i - 1].startsWith(`${labels.questionPrefix} `)) {
      ws.getColumn(i).alignment = { wrapText: true, vertical: 'top' }
    }
  }
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  for (const row of rows) {
    const rec: Record<string, string> = {}
    row.forEach((cell, idx) => {
      rec[`c${idx}`] = cell
    })
    ws.addRow(rec)
  }

  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: XLSX_MIME })
}

export async function exportRegistrationsToExcel(opts: {
  registrations: Registration[]
  fileStem: string
  labels: RegistrationsExportLabels
  formatDateCell?: (iso: string) => string
  includeTestScore?: boolean
}): Promise<void> {
  const { registrations, fileStem, labels, formatDateCell, includeTestScore } = opts
  const blob = await buildWorkbookBlob(registrations, labels, formatDateCell, includeTestScore)
  triggerDownload(blob, safeFilename(fileStem, 'xlsx'))
}

export function exportRegistrationsToCsv(opts: {
  registrations: Registration[]
  fileStem: string
  labels: RegistrationsExportLabels
  formatDateCell?: (iso: string) => string
  includeTestScore?: boolean
}): void {
  const { registrations, fileStem, labels, formatDateCell, includeTestScore } = opts
  const { header, rows } = buildMatrix(
    registrations,
    labels,
    formatDateCell,
    includeTestScore,
  )
  triggerDownload(buildCsv([header, ...rows]), safeFilename(fileStem, 'csv'))
}

// ── ZIP bundle (Q&A spreadsheet + uploaded answer files) ────────────────────

/** Strip path-hostile/control chars from one path segment, keep it readable. */
function sanitizeSegment(name: string): string {
  return (
    name
      .replace(/[\\/:*?"<>| -]+/g, '_')
      .replace(/\s+/g, ' ')
      .trim() || 'file'
  )
}

/** Per-participant folder name; suffixed with a short id so identical names
 * (two "Ivan Petrov") don't collapse into one folder. */
function participantFolder(reg: Registration): string {
  const name = `${reg.user?.firstName ?? ''} ${reg.user?.lastName ?? ''}`.trim()
  const base = name || reg.user?.email || 'participant'
  return `${sanitizeSegment(base)} ${reg.id.slice(0, 8)}`
}

/** Resolve a collision-free `folder/file.ext` entry path within the zip. */
function uniqueEntryName(folder: string, original: string, used: Set<string>): string {
  const safe = sanitizeSegment(original)
  const dot = safe.lastIndexOf('.')
  const stem = dot > 0 ? safe.slice(0, dot) : safe
  const ext = dot > 0 ? safe.slice(dot) : ''
  let candidate = `${folder}/${safe}`
  let n = 2
  while (used.has(candidate)) {
    candidate = `${folder}/${stem} (${n})${ext}`
    n += 1
  }
  used.add(candidate)
  return candidate
}

/**
 * Build a ZIP bundle: the Q&A spreadsheet (xlsx) plus every uploaded answer
 * file, grouped into a folder per participant under `files/`. Files are fetched
 * one-by-one via `fetchFile` (the caller wires this to the download endpoint);
 * individual failures are tolerated and counted so one broken file can't sink
 * the whole export.
 */
export async function exportRegistrationsBundleZip(opts: {
  registrations: Registration[]
  fileStem: string
  labels: RegistrationsExportLabels
  formatDateCell?: (iso: string) => string
  includeTestScore?: boolean
  fetchFile: (registrationId: string, fileId: string) => Promise<Blob>
  onProgress?: (done: number, total: number) => void
}): Promise<{ filesTotal: number; filesIncluded: number; filesFailed: number }> {
  const {
    registrations,
    fileStem,
    labels,
    formatDateCell,
    includeTestScore,
    fetchFile,
    onProgress,
  } = opts

  const zip = new JSZip()
  const xlsx = await buildWorkbookBlob(registrations, labels, formatDateCell, includeTestScore)
  zip.file(safeFilename(fileStem, 'xlsx'), xlsx)

  // Flatten every attached file across all registrations.
  const tasks = registrations.flatMap(reg =>
    (reg.fileUploads ?? []).map(file => ({ reg, file })),
  )

  const filesRoot = zip.folder('files') ?? zip
  const used = new Set<string>()
  let done = 0
  let filesIncluded = 0
  let filesFailed = 0
  onProgress?.(0, tasks.length)
  for (const { reg, file } of tasks) {
    try {
      const blob = await fetchFile(reg.id, file.id)
      const entry = uniqueEntryName(participantFolder(reg), file.originalName, used)
      filesRoot.file(entry, blob)
      filesIncluded += 1
    } catch {
      filesFailed += 1
    } finally {
      done += 1
      onProgress?.(done, tasks.length)
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  triggerDownload(zipBlob, safeFilename(fileStem, 'zip'))
  return { filesTotal: tasks.length, filesIncluded, filesFailed }
}
