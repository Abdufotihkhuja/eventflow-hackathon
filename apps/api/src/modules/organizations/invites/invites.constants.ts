/**
 * Stable, machine-readable domain codes for the organization invite/membership
 * flow. They are surfaced to clients via the `code` field of the error/response
 * body (see AllExceptionsFilter) so the frontend branches on a code instead of
 * parsing human copy. Do not rename without updating the web clients.
 */
export const INVITE_CODES = {
  // Success
  MEMBERSHIP_CREATED: 'MEMBERSHIP_CREATED',
  // Auth / identity
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  WRONG_ACCOUNT: 'WRONG_ACCOUNT',
  OAUTH_EMAIL_MISMATCH: 'OAUTH_EMAIL_MISMATCH',
  PASSWORD_REQUIRED_FOR_NEW_ACCOUNT: 'PASSWORD_REQUIRED_FOR_NEW_ACCOUNT',
  // Invite lifecycle
  INVITE_NOT_FOUND: 'INVITE_NOT_FOUND',
  INVITE_EXPIRED: 'INVITE_EXPIRED',
  INVITE_REVOKED: 'INVITE_REVOKED',
  INVITE_ALREADY_ACCEPTED: 'INVITE_ALREADY_ACCEPTED',
  INVITE_DECLINED: 'INVITE_DECLINED',
  // Creation guards
  USER_ALREADY_ORGANIZATION_MEMBER: 'USER_ALREADY_ORGANIZATION_MEMBER',
  PENDING_INVITE_ALREADY_EXISTS: 'PENDING_INVITE_ALREADY_EXISTS',
} as const;

export type InviteCode = (typeof INVITE_CODES)[keyof typeof INVITE_CODES];

/** Предел длины комментария к отказу — столько же, сколько влезает в письмо. */
export const DECLINE_REASON_MAX = 500;

/**
 * What the client should do next for a given invite token + viewer. Drives the
 * invite-accept screen in web-workspace.
 */
export enum InviteNextAction {
  LOGIN_TO_ACCEPT = 'LOGIN_TO_ACCEPT',
  SIGNUP_TO_ACCEPT = 'SIGNUP_TO_ACCEPT',
  ACCEPT_INVITE = 'ACCEPT_INVITE',
  WRONG_ACCOUNT = 'WRONG_ACCOUNT',
  ALREADY_ACCEPTED = 'ALREADY_ACCEPTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

/** Auth methods an existing user can use to sign in and accept. */
export type InviteAuthMethod = 'password' | 'google' | 'linkedin';
