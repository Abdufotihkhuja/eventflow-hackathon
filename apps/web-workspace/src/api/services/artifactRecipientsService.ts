import { workspaceSdk } from '@api/sdk'

import type {
  ArtifactBulkPreviewRequest,
  ArtifactBulkPreviewResponse,
  ArtifactRecipient,
  ArtifactRecipientCreateResult,
  ArtifactRecipientRoleAssignmentResult,
  ArtifactTemplateSummaryResponse,
  AssignArtifactRecipientRoleRequest,
  BatchCreateArtifactRecipientsRequest,
  BatchCreateArtifactRecipientsResult,
  CreateManualArtifactRecipientRequest,
  CreateRecipientRoleRequest,
  GetArtifactRecipientsParams,
  GetArtifactRecipientsResponse,
  GetArtifactTemplateSummaryParams,
  RecipientRole,
  RecipientRoleDeletePreview,
  UpdateManualArtifactRecipientRequest,
  UpdateRecipientRoleRequest,
} from './artifact-recipient.types'

export const artifactRecipientsService = {
  list: (eventId: string, params?: GetArtifactRecipientsParams) =>
    workspaceSdk.events.getArtifactRecipients(
      eventId,
      params as never
    ) as Promise<GetArtifactRecipientsResponse>,

  create: (eventId: string, body: CreateManualArtifactRecipientRequest) =>
    workspaceSdk.events.createArtifactRecipient(
      eventId,
      body as never
    ) as Promise<ArtifactRecipientCreateResult>,

  batchCreate: (eventId: string, body: BatchCreateArtifactRecipientsRequest) =>
    workspaceSdk.events.batchCreateArtifactRecipients(
      eventId,
      body as never
    ) as Promise<BatchCreateArtifactRecipientsResult>,

  update: (
    eventId: string,
    recipientId: string,
    body: UpdateManualArtifactRecipientRequest
  ) =>
    workspaceSdk.events.updateArtifactRecipient(
      eventId,
      recipientId,
      body as never
    ) as Promise<ArtifactRecipient>,

  assignRole: (
    eventId: string,
    recipientId: string,
    body: AssignArtifactRecipientRoleRequest
  ) =>
    workspaceSdk.events.assignArtifactRecipientRole(
      eventId,
      recipientId,
      body as never
    ) as Promise<ArtifactRecipientRoleAssignmentResult>,

  deactivateRole: (eventId: string, recipientId: string, roleId: string) =>
    workspaceSdk.events.deactivateArtifactRecipientRole(
      eventId,
      recipientId,
      roleId
    ) as Promise<ArtifactRecipientRoleAssignmentResult>,
} as const

export const artifactTemplateSummaryService = {
  get: (eventId: string, params?: GetArtifactTemplateSummaryParams) =>
    workspaceSdk.events.getArtifactTemplateSummary(
      eventId,
      params as never
    ) as Promise<ArtifactTemplateSummaryResponse>,
} as const

export const artifactBulkPreviewService = {
  get: (eventId: string, body: ArtifactBulkPreviewRequest) =>
    workspaceSdk.events.getArtifactBulkPreview(
      eventId,
      body as never
    ) as Promise<ArtifactBulkPreviewResponse>,
} as const

export const recipientRolesService = {
  list: (eventId: string) =>
    workspaceSdk.events.getRecipientRoles(eventId) as Promise<RecipientRole[]>,

  create: (eventId: string, body: CreateRecipientRoleRequest) =>
    workspaceSdk.events.createRecipientRole(
      eventId,
      body as never
    ) as Promise<RecipientRole>,

  update: (eventId: string, roleId: string, body: UpdateRecipientRoleRequest) =>
    workspaceSdk.events.updateRecipientRole(
      eventId,
      roleId,
      body as never
    ) as Promise<RecipientRole>,

  activate: (eventId: string, roleId: string) =>
    workspaceSdk.events.activateRecipientRole(eventId, roleId) as Promise<RecipientRole>,

  deactivate: (eventId: string, roleId: string) =>
    workspaceSdk.events.deactivateRecipientRole(eventId, roleId) as Promise<RecipientRole>,

  deletePreview: (eventId: string, roleId: string) =>
    workspaceSdk.events.getRecipientRoleDeletePreview(
      eventId,
      roleId
    ) as Promise<RecipientRoleDeletePreview>,
} as const
