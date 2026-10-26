import { useEffect, useMemo, useState } from 'react'

import { BatchImportDialog } from './batch-import-dialog'

import {
  FileSpreadsheet,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Send,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { useLocale, useT } from '@eventflow/i18n/react'

import type {
  ArtifactRecipient,
  ArtifactRecipientAssignedRole,
  RecipientRole,
} from '@api/services'
import {
  useActivateRecipientRole,
  useArtifactRecipientsQuery,
  useAssignRecipientRole,
  useCreateArtifactRecipient,
  useCreateRecipientRole,
  useDeactivateRecipientRole,
  useDeactivateRecipientRoleAssignment,
  useRecipientRolesQuery,
  useUpdateRecipientRole,
} from '@features/events/api'
import { resolveLocalizedField } from '@entities/event/lib/localized-field'
import {
  buildScalarNameTranslations,
  flattenScalarNameTranslations,
  ScalarNameTranslationEditor,
  type AppLocale,
  type ScalarNameTranslationsState,
} from '@features/translations'
import { cn } from '@shared/lib/cn'
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@shared/ui'

function resolveRoleDisplayName(role: RecipientRole, uiLocale: string): string {
  return resolveLocalizedField(
    role.translations,
    'displayName',
    uiLocale,
    role.displayName,
  )
}

type RecipientsRolesSheetProps = {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  canManageRecipients?: boolean
  canManageRoles?: boolean
  /**
   * Called when the organizer wants to issue certificates to a hand-picked
   * subset of recipients (sticky footer with the bulk-issue button).
   * The parent (event-certificates-tab) wires this into the existing
   * BulkPreviewDialog + generation flow.
   */
  onIssueForRecipients?: (recipientIds: string[]) => void
}

function ApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return fallback
}

function buildInitialRoleTranslations(
  initial?: { displayName?: string | null; translations?: unknown },
): ScalarNameTranslationsState {
  return buildScalarNameTranslations('displayName', {
    scalar: initial?.displayName ?? '',
    translations: initial?.translations,
  })
}

function flattenRoleTranslations(state: ScalarNameTranslationsState): {
  displayNameScalar: string
  translations: Record<string, Partial<Record<AppLocale, string>>>
} {
  const { scalar, translations } = flattenScalarNameTranslations(state, 'displayName')
  return { displayNameScalar: scalar, translations }
}

function CreateRoleDialog({
  eventId,
  open,
  onOpenChange,
  canManage,
}: {
  eventId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  canManage: boolean
}) {
  const [code, setCode] = useState('')
  const [translationsState, setTranslationsState] = useState<ScalarNameTranslationsState>(() =>
    buildInitialRoleTranslations(),
  )
  const [isArtifactEligible, setIsArtifactEligible] = useState(true)
  const create = useCreateRecipientRole(eventId)
  const t = useT()
  const tx = (key: string, params?: Record<string, string | number>) =>
    t(`events.certificates.recipientsSheet.${key}`, params)

  useEffect(() => {
    if (!open) {
      setCode('')
      setTranslationsState(buildInitialRoleTranslations())
      setIsArtifactEligible(true)
    }
  }, [open])

  const handleSubmit = () => {
    const trimmedCode = code.trim().toLowerCase()
    const { displayNameScalar, translations } = flattenRoleTranslations(translationsState)
    if (!trimmedCode || !displayNameScalar) {
      toast.error(tx('roles.createError'))
      return
    }
    create.mutate(
      {
        code: trimmedCode,
        displayName: displayNameScalar,
        sortOrder: 100,
        isArtifactEligible,
        ...(Object.keys(translations).length > 0 ? { translations } : {}),
      },
      {
        onSuccess: () => {
          toast.success(tx('roles.createdToast'))
          onOpenChange(false)
        },
        onError: err => toast.error(ApiErrorMessage(err, tx('genericError'))),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{tx('roles.createTitle')}</DialogTitle>
          <DialogDescription>{tx('roles.createDescription')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="role-code">{tx('roles.codeLabel')}</Label>
            <Input
              id="role-code"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder={tx('roles.codePlaceholder')}
              autoCapitalize="none"
              disabled={!canManage}
            />
          </div>
          <ScalarNameTranslationEditor
            fieldKey="displayName"
            label={tx('roles.nameLabel')}
            placeholder={tx('roles.namePlaceholder')}
            state={translationsState}
            onStateChange={setTranslationsState}
            disabled={!canManage}
          />
          <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
            <div>
              <Label htmlFor="role-eligible" className="text-xs">
                {tx('roles.artifactsLabel')}
              </Label>
              <p className="text-[10px] text-muted-foreground">
                {tx('roles.artifactsHint')}
              </p>
            </div>
            <Switch
              id="role-eligible"
              checked={isArtifactEligible}
              onCheckedChange={setIsArtifactEligible}
              disabled={!canManage}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending || !canManage}>
            {create.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {t('actions.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditRoleDialog({
  eventId,
  role,
  open,
  onOpenChange,
  canManage,
}: {
  eventId: string
  role: RecipientRole | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canManage: boolean
}) {
  const update = useUpdateRecipientRole(eventId)
  const t = useT()
  const tx = (key: string, params?: Record<string, string | number>) =>
    t(`events.certificates.recipientsSheet.${key}`, params)
  const [translationsState, setTranslationsState] = useState<ScalarNameTranslationsState>(() =>
    buildInitialRoleTranslations(),
  )

  useEffect(() => {
    if (open && role) {
      setTranslationsState(
        buildInitialRoleTranslations({
          displayName: role.displayName,
          translations: role.translations,
        }),
      )
    }
  }, [open, role])

  if (!role) return null

  const handleSubmit = () => {
    const { displayNameScalar, translations } = flattenRoleTranslations(translationsState)
    if (!displayNameScalar) {
      toast.error(tx('roles.editError'))
      return
    }
    update.mutate(
      {
        roleId: role.id,
        body: {
          displayName: displayNameScalar,
          translations,
        },
      },
      {
        onSuccess: () => {
          toast.success(tx('roles.updatedToast'))
          onOpenChange(false)
        },
        onError: err => toast.error(ApiErrorMessage(err, tx('genericError'))),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{tx('roles.editTitle')}</DialogTitle>
          <DialogDescription>
            {tx('roles.editDescription', { code: role.code })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <ScalarNameTranslationEditor
            fieldKey="displayName"
            label={tx('roles.nameLabel')}
            placeholder={tx('roles.namePlaceholder')}
            state={translationsState}
            onStateChange={setTranslationsState}
            disabled={!canManage}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={update.isPending || !canManage}>
            {update.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RolesTab({
  eventId,
  canManage,
}: {
  eventId: string
  canManage: boolean
}) {
  const rolesQuery = useRecipientRolesQuery(eventId)
  const update = useUpdateRecipientRole(eventId)
  const activate = useActivateRecipientRole(eventId)
  const deactivate = useDeactivateRecipientRole(eventId)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RecipientRole | null>(null)
  const uiLocale = useLocale()
  const t = useT()
  const tx = (key: string, params?: Record<string, string | number>) =>
    t(`events.certificates.recipientsSheet.${key}`, params)

  const sortedRoles = useMemo(() => {
    const list: RecipientRole[] = rolesQuery.data ?? []
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [rolesQuery.data])

  const handleToggleActive = (role: RecipientRole) => {
    const action = role.isActive ? deactivate : activate
    action.mutate(role.id, {
      onSuccess: () =>
        toast.success(tx(role.isActive ? 'roles.disabledToast' : 'roles.enabledToast')),
      onError: err => toast.error(ApiErrorMessage(err, tx('genericError'))),
    })
  }

  const handleToggleArtifactEligible = (role: RecipientRole, value: boolean) => {
    update.mutate(
      { roleId: role.id, body: { isArtifactEligible: value } },
      {
        onSuccess: () => toast.success(tx('roles.savedToast')),
        onError: err => toast.error(ApiErrorMessage(err, tx('genericError'))),
      }
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{tx('roles.builtInHint')}</p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5"
          onClick={() => setCreateOpen(true)}
          disabled={!canManage}
        >
          <Plus className="h-3.5 w-3.5" />
          {tx('roles.newRole')}
        </Button>
      </div>

      {rolesQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{tx('roles.colRole')}</th>
                <th className="px-3 py-2 text-right font-medium">
                  {tx('roles.colArtifacts')}
                </th>
                <th className="px-3 py-2 text-right font-medium">{tx('roles.colState')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sortedRoles.map(role => {
                const isBuiltIn = role.kind === 'BUILT_IN'
                return (
                  <tr key={role.id} className={cn(!role.isActive && 'opacity-70')}>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">
                          {resolveRoleDisplayName(role, uiLocale)}
                        </span>
                        <span className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                          {role.code}
                        </span>
                        {isBuiltIn && (
                          <Badge variant="secondary" className="h-4 gap-1 px-1 text-[10px]">
                            <Lock className="h-2.5 w-2.5" />
                            built-in
                          </Badge>
                        )}
                        {!isBuiltIn && canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-1 h-5 gap-1 px-1.5 text-[10px]"
                            onClick={() => setEditingRole(role)}
                            aria-label={tx('roles.editAria')}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Switch
                        checked={role.isArtifactEligible}
                        onCheckedChange={value => handleToggleArtifactEligible(role, value)}
                        disabled={!canManage || update.isPending}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => handleToggleActive(role)}
                        disabled={!canManage || activate.isPending || deactivate.isPending}
                      >
                        {role.isActive ? (
                          <>
                            <PowerOff className="h-3.5 w-3.5" /> {tx('roles.disable')}
                          </>
                        ) : (
                          <>
                            <Power className="h-3.5 w-3.5" /> {tx('roles.enable')}
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreateRoleDialog
        eventId={eventId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        canManage={canManage}
      />
      <EditRoleDialog
        eventId={eventId}
        role={editingRole}
        open={editingRole !== null}
        onOpenChange={open => {
          if (!open) setEditingRole(null)
        }}
        canManage={canManage}
      />
    </div>
  )
}

function buildDisplayName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ').trim()
}

function CreateManualRecipientForm({
  eventId,
  canManage,
  onImportClick,
}: {
  eventId: string
  canManage: boolean
  onImportClick: () => void
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [roleIds, setRoleIds] = useState<Set<string>>(new Set())
  const create = useCreateArtifactRecipient(eventId)
  const rolesQuery = useRecipientRolesQuery(eventId)
  const uiLocale = useLocale()
  const t = useT()
  const tx = (key: string) => t(`events.certificates.recipientsSheet.${key}`)
  const sortedRoles = useMemo(() => {
    const list: RecipientRole[] = rolesQuery.data ?? []
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [rolesQuery.data])

  const handleSubmit = () => {
    const trimmedFirst = firstName.trim()
    const trimmedLast = lastName.trim()
    const composedName = buildDisplayName(trimmedFirst, trimmedLast)
    if (!composedName) {
      toast.error(tx('nameRequiredError'))
      return
    }
    create.mutate(
      {
        displayName: composedName,
        firstName: trimmedFirst || undefined,
        lastName: trimmedLast || undefined,
        email: email.trim() || undefined,
        roleIds: roleIds.size > 0 ? Array.from(roleIds) : undefined,
      },
      {
        onSuccess: result => {
          if (result.reused && !result.created) {
            toast.message(tx('reusedToast'))
          } else {
            toast.success(tx('createdToast'))
          }
          setFirstName('')
          setLastName('')
          setEmail('')
          setRoleIds(new Set())
        },
        onError: err => toast.error(ApiErrorMessage(err, tx('genericError'))),
      }
    )
  }

  const toggleRole = (id: string) => {
    setRoleIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-3 rounded-md border border-border/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{tx('addManualTitle')}</p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5"
          onClick={onImportClick}
          disabled={!canManage}
          aria-label={tx('importButton')}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          {tx('importButton')}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Input
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          placeholder={tx('firstName')}
          disabled={!canManage}
        />
        <Input
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          placeholder={tx('lastName')}
          disabled={!canManage}
        />
        <Input
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={tx('emailOptional')}
          type="email"
          disabled={!canManage}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sortedRoles.map(role => {
          const active = roleIds.has(role.id)
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => toggleRole(role.id)}
              disabled={!canManage || !role.isActive}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                active
                  ? 'border-primary/50 bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:border-foreground/30',
                (!role.isActive || !canManage) && 'cursor-not-allowed opacity-60'
              )}
            >
              {resolveRoleDisplayName(role, uiLocale)}
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">{tx('autoEmailHint')}</p>
        <Button size="sm" onClick={handleSubmit} disabled={!canManage || create.isPending}>
          {create.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          {tx('addButton')}
        </Button>
      </div>
    </div>
  )
}

function RecipientRoleAssignmentRow({
  recipient,
  role,
  eventId,
  canManage,
}: {
  recipient: ArtifactRecipient
  role: ArtifactRecipientAssignedRole
  eventId: string
  canManage: boolean
}) {
  const deactivate = useDeactivateRecipientRoleAssignment(eventId)
  const uiLocale = useLocale()
  const t = useT()
  const tx = (key: string) => t(`events.certificates.recipientsSheet.${key}`)
  const localizedRoleName = resolveLocalizedField(
    role.translations,
    'displayName',
    uiLocale,
    role.displayName,
  )
  const isManual = role.assignmentSourceType === 'MANUAL' || role.assignmentSourceType === null
  const handleRemove = () => {
    deactivate.mutate(
      { recipientId: recipient.id, roleId: role.id },
      {
        onSuccess: () => toast.success(tx('roleRemoved')),
        onError: err => toast.error(ApiErrorMessage(err, tx('genericError'))),
      }
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
        role.assignmentStatus === 'ACTIVE'
          ? 'border-border bg-muted/60 text-foreground'
          : 'border-border/40 bg-muted/30 text-muted-foreground line-through'
      )}
    >
      {localizedRoleName}
      {role.assignmentStatus === 'ACTIVE' && canManage && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={deactivate.isPending}
          title={isManual ? tx('removeRole') : tx('roleAutoManaged')}
          className="ml-0.5 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deactivate.isPending ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <X className="h-2.5 w-2.5" />}
        </button>
      )}
    </span>
  )
}

function AssignRolePopover({
  eventId,
  recipient,
  canManage,
}: {
  eventId: string
  recipient: ArtifactRecipient
  canManage: boolean
}) {
  const rolesQuery = useRecipientRolesQuery(eventId)
  const assign = useAssignRecipientRole(eventId)
  const uiLocale = useLocale()
  const t = useT()
  const tx = (key: string) => t(`events.certificates.recipientsSheet.${key}`)
  const sortedRoles = useMemo(() => {
    const list: RecipientRole[] = rolesQuery.data ?? []
    return [...list]
      .filter(r => r.isActive)
      .filter(r => !recipient.roles.some(rr => rr.id === r.id && rr.assignmentStatus === 'ACTIVE'))
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [rolesQuery.data, recipient.roles])

  if (sortedRoles.length === 0) return null

  return (
    <details className="relative">
      <summary
        className={cn(
          'list-none rounded-full border border-dashed border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground',
          !canManage && 'cursor-not-allowed opacity-50'
        )}
      >
        {tx('addRole')}
      </summary>
      <div className="absolute right-0 z-20 mt-1 flex flex-wrap gap-1 rounded-md border border-border bg-popover p-2 shadow-md">
        {sortedRoles.map(role => (
          <button
            key={role.id}
            type="button"
            onClick={() => {
              if (!canManage) return
              assign.mutate(
                { recipientId: recipient.id, body: { roleId: role.id } },
                {
                  onSuccess: () => toast.success(tx('roleAssigned')),
                  onError: err => toast.error(ApiErrorMessage(err, tx('genericError'))),
                }
              )
            }}
            disabled={!canManage || assign.isPending}
            className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] hover:border-foreground/40"
          >
            {resolveRoleDisplayName(role, uiLocale)}
          </button>
        ))}
      </div>
    </details>
  )
}

function RecipientsTab({
  eventId,
  canManage,
  onIssueForSelection,
}: {
  eventId: string
  canManage: boolean
  onIssueForSelection: (recipientIds: string[]) => void
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importOpen, setImportOpen] = useState(false)
  const t = useT()
  const tx = (key: string, params?: Record<string, string | number>) =>
    t(`events.certificates.recipientsSheet.${key}`, params)
  const recipients = useArtifactRecipientsQuery(eventId, {
    page: 1,
    limit: 50,
    search: search.trim() || undefined,
    status: 'ACTIVE',
  })

  const rows = recipients.data?.data ?? []
  const allOnPageSelected =
    rows.length > 0 && rows.every(r => selected.has(r.id))
  const someOnPageSelected = rows.some(r => selected.has(r.id))

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const togglePage = () => {
    setSelected(prev => {
      const next = new Set(prev)
      if (allOnPageSelected) {
        rows.forEach(r => next.delete(r.id))
      } else {
        rows.forEach(r => next.add(r.id))
      }
      return next
    })
  }

  const handleImported = (newIds: string[]) => {
    if (newIds.length === 0) return
    // Preselect freshly imported recipients so the user can issue immediately.
    setSelected(prev => {
      const next = new Set(prev)
      newIds.forEach(id => next.add(id))
      return next
    })
  }

  const handleIssueClick = () => {
    if (selected.size === 0) return
    onIssueForSelection(Array.from(selected))
  }

  return (
    <div className="space-y-3">
      <CreateManualRecipientForm
        eventId={eventId}
        canManage={canManage}
        onImportClick={() => setImportOpen(true)}
      />
      <div className="flex items-center gap-2">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={tx('searchPlaceholder')}
          className="h-8 text-sm"
        />
        {rows.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1.5 text-xs"
            onClick={togglePage}
          >
            <Checkbox
              checked={
                allOnPageSelected ? true : someOnPageSelected ? 'indeterminate' : false
              }
              className="h-3.5 w-3.5"
              aria-label={tx('selectAll')}
            />
            {allOnPageSelected ? tx('deselectAll') : tx('selectAll')}
          </Button>
        )}
      </div>
      {recipients.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          {tx('emptyList')}
        </div>
      ) : (
        <div className="space-y-1.5 pb-16">
          {rows.map(recipient => {
            const isSelected = selected.has(recipient.id)
            const isRegistered = recipient.sources.userId !== null
            return (
              <div
                key={recipient.id}
                className={cn(
                  'rounded-md border px-3 py-2 transition-colors',
                  isSelected
                    ? 'border-primary/40 bg-primary/[0.04]'
                    : 'border-border/60',
                )}
              >
                <div className="flex items-center gap-2.5">
                  {canManage && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(recipient.id)}
                      aria-label={recipient.displayName}
                      className="h-4 w-4 shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{recipient.displayName}</p>
                      {isRegistered && (
                        <Badge
                          variant="secondary"
                          className="h-4 shrink-0 gap-1 px-1.5 text-[10px]"
                          title={tx('registeredBadgeTooltip')}
                        >
                          <UserCheck className="h-2.5 w-2.5" />
                          {tx('registeredBadge')}
                        </Badge>
                      )}
                    </div>
                    {recipient.email && (
                      <p className="truncate text-xs text-muted-foreground">{recipient.email}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                    {recipient.sources.sourceTypes.join(' · ') || 'manual'}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1 pl-6">
                  {recipient.roles.map(role => (
                    <RecipientRoleAssignmentRow
                      key={`${role.id}-${role.assignmentId ?? role.assignmentStatus}`}
                      recipient={recipient}
                      role={role}
                      eventId={eventId}
                      canManage={canManage}
                    />
                  ))}
                  {canManage && <AssignRolePopover eventId={eventId} recipient={recipient} canManage={canManage} />}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Sticky footer for bulk issue — only when at least one recipient is selected */}
      {selected.size > 0 && (
        <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-border bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{tx('bulkSelected', { count: selected.size })}</p>
              <p className="text-[11px] text-muted-foreground">{tx('bulkHint')}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setSelected(new Set())}
              >
                {tx('bulkClearButton')}
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5"
                onClick={handleIssueClick}
                disabled={!canManage}
              >
                <Send className="h-3.5 w-3.5" />
                {tx('bulkIssueButton', { count: selected.size })}
              </Button>
            </div>
          </div>
        </div>
      )}

      <BatchImportDialog
        eventId={eventId}
        open={importOpen}
        onOpenChange={setImportOpen}
        canManage={canManage}
        onImported={handleImported}
      />
    </div>
  )
}

export function RecipientsRolesSheet({
  eventId,
  open,
  onOpenChange,
  canManageRecipients = true,
  canManageRoles = true,
  onIssueForRecipients,
}: RecipientsRolesSheetProps) {
  const t = useT()
  const tx = (key: string) => t(`events.certificates.recipientsSheet.${key}`)
  const handleIssueForSelection = (recipientIds: string[]) => {
    if (recipientIds.length === 0) return
    if (onIssueForRecipients) {
      // Close the sheet so the BulkPreviewDialog in the parent has the stage.
      onOpenChange(false)
      onIssueForRecipients(recipientIds)
    } else {
      toast.message(tx('issueUnavailable'))
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{tx('sheetTitle')}</SheetTitle>
          <SheetDescription>{tx('sheetDescription')}</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="recipients" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="recipients" className="flex-1">
              {tx('tabRecipients')}
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex-1">
              {tx('tabRoles')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="recipients" className="mt-3">
            <RecipientsTab
              eventId={eventId}
              canManage={canManageRecipients}
              onIssueForSelection={handleIssueForSelection}
            />
          </TabsContent>
          <TabsContent value="roles" className="mt-3">
            <RolesTab eventId={eventId} canManage={canManageRoles} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

