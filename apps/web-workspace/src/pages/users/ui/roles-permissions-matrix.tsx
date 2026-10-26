import { useMemo } from 'react'
import { useT } from '@eventflow/i18n/react'

import {
  getOrganizationRoleLabel,
  type OrgPermission,
  type OrganizationRole,
  type RolePermission,
} from '@api/services'
import { cn } from '@shared/lib/cn'

// Show a readable subset of capability areas, in priority order, only when present.
const CATEGORY_PRIORITY = [
  'events',
  'registrations',
  'attendance',
  'members',
  'analytics',
  'settings',
]
const MAX_CATEGORIES = 6

function rolePermissionIds(role: OrganizationRole): Set<string> {
  const perms = role.permissions
  if (!perms || perms.length === 0) return new Set()
  if (typeof perms[0] === 'string') return new Set(perms as string[])
  return new Set((perms as RolePermission[]).map(p => p.permissionId))
}

type RolesPermissionsMatrixProps = {
  roles: OrganizationRole[]
  permissions: OrgPermission[]
}

export function RolesPermissionsMatrix({ roles, permissions }: RolesPermissionsMatrixProps) {
  const t = useT()
  const roleLabel = getOrganizationRoleLabel(t)

  const { categories, byRole } = useMemo(() => {
    const catToPermIds = new Map<string, Set<string>>()
    for (const p of permissions) {
      if (!p.category) continue
      if (!catToPermIds.has(p.category)) catToPermIds.set(p.category, new Set())
      catToPermIds.get(p.category)!.add(p.id)
    }

    const present = Array.from(catToPermIds.keys())
    const ordered = [
      ...CATEGORY_PRIORITY.filter(c => present.includes(c)),
      ...present.filter(c => !CATEGORY_PRIORITY.includes(c)),
    ].slice(0, MAX_CATEGORIES)

    const byRole = new Map<string, Map<string, 'full' | 'partial' | 'none'>>()
    for (const role of roles) {
      const held = rolePermissionIds(role)
      const cells = new Map<string, 'full' | 'partial' | 'none'>()
      for (const cat of ordered) {
        const all = catToPermIds.get(cat)!
        let have = 0
        for (const id of all) if (held.has(id)) have += 1
        cells.set(cat, have === 0 ? 'none' : have >= all.size ? 'full' : 'partial')
      }
      byRole.set(role.id, cells)
    }

    return { categories: ordered, byRole }
  }, [permissions, roles])

  if (roles.length === 0 || categories.length === 0) return null

  const categoryLabel = (cat: string) => {
    const key = `users.permissionEditor.modules.${cat}`
    const label = t(key)
    return label === key ? cat : label
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6 sm:p-7">
      <div className="space-y-1.5">
        <h2 className="text-base font-semibold tracking-[-0.01em] text-foreground">
          {t('users.page.rolesTitle')}
        </h2>
        <p className="text-[13.5px] text-muted-foreground">{t('users.page.rolesDescription')}</p>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2.5 pr-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {t('users.page.capability')}
              </th>
              {roles.map(role => (
                <th
                  key={role.id}
                  className="px-3 py-2.5 text-left text-[12.5px] font-semibold text-foreground"
                >
                  {roleLabel(role)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat} className="border-b border-border last:border-b-0">
                <td className="py-3 pr-4 text-[13px] font-medium text-foreground">
                  {categoryLabel(cat)}
                </td>
                {roles.map(role => {
                  const level = byRole.get(role.id)?.get(cat) ?? 'none'
                  return (
                    <td key={role.id} className="px-3 py-3">
                      <Cell level={level} t={t} />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Cell({ level, t }: { level: 'full' | 'partial' | 'none'; t: (k: string) => string }) {
  if (level === 'none') return <span className="text-sm text-muted-foreground/50">—</span>
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
        level === 'full'
          ? 'bg-success-soft text-success-soft-foreground'
          : 'bg-sunken text-fg-muted'
      )}
    >
      {level === 'full' ? t('users.page.permFull') : t('users.page.permPartial')}
    </span>
  )
}
