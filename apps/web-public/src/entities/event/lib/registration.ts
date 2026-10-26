/** Статусы регистрации, при которых пользователь считается зарегистрированным на событие */
const ACTIVE_REGISTRATION_STATUSES = ["PENDING", "APPROVED"] as const;

/**
 * Проверяет, что регистрация активна (пользователь участвует).
 * CANCELLED и REJECTED не считаются зарегистрированными.
 */
export function isActiveRegistration(
  reg: { status: string } | null | undefined
): boolean {
  return (
    reg != null &&
    (ACTIVE_REGISTRATION_STATUSES as readonly string[]).includes(reg.status)
  );
}
