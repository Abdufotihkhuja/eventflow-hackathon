// ================================
// Recipient Roles
// ================================

export type RecipientRoleKind = 'BUILT_IN' | 'CUSTOM'

export type BusinessTranslationsBag = Record<string, Partial<Record<'ru' | 'uz' | 'en', string>>>

export type RecipientRole = {
  id: string
  code: string
  displayName: string
  translations?: BusinessTranslationsBag | null
  kind: RecipientRoleKind
  builtInKey: string | null
  sortOrder: number
  isActive: boolean
  isArtifactEligible: boolean
  sourceMapping: string | null
  createdAt: string
  updatedAt: string
}

export type CreateRecipientRoleRequest = {
  code: string
  displayName: string
  sortOrder?: number
  isArtifactEligible?: boolean
  translations?: BusinessTranslationsBag
}

export type UpdateRecipientRoleRequest = {
  displayName?: string
  sortOrder?: number
  isArtifactEligible?: boolean
  translations?: BusinessTranslationsBag
}

export type RecipientRoleDeletePreviewCounts = {
  activeAssignments: number
  inactiveAssignments: number
  certificateTemplates: number
  badgeTemplates: number
  certificates: number
}

export type RecipientRoleDeletePreview = {
  roleId: string
  code: string
  displayName: string
  isBuiltIn: boolean
  counts: RecipientRoleDeletePreviewCounts
  recommendedAction: 'DEACTIVATE' | 'SAFE_TO_DELETE' | 'BLOCKED'
  blockingReasons: string[]
}

// ================================
// Artifact Recipients
// ================================

export type ArtifactRecipientStatus = 'ACTIVE' | 'ARCHIVED'
export type ArtifactRecipientAssignmentStatus = 'ACTIVE' | 'INACTIVE'
export type ArtifactRecipientSourceType =
  | 'USER'
  | 'REGISTRATION'
  | 'SPEAKER'
  | 'MANUAL'
  | 'EMAIL'

export type ArtifactRecipientAssignedRole = {
  id: string
  code: string
  displayName: string
  translations?: BusinessTranslationsBag | null
  kind: RecipientRoleKind
  builtInKey: string | null
  assignmentStatus: ArtifactRecipientAssignmentStatus
  assignmentId: string | null
  assignmentSourceType: string | null
}

export type ArtifactRecipientSourceSummary = {
  userId: string | null
  registrationId: string | null
  speakerId: string | null
  sourceTypes: ArtifactRecipientSourceType[]
}

export type ArtifactRecipient = {
  id: string
  displayName: string
  firstName: string | null
  lastName: string | null
  email: string | null
  status: ArtifactRecipientStatus
  roles: ArtifactRecipientAssignedRole[]
  sources: ArtifactRecipientSourceSummary
  createdAt: string
  updatedAt: string
}

export type GetArtifactRecipientsParams = {
  page?: number
  limit?: number
  search?: string
  roleId?: string
  roleCode?: string
  status?: ArtifactRecipientStatus
}

export type GetArtifactRecipientsResponse = {
  data: ArtifactRecipient[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type CreateManualArtifactRecipientRequest = {
  displayName: string
  firstName?: string
  lastName?: string
  email?: string
  userId?: string
  roleIds?: string[]
  roleCodes?: string[]
}

export type ArtifactRecipientCreateResult = {
  recipient: ArtifactRecipient
  created: boolean
  reused: boolean
}

export type BatchRecipientOutcome = 'CREATED' | 'REUSED' | 'FAILED'

export type BatchCreateArtifactRecipientsRequest = {
  recipients: CreateManualArtifactRecipientRequest[]
  /** Role codes applied to every row that did not specify roles. */
  defaultRoleCodes?: string[]
}

export type BatchRecipientResultRow = {
  index: number
  outcome: BatchRecipientOutcome
  recipient: ArtifactRecipient | null
  error: string | null
}

export type BatchCreateArtifactRecipientsResult = {
  results: BatchRecipientResultRow[]
  createdCount: number
  reusedCount: number
  failedCount: number
}

export type UpdateManualArtifactRecipientRequest = {
  displayName?: string
  firstName?: string
  lastName?: string
  email?: string | null
  status?: ArtifactRecipientStatus
}

export type AssignArtifactRecipientRoleRequest = {
  roleId?: string
  roleCode?: string
}

export type ArtifactRecipientRoleAssignmentSummary = {
  id: string
  roleId: string
  roleCode: string
  status: ArtifactRecipientAssignmentStatus
  sourceType: string | null
}

export type ArtifactRecipientRoleAssignmentResult = {
  recipient: ArtifactRecipient
  assignment: ArtifactRecipientRoleAssignmentSummary
}

// ================================
// Template Summary
// ================================

export type ArtifactTemplateStatus =
  | 'READY'
  | 'MISSING'
  | 'INACTIVE_ROLE'
  | 'NOT_ARTIFACT_ELIGIBLE'
  | 'DUPLICATE_DEFAULT'

export type ArtifactTemplateSummaryTemplate = {
  id: string
  name: string
  isDefault: boolean
  isActive: boolean
  recipientRoleId: string | null
  roleCode: string
  roleDisplayName: string
  recipientRole: 'PARTICIPANT' | 'SPEAKER' | 'MENTOR' | null
  sizePreset: string
  createdAt: string
  updatedAt: string
}

export type ArtifactTemplateTypeSummary = {
  defaultTemplateId: string | null
  defaultTemplateName: string | null
  hasActiveDefault: boolean
  activeTemplateCount: number
  inactiveTemplateCount: number
  duplicateActiveDefaultCount: number
  missingTemplate: boolean
  templateStatus: ArtifactTemplateStatus
  templates: ArtifactTemplateSummaryTemplate[]
}

export type ArtifactTemplateRoleSummary = {
  roleId: string
  roleCode: string
  roleDisplayName: string
  roleTranslations?: BusinessTranslationsBag | null
  builtInKey: string | null
  kind: RecipientRoleKind
  sortOrder: number
  isActive: boolean
  isArtifactEligible: boolean
  assignmentCount: number
  activeAssignmentCount: number
  certificateTemplateSummary?: ArtifactTemplateTypeSummary
  badgeTemplateSummary?: ArtifactTemplateTypeSummary
}

export type ArtifactTemplateSummaryResponse = {
  roles: ArtifactTemplateRoleSummary[]
}

export type GetArtifactTemplateSummaryParams = {
  artifactType?: 'CERTIFICATE' | 'BADGE'
  includeInactiveTemplates?: boolean
  includeInactiveRoles?: boolean
}

// ================================
// Bulk Preview
// ================================

export type ArtifactType = 'CERTIFICATE' | 'BADGE'
export type ArtifactBulkScope =
  | 'SELECTED'
  | 'ROLE'
  | 'ALL_ELIGIBLE'
  | 'ALL_PARTICIPANTS'
  | 'ALL_SPEAKERS'

export type ArtifactBulkPreviewRequest = {
  artifactType: ArtifactType
  scope: ArtifactBulkScope
  recipientIds?: string[]
  registrationIds?: string[]
  recipientRoleIds?: string[]
  recipientRoleId?: string
  roleId?: string
  roleCode?: string
  recipientRole?: 'PARTICIPANT' | 'SPEAKER' | 'MENTOR'
  staleOnly?: boolean
  forceRegenerate?: boolean
  /** Certificate previews only — defaults to true server-side. */
  onlyAttended?: boolean
  /** Badge previews only — defaults to true server-side. */
  onlyApproved?: boolean
  includeReady?: boolean
  includeStale?: boolean
}

export type ArtifactBulkPreviewStatusBreakdown = {
  ready: number
  stale: number
  failed: number
  processing: number
  notGenerated: number
  missingTemplate: number
  notEligible: number
  generatable: number
  blocked: number
}

export type ArtifactBulkPreviewRole = {
  roleId: string
  roleCode: string
  roleDisplayName: string
  recipientCount: number
  artifactCount: number
  willGenerateCount: number
  willRegenerateCount: number
  willSkipCount: number
  missingTemplateCount: number
  blockedCount: number
  statusBreakdown: ArtifactBulkPreviewStatusBreakdown
}

export type ArtifactBulkPreviewMissingTemplate = {
  roleId: string
  roleCode: string
  roleDisplayName: string
  artifactType: ArtifactType
}

export type ArtifactBulkPreviewWarningCode = 'LARGE_BULK_ACTION'

export type ArtifactBulkPreviewWarning = {
  code: ArtifactBulkPreviewWarningCode
  message: string
}

export type ArtifactBulkPreviewExcludedReason =
  | 'ROLE_MISMATCH'
  | 'NOT_APPROVED'
  | 'NOT_ATTENDED'

export type ArtifactBulkPreviewExcludedRecipient = {
  recipientId: string
  reason: ArtifactBulkPreviewExcludedReason
}

export type ArtifactBulkPreviewResponse = {
  artifactType: ArtifactType
  scope: ArtifactBulkScope
  recipientCount: number
  artifactCount: number
  willGenerateCount: number
  willRegenerateCount: number
  willSkipCount: number
  missingTemplateCount: number
  blockedCount: number
  staleCount: number
  readyCount: number
  failedCount: number
  notGeneratedCount: number
  processingCount: number
  roles: ArtifactBulkPreviewRole[]
  missingTemplates: ArtifactBulkPreviewMissingTemplate[]
  warnings: ArtifactBulkPreviewWarning[]
  excludedRecipients: ArtifactBulkPreviewExcludedRecipient[]
}
