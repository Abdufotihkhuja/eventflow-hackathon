import { Injectable } from '@nestjs/common';
import { PERMISSIONS, PermissionCode } from '../../common/constants/permissions.constant';
import { AccessMaskRepository } from './access-mask.repository';

/** Полный каталог кодов прав (для UI супер-админа и валидации). */
export const ALL_PERMISSION_CODES = Object.values(PERMISSIONS) as PermissionCode[];
const VALID_CODES = new Set<string>(ALL_PERMISSION_CODES);

/**
 * Маска доступа организации (тонкое управление супер-админа): deny-list прав,
 * закрытых для всей организации, включая владельца. Применяется при резолве
 * прав (jwt.strategy — членам вычитаем, PermissionsGuard — владельцу проверяем).
 * Маска только УБИРАЕТ права; выдача — управление ролями.
 */
@Injectable()
export class AccessMaskService {
  constructor(private readonly repository: AccessMaskRepository) {}

  /** Множество закрытых кодов организации (для резолва прав на запросе). */
  async getDeniedCodes(organizationId: string): Promise<Set<string>> {
    const codes = await this.repository.findDeniedCodes(organizationId);
    return new Set(codes);
  }

  /** Список закрытых кодов (для панели супер-админа). */
  listDeniedCodes(organizationId: string): Promise<string[]> {
    return this.repository.findDeniedCodes(organizationId);
  }

  /**
   * Заменяет маску организации. Невалидные коды (не из каталога) отбрасываются,
   * дубликаты схлопываются. Возвращает before/after для аудита.
   */
  setDeniedCodes(
    organizationId: string,
    deniedCodes: string[],
    reason: string | null,
    createdByAdminId: string | null,
  ): Promise<{ before: string[]; after: string[] }> {
    const sanitized = [
      ...new Set(deniedCodes.filter((c) => VALID_CODES.has(c))),
    ];
    return this.repository.replaceDeniedCodes(
      organizationId,
      sanitized,
      reason,
      createdByAdminId,
    );
  }
}
