import { SetMetadata } from '@nestjs/common';
import { MembershipKind } from '@prisma/client';

export const REQUIRE_MEMBERSHIP_KEY = 'requireMembership';

export const RequireMembership = (...kinds: MembershipKind[]) =>
  SetMetadata(REQUIRE_MEMBERSHIP_KEY, kinds);
