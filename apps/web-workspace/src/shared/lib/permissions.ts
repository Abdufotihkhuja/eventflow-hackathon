/**
 * Permission codes shared between the workspace UI and the backend.
 *
 * Keep these strings in lockstep with apps/api/src/common/constants/permissions.constant.ts.
 * Used proactively in the UI to disable controls before the backend has to reject them.
 */

export const PERMISSION = {
  CERTIFICATES_GENERATE: 'certificates:generate',
  CERTIFICATES_READ: 'certificates:read',
  CERTIFICATES_EXPORT: 'certificates:export',
  ARTIFACT_RECIPIENTS_MANAGE: 'artifact_recipients:manage',
  RECIPIENT_ROLES_MANAGE: 'recipient_roles:manage',
  BILLING_VIEW: 'billing:view',
  BILLING_MANAGE: 'billing:manage',
} as const

export type PermissionCode = (typeof PERMISSION)[keyof typeof PERMISSION]
