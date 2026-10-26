/**
 * Организация → Команда (управление сотрудниками)
 * API: /api/v1/organizations/members, /roles, /permissions
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Loader2, Search, Settings, UserPlus, Users as UsersIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@eventflow/i18n/react'

import type {
  MemberPermission,
  OrganizationMember,
  RolePermission,
  UpdateMemberRequest,
} from '@api/services'
import { getOrganizationRoleLabel, MemberStatus } from '@api/services'
import { useCurrentUser, isOrganizationUser, usePermissions } from '@features/profile'
import {
  useCreateUserForm,
  useUpdateUserForm,
  UserForm,
  useMembersQuery,
  useUpdateMember,
  useDeleteMember,
  useResendMemberInvite,
  useRolesQuery,
  usePermissionsQuery,
  useUpdateMemberPermissions,
  usePendingInvites,
  useDeclinedInvites,
  useCreateInvite,
  useResendInvite,
  useRevokeInvite,
  PermissionsEditor,
  type CreateMemberFormValues,
  type UpdateMemberFormValues,
} from '@features/users'
import type { ApiError } from '@api/index'
import type { PendingInviteConflictDetails } from '@api/services'
import {
  LimitPrompt,
  mapBillingError,
  SEATS_OF_PLURAL,
  useBillingEntitlementsQuery,
  type BillingLimitError,
} from '@features/billing'
import { plural } from '@eventflow/i18n'
import { useLocale } from '@eventflow/i18n/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  PageTabs,
  PermissionDenied,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  StatusPill,
  type PageTabItem,
} from '@shared/ui'

import { MembersTable } from './members-table'
import { DeclinedInvites } from './declined-invites'
import { PendingInvites } from './pending-invites'
import { RolesPermissionsMatrix } from './roles-permissions-matrix'

type StatusTab = 'all' | 'active' | 'invited' | 'suspended'

function extractPermissionIds(permissions?: string[] | RolePermission[]): string[] {
  if (!permissions || permissions.length === 0) return []
  if (typeof permissions[0] === 'string') return permissions as string[]
  return (permissions as RolePermission[]).map(p => p.permissionId)
}

function extractMemberPermissionIds(permissions?: MemberPermission[]): string[] {
  if (!permissions || permissions.length === 0) return []
  return permissions.map(p => p.permissionId)
}

function getErrorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined
}

function normalizePhone(value?: string | null): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  return trimmed.replace(/[\s()-]/g, '')
}

function toUpdateMemberRequest(values: UpdateMemberFormValues): UpdateMemberRequest {
  return {
    ...values,
    phone: normalizePhone(values.phone),
  }
}

export default function UsersPage() {
  const t = useT()
  const locale = useLocale()
  const getRoleLabel = getOrganizationRoleLabel(t)

  const { data: currentUser } = useCurrentUser()
  const { hasPermission, isLoading: isPermsLoading } = usePermissions()

  const canRead = hasPermission('members:read')
  const canCreate = hasPermission('members:create')
  const canUpdate = hasPermission('members:update')
  const canDelete = hasPermission('members:delete')
  const canManageRoles = hasPermission('roles:manage')
  const canViewBilling = hasPermission('billing:view')

  const currentMemberId = currentUser?.type === 'member' ? currentUser.data.id : null
  const orgName = isOrganizationUser(currentUser)
    ? currentUser.data.organizationName
    : currentUser?.type === 'member'
      ? currentUser.data.organization?.name
      : undefined
  const hasInn = isOrganizationUser(currentUser) ? Boolean(currentUser.data.inn) : true

  const [tab, setTab] = useState<StatusTab>('all')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null)
  const [deletingMember, setDeletingMember] = useState<OrganizationMember | null>(null)
  const [permissionsMember, setPermissionsMember] = useState<OrganizationMember | null>(null)

  // Fetch the full member list once; tabs/search/role filter run on the client so
  // the tab counts are real (not a per-request slice).
  const { data: membersData, isLoading: isMembersLoading } = useMembersQuery({})
  const { data: rolesData, isLoading: isRolesLoading } = useRolesQuery()
  const {
    data: permissionsData,
    isLoading: isPermissionsLoading,
    isError: isPermissionsError,
    error: permissionsError,
    refetch: refetchPermissions,
  } = usePermissionsQuery()

  const updateMember = useUpdateMember()
  const deleteMember = useDeleteMember()
  const resendInvite = useResendMemberInvite()
  const updatePermissions = useUpdateMemberPermissions()

  // Новый flow приглашений (отдельные invite-сущности).
  const { data: pendingInvitesData } = usePendingInvites(canRead)
  const { data: declinedInvitesData } = useDeclinedInvites(canRead)
  const createInvite = useCreateInvite()
  const resendOrgInvite = useResendInvite()
  const revokeOrgInvite = useRevokeInvite()
  const [createError, setCreateError] = useState<string | null>(null)
  // C-9: 409 BILLING_CAP_EXCEEDED (STAFF_SEATS) при приглашении/создании.
  const [seatLimitError, setSeatLimitError] = useState<BillingLimitError | null>(null)

  // C-9: лимит мест тарифа. Эндпоинт защищён billing:view — для остальных
  // сидбар-метрика просто не рендерится (энфорсмент всё равно серверный).
  const { data: entitlements } = useBillingEntitlementsQuery(canViewBilling)

  const createForm = useCreateUserForm()
  const updateForm = useUpdateUserForm()

  const members = useMemo(() => membersData ?? [], [membersData])
  const roles = rolesData ?? []
  const permissions = permissionsData ?? []

  const counts = useMemo(
    () => ({
      all: members.length,
      active: members.filter(m => m.status === MemberStatus.ACTIVE).length,
      invited: members.filter(m => m.status === MemberStatus.INVITED).length,
      suspended: members.filter(m => m.status === MemberStatus.SUSPENDED).length,
    }),
    [members]
  )

  const pendingInvites = useMemo(() => pendingInvitesData ?? [], [pendingInvitesData])
  const declinedInvites = useMemo(
    () => declinedInvitesData ?? [],
    [declinedInvitesData]
  )

  // Место занимают и сотрудники, и неистёкшие приглашения (CR-10, зеркалит E-4).
  const seatLimit =
    entitlements && entitlements.enforcementEnabled && entitlements.staffSeats != null
      ? entitlements.staffSeats
      : null
  const seatsOccupied = members.length + pendingInvites.length
  const atSeatLimit = seatLimit !== null && seatsOccupied >= seatLimit

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return members.filter(m => {
      if (tab !== 'all' && m.status !== tab.toUpperCase()) return false
      if (roleFilter !== 'all' && m.roleId !== roleFilter) return false
      if (q) {
        const haystack = `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [members, tab, roleFilter, search])

  const hasFilters = Boolean(search) || roleFilter !== 'all' || tab !== 'all'

  const handleCreateMember = async (values: CreateMemberFormValues) => {
    setCreateError(null)

    // Membership is created only when this invitation is accepted.
    try {
      await createInvite.mutateAsync({
        email: values.email,
        roleId: values.roleId,
        firstName: values.firstName,
        lastName: values.lastName,
        position: values.position || undefined,
        department: values.department || undefined,
      })
      setSheetOpen(false)
      createForm.reset()
    } catch (error) {
      const apiError = error as ApiError
      const code = (apiError.details as { code?: string } | undefined)?.code

      // C-9: 409 BILLING_CAP_EXCEEDED (STAFF_SEATS) → at-limit панель с
      // deep-link'ом «Запросить апгрейд» вместо сырого сообщения об ошибке.
      const billingError = mapBillingError(error)
      if (billingError) {
        setSeatLimitError(billingError)
        return
      }

      if (code === 'PENDING_INVITE_ALREADY_EXISTS') {
        const conflict = (
          apiError.details as { details?: PendingInviteConflictDetails } | undefined
        )?.details
        if (conflict?.inviteId && conflict.canResend) {
          try {
            await resendOrgInvite.mutateAsync(conflict.inviteId)
            setSheetOpen(false)
            createForm.reset()
            return
          } catch {
            /* fall through to inline error */
          }
        }
        setCreateError(t('security.invite.errors.PENDING_INVITE_ALREADY_EXISTS'))
        return
      }

      if (code === 'USER_ALREADY_ORGANIZATION_MEMBER') {
        setCreateError(t('security.invite.errors.USER_ALREADY_ORGANIZATION_MEMBER'))
        return
      }

      setCreateError(apiError.message || t('toasts.users.createError'))
    }
  }

  const handleUpdateMember = async (values: UpdateMemberFormValues) => {
    if (!editingMember) return
    try {
      await updateMember.mutateAsync({
        memberId: editingMember.id,
        data: toUpdateMemberRequest(values),
      })
      setSheetOpen(false)
      setEditingMember(null)
      updateForm.reset()
    } catch {
      /* handled in hook */
    }
  }

  const handleChangeRole = (member: OrganizationMember, roleId: string) => {
    if (roleId === member.roleId) return
    updateMember.mutate({ memberId: member.id, data: { roleId } })
  }

  const handleToggleStatus = (member: OrganizationMember) => {
    const status =
      member.status === MemberStatus.SUSPENDED ? MemberStatus.ACTIVE : MemberStatus.SUSPENDED
    updateMember.mutate({ memberId: member.id, data: { status } })
  }

  const handleDeleteMember = async () => {
    if (!deletingMember) return
    try {
      await deleteMember.mutateAsync(deletingMember.id)
      setDeletingMember(null)
    } catch {
      /* handled in hook */
    }
  }

  const handleResendInvite = (member: OrganizationMember) => {
    resendInvite.mutate(member.id)
  }

  const handleResendAllInvites = async () => {
    await Promise.allSettled(pendingInvites.map(invite => resendOrgInvite.mutateAsync(invite.id)))
    toast.success(t('users.page.invitesResent', { count: pendingInvites.length }))
  }

  const handleRevokeInvite = (inviteId: string) => {
    revokeOrgInvite.mutate(inviteId)
  }

  const handlePermissionsChange = async (newPermissions: string[]) => {
    if (!permissionsMember) return
    try {
      const updated = await updatePermissions.mutateAsync({
        memberId: permissionsMember.id,
        data: { permissionIds: newPermissions },
      })
      setPermissionsMember(updated)
    } catch {
      /* handled in hook */
    }
  }

  const handleOpenCreateSheet = () => {
    setEditingMember(null)
    setCreateError(null)
    setSeatLimitError(null)
    createForm.reset()
    createInvite.reset()
    setSheetOpen(true)
  }

  const handleOpenEditSheet = (member: OrganizationMember) => {
    setEditingMember(member)
    updateMember.reset()
    updateForm.reset({
      firstName: member.firstName,
      lastName: member.lastName,
      phone: member.phone || '',
      position: member.position || '',
      department: member.department || '',
      roleId: member.roleId,
    })
    setSheetOpen(true)
  }

  const handleCloseSheet = () => {
    setSheetOpen(false)
    setEditingMember(null)
    setCreateError(null)
    setSeatLimitError(null)
    createForm.reset()
    updateForm.reset()
    createInvite.reset()
    updateMember.reset()
  }

  const isCreating = createInvite.isPending

  const rowPendingId =
    updateMember.isPending && updateMember.variables ? updateMember.variables.memberId : null

  const tabs: PageTabItem<StatusTab>[] = [
    { id: 'all', label: t('users.page.tabAll'), count: counts.all },
    { id: 'active', label: t('users.status.active'), count: counts.active },
    { id: 'invited', label: t('users.status.invited'), count: counts.invited },
    { id: 'suspended', label: t('users.status.suspended'), count: counts.suspended },
  ]

  if (!isPermsLoading && !canRead) {
    return (
      <PermissionDenied
        title={t('users.page.noAccessTitle')}
        description={t('users.page.noAccessDescription')}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={orgName ? `${t('users.page.kicker')} · ${orgName}` : t('users.page.kicker')}
        title={t('users.page.title')}
        description={t('users.page.teamDescription')}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* C-9: живой счётчик мест тарифа (сотрудники + приглашения). */}
            {seatLimit !== null && (
              <StatusPill tone={atSeatLimit ? 'warning' : 'neutral'} size="md" dot={false}>
                {t('billing.seats.chip', {
                  used: seatsOccupied,
                  seats: plural(locale, seatLimit, SEATS_OF_PLURAL),
                })}
              </StatusPill>
            )}
            {canCreate && (
              <Button onClick={handleOpenCreateSheet} size="sm" disabled={!hasInn}>
                <UserPlus className="mr-1.5 size-4" />
                {t('users.page.invitePeople')}
              </Button>
            )}
          </div>
        }
        bottom={<PageTabs items={tabs} active={tab} onChange={setTab} />}
      />

      {isOrganizationUser(currentUser) && !hasInn && (
        <Card className="border-warning-soft bg-warning-soft">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
            <div className="flex-1 space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">
                {t('users.page.innRequiredTitle')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('users.page.innRequiredDescription')}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-1">
                <Link to="/settings">{t('users.page.goToProfile')}</Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={t('users.page.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 pl-9"
            aria-label={t('users.page.searchPlaceholder')}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder={t('users.page.allRoles')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('users.page.allRoles')}</SelectItem>
            {roles.map(role => (
              <SelectItem key={role.id} value={role.id}>
                {getRoleLabel(role)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isMembersLoading && !membersData ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={UsersIcon}
            title={t('users.page.noEmployees')}
            description={
              hasFilters ? t('users.page.tryChangingFilters') : t('users.page.addFirstEmployee')
            }
            action={
              !hasFilters && canCreate && hasInn
                ? { label: t('users.page.invitePeople'), onClick: handleOpenCreateSheet }
                : undefined
            }
          />
        </Card>
      ) : (
        <MembersTable
          members={filtered}
          roles={roles}
          currentMemberId={currentMemberId}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canManageRoles={canManageRoles}
          rowPendingId={rowPendingId}
          onChangeRole={handleChangeRole}
          onEdit={handleOpenEditSheet}
          onManagePermissions={setPermissionsMember}
          onResendInvite={handleResendInvite}
          onToggleStatus={handleToggleStatus}
          onDelete={setDeletingMember}
        />
      )}

      {canUpdate && (
        <PendingInvites
          invites={pendingInvites}
          canManage={canUpdate}
          isResending={resendOrgInvite.isPending}
          isRevoking={revokeOrgInvite.isPending}
          onResendAll={handleResendAllInvites}
          onRevoke={handleRevokeInvite}
        />
      )}

      {canUpdate && <DeclinedInvites invites={declinedInvites} />}

      <RolesPermissionsMatrix roles={roles} permissions={permissions} />

      {/* Invite / edit member */}
      <Sheet open={sheetOpen} onOpenChange={handleCloseSheet}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>
              {editingMember ? t('users.page.editEmployee') : t('users.page.invitePeople')}
            </SheetTitle>
            <SheetDescription>
              {editingMember
                ? t('users.page.editEmployeeDescription')
                : t('users.page.addEmployeeDescription')}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {/* C-9: at-limit панель при 409 STAFF_SEATS от бэкенда. */}
            {!editingMember && seatLimitError && (
              <LimitPrompt
                error={seatLimitError}
                upgradeLabel={t('billing.seats.requestUpgrade')}
                onClose={() => setSeatLimitError(null)}
              />
            )}
            {editingMember ? (
              <UserForm
                form={updateForm}
                onSubmit={handleUpdateMember}
                isLoading={updateMember.isPending}
                isEdit
                roles={roles}
                isRolesLoading={isRolesLoading}
                errorMessage={
                  updateMember.isError
                    ? ((updateMember.error as { message?: string })?.message ??
                      t('toasts.users.updateError'))
                    : undefined
                }
              />
            ) : (
              <UserForm
                form={createForm}
                onSubmit={handleCreateMember}
                isLoading={isCreating}
                roles={roles}
                isRolesLoading={isRolesLoading}
                errorMessage={createError ?? undefined}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingMember} onOpenChange={() => setDeletingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('users.page.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('users.page.deleteDescription', {
                name: `${deletingMember?.firstName ?? ''} ${deletingMember?.lastName ?? ''}`.trim(),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMember.isPending}
            >
              {deleteMember.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Configure access */}
      <Sheet open={!!permissionsMember} onOpenChange={() => setPermissionsMember(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="size-5" />
              {t('users.page.manageAccess')}
            </SheetTitle>
            <SheetDescription>
              {permissionsMember &&
                t('users.page.manageAccessDescription', {
                  name: `${permissionsMember.firstName} ${permissionsMember.lastName}`,
                })}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {permissionsMember && (
              <PermissionsEditor
                permissions={permissions}
                rolePermissions={extractPermissionIds(permissionsMember.role?.permissions)}
                memberPermissions={extractMemberPermissionIds(permissionsMember.permissions)}
                onChange={handlePermissionsChange}
                isLoading={isPermissionsLoading}
                isError={isPermissionsError}
                errorMessage={getErrorMessage(permissionsError)}
                onRetry={() => void refetchPermissions()}
                isSaving={updatePermissions.isPending}
                role={permissionsMember.role}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Skeleton className="h-9 max-w-sm flex-1" />
        <Skeleton className="h-9 w-52" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}
