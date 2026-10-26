import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserType, OrganizationVerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { ICurrentUser } from '../interfaces';

/**
 * Guard проверяет что организация верифицирована супер-админом.
 * Используется для защиты действий, требующих одобренного статуса организации
 * (например, отправка события на модерацию).
 */
@Injectable()
export class VerifiedOrganizationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: ICurrentUser = request.user;

    // Пропускаем если не организация и не сотрудник
    if (user.type !== UserType.ORGANIZATION && user.type !== UserType.MEMBER) {
      return true;
    }

    const organizationId =
      user.type === UserType.ORGANIZATION ? user.sub : user.organizationId;

    if (!organizationId) {
      throw new ForbiddenException('Организация не найдена');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { verificationStatus: true, rejectionReason: true },
    });

    if (!organization) {
      throw new ForbiddenException('Организация не найдена');
    }

    if (
      organization.verificationStatus !==
      OrganizationVerificationStatus.APPROVED
    ) {
      const statusMessages: Record<OrganizationVerificationStatus, string> = {
        [OrganizationVerificationStatus.PENDING]:
          'Ваша организация ожидает верификации супер-админом',
        [OrganizationVerificationStatus.REJECTED]: organization.rejectionReason
          ? `Ваша организация отклонена: ${organization.rejectionReason}`
          : 'Ваша организация отклонена',
        [OrganizationVerificationStatus.APPROVED]: '',
      };

      throw new ForbiddenException(
        statusMessages[organization.verificationStatus],
      );
    }

    return true;
  }
}
