/**
 * Детальная информация о пользователе (Sheet)
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime } from '@eventflow/i18n'
import { useLocale, useT } from '@eventflow/i18n/react'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Eye,
  EyeOff,
  FileText,
  Trash2,
  Loader2,
  Pencil,
  Link2,
  AlertTriangle,
  Archive,
  Building2,
  RotateCcw,
} from 'lucide-react'

import type { AdminUser } from '@api/services/superAdmin.types'
import { useUpdateAdminUser } from '@features/super-admin'
import { formatUserName, getUserInitials } from '@shared/lib'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  StatusPill,
  statusPillTone,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Separator,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
  Textarea,
  Switch,
} from '@shared/ui'

type UserDetailSheetProps = {
  user: AdminUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Архивировать активного пользователя. */
  onArchive: (user: AdminUser) => void
  /** Восстановить архивированного пользователя. */
  onRestore: (user: AdminUser) => void
  /** Необратимо удалить (только для архивированных). */
  onHardDelete: (user: AdminUser) => void
  onUserUpdated?: (user: AdminUser) => void
  /** Идёт операция архив/восстановление/удаление. */
  isBusy?: boolean
}

export function UserDetailSheet({
  user,
  open,
  onOpenChange,
  onArchive,
  onRestore,
  onHardDelete,
  onUserUpdated,
  isBusy,
}: UserDetailSheetProps) {
  const t = useT()
  const locale = useLocale()
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [isPublicProfile, setIsPublicProfile] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [showPhone, setShowPhone] = useState(false)
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')

  const updateUser = useUpdateAdminUser()

  useEffect(() => {
    if (user) {
      setName(formatUserName(user.firstName, user.lastName))
      setEmail(user.email)
      setPhone(user.phone ?? '')
      setLocation(user.location ?? '')
      setBio(user.bio ?? '')
      setIsEmailVerified(user.isEmailVerified)
      setIsPublicProfile(user.isPublicProfile)
      setShowEmail(user.showEmail)
      setShowPhone(user.showPhone)
      setLinkedinUrl(user.linkedinUrl ?? '')
      setInstagramUrl(user.instagramUrl ?? '')
      setFacebookUrl(user.facebookUrl ?? '')
      setWebsiteUrl(user.websiteUrl ?? '')
    }
  }, [user])

  if (!user) return null

  const fullName = formatUserName(user.firstName, user.lastName)
  const initials = getUserInitials(user.firstName, user.lastName)
  const isArchived = !!user.deletedAt

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateUser.mutate(
      {
        userId: user.id,
        data: {
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          location: location.trim() || undefined,
          bio: bio.trim() || undefined,
          isEmailVerified,
          isPublicProfile,
          showEmail,
          showPhone,
          linkedinUrl: linkedinUrl.trim() || undefined,
          instagramUrl: instagramUrl.trim() || undefined,
          facebookUrl: facebookUrl.trim() || undefined,
          websiteUrl: websiteUrl.trim() || undefined,
        },
      },
      {
        onSuccess: data => {
          setEditOpen(false)
          onUserUpdated?.(data)
        },
      }
    )
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t('admin.users.title')}</SheetTitle>
            <SheetDescription>{t('admin.users.description')}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Avatar & Name */}
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarImage src={user.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-muted text-lg font-semibold">
                  {initials || '??'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{fullName}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {isArchived ? (
                    <StatusPill tone={statusPillTone('archived')} size="sm">
                      {t('admin.statuses.archived')}
                    </StatusPill>
                  ) : null}
                  <StatusPill tone={user.isEmailVerified ? 'success' : 'warning'} size="sm">
                    {user.isEmailVerified
                      ? t('admin.users.fields.emailVerified')
                      : t('admin.statuses.notVerified')}
                  </StatusPill>
                  <Badge variant="outline" className="text-xs">
                    {user.authProvider}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact Info */}
            <Section title={t('admin.users.sections.contact')} icon={<User className="size-4" />}>
              <InfoRow icon={<Mail />} label={t('admin.users.fields.email')} value={user.email} />
              <InfoRow icon={<Phone />} label={t('admin.users.fields.phone')} value={user.phone || '—'} />
              <InfoRow
                icon={<MapPin />}
                label={t('admin.users.fields.location')}
                value={user.location || '—'}
              />
              {user.organizationName ? (
                <InfoRow
                  icon={<Building2 />}
                  label={t('admin.tables.columns.organization')}
                  value={
                    <Link
                      to={`/admin/organizations?search=${encodeURIComponent(user.organizationName)}`}
                      className="text-foreground underline underline-offset-2 hover:opacity-80"
                    >
                      {user.organizationName}
                    </Link>
                  }
                />
              ) : null}
            </Section>

            <Separator />

            {/* Privacy Settings */}
            <Section title={t('admin.users.sections.privacy')} icon={<Shield className="size-4" />}>
              <InfoRow
                icon={user.isPublicProfile ? <Eye /> : <EyeOff />}
                label={t('admin.users.fields.publicProfile')}
                value={
                  <StatusPill tone={user.isPublicProfile ? 'success' : 'neutral'} size="sm">
                    {user.isPublicProfile ? t('admin.statuses.yes') : t('admin.statuses.no')}
                  </StatusPill>
                }
              />
              <InfoRow
                icon={<Mail />}
                label={t('admin.users.fields.showEmail')}
                value={user.showEmail ? t('admin.statuses.yes') : t('admin.statuses.no')}
              />
              <InfoRow
                icon={<Phone />}
                label={t('admin.users.fields.showPhone')}
                value={user.showPhone ? t('admin.statuses.yes') : t('admin.statuses.no')}
              />
            </Section>

            <Separator />

            {/* Dates */}
            <Section title={t('admin.users.sections.dates')} icon={<Calendar className="size-4" />}>
              <InfoRow
                icon={<Calendar />}
                label={t('admin.users.fields.registration')}
                value={formatDateTime(user.createdAt, locale)}
              />
              <InfoRow
                icon={<Calendar />}
                label={t('admin.users.fields.lastUpdate')}
                value={formatDateTime(user.updatedAt, locale)}
              />
            </Section>

            {/* Bio */}
            {user.bio && (
              <>
                <Separator />
                <Section title={t('admin.users.sections.about')} icon={<FileText className="size-4" />}>
                  <p className="text-sm text-muted-foreground">{user.bio}</p>
                </Section>
              </>
            )}

            {/* Social links */}
            {(user.linkedinUrl ||
              user.instagramUrl ||
              user.facebookUrl ||
              user.websiteUrl) && (
              <>
                <Separator />
                <Section title={t('admin.users.sections.social')} icon={<Link2 className="size-4" />}>
                  {user.linkedinUrl && (
                    <InfoRow
                      icon={<Link2 />}
                      label={t('admin.users.fields.linkedin')}
                      value={
                        <a
                          href={user.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          {user.linkedinUrl}
                        </a>
                      }
                    />
                  )}
                  {user.instagramUrl && (
                    <InfoRow
                      icon={<Link2 />}
                      label={t('admin.users.fields.instagram')}
                      value={
                        <a
                          href={user.instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          {user.instagramUrl}
                        </a>
                      }
                    />
                  )}
                  {user.facebookUrl && (
                    <InfoRow
                      icon={<Link2 />}
                      label={t('admin.users.fields.facebook')}
                      value={
                        <a
                          href={user.facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          {user.facebookUrl}
                        </a>
                      }
                    />
                  )}
                  {user.websiteUrl && (
                    <InfoRow
                      icon={<Link2 />}
                      label={t('admin.users.fields.website')}
                      value={
                        <a
                          href={user.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          {user.websiteUrl}
                        </a>
                      }
                    />
                  )}
                </Section>
              </>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setEditOpen(true)}
                disabled={isBusy}
              >
                <Pencil className="mr-2 size-4" />
                {t('admin.actions.edit')}
              </Button>
            </div>

            {/* Опасная зона — отделена от обычных действий, зависит от состояния */}
            <div className="space-y-3 rounded-lg border border-destructive/40 bg-danger-soft/40 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertTriangle className="size-4" />
                {t('admin.dangerZone.title')}
              </div>

              {isArchived ? (
                <>
                  {/* Метаданные архивации */}
                  <dl className="space-y-1.5 rounded-md bg-background/60 p-3 text-sm">
                    <DetailRow
                      label={t('admin.fields.archivedAt')}
                      value={user.deletedAt ? formatDateTime(user.deletedAt, locale) : '—'}
                    />
                    <DetailRow
                      label={t('admin.fields.archivedBy')}
                      value={user.archivedByName || '—'}
                    />
                    {user.archiveReason ? (
                      <DetailRow
                        label={t('admin.fields.archiveReason')}
                        value={user.archiveReason}
                      />
                    ) : null}
                  </dl>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={isBusy}
                    onClick={() => onRestore(user)}
                  >
                    <RotateCcw className="mr-2 size-4" />
                    {t('admin.actions.restoreUser')}
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={isBusy}
                    onClick={() => onHardDelete(user)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    {t('admin.actions.hardDeleteUser')}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    {t('admin.dangerZone.userArchiveHint')}
                  </p>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={isBusy}
                    onClick={() => onArchive(user)}
                  >
                    <Archive className="mr-2 size-4" />
                    {t('admin.actions.archiveUser')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('admin.dialogs.editUserTitle')}</DialogTitle>
            <DialogDescription>{t('admin.dialogs.editDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('admin.users.fields.name')}</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('admin.users.placeholders.name')}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">{t('admin.users.fields.email')}</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">{t('admin.users.fields.phone')}</Label>
              <Input
                id="edit-phone"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+7 ..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">{t('admin.users.fields.location')}</Label>
              <Input
                id="edit-location"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder={t('admin.users.placeholders.location')}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-bio">{t('admin.users.fields.bio')}</Label>
              <Textarea
                id="edit-bio"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder={t('admin.users.placeholders.bio')}
                rows={3}
                maxLength={2000}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-linkedin">{t('admin.users.fields.linkedin')}</Label>
              <Input
                id="edit-linkedin"
                type="url"
                value={linkedinUrl}
                onChange={e => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-instagram">{t('admin.users.fields.instagram')}</Label>
              <Input
                id="edit-instagram"
                type="url"
                value={instagramUrl}
                onChange={e => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-facebook">{t('admin.users.fields.facebook')}</Label>
              <Input
                id="edit-facebook"
                type="url"
                value={facebookUrl}
                onChange={e => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-website">{t('admin.users.fields.personalWebsite')}</Label>
              <Input
                id="edit-website"
                type="url"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-email-verified">{t('admin.users.fields.emailVerified')}</Label>
                <Switch
                  id="edit-email-verified"
                  checked={isEmailVerified}
                  onCheckedChange={setIsEmailVerified}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-public">{t('admin.users.fields.publicProfile')}</Label>
                <Switch
                  id="edit-public"
                  checked={isPublicProfile}
                  onCheckedChange={setIsPublicProfile}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-show-email">{t('admin.users.fields.showEmail')}</Label>
                <Switch id="edit-show-email" checked={showEmail} onCheckedChange={setShowEmail} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-show-phone">{t('admin.users.fields.showPhone')}</Label>
                <Switch id="edit-show-phone" checked={showPhone} onCheckedChange={setShowPhone} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                {t('admin.actions.cancel')}
              </Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {t('admin.actions.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ================================
// Helper Components
// ================================

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <h4 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className="[&>svg]:size-4">{icon}</span>
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  )
}
