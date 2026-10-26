import {
  ActorKind,
  MembershipKind,
  PlatformRole,
  UserType,
} from '@prisma/client';

export interface ICurrentSessionAccount {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
}

export interface ICurrentSessionWorkspace {
  id: string;
  name: string;
  companyName?: string | null;
  email: string;
  logoUrl?: string | null;
  verificationStatus?: string;
}

export interface ICurrentSessionMembership {
  id: string;
  kind: MembershipKind;
  roleName?: string | null;
  permissions: string[];
  workspace: ICurrentSessionWorkspace;
  organizationMemberId?: string | null;
}

export interface ICurrentUser {
  sub: string;
  type: UserType;
  email: string;
  organizationId?: string;
  /** Права члена ПОСЛЕ вычета маски доступа организации (E-2 источник). */
  permissions?: string[];
  /**
   * Коды прав, закрытых маской доступа организации (тонкое управление
   * супер-админа). Для владельца (UserType.ORGANIZATION) — единственный
   * способ применить маску (у него нет материализованного списка прав).
   */
  accessDeniedPermissions?: string[];
  accountId?: string;
  actorKind?: ActorKind;
  activeWorkspaceId?: string;
  platformRole?: PlatformRole;
  currentAccount?: ICurrentSessionAccount;
  activeWorkspace?: ICurrentSessionWorkspace | null;
  memberships?: ICurrentSessionMembership[];
}
