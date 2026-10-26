import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import type { ICurrentUser } from '../../../common/interfaces';
import {
  ActorKind,
  MemberStatus,
  PlatformRole,
  UserType,
} from '@prisma/client';
import { IamService } from '../../iam/iam.service';
import { AccessMaskService } from '../../access-mask/access-mask.service';
import { readWebAccessCookie } from '../web-session.util';
import type { Request } from 'express';

interface JwtPayload {
  sub: string;
  type: UserType;
  email: string;
  organizationId?: string;
  accountId?: string;
  actorKind?: ActorKind;
  activeWorkspaceId?: string;
  platformRole?: PlatformRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly iamService: IamService,
    private readonly accessMask: AccessMaskService,
  ) {
    const secret = configService.get<string>('jwt.secret');
    if (!secret) {
      throw new Error(
        'JWT_SECRET is not configured. Application cannot start without it.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) => readWebAccessCookie(request) ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      // Пиним алгоритм: принимаем только HS256, которым подписываем. Без этого
      // верификатор доверяет alg из заголовка токена — defense-in-depth против
      // alg-confusion (в т.ч. попыток "none"/подмены на асимметричный).
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<ICurrentUser> {
    const { sub, type, email, organizationId } = payload;

    // Проверяем существование пользователя в зависимости от типа
    switch (type) {
      case UserType.USER: {
        const user = await this.prisma.user.findUnique({ where: { id: sub } });
        // deletedAt: архивированный (soft-deleted) аккаунт не должен
        // аутентифицироваться до истечения access-токена. Логин/refresh уже
        // это проверяют — здесь закрываем окно между архивацией и exp.
        if (!user || user.deletedAt) {
          throw new UnauthorizedException('Пользователь не найден');
        }
        break;
      }
      case UserType.ORGANIZATION: {
        const org = await this.prisma.organization.findUnique({
          where: { id: sub },
        });
        if (!org || org.deletedAt || org.suspendedAt) {
          throw new UnauthorizedException('Организация не найдена');
        }
        break;
      }
      case UserType.MEMBER: {
        const member = await this.prisma.organizationMember.findUnique({
          where: { id: sub },
          include: {
            organization: { select: { deletedAt: true, suspendedAt: true } },
            role: {
              include: { permissions: { include: { permission: true } } },
            },
            permissions: { include: { permission: true } },
          },
        });
        if (
          !member ||
          member.deletedAt ||
          member.organization.deletedAt ||
          member.organization.suspendedAt
        ) {
          throw new UnauthorizedException('Сотрудник не найден');
        }

        // Проверяем статус сотрудника
        if (member.status === MemberStatus.SUSPENDED) {
          throw new UnauthorizedException('Аккаунт приостановлен');
        }
        if (member.status === MemberStatus.INVITED) {
          throw new UnauthorizedException('Аккаунт не активирован');
        }

        // Собираем все права: от роли + индивидуальные
        const rolePermissions = member.role.permissions.map(
          (rp) => rp.permission.code,
        );
        const memberPermissions = member.permissions.map(
          (mp) => mp.permission.code,
        );
        const allPermissions = [
          ...new Set([...rolePermissions, ...memberPermissions]),
        ];

        // Маска доступа организации (тонкое управление супер-админа): вычитаем
        // закрытые коды из эффективных прав члена. Читается на каждом запросе,
        // поэтому закрытие модуля применяется мгновенно без релогина.
        const deniedForMember = await this.accessMask.getDeniedCodes(
          member.organizationId,
        );
        const effectivePermissions = allPermissions.filter(
          (code) => !deniedForMember.has(code),
        );

        const sessionContext = await this.iamService.resolveSessionContext({
          sub,
          type,
        });

        return {
          sub,
          type,
          email,
          organizationId,
          permissions: effectivePermissions,
          accessDeniedPermissions: [...deniedForMember],
          accountId: sessionContext.accountId,
          actorKind: sessionContext.actorKind,
          activeWorkspaceId: sessionContext.activeWorkspaceId,
          platformRole: sessionContext.platformRole,
          currentAccount: sessionContext.currentAccount,
          activeWorkspace: sessionContext.activeWorkspace,
          memberships: sessionContext.memberships,
        };
      }
      case UserType.SUPER_ADMIN: {
        const admin = await this.prisma.superAdmin.findUnique({
          where: { id: sub },
        });
        if (!admin || admin.deletedAt) {
          throw new UnauthorizedException('Администратор не найден');
        }
        break;
      }
      default:
        throw new UnauthorizedException('Неизвестный тип пользователя');
    }

    const sessionContext = await this.iamService.resolveSessionContext({
      sub,
      type,
    });

    // Маска доступа для владельца (UserType.ORGANIZATION): у него нет
    // материализованного списка прав, поэтому передаём закрытые коды —
    // PermissionsGuard применит их вместо безусловного «всё разрешено».
    // Для владельца sub — это id организации.
    const accessDeniedPermissions =
      type === UserType.ORGANIZATION
        ? [...(await this.accessMask.getDeniedCodes(sub))]
        : undefined;

    return {
      sub,
      type,
      email,
      organizationId,
      accessDeniedPermissions,
      accountId: sessionContext.accountId,
      actorKind: sessionContext.actorKind,
      activeWorkspaceId: sessionContext.activeWorkspaceId,
      platformRole: sessionContext.platformRole,
      currentAccount: sessionContext.currentAccount,
      activeWorkspace: sessionContext.activeWorkspace,
      memberships: sessionContext.memberships,
    };
  }
}
