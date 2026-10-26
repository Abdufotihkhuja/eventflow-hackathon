/**
 * Страница управления сотрудниками организации
 *
 * Использует API: /api/v1/organizations/members
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '@eventflow/i18n/react'
import {
  AlertCircle,
  Filter,
  Plus,
  Search,
  UserPlus,
  Users as UsersIcon,
  Loader2,
  Settings,
} from 'lucide-react'

import type {
  CreateMemberRequest,
  OrganizationMember,
  MemberPermission,
  RolePermission,
  UpdateMemberRequest,
} from '@api/services'
import { MemberStatus, MEMBER_STATUS_LABEL_KEYS } from '@api/services'
import { useCurrentUser } from '@features/profile'
import {
  useCreateUserForm,
  useUpdateUserForm,
  UserForm,
  useMembersQuery,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
  useResendMemberInvite,
  useRolesQuery,
  usePermissionsQuery,
  useUpdateMemberPermissions,
  PermissionsEditor,
  type CreateMemberFormValues,
  type UpdateMemberFormValues,
} from '@features/users'
import { cn } from '@shared/lib/cn'
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
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@shared/ui'

import { UserCard } from './user-card'
import { UsersPageSkeleton } from './users-page-skeleton'

/**
 * Извлекает id прав из массива (может быть string[] или RolePermission[])
 */
function extractPermissionIds(permissions?: string[] | RolePermission[]): string[] {
  if (!permissions || permissions.length === 0) return []

  // Если первый элемент строка — массив id
  if (typeof permissions[0] === 'string') {
    return permissions as string[]
  }

  // Массив объектов RolePermission
  return (permissions as RolePermission[]).map(p => p.permissionId)
}

/**
 * Извлекает id прав из массива MemberPermission
 */
function extractMemberPermissionIds(permissions?: MemberPermission[]): string[] {
  if (!permissions || permissions.length === 0) return []
  return permissions.map(p => p.permissionId)
}

function emptyToUndefined(value?: string | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function normalizePhone(value?: string | null): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  return trimmed.replace(/[\s()-]/g, '')
}

function toCreateMemberRequest(values: CreateMemberFormValues): CreateMemberRequest {
  return {
    ...values,
    phone: normalizePhone(values.phone),
    position: emptyToUndefined(values.position),
    department: emptyToUndefined(values.department),
  }
}

function toUpdateMemberRequest(values: UpdateMemberFormValues): UpdateMemberRequest {
  return {
    ...values,
    phone: normalizePhone(values.phone),
  }
}

export default function UsersPage() {
  const t = useT()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'all'>('all')

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null)
  const [deletingMember, setDeletingMember] = useState<OrganizationMember | null>(null)
  const [permissionsMember, setPermissionsMember] = useState<OrganizationMember | null>(null)

  // Проверяем наличие ИНН организации
  const { data: currentUser } = useCurrentUser()
  const hasInn = Boolean(currentUser?.type === 'organization' ? currentUser.data.inn : null)

  // API Hooks
  const { data: membersData, isLoading: isMembersLoading } = useMembersQuery({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    roleId: roleFilter !== 'all' ? roleFilter : undefined,
  })

  const { data: rolesData, isLoading: isRolesLoading } = useRolesQuery()
  const { data: permissionsData, isLoading: isPermissionsLoading } = usePermissionsQuery()
  const createMember = useCreateMember()
  const updateMember = useUpdateMember()
  const deleteMember = useDeleteMember()
  const resendInvite = useResendMemberInvite()
  const updatePermissions = useUpdateMemberPermissions()

  const createForm = useCreateUserForm()
  const updateForm = useUpdateUserForm()

  // API возвращает массивы напрямую
  const members = membersData ?? []
  const roles = rolesData ?? []
  const permissions = permissionsData ?? []

  // Статистика
  const stats = useMemo(() => {
    return {
      total: members.length,
      active: members.filter(m => m.status === MemberStatus.ACTIVE).length,
      invited: members.filter(m => m.status === MemberStatus.INVITED).length,
      suspended: members.filter(m => m.status === MemberStatus.SUSPENDED).length,
    }
  }, [members])

  const handleCreateMember = async (values: CreateMemberFormValues) => {
    try {
      await createMember.mutateAsync(toCreateMemberRequest(values))
      setSheetOpen(false)
      createForm.reset()
    } catch {
      // Ошибка обработана в хуке
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
      // Ошибка обработана в хуке
    }
  }

  const handleDeleteMember = async () => {
    if (!deletingMember) return

    try {
      await deleteMember.mutateAsync(deletingMember.id)
      setDeletingMember(null)
    } catch {
      // Ошибка обработана в хуке
    }
  }

  const handleResendInvite = async (member: OrganizationMember) => {
    await resendInvite.mutateAsync(member.id)
  }

  const handleOpenPermissionsSheet = (member: OrganizationMember) => {
    setPermissionsMember(member)
  }

  const handleClosePermissionsSheet = () => {
    setPermissionsMember(null)
  }

  const handlePermissionsChange = async (newPermissions: string[]) => {
    if (!permissionsMember) return

    try {
      const updatedMember = await updatePermissions.mutateAsync({
        memberId: permissionsMember.id,
        data: { permissionIds: newPermissions },
      })
      // Обновляем state с новыми данными от API
      setPermissionsMember(updatedMember)
    } catch {
      // Ошибка обработана в хуке
    }
  }

  const handleToggleStatus = async (member: OrganizationMember) => {
    const newStatus =
      member.status === MemberStatus.SUSPENDED ? MemberStatus.ACTIVE : MemberStatus.SUSPENDED

    await updateMember.mutateAsync({
      memberId: member.id,
      data: { status: newStatus },
    })
  }

  const handleOpenCreateSheet = () => {
    setEditingMember(null)
    createForm.reset()
    setSheetOpen(true)
  }

  const handleOpenEditSheet = (member: OrganizationMember) => {
    setEditingMember(member)
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
    createForm.reset()
    updateForm.reset()
  }

  const statsData = [
    { label: t('users.page.statsTotal'), value: stats.total, color: 'text-foreground', bg: 'bg-muted/50' },
    {
      label: t('users.page.statsActive'),
      value: stats.active,
      color: 'text-success-soft-foreground',
      bg: 'bg-success-soft',
    },
    {
      label: t('users.page.statsInvited'),
      value: stats.invited,
      color: 'text-info-soft-foreground',
      bg: 'bg-info-soft',
    },
    {
      label: t('users.page.statsSuspended'),
      value: stats.suspended,
      color: 'text-danger-soft-foreground',
      bg: 'bg-danger-soft',
    },
  ]

  if (isMembersLoading && !membersData) {
    return <UsersPageSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Предупреждение об отсутствии ИНН */}
      {!hasInn && (
        <div className="rounded-lg border border-warning/20 bg-warning-soft p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-warning" />
            <div className="flex-1">
              <h3 className="font-medium text-warning-soft-foreground">
                {t('users.page.innRequiredTitle')}
              </h3>
              <p className="mt-1 text-sm text-warning-soft-foreground/90">
                {t('users.page.innRequiredDescription')}
              </p>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-3 border-warning/40 text-warning-soft-foreground hover:bg-warning-soft/60"
              >
                <Link to="/profile">{t('users.page.goToProfile')}</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Заголовок */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('users.page.teamManagement')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('users.page.teamDescription')}
          </p>
        </div>
        <Button onClick={handleOpenCreateSheet} className="gap-2" disabled={!hasInn}>
          <UserPlus className="size-4" />
          {t('users.page.addEmployee')}
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statsData.map(stat => (
          <div key={stat.label} className={cn('rounded-lg px-4 py-3', stat.bg)}>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={cn('mt-1 text-2xl font-semibold tabular-nums', stat.color)}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Фильтры */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('admin.filters.searchByNameOrEmail')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="size-4" />
              {t('admin.filters.filters')}
            </div>

            {/* Фильтр по ролям */}
            <div className="flex flex-wrap gap-1.5">
              <FilterButton active={roleFilter === 'all'} onClick={() => setRoleFilter('all')}>
                {t('users.page.allRoles')}
              </FilterButton>
              {roles.map(role => (
                <FilterButton
                  key={role.id}
                  active={roleFilter === role.id}
                  onClick={() => setRoleFilter(role.id)}
                >
                  {role.name}
                </FilterButton>
              ))}
            </div>

            {/* Фильтр по статусам */}
            <div className="flex flex-wrap gap-1.5">
              <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                {t('admin.filters.allStatuses')}
              </FilterButton>
              {Object.entries(MEMBER_STATUS_LABEL_KEYS).map(([status, labelKey]) => (
                <FilterButton
                  key={status}
                  active={statusFilter === status}
                  onClick={() => setStatusFilter(status as MemberStatus)}
                >
                  {t(labelKey)}
                </FilterButton>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Список */}
      {isMembersLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : members.length === 0 ? (
        <Card className="py-12">
          <div className="text-center">
            <UsersIcon className="mx-auto size-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-medium">{t('users.page.noEmployees')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search || roleFilter !== 'all' || statusFilter !== 'all'
                ? t('users.page.tryChangingFilters')
                : t('users.page.addFirstEmployee')}
            </p>
            {!search && roleFilter === 'all' && statusFilter === 'all' && (
              <Button onClick={handleOpenCreateSheet} className="mt-4 gap-2" disabled={!hasInn}>
                <Plus className="size-4" />
                {t('admin.actions.add')}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map(member => (
            <UserCard
              key={member.id}
              member={member}
              roles={roles}
              onEdit={handleOpenEditSheet}
              onDelete={setDeletingMember}
              onToggleStatus={handleToggleStatus}
              onResendInvite={handleResendInvite}
              onManagePermissions={handleOpenPermissionsSheet}
            />
          ))}
        </div>
      )}

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={handleCloseSheet}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>
              {editingMember ? t('users.page.editEmployee') : t('users.page.addEmployeeTitle')}
            </SheetTitle>
            <SheetDescription>
              {editingMember
                ? t('users.page.editEmployeeDescription')
                : t('users.page.addEmployeeDescription')}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {editingMember ? (
              <UserForm
                form={updateForm}
                onSubmit={handleUpdateMember}
                isLoading={updateMember.isPending}
                isEdit
                roles={roles}
                isRolesLoading={isRolesLoading}
              />
            ) : (
              <UserForm
                form={createForm}
                onSubmit={handleCreateMember}
                isLoading={createMember.isPending}
                roles={roles}
                isRolesLoading={isRolesLoading}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Диалог удаления */}
      <AlertDialog open={!!deletingMember} onOpenChange={() => setDeletingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('users.page.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingMember
                ? t('users.page.deleteDescription', {
                    name: `${deletingMember.firstName} ${deletingMember.lastName}`,
                  })
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMember.isPending}
            >
              {deleteMember.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              {t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sheet управления правами */}
      <Sheet open={!!permissionsMember} onOpenChange={handleClosePermissionsSheet}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="size-5" />
              {t('users.page.manageAccess')}
            </SheetTitle>
            <SheetDescription>
              {permissionsMember
                ? t('users.page.manageAccessDescription', {
                    name: `${permissionsMember.firstName} ${permissionsMember.lastName}`,
                  })
                : ''}
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

type FilterButtonProps = {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function FilterButton({ active, onClick, children }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-background text-muted-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  )
}
