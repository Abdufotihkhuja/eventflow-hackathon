/**
 * Shared helpers for client-side CSV/XLSX exports (participants, attendance, …).
 *
 * Keep this module exceljs-free so it can be imported in code paths that
 * only need CSV without paying the ExcelJS chunk cost.
 */

export const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const CSV_MIME = 'text/csv;charset=utf-8'

/** Download a blob as a file via a synthetic anchor. Works in all browsers. */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Defer revoke so Safari/Firefox finish their download handler.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Strip filesystem-hostile chars, collapse whitespace, fall back to a default. */
export function safeFilename(stem: string, ext: string): string {
  const base =
    stem
      .replace(/[\\/:"*?<>|]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() || 'export'
  return `${base}.${ext}`
}

/** Quote a CSV cell only when needed (RFC 4180). */
export function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Build a UTF-8 CSV with BOM so Excel on Windows reads Cyrillic correctly.
 * `rows[0]` is treated as headers; every value is escaped per RFC 4180.
 */
export function buildCsv(rows: string[][]): Blob {
  const body = rows.map(row => row.map(csvEscape).join(',')).join('\n')
  // U+FEFF BOM — Excel on Windows needs it for non-ASCII headers.
  return new Blob([`﻿${body}`], { type: CSV_MIME })
}
