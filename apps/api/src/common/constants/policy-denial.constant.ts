export const POLICY_DENIALS = {
  ORGANIZATION_INVITATION_REQUIRED: {
    code: 'ORGANIZATION_INVITATION_REQUIRED',
    message: 'Сотрудник может быть добавлен только через приглашение.',
  },
  ORGANIZATION_HARD_DELETE_DISABLED: {
    code: 'ORGANIZATION_HARD_DELETE_DISABLED',
    message:
      'Необратимое удаление организации запрещено. Используйте архивацию.',
  },
  OWNER_LIFECYCLE_REQUIRES_TRANSFER: {
    code: 'OWNER_LIFECYCLE_REQUIRES_TRANSFER',
    message:
      'Защищённое членство владельца нельзя изменить через обычный маршрут сотрудников.',
  },
} as const;
