import { useEffect, useMemo, useRef, useState } from 'react'

import ExcelJS from 'exceljs'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { useLocale, useT } from '@eventflow/i18n/react'

import type { RecipientRole } from '@api/services'
import {
  useBatchCreateArtifactRecipients,
  useRecipientRolesQuery,
} from '@features/events/api'
import { resolveLocalizedField } from '@entities/event/lib/localized-field'
import { cn } from '@shared/lib/cn'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Header aliases — Russian + English + Uzbek. Match case-insensitive after trim.
const HEADER_ALIASES = {
  firstName: ['имя', 'first name', 'firstname', 'ism', 'first', 'name'],
  lastName: ['фамилия', 'last name', 'lastname', 'familiya', 'surname', 'last'],
  email: ['email', 'e-mail', 'почта', 'эл. почта', 'эл почта', 'pochta'],
  role: ['роль', 'role', 'роли', 'roles', 'rol'],
} as const

type ColumnKey = keyof typeof HEADER_ALIASES

type ImportedRow = {
  rowNumber: number
  firstName: string
  lastName: string
  displayName: string
  email: string
  /** Role tokens from the file (codes or display names). */
  roleTokens: string[]
  /** Validation error explaining why the row cannot be submitted. */
  error: string | null
  /** Resolved role codes after matching tokens against event roles. */
  resolvedRoleCodes: string[]
  /** Role tokens that did not match any active role. */
  unknownRoleTokens: string[]
}

type BatchImportDialogProps = {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  canManage: boolean
  /** Called once on successful submit with the IDs of the new+reused recipients. */
  onImported?: (recipientIds: string[]) => void
}

function normalizeHeader(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim().toLowerCase()
}

function detectColumnMap(headerRow: unknown[]): Partial<Record<ColumnKey, number>> {
  const map: Partial<Record<ColumnKey, number>> = {}
  headerRow.forEach((cell, idx) => {
    const normalized = normalizeHeader(cell)
    if (!normalized) return
    for (const key of Object.keys(HEADER_ALIASES) as ColumnKey[]) {
      if (map[key] !== undefined) continue
      if (HEADER_ALIASES[key].includes(normalized)) {
        map[key] = idx
        return
      }
    }
  })
  return map
}

function cellText(cell: ExcelJS.CellValue | null | undefined): string {
  if (cell === null || cell === undefined) return ''
  if (typeof cell === 'string') return cell.trim()
  if (typeof cell === 'number' || typeof cell === 'boolean') return String(cell).trim()
  if (cell instanceof Date) return cell.toISOString().slice(0, 10)
  if (typeof cell === 'object') {
    const obj = cell as Record<string, unknown>
    if (typeof obj.text === 'string') return obj.text.trim()
    if (typeof obj.result === 'string' || typeof obj.result === 'number') {
      return String(obj.result).trim()
    }
    if (Array.isArray(obj.richText)) {
      return obj.richText
        .map(r =>
          typeof (r as { text?: unknown }).text === 'string'
            ? (r as { text: string }).text
            : '',
        )
        .join('')
        .trim()
    }
  }
  return String(cell).trim()
}

function splitRoleTokens(value: string): string[] {
  return value
    .split(/[,;|/]/g)
    .map(s => s.trim())
    .filter(Boolean)
}

function resolveRoleTokenToCode(
  token: string,
  roles: RecipientRole[],
  uiLocale: string,
): string | null {
  const normalized = token.trim().toLowerCase()
  if (!normalized) return null
  for (const role of roles) {
    if (role.code.toLowerCase() === normalized) return role.code
    if (role.displayName.toLowerCase() === normalized) return role.code
    const localized = resolveLocalizedField(
      role.translations,
      'displayName',
      uiLocale,
      role.displayName,
    )
    if (localized.toLowerCase() === normalized) return role.code
  }
  return null
}

async function parseExcelFile(file: File): Promise<unknown[][]> {
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.worksheets[0]
  if (!worksheet) return []
  const rows: unknown[][] = []
  worksheet.eachRow({ includeEmpty: false }, row => {
    // exceljs row.values[0] is always null (1-indexed). Slice it off.
    const values = (row.values as ExcelJS.CellValue[]).slice(1)
    rows.push(values.map(v => cellText(v)))
  })
  return rows
}

type TemplateLabels = {
  sheetRecipients: string
  sheetRoles: string
  firstName: string
  lastName: string
  email: string
  role: string
  roleCode: string
  roleName: string
}

async function downloadExcelTemplate(
  roles: RecipientRole[],
  uiLocale: string,
  labels: TemplateLabels,
) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'EventFlow'
  wb.created = new Date()
  const ws = wb.addWorksheet(labels.sheetRecipients)
  ws.columns = [
    { header: labels.firstName, key: 'firstName', width: 22 },
    { header: labels.lastName, key: 'lastName', width: 22 },
    { header: labels.email, key: 'email', width: 32 },
    { header: labels.role, key: 'role', width: 18 },
  ]
  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true }
  headerRow.alignment = { vertical: 'middle' }
  headerRow.height = 22

  // Examples — use the first active role as the example role token.
  const firstRoleCode =
    roles.find(r => r.isActive)?.code ?? 'participant'
  ws.addRow({
    firstName: 'Иван',
    lastName: 'Иванов',
    email: 'ivan@example.com',
    role: firstRoleCode,
  })
  ws.addRow({
    firstName: 'Зайнаб',
    lastName: 'Каримова',
    email: '',
    role: firstRoleCode,
  })
  ws.addRow({
    firstName: 'Aziza',
    lastName: 'Yusupova',
    email: 'aziza@example.com',
    role: '',
  })

  // Reference sheet so organizers can see valid role codes.
  const refs = wb.addWorksheet(labels.sheetRoles)
  refs.columns = [
    { header: labels.roleCode, key: 'code', width: 22 },
    { header: labels.roleName, key: 'displayName', width: 30 },
  ]
  refs.getRow(1).font = { bold: true }
  roles
    .filter(r => r.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .forEach(role => {
      refs.addRow({
        code: role.code,
        displayName: resolveLocalizedField(
          role.translations,
          'displayName',
          uiLocale,
          role.displayName,
        ),
      })
    })

  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'eventflow-recipients-template.xlsx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function BatchImportDialog({
  eventId,
  open,
  onOpenChange,
  canManage,
  onImported,
}: BatchImportDialogProps) {
  const rolesQuery = useRecipientRolesQuery(eventId)
  const batch = useBatchCreateArtifactRecipients(eventId)
  const uiLocale = useLocale()
  const t = useT()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const tx = (key: string, params?: Record<string, string | number>) =>
    t(`events.certificates.batchImport.${key}`, params)

  const [parsedRows, setParsedRows] = useState<ImportedRow[] | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [parsing, setParsing] = useState(false)
  const [defaultRoleCode, setDefaultRoleCode] = useState<string>('')
  // Inline success state — we keep the dialog open after import so the organiser actually sees
  // the confirmation (the toast can be missed when the dialog closes at the same moment).
  const [importResult, setImportResult] = useState<{
    total: number
    created: number
    reused: number
    failed: number
    mergedInFile: number
  } | null>(null)

  const activeRoles = useMemo(() => {
    const list: RecipientRole[] = rolesQuery.data ?? []
    return list.filter(r => r.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
  }, [rolesQuery.data])

  const allRoles: RecipientRole[] = rolesQuery.data ?? []

  // Reset on close. `batch` itself is a fresh object on every render, so we
  // depend only on `open` and pull out the stable `reset` reference (React
  // Query memoizes mutation methods). Including `batch` in deps causes a
  // setState loop → "Maximum update depth exceeded".
  const batchReset = batch.reset
  useEffect(() => {
    if (!open) {
      setParsedRows(null)
      setFileName('')
      setDefaultRoleCode('')
      setImportResult(null)
      batchReset()
    }
  }, [open, batchReset])

  // Re-resolve roles when defaultRoleCode changes (so unknown tokens may resolve to the default).
  const rowsForDisplay = useMemo(() => {
    if (!parsedRows) return null
    if (allRoles.length === 0) return parsedRows
    return parsedRows.map(row => {
      const resolved: string[] = []
      const unknown: string[] = []
      for (const token of row.roleTokens) {
        const code = resolveRoleTokenToCode(token, allRoles, uiLocale)
        if (code) resolved.push(code)
        else unknown.push(token)
      }
      // If row has no resolved roles, the backend will apply defaultRoleCodes.
      return { ...row, resolvedRoleCodes: resolved, unknownRoleTokens: unknown }
    })
  }, [parsedRows, allRoles, uiLocale])

  const handleSelectFile = () => fileInputRef.current?.click()

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    // Reset value so picking the same file again still fires onChange.
    event.target.value = ''
    setFileName(file.name)
    setParsing(true)
    try {
      const matrix = await parseExcelFile(file)
      if (matrix.length === 0) {
        toast.error(tx('emptyFile'))
        setParsedRows([])
        return
      }
      const [headerRow, ...dataRows] = matrix
      const colMap = detectColumnMap(headerRow as unknown[])
      if (colMap.firstName === undefined && colMap.lastName === undefined) {
        toast.error(tx('noHeaders'))
        setParsedRows([])
        return
      }
      const rows: ImportedRow[] = dataRows.map((cells, idx) => {
        const c = cells as unknown[]
        const get = (key: ColumnKey) => {
          const colIdx = colMap[key]
          if (colIdx === undefined) return ''
          const value = c[colIdx]
          return value === undefined || value === null ? '' : String(value).trim()
        }
        const firstName = get('firstName')
        const lastName = get('lastName')
        const email = get('email')
        const rawRole = get('role')
        const roleTokens = rawRole ? splitRoleTokens(rawRole) : []
        const displayName = [firstName, lastName].filter(Boolean).join(' ').trim()
        let error: string | null = null
        if (!displayName) {
          error = tx('rowErrorNameMissing')
        } else if (email && !EMAIL_RE.test(email)) {
          error = tx('rowErrorBadEmail')
        }
        return {
          rowNumber: idx + 2, // +1 for 0-index, +1 for header row
          firstName,
          lastName,
          displayName,
          email,
          roleTokens,
          resolvedRoleCodes: [],
          unknownRoleTokens: [],
          error,
        }
      })
      setParsedRows(rows)
    } catch (err) {
      console.error('Failed to parse Excel file', err)
      toast.error(tx('parseError'))
      setParsedRows([])
    } finally {
      setParsing(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      await downloadExcelTemplate(activeRoles, uiLocale, {
        sheetRecipients: tx('sheetRecipients'),
        sheetRoles: tx('sheetRoles'),
        firstName: tx('colFirstName'),
        lastName: tx('colLastName'),
        email: tx('colEmail'),
        role: tx('colRole'),
        roleCode: tx('colRoleCode'),
        roleName: tx('colRoleName'),
      })
    } catch (err) {
      console.error('Failed to build template', err)
      toast.error(tx('templateError'))
    }
  }

  // `rowsForDisplay?.filter()` returns a fresh array on every render — wrap in useMemo so
  // downstream useMemo deps (e.g. dedupedValidRows) keep stable references.
  const validRows = useMemo(
    () => rowsForDisplay?.filter(r => r.error === null) ?? [],
    [rowsForDisplay],
  )
  const invalidCount = (rowsForDisplay?.length ?? 0) - validRows.length
  const willUseDefaultRoleCount = defaultRoleCode
    ? validRows.filter(r => r.resolvedRoleCodes.length === 0).length
    : 0

  /**
   * Defensive pre-submit dedup. Mirrors the per-batch coalescing the backend now does, so the
   * "Импортировать (N)" button label tells the organiser the true number of distinct people
   * being created instead of inflating the count with file-level duplicates.
   *
   * Key = lowercased email when present, otherwise lowercased "firstName lastName". Within one
   * file this is exactly what users expect — two identical rows for an emailless volunteer should
   * collapse to one recipient. (Real same-name-different-people only matters across batches, and
   * those still create separate recipients because we don't search by name in the DB.)
   */
  const dedupedValidRows = useMemo(() => {
    const seen = new Map<string, ImportedRow>()
    const out: ImportedRow[] = []
    for (const row of validRows) {
      const email = row.email.trim().toLowerCase()
      const name = `${row.firstName} ${row.lastName}`.trim().toLowerCase().replace(/\s+/g, ' ')
      const key = email || name
      if (!key) {
        out.push(row)
        continue
      }
      if (seen.has(key)) continue
      seen.set(key, row)
      out.push(row)
    }
    return out
  }, [validRows])

  const mergedDuplicatesInFile = validRows.length - dedupedValidRows.length

  const handleSubmit = () => {
    if (dedupedValidRows.length === 0) {
      toast.error(tx('noValidRows'))
      return
    }
    batch.mutate(
      {
        recipients: dedupedValidRows.map(r => ({
          displayName: r.displayName,
          firstName: r.firstName || undefined,
          lastName: r.lastName || undefined,
          email: r.email || undefined,
          roleCodes: r.resolvedRoleCodes.length > 0 ? r.resolvedRoleCodes : undefined,
        })),
        defaultRoleCodes: defaultRoleCode ? [defaultRoleCode] : undefined,
      },
      {
        onSuccess: result => {
          // Defensive numbers — sonner can hide behind dialog overlay on some setups, so we also
          // surface the confirmation as an inline panel that stays until the user dismisses it.
          const created = result.createdCount ?? 0
          const reused = result.reusedCount ?? 0
          const failed = result.failedCount ?? 0
          const total = created + reused
          const params = { total, created, reused, failed }

          if (failed > 0) {
            toast.warning(tx('importedWithFailures', params))
          } else {
            toast.success(tx('importedSuccess', params))
          }
          setImportResult({
            total,
            created,
            reused,
            failed,
            mergedInFile: mergedDuplicatesInFile,
          })

          const ids = result.results
            .map(r => r.recipient?.id)
            .filter((id): id is string => Boolean(id))
          onImported?.(ids)
          // NOTE: do NOT auto-close — the inline success panel needs to stay visible.
        },
        onError: err => {
          const message =
            err && typeof err === 'object' && 'message' in err
              ? String((err as { message?: unknown }).message ?? '')
              : tx('genericError')
          toast.error(message || tx('genericError'))
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            {tx('title')}
          </DialogTitle>
          <DialogDescription>{tx('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Inline success panel — pinned at the top of the body after a successful import so the
              organiser actually sees the confirmation regardless of whether the sonner toast was
              missed. Stays until they explicitly close the dialog. */}
          {importResult && (
            <div
              className={cn(
                'flex items-start gap-3 rounded-md border px-3 py-2.5 text-sm',
                importResult.failed > 0
                  ? 'border-amber-500/40 bg-amber-500/10'
                  : 'border-emerald-500/40 bg-emerald-500/10',
              )}
              role="status"
              aria-live="polite"
            >
              <CheckCircle2
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  importResult.failed > 0 ? 'text-amber-500' : 'text-emerald-500',
                )}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium text-foreground">
                  {importResult.failed > 0
                    ? tx('importedWithFailures', importResult)
                    : tx('importedSuccess', importResult)}
                </p>
                {importResult.mergedInFile > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {tx('mergedDuplicatesInFile', { count: importResult.mergedInFile })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 1: download template + upload */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              {tx('downloadTemplate')}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSelectFile}
              disabled={!canManage || parsing}
              className="gap-1.5"
            >
              {parsing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {parsedRows ? tx('pickAnother') : tx('uploadButton')}
            </Button>
            {fileName && (
              <span className="truncate text-xs text-muted-foreground">{fileName}</span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Default role picker — only useful once a file is loaded */}
          {parsedRows && activeRoles.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                {tx('defaultRoleLabel')}
              </span>
              <Select
                value={defaultRoleCode || '__none__'}
                onValueChange={value =>
                  setDefaultRoleCode(value === '__none__' ? '' : value)
                }
              >
                <SelectTrigger className="h-8 w-56 text-xs">
                  <SelectValue placeholder={tx('defaultRoleNone')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{tx('defaultRoleNone')}</SelectItem>
                  {activeRoles.map(role => (
                    <SelectItem key={role.id} value={role.code}>
                      {resolveLocalizedField(
                        role.translations,
                        'displayName',
                        uiLocale,
                        role.displayName,
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {willUseDefaultRoleCount > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {tx(
                    willUseDefaultRoleCount === 1
                      ? 'defaultRoleAppliesOne'
                      : 'defaultRoleAppliesMany',
                    { count: willUseDefaultRoleCount },
                  )}
                </span>
              )}
            </div>
          )}

          {/* Preview table */}
          {rowsForDisplay && rowsForDisplay.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  {tx('countValid')}:{' '}
                  <strong className="text-foreground">{validRows.length}</strong>
                </span>
                {invalidCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    {tx('countInvalid')}:{' '}
                    <strong className="text-foreground">{invalidCount}</strong>
                  </span>
                )}
                {mergedDuplicatesInFile > 0 && (
                  <span
                    className="inline-flex items-center gap-1"
                    title={tx('mergedDuplicatesInFile', { count: mergedDuplicatesInFile })}
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                    {tx('mergedDuplicatesShort', { count: mergedDuplicatesInFile })}
                  </span>
                )}
              </div>
              <div className="max-h-[40vh] overflow-y-auto rounded-md border border-border/60">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/60 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">{tx('colRowNum')}</th>
                      <th className="px-2 py-1.5 text-left font-medium">{tx('colFirstName')}</th>
                      <th className="px-2 py-1.5 text-left font-medium">{tx('colLastName')}</th>
                      <th className="px-2 py-1.5 text-left font-medium">{tx('colEmail')}</th>
                      <th className="px-2 py-1.5 text-left font-medium">{tx('colRole')}</th>
                      <th className="px-2 py-1.5 text-left font-medium">{tx('colStatus')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {rowsForDisplay.map(row => (
                      <tr
                        key={row.rowNumber}
                        className={cn(row.error ? 'bg-red-500/5' : '')}
                      >
                        <td className="px-2 py-1.5 text-muted-foreground">{row.rowNumber}</td>
                        <td className="px-2 py-1.5">{row.firstName || '—'}</td>
                        <td className="px-2 py-1.5">{row.lastName || '—'}</td>
                        <td className="px-2 py-1.5">{row.email || '—'}</td>
                        <td className="px-2 py-1.5">
                          {row.resolvedRoleCodes.length === 0 ? (
                            defaultRoleCode ? (
                              <span className="text-muted-foreground">
                                {defaultRoleCode}{' '}
                                <span className="text-[10px]">{tx('defaultSuffix')}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )
                          ) : (
                            <span>{row.resolvedRoleCodes.join(', ')}</span>
                          )}
                          {row.unknownRoleTokens.length > 0 && (
                            <Badge
                              variant="outline"
                              className="ml-1 h-4 gap-0.5 border-amber-500/40 px-1 text-[9px] text-amber-600"
                            >
                              ? {row.unknownRoleTokens.join(', ')}
                            </Badge>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {row.error ? (
                            <span className="inline-flex items-center gap-1 text-red-500">
                              <AlertTriangle className="h-3 w-3" />
                              {row.error}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="h-3 w-3" />
                              {tx('statusOk')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rowsForDisplay && rowsForDisplay.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              {tx('noRows')}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant={importResult ? 'default' : 'outline'}
            onClick={() => onOpenChange(false)}
          >
            {importResult ? (
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <X className="mr-1.5 h-3.5 w-3.5" />
            )}
            {importResult ? tx('doneButton') : tx('closeButton')}
          </Button>
          {parsedRows && !importResult && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectFile}
              disabled={parsing}
              className="gap-1.5"
              aria-label={tx('chooseAnotherButton')}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {tx('chooseAnotherButton')}
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={
              !canManage ||
              batch.isPending ||
              dedupedValidRows.length === 0 ||
              parsing ||
              !!importResult
            }
          >
            {batch.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {tx('submitButton')}{' '}
            {dedupedValidRows.length > 0 ? `(${dedupedValidRows.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
