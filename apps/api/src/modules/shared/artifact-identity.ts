import { createHash } from 'crypto';
import type { ParticipantRole, Prisma } from '@prisma/client';

/**
 * Identity helpers for generated artifacts (certificates, badges).
 *
 * A rendered PDF depends on two things: the template design and what is
 * printed on it (the recipient's name). Both hashes take part in cache keys
 * and job ids, so a template edit or a renamed recipient always produces a new
 * artifact instead of hitting a stale cache or a deduplicated queue job.
 */

const sha256 = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Fields of a certificate template that affect the rendered PDF. */
export type CertificateTemplateVersionInput = {
  recipientRoleId?: string | null;
  recipientRole?: ParticipantRole | null;
  sizePreset: string | null;
  widthPx?: number | null;
  heightPx?: number | null;
  templateUrl?: string | null;
  namePosition: Prisma.JsonValue;
  datePosition: Prisma.JsonValue | null;
  eventNamePosition: Prisma.JsonValue | null;
  firstNamePosition: Prisma.JsonValue | null;
  lastNamePosition: Prisma.JsonValue | null;
  qrPosition: Prisma.JsonValue | null;
  nameFontSize: number | null;
  nameFont: string | null;
  nameColor: string | null;
};

/** Stable hash of a certificate template's rendering-relevant content. */
export function certificateTemplateVersionHash(
  template: CertificateTemplateVersionInput,
): string {
  return sha256({
    recipientRole: template.recipientRole ?? null,
    recipientRoleId: template.recipientRoleId ?? null,
    sizePreset: template.sizePreset,
    widthPx: template.widthPx ?? null,
    heightPx: template.heightPx ?? null,
    templateUrl: template.templateUrl ?? null,
    namePosition: template.namePosition,
    datePosition: template.datePosition,
    eventNamePosition: template.eventNamePosition,
    firstNamePosition: template.firstNamePosition,
    lastNamePosition: template.lastNamePosition,
    qrPosition: template.qrPosition,
    nameFontSize: template.nameFontSize,
    nameFont: template.nameFont,
    nameColor: template.nameColor,
  });
}

/** Fields of a badge template that affect the rendered PDF. */
export type BadgeTemplateVersionInput = {
  recipientRoleId?: string | null;
  recipientRole?: ParticipantRole | null;
  sizePreset: string | null;
  widthPx?: number | null;
  heightPx?: number | null;
  templateUrl?: string | null;
  namePosition: Prisma.JsonValue | null;
  firstNamePosition: Prisma.JsonValue | null;
  lastNamePosition: Prisma.JsonValue | null;
  rolePosition: Prisma.JsonValue | null;
  eventNamePosition: Prisma.JsonValue | null;
  qrPosition: Prisma.JsonValue | null;
  nameFont: string | null;
  nameFontSize: number | null;
  nameColor: string | null;
  roleLabel?: string | null;
  roleFontSize?: number | null;
  roleColor?: string | null;
  eventLabel?: string | null;
  eventFontSize?: number | null;
  eventColor?: string | null;
};

/** Stable hash of a badge template's rendering-relevant content. */
export function badgeTemplateVersionHash(
  template: BadgeTemplateVersionInput,
): string {
  return sha256({
    recipientRole: template.recipientRole ?? null,
    recipientRoleId: template.recipientRoleId ?? null,
    sizePreset: template.sizePreset,
    widthPx: template.widthPx ?? null,
    heightPx: template.heightPx ?? null,
    templateUrl: template.templateUrl ?? null,
    namePosition: template.namePosition,
    firstNamePosition: template.firstNamePosition,
    lastNamePosition: template.lastNamePosition,
    rolePosition: template.rolePosition,
    eventNamePosition: template.eventNamePosition,
    qrPosition: template.qrPosition,
    nameFont: template.nameFont,
    nameFontSize: template.nameFontSize,
    nameColor: template.nameColor,
    roleLabel: template.roleLabel ?? null,
    roleFontSize: template.roleFontSize ?? null,
    roleColor: template.roleColor ?? null,
    eventLabel: template.eventLabel ?? null,
    eventFontSize: template.eventFontSize ?? null,
    eventColor: template.eventColor ?? null,
  });
}

export type ArtifactRecipientNameInput = {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string | null;
};

/**
 * The name printed on an artifact: "First Last", falling back to the display
 * name, then the email. Certificates persist this value at issue time, so the
 * same formula decides whether an issued certificate is out of date.
 */
export function artifactRecipientName(
  input: ArtifactRecipientNameInput,
): string {
  return (
    `${input.firstName ?? ''} ${input.lastName ?? ''}`.trim() ||
    input.displayName ||
    input.email ||
    'Recipient'
  );
}

/**
 * Hash of everything printed about one recipient. Goes into badge archive keys
 * and generation job ids so a renamed recipient never reuses a stale result.
 */
export function artifactRecipientIdentityHash(
  input: ArtifactRecipientNameInput & {
    recipientId: string;
    recipientRoleId: string;
  },
): string {
  return sha256({
    recipientId: input.recipientId,
    recipientRoleId: input.recipientRoleId,
    firstName: input.firstName ?? null,
    lastName: input.lastName ?? null,
    displayName: input.displayName ?? null,
    email: input.email ?? null,
  });
}
