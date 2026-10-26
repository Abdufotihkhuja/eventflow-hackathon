import { Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useT } from '@eventflow/i18n/react'

import { getMediaUrl } from '@api/config'
import type { MemberProfile } from '@api/services/member.types'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  PageHeader,
} from '@shared/ui'

import { SettingsSection } from './settings-section'

type MemberSettingsViewProps = {
  member: MemberProfile
}

export function MemberSettingsView({ member }: MemberSettingsViewProps) {
  const t = useT()
  const org = member.organization

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('settings.organizationKicker')}
        title={t('workspace.layout.routes.settings.title')}
        description={t('settings.member.description')}
      />

      <div className="mx-auto max-w-[820px] space-y-5">
        <SettingsSection
          id="organization"
          title={t('settings.member.organizationTitle')}
          description={t('settings.member.organizationDescription')}
        >
          <div className="flex items-center gap-4">
            <Avatar className="size-14 rounded-xl border border-border">
              <AvatarImage src={getMediaUrl(org?.logoUrl)} alt={org?.name} className="rounded-xl" />
              <AvatarFallback className="rounded-xl bg-secondary text-lg font-semibold text-foreground">
                {org?.name?.[0]?.toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-foreground">{org?.name}</p>
              {org?.companyName && org.companyName !== org.name && (
                <p className="truncate text-sm text-muted-foreground">{org.companyName}</p>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-border bg-secondary/50 p-3.5">
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {t('settings.member.readonlyNote')}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/profile">{t('settings.member.goToProfile')}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/security">{t('settings.member.goToSecurity')}</Link>
            </Button>
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}
