import {
  useCurrentUser,
  isOrganizationUser,
  isMemberUser,
} from '@features/profile'
import {
  Card,
  CardContent,
  CardHeader,
  Skeleton,
} from '@shared/ui'

import { MemberProfileView } from './member-profile-view'
import { OrganizationProfileView } from './organization-profile-view'

export function ProfilePage() {
  const { data: currentUser, isLoading, error } = useCurrentUser()

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="w-full max-w-md border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">Ошибка загрузки профиля</p>
            <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isMemberUser(currentUser)) {
    return <MemberProfileView member={currentUser.data} isLoading={isLoading} />
  }

  if (isOrganizationUser(currentUser)) {
    return <OrganizationProfileView organization={currentUser.data} isLoading={isLoading} />
  }

  return <ProfileSkeleton />
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-1 h-4 w-40" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <Skeleton className="size-24 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
