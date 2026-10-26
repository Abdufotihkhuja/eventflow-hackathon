import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuthProvider,
  MemberStatus,
  MembershipKind,
  Organization,
  Prisma,
  UserType,
  VerificationCodeType,
} from '@prisma/client';
import {
  RegisterUserDto,
  RegisterOrganizationDto,
  LoginDto,
  MemberLoginDto,
  TokensResponseDto,
  ChangePasswordDto,
  SessionResponseDto,
} from './dto';
import { GoogleProfile } from './strategies/google.strategy';
import { LinkedInProfile } from './strategies/linkedin.strategy';
import type { ICurrentUser } from '../../common/interfaces';
import { parseFullName } from '../../common/utils/name-parser.util';
import { BCRYPT_SALT_ROUNDS } from '../../common/constants/security.constant';
import { VerificationService } from '../verification/verification.service';
import { MailService } from '../mail/mail.service';
import { IamService } from '../iam/iam.service';
import { isAccountLocale } from '../../common/constants/locale.constant';
import { DEFAULT_ROLES } from '../../common/constants/permissions.constant';

interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
  /**
   * BL-37: валидный сигнал языка клиента (из optional `locale` в login/refresh
   * DTO). После успешной аутентификации синхронизируется в `Account.locale` —
   * источник локали писем и killed-push.
   */
  locale?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Фиктивный bcrypt-хеш (случайный секрет, тот же cost). Сравниваем с ним
  // пароль, когда аккаунт не найден, чтобы время ответа не отличало
  // «нет такого email» от «неверный пароль» (timing-энумерация). Считается
  // один раз при старте.
  private readonly dummyPasswordHash = bcrypt.hashSync(
    randomBytes(32).toString('hex'),
    BCRYPT_SALT_ROUNDS,
  );

  private async wastePasswordCompare(password: string): Promise<void> {
    await bcrypt.compare(password, this.dummyPasswordHash);
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly verificationService: VerificationService,
    private readonly mailService: MailService,
    private readonly iamService: IamService,
  ) {}

  /**
   * Разбивает полное имя на firstName и lastName
   */
  private parseFullName(fullName: string): {
    firstName: string;
    lastName?: string;
  } {
    return parseFullName(fullName);
  }

  private async ensurePublicEmailIsAvailable(
    email: string,
    actorType: Extract<UserType, 'USER' | 'ORGANIZATION'>,
  ): Promise<void> {
    void actorType;
    const normalizedEmail = email.trim().toLowerCase();
    const [existingUser, existingOrganization] = await Promise.all([
      this.prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      }),
      this.prisma.organization.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      }),
    ]);

    // Единое неразличающее сообщение: не раскрываем, существует ли аккаунт и
    // какого он типа (защита от перечисления учётных записей при регистрации).
    if (existingUser || existingOrganization) {
      throw new ConflictException('Этот email недоступен для регистрации');
    }
  }

  // ==================== USER AUTH ====================

  async registerUser(
    dto: RegisterUserDto,
    metadata?: SessionMetadata,
  ): Promise<TokensResponseDto> {
    const email = dto.email.trim().toLowerCase();
    await this.ensurePublicEmailIsAvailable(email, UserType.USER);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        authProvider: AuthProvider.EMAIL,
        isEmailVerified: false, // Email не подтвержден при регистрации
      },
    });

    // Отправляем код подтверждения email
    try {
      const code = await this.verificationService.sendVerificationCode(
        user.email,
        VerificationCodeType.EMAIL_VERIFICATION,
        user.id,
      );
      await this.mailService.sendEmailVerificationCode(
        user.email,
        user.firstName,
        code,
      );
    } catch (error) {
      // Логируем ошибку, но не блокируем регистрацию
      this.logger.error(
        'Ошибка отправки кода верификации',
        error instanceof Error ? error.stack : String(error),
      );
    }

    const tokens = await this.generateTokens(
      user.id,
      UserType.USER,
      user.email,
      undefined,
      metadata,
    );

    return {
      ...tokens,
      emailVerificationRequired: true,
    };
  }

  async loginUser(
    dto: LoginDto,
    metadata?: SessionMetadata,
  ): Promise<TokensResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: dto.email.trim(), mode: 'insensitive' },
      },
    });

    if (!user || !user.passwordHash) {
      // Уравниваем время с веткой «неверный пароль» (timing-энумерация).
      await this.wastePasswordCompare(dto.password);
      throw new UnauthorizedException('Неверный email или пароль');
    }

    // Проверяем soft delete
    if (user.deletedAt) {
      throw new UnauthorizedException('Аккаунт удалён');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    return this.generateTokens(
      user.id,
      UserType.USER,
      user.email,
      undefined,
      metadata,
    );
  }

  /**
   * Account-centric login (no INN). Resolves the actor by email — organization
   * owner, public user, or legacy staff member (emails are globally unique
   * across these tables) — verifies the password and issues tokens. Goes through
   * the same {@link generateTokens} path, so the session already carries the
   * account's memberships for the organization switcher.
   *
   * A person who is both a participant and organization staff logs in here as a
   * USER and then opens a specific workspace via {@link createWorkspaceSession}.
   */
  async loginAccount(
    dto: LoginDto,
    metadata?: SessionMetadata,
  ): Promise<TokensResponseDto> {
    const email = dto.email.trim().toLowerCase();

    const organization = await this.prisma.organization.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
    });
    if (
      organization?.passwordHash &&
      (await bcrypt.compare(dto.password, organization.passwordHash))
    ) {
      return this.generateTokens(
        organization.id,
        UserType.ORGANIZATION,
        organization.email,
        undefined,
        metadata,
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
    });
    if (
      user?.passwordHash &&
      (await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      return this.generateTokens(
        user.id,
        UserType.USER,
        user.email,
        undefined,
        metadata,
      );
    }

    // Legacy staff that still authenticate against their own member password
    // (joined before the unified-account flow). New staff have a User account
    // and match above instead.
    const members = await this.prisma.organizationMember.findMany({
      where: {
        email: { equals: email, mode: 'insensitive' },
        deletedAt: null,
        status: MemberStatus.ACTIVE,
        passwordHash: { not: null },
      },
    });
    for (const member of members) {
      if (
        member.passwordHash &&
        (await bcrypt.compare(dto.password, member.passwordHash))
      ) {
        return this.generateTokens(
          member.id,
          UserType.MEMBER,
          member.email,
          member.organizationId,
          metadata,
        );
      }
    }

    // Ни один актор с таким email не найден: тратим один bcrypt-compare, чтобы
    // «нет аккаунта» не отвечал заметно быстрее «неверный пароль».
    await this.wastePasswordCompare(dto.password);
    throw new UnauthorizedException('Неверный email или пароль');
  }

  /**
   * Issues a workspace-scoped session for an account that belongs to the target
   * organization. OWNER membership → ORGANIZATION session; MEMBER membership →
   * MEMBER session for the linked staff record. Used by the org switcher and the
   * invite-accept follow-up so a unified user can enter a specific workspace
   * without a second password.
   */
  async createWorkspaceSession(
    accountId: string,
    organizationId: string,
    metadata?: SessionMetadata,
  ): Promise<TokensResponseDto> {
    const ownerMembership = await this.prisma.membership.findFirst({
      where: { accountId, organizationId, kind: MembershipKind.OWNER },
      include: { organization: true },
    });
    if (ownerMembership) {
      const org = ownerMembership.organization;
      if (org.deletedAt) {
        throw new UnauthorizedException('Организация удалена');
      }
      return this.generateTokens(
        org.id,
        UserType.ORGANIZATION,
        org.email,
        undefined,
        metadata,
      );
    }

    const resolved = await this.iamService.resolveMembershipForWorkspace({
      accountId,
      organizationId,
    });
    if (!resolved) {
      throw new ForbiddenException('Нет активного членства в этой организации');
    }
    return this.generateTokens(
      resolved.member.id,
      UserType.MEMBER,
      resolved.member.email,
      organizationId,
      metadata,
    );
  }

  async handleGoogleUserAuth(
    profile: GoogleProfile,
    metadata?: SessionMetadata,
  ): Promise<TokensResponseDto> {
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: profile.email },
          { providerId: profile.providerId, authProvider: AuthProvider.GOOGLE },
        ],
      },
    });

    if (user?.deletedAt) {
      throw new UnauthorizedException('Аккаунт удалён');
    }

    let isNewUser = false;

    if (!user) {
      await this.ensurePublicEmailIsAvailable(profile.email, UserType.USER);
      const { firstName, lastName } = this.parseFullName(profile.name);
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          firstName,
          lastName,
          authProvider: AuthProvider.GOOGLE,
          providerId: profile.providerId,
          isEmailVerified: true,
          isOnboardingCompleted: false,
        },
      });
      isNewUser = true;
    } else if (user.authProvider === AuthProvider.EMAIL) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          authProvider: AuthProvider.GOOGLE,
          providerId: profile.providerId,
          isEmailVerified: true,
        },
      });
    }

    const tokens = await this.generateTokens(
      user.id,
      UserType.USER,
      user.email,
      undefined,
      metadata,
    );

    return {
      ...tokens,
      isNewUser,
      isOnboardingCompleted: user.isOnboardingCompleted,
    };
  }

  async handleLinkedInUserAuth(
    profile: LinkedInProfile,
    metadata?: SessionMetadata,
  ): Promise<TokensResponseDto> {
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: profile.email },
          {
            providerId: profile.providerId,
            authProvider: AuthProvider.LINKEDIN,
          },
        ],
      },
    });

    if (user?.deletedAt) {
      throw new UnauthorizedException('Аккаунт удалён');
    }

    let isNewUser = false;

    if (!user) {
      await this.ensurePublicEmailIsAvailable(profile.email, UserType.USER);
      const { firstName, lastName } = this.parseFullName(profile.name);
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          firstName,
          lastName,
          authProvider: AuthProvider.LINKEDIN,
          providerId: profile.providerId,
          isEmailVerified: true,
          isOnboardingCompleted: false,
        },
      });
      isNewUser = true;
    } else if (user.authProvider === AuthProvider.EMAIL) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          authProvider: AuthProvider.LINKEDIN,
          providerId: profile.providerId,
          isEmailVerified: true,
        },
      });
    }

    const tokens = await this.generateTokens(
      user.id,
      UserType.USER,
      user.email,
      undefined,
      metadata,
    );

    return {
      ...tokens,
      isNewUser,
      isOnboardingCompleted: user.isOnboardingCompleted,
    };
  }

  // ==================== ORGANIZATION AUTH ====================

  async registerOrganization(
    dto: RegisterOrganizationDto,
    metadata?: SessionMetadata,
  ): Promise<{ message: string; emailVerificationRequired: boolean }> {
    void metadata;
    const email = dto.email.trim().toLowerCase();
    await this.ensurePublicEmailIsAvailable(email, UserType.ORGANIZATION);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const organization = await this.createOrganizationOwnerAccount({
      email,
      organizationName: dto.organizationName.trim(),
      description: dto.description?.trim() || null,
      authProvider: AuthProvider.EMAIL,
      passwordHash,
      isEmailVerified: false,
    });

    try {
      const code = await this.verificationService.sendVerificationCode(
        organization.email,
        VerificationCodeType.EMAIL_VERIFICATION,
        organization.id,
      );
      await this.mailService.sendEmailVerificationCode(
        organization.email,
        organization.name,
        code,
      );
    } catch (error) {
      this.logger.error(
        'Ошибка отправки кода верификации для организации',
        error instanceof Error ? error.stack : String(error),
      );
    }

    return {
      message:
        'Регистрация прошла успешно! Проверьте email для подтверждения адреса. После этого вы сможете создавать и управлять мероприятиями.',
      emailVerificationRequired: true,
    };
  }

  async loginOrganization(
    dto: LoginDto,
    metadata?: SessionMetadata,
  ): Promise<TokensResponseDto> {
    const organization = await this.prisma.organization.findFirst({
      where: {
        email: { equals: dto.email.trim(), mode: 'insensitive' },
      },
    });

    if (!organization || !organization.passwordHash) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    if (organization.deletedAt) {
      throw new UnauthorizedException('Аккаунт организации удалён');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      organization.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    return this.generateTokens(
      organization.id,
      UserType.ORGANIZATION,
      organization.email,
      undefined,
      metadata,
    );
  }

  async handleGoogleOrgAuth(
    profile: GoogleProfile,
    metadata?: SessionMetadata,
  ): Promise<TokensResponseDto> {
    return this.handleOrganizationOAuth(profile, AuthProvider.GOOGLE, metadata);
  }

  async handleLinkedInOrgAuth(
    profile: LinkedInProfile,
    metadata?: SessionMetadata,
  ): Promise<TokensResponseDto> {
    return this.handleOrganizationOAuth(
      profile,
      AuthProvider.LINKEDIN,
      metadata,
    );
  }

  /**
   * Creates the organization subject and its authorization graph atomically.
   *
   * A self-registered organization is deliberately NOT a personal User. The
   * Account receives only an ORGANIZATION Identity and an OWNER Membership, so
   * it can administer its workspace but cannot enter participant scope. A
   * personal user can become staff only through invite acceptance, which adds
   * a MEMBER Membership to that user's existing Account.
   */
  private async createOrganizationOwnerAccount(params: {
    email: string;
    organizationName: string;
    description?: string | null;
    authProvider: AuthProvider;
    providerId?: string | null;
    passwordHash?: string | null;
    isEmailVerified: boolean;
  }): Promise<Organization> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const [existingUser, existingOrganization] = await Promise.all([
            tx.user.findFirst({
              where: {
                email: { equals: params.email, mode: 'insensitive' },
              },
            }),
            tx.organization.findFirst({
              where: {
                email: { equals: params.email, mode: 'insensitive' },
              },
            }),
          ]);
          if (existingUser || existingOrganization) {
            throw new ConflictException(
              'Этот email недоступен для регистрации',
            );
          }

          const organization = await tx.organization.create({
            data: {
              email: params.email,
              passwordHash: params.passwordHash,
              name: params.organizationName,
              companyName: params.organizationName,
              description: params.description,
              authProvider: params.authProvider,
              providerId: params.providerId,
              isEmailVerified: params.isEmailVerified,
              isOnboardingCompleted: false,
            },
          });

          const permissions = await tx.permission.findMany();
          const permissionIds = new Map(
            permissions.map((permission) => [permission.code, permission.id]),
          );
          const roleIds = new Map<string, string>();

          for (const [roleKey, roleDefinition] of Object.entries(
            DEFAULT_ROLES,
          )) {
            const role = await tx.organizationRole.create({
              data: {
                organizationId: organization.id,
                name: roleDefinition.name,
                isSystem: roleKey === 'OWNER',
              },
            });
            roleIds.set(roleKey, role.id);

            const rolePermissions = roleDefinition.permissions.flatMap(
              (code) => {
                const permissionId = permissionIds.get(code);
                return permissionId ? [{ roleId: role.id, permissionId }] : [];
              },
            );
            if (rolePermissions.length > 0) {
              await tx.rolePermission.createMany({ data: rolePermissions });
            }
          }

          const ownerRoleId = roleIds.get('OWNER');
          if (!ownerRoleId) {
            throw new Error('OWNER role bootstrap failed');
          }

          const account = await tx.account.create({
            data: {
              email: params.email,
              displayName: params.organizationName,
              identities: {
                create: {
                  email: params.email,
                  provider: params.authProvider,
                  providerId: params.providerId,
                  passwordHash: params.passwordHash,
                  actorType: UserType.ORGANIZATION,
                  actorId: organization.id,
                },
              },
            },
          });

          await tx.membership.create({
            data: {
              accountId: account.id,
              organizationId: organization.id,
              kind: MembershipKind.OWNER,
              roleId: ownerRoleId,
              roleName: 'OWNER',
              permissions: DEFAULT_ROLES.OWNER.permissions.filter((code) =>
                permissionIds.has(code),
              ),
            },
          });

          return organization;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2034')
      ) {
        throw new ConflictException('Этот email недоступен для регистрации');
      }
      throw error;
    }
  }

  private async handleOrganizationOAuth(
    profile: GoogleProfile | LinkedInProfile,
    authProvider: Extract<AuthProvider, 'GOOGLE' | 'LINKEDIN'>,
    metadata?: SessionMetadata,
  ): Promise<TokensResponseDto> {
    const email = profile.email.trim().toLowerCase();
    let organization = await this.prisma.organization.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: 'insensitive' } },
          { providerId: profile.providerId, authProvider },
        ],
      },
    });

    if (organization?.deletedAt) {
      throw new UnauthorizedException('Аккаунт организации удалён');
    }

    let isNewUser = false;
    if (!organization) {
      await this.ensurePublicEmailIsAvailable(email, UserType.ORGANIZATION);
      organization = await this.createOrganizationOwnerAccount({
        email,
        organizationName: profile.name.trim(),
        authProvider,
        providerId: profile.providerId,
        isEmailVerified: true,
      });
      isNewUser = true;
    } else if (organization.authProvider === AuthProvider.EMAIL) {
      organization = await this.prisma.organization.update({
        where: { id: organization.id },
        data: {
          authProvider,
          providerId: profile.providerId,
          isEmailVerified: true,
        },
      });
    }

    const tokens = await this.generateTokens(
      organization.id,
      UserType.ORGANIZATION,
      organization.email,
      undefined,
      metadata,
    );

    return {
      ...tokens,
      isNewUser,
      isOnboardingCompleted: organization.isOnboardingCompleted,
    };
  }

  // ==================== MEMBER AUTH ====================

  async loginMember(
    dto: MemberLoginDto,
    metadata?: SessionMetadata,
  ): Promise<TokensResponseDto> {
    // Находим организацию по ИНН
    const organization = await this.prisma.organization.findUnique({
      where: { inn: dto.inn },
    });

    // Единое сообщение для «нет такого ИНН» и «нет такого сотрудника»: иначе
    // неаутентифицированный вызывающий может энумерировать, какие ИНН
    // зарегистрированы на платформе. Плюс dummy-compare для равного тайминга.
    if (!organization || organization.deletedAt) {
      await this.wastePasswordCompare(dto.password);
      throw new UnauthorizedException('Неверные ИНН, email или пароль');
    }

    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_email: {
          organizationId: organization.id,
          email: dto.email,
        },
      },
    });

    if (!member) {
      await this.wastePasswordCompare(dto.password);
      throw new UnauthorizedException('Неверные ИНН, email или пароль');
    }

    if (member.deletedAt) {
      throw new UnauthorizedException('Аккаунт удалён');
    }

    if (member.status === MemberStatus.SUSPENDED) {
      throw new UnauthorizedException(
        'Аккаунт приостановлен. Обратитесь к администратору организации.',
      );
    }

    if (member.status === MemberStatus.INVITED) {
      throw new UnauthorizedException(
        'Аккаунт не активирован. Проверьте email для получения инструкций.',
      );
    }

    if (!member.passwordHash) {
      throw new UnauthorizedException(
        'Аккаунт не активирован. Проверьте email для получения инструкций.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      member.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверные ИНН, email или пароль');
    }

    return this.generateTokens(
      member.id,
      UserType.MEMBER,
      member.email,
      member.organizationId,
      metadata,
    );
  }

  // ==================== SUPER ADMIN AUTH ====================

  async loginSuperAdmin(
    dto: LoginDto,
    metadata?: SessionMetadata,
  ): Promise<TokensResponseDto> {
    const admin = await this.prisma.superAdmin.findUnique({
      where: { email: dto.email },
    });

    if (!admin) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    if (admin.deletedAt) {
      throw new UnauthorizedException('Аккаунт удалён');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      admin.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    return this.generateTokens(
      admin.id,
      UserType.SUPER_ADMIN,
      admin.email,
      undefined,
      metadata,
    );
  }

  // ==================== PASSWORD MANAGEMENT ====================

  /**
   * Изменение пароля для текущего пользователя
   * Работает для всех типов пользователей: User, Organization, Member
   */
  async changePassword(
    currentUser: ICurrentUser,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    let currentPasswordHash: string | null = null;
    let updateFn: (hash: string) => Promise<void>;

    switch (currentUser.type) {
      case UserType.USER: {
        const user = await this.prisma.user.findUnique({
          where: { id: currentUser.sub },
        });
        if (!user || user.deletedAt) {
          throw new NotFoundException('Пользователь не найден');
        }
        currentPasswordHash = user.passwordHash;
        updateFn = async (hash: string) => {
          await this.prisma.user.update({
            where: { id: currentUser.sub },
            data: { passwordHash: hash },
          });
        };
        break;
      }
      case UserType.ORGANIZATION: {
        const org = await this.prisma.organization.findUnique({
          where: { id: currentUser.sub },
        });
        if (!org || org.deletedAt) {
          throw new NotFoundException('Организация не найдена');
        }
        currentPasswordHash = org.passwordHash;
        updateFn = async (hash: string) => {
          await this.prisma.organization.update({
            where: { id: currentUser.sub },
            data: { passwordHash: hash },
          });
        };
        break;
      }
      case UserType.MEMBER: {
        const member = await this.prisma.organizationMember.findUnique({
          where: { id: currentUser.sub },
        });
        if (!member || member.deletedAt) {
          throw new NotFoundException('Сотрудник не найден');
        }
        currentPasswordHash = member.passwordHash;
        updateFn = async (hash: string) => {
          await this.prisma.organizationMember.update({
            where: { id: currentUser.sub },
            data: { passwordHash: hash },
          });
        };
        break;
      }
      default:
        throw new ForbiddenException(
          'Смена пароля недоступна для данного типа аккаунта',
        );
    }

    // OAuth пользователи не могут менять пароль
    if (!currentPasswordHash) {
      throw new BadRequestException(
        'Невозможно изменить пароль. Вы вошли через OAuth провайдер.',
      );
    }

    // Проверяем текущий пароль
    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      currentPasswordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Неверный текущий пароль');
    }

    // Проверяем что новый пароль отличается от текущего
    const isSamePassword = await bcrypt.compare(
      dto.newPassword,
      currentPasswordHash,
    );
    if (isSamePassword) {
      throw new BadRequestException(
        'Новый пароль должен отличаться от текущего',
      );
    }

    // Хешируем и сохраняем новый пароль
    const newPasswordHash = await bcrypt.hash(
      dto.newPassword,
      BCRYPT_SALT_ROUNDS,
    );
    await updateFn(newPasswordHash);

    // Отзываем все refresh-токены аккаунта: после смены пароля ранее выданные
    // сессии (в т.ч. потенциально скомпрометированные) не должны продолжать
    // работать. Текущий клиент переавторизуется по истечении access-токена.
    if (currentUser.accountId) {
      await this.prisma.refreshToken.deleteMany({
        where: { accountId: currentUser.accountId },
      });
    }

    return { message: 'Пароль успешно изменён' };
  }

  // ==================== SESSION MANAGEMENT ====================

  /**
   * Получить все активные сессии текущего пользователя
   */
  async getSessions(
    currentUser: ICurrentUser,
    currentToken?: string,
  ): Promise<SessionResponseDto[]> {
    const accountId = this.getSessionAccountId(currentUser);

    const sessions = await this.prisma.refreshToken.findMany({
      where: {
        accountId,
        expiresAt: { gt: new Date() },
        consumedAt: null,
        revokedAt: null,
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    return sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      lastUsedAt: session.lastUsedAt,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: currentToken
        ? session.token === this.hashRefreshToken(currentToken)
        : false,
    }));
  }

  /**
   * Завершить конкретную сессию
   */
  async terminateSession(
    currentUser: ICurrentUser,
    sessionId: string,
  ): Promise<{ message: string }> {
    const accountId = this.getSessionAccountId(currentUser);

    const session = await this.prisma.refreshToken.findFirst({
      where: {
        id: sessionId,
        accountId,
      },
    });

    if (!session) {
      throw new NotFoundException('Сессия не найдена');
    }

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    return { message: 'Сессия завершена' };
  }

  /**
   * Завершить все сессии кроме текущей
   */
  async terminateAllSessions(
    currentUser: ICurrentUser,
    currentToken: string,
  ): Promise<{ message: string; terminatedCount: number }> {
    const accountId = this.getSessionAccountId(currentUser);

    const result = await this.prisma.refreshToken.updateMany({
      where: {
        accountId,
        token: { not: this.hashRefreshToken(currentToken) },
        consumedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    return {
      message: 'Все сессии завершены',
      terminatedCount: result.count,
    };
  }

  // ==================== TOKEN MANAGEMENT ====================

  async refreshTokens(
    refreshToken: string,
    metadata?: SessionMetadata,
  ): Promise<TokensResponseDto> {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: this.hashRefreshToken(refreshToken) },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Недействительный refresh token');
    }

    const actorRecord = await this.iamService.resolveActorIdentityForAccount({
      accountId: tokenRecord.accountId,
      actorType: tokenRecord.actorType,
    });

    switch (actorRecord.type) {
      case UserType.USER: {
        if (actorRecord.actor.deletedAt) {
          throw new UnauthorizedException('Аккаунт удалён');
        }
        break;
      }
      case UserType.ORGANIZATION: {
        if (actorRecord.actor.deletedAt) {
          throw new UnauthorizedException('Аккаунт организации удалён');
        }
        break;
      }
      case UserType.MEMBER: {
        if (actorRecord.actor.deletedAt) {
          throw new UnauthorizedException('Аккаунт удалён');
        }
        break;
      }
      case UserType.SUPER_ADMIN: {
        if (actorRecord.actor.deletedAt) {
          throw new UnauthorizedException('Аккаунт удалён');
        }
        break;
      }
    }

    const organizationId =
      actorRecord.type === UserType.MEMBER
        ? actorRecord.actor.organizationId
        : undefined;
    const rotation = this.prisma.$transaction(
      async (tx) => {
        const consumedAt = new Date();
        const claimed = await tx.refreshToken.updateMany({
          where: {
            id: tokenRecord.id,
            consumedAt: null,
            revokedAt: null,
            expiresAt: { gt: consumedAt },
          },
          data: { consumedAt, lastUsedAt: consumedAt },
        });

        if (claimed.count !== 1) {
          await tx.refreshToken.updateMany({
            where: { familyId: tokenRecord.familyId },
            data: { revokedAt: consumedAt },
          });
          return null;
        }

        return this.generateTokens(
          actorRecord.actor.id,
          tokenRecord.actorType,
          actorRecord.actor.email,
          organizationId,
          metadata,
          {
            db: tx,
            familyId: tokenRecord.familyId,
            replacesTokenId: tokenRecord.id,
          },
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    const rotated = await rotation.catch((error: unknown) =>
      this.rethrowRefreshRotationError(error),
    );
    if (!rotated) {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_REUSE_DETECTED',
        message: 'Сессия отозвана',
      });
    }
    return rotated;
  }

  /**
   * Maps a lost refresh-token rotation race to a client-visible 409.
   *
   * Several requests of one browser (parallel API calls, a second tab) can try
   * to rotate the same refresh token at once. Under Serializable isolation
   * Postgres aborts all but one with a serialization failure (Prisma P2034).
   * That is neither a database fault nor token reuse: the winner has already
   * issued the new session, so the loser gets REFRESH_TOKEN_ROTATION_RACE, no
   * tokens, and the token family stays valid. Any other error is rethrown.
   */
  private rethrowRefreshRotationError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    ) {
      throw new ConflictException({
        code: 'REFRESH_TOKEN_ROTATION_RACE',
        message: 'Сессия уже обновлена другим запросом',
      });
    }
    throw error;
  }

  /**
   * Дать сотруднику организации личный (участницкий) профиль.
   *
   * Сотрудник — это человек: он может ходить на события как участник. Владелец
   * организации — не может: субъект его сессии сама организация, а не человек,
   * поэтому личного кабинета у него нет и быть не должно (продуктовое решение).
   *
   * Создаёт `User` по данным `OrganizationMember` (то же имя, под которым
   * сотрудника завели) и подвешивает его USER-identity к ТОМУ ЖЕ `Account`, так
   * что один вход даёт и рабочий, и личный режим. Возвращает USER-сессию —
   * иначе клиент остался бы с MEMBER-токеном, которым личный кабинет не
   * открыть.
   */
  async createParticipantProfile(
    currentUser: ICurrentUser,
    metadata?: SessionMetadata,
  ): Promise<TokensResponseDto> {
    if (currentUser.type === UserType.ORGANIZATION) {
      throw new ForbiddenException(
        'У аккаунта организации не может быть личного кабинета участника',
      );
    }
    if (currentUser.type !== UserType.MEMBER) {
      throw new ForbiddenException(
        'Личный кабинет доступен только сотрудникам',
      );
    }

    const accountId = this.getSessionAccountId(currentUser);

    // Уже есть личный профиль на этом аккаунте — просто выдаём под него сессию,
    // повторный вызов не должен падать (клиент мог не узнать об успехе).
    const existing = await this.prisma.identity.findFirst({
      where: { accountId, actorType: UserType.USER },
    });
    if (existing) {
      const user = await this.prisma.user.findUnique({
        where: { id: existing.actorId },
      });
      if (user && !user.deletedAt) {
        return this.generateTokens(
          user.id,
          UserType.USER,
          user.email,
          undefined,
          metadata,
        );
      }
    }

    const member = await this.prisma.organizationMember.findUnique({
      where: { id: currentUser.sub },
    });
    if (!member || member.deletedAt) {
      throw new UnauthorizedException('Сотрудник не найден');
    }

    const email = member.email.trim().toLowerCase();
    // Email уникален между User и Organization: если он уже занят кем-то
    // другим, личный профиль создавать нельзя.
    await this.ensurePublicEmailIsAvailable(email, UserType.USER);

    const user = await this.prisma.user.create({
      data: {
        email,
        firstName: member.firstName,
        lastName: member.lastName,
        phone: member.phone,
        avatarUrl: member.avatarUrl,
        passwordHash: member.passwordHash,
        authProvider: AuthProvider.EMAIL,
        // Почту сотрудник уже подтвердил, принимая приглашение в организацию.
        isEmailVerified: true,
      },
    });

    await this.prisma.identity.create({
      data: {
        accountId,
        actorType: UserType.USER,
        actorId: user.id,
        email,
        provider: AuthProvider.EMAIL,
        passwordHash: member.passwordHash,
      },
    });

    return this.generateTokens(
      user.id,
      UserType.USER,
      user.email,
      undefined,
      metadata,
    );
  }

  async logout(refreshToken: string): Promise<void> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { token: this.hashRefreshToken(refreshToken) },
      select: { familyId: true },
    });
    if (!record) return;
    await this.prisma.refreshToken.updateMany({
      where: { familyId: record.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ==================== HELPERS ====================

  /**
   * Хеш refresh-токена для хранения в БД. Токены — 64 байта CSPRNG (высокая
   * энтропия), поэтому быстрый sha256 достаточен (не пароль). В таблице лежит
   * только хеш: дамп refresh_tokens (SQL-инъекция/бэкап/реплика) не даёт рабочих
   * bearer-креденшелов. Клиент хранит сырой токен; сверка — по хешу.
   */
  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async generateTokens(
    actorId: string,
    actorType: UserType,
    email: string,
    organizationId?: string,
    metadata?: SessionMetadata,
    family?: {
      db: Prisma.TransactionClient | PrismaService;
      familyId: string;
      replacesTokenId: string;
    },
  ): Promise<TokensResponseDto> {
    const db = family?.db ?? this.prisma;
    const sessionContext = await this.iamService.resolveSessionContextForLogin({
      actorId,
      actorType,
    });

    // BL-37: клиент прислал локаль — фиксируем её на аккаунте (язык писем и
    // killed-push). Best-effort: сбой записи не должен ронять вход.
    const clientLocale = metadata?.locale;
    if (isAccountLocale(clientLocale)) {
      try {
        await db.account.updateMany({
          where: {
            id: sessionContext.accountId,
            NOT: { locale: clientLocale },
          },
          data: { locale: clientLocale },
        });
      } catch (error) {
        this.logger.warn(
          `Не удалось обновить Account.locale для ${sessionContext.accountId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    const payload = {
      sub: actorId,
      type: actorType,
      email,
      ...(organizationId && { organizationId }),
      accountId: sessionContext.accountId,
      actorKind: sessionContext.actorKind,
      ...(sessionContext.activeWorkspaceId && {
        activeWorkspaceId: sessionContext.activeWorkspaceId,
      }),
      ...(sessionContext.platformRole && {
        platformRole: sessionContext.platformRole,
      }),
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = randomBytes(64).toString('hex');
    const refreshExpiration = this.configService.get<string>(
      'jwt.refreshTokenExpiration',
    );
    const expiresAt = this.calculateExpiration(refreshExpiration || '7d');

    const tokenData: {
      token: string;
      actorType: UserType;
      expiresAt: Date;
      userAgent?: string;
      ipAddress?: string;
      accountId: string;
      familyId?: string;
    } = {
      token: this.hashRefreshToken(refreshToken),
      actorType,
      expiresAt,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
      accountId: sessionContext.accountId,
      familyId: family?.familyId,
    };

    await db.refreshToken.create({ data: tokenData });
    if (family) {
      await db.refreshToken.update({
        where: { id: family.replacesTokenId },
        data: { replacedByTokenHash: tokenData.token },
      });
    }

    // Клиенту — сырой токен; в БД сохранён только его sha256-хеш.
    return { accessToken, refreshToken };
  }

  private getSessionAccountId(currentUser: ICurrentUser): string {
    if (!currentUser.accountId) {
      throw new UnauthorizedException('Аккаунт сессии не найден');
    }

    return currentUser.accountId;
  }

  private calculateExpiration(duration: string): Date {
    const now = new Date();
    const match = duration.match(/^(\d+)([smhd])$/);

    if (!match) {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return new Date(now.getTime() + value * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}
