// Query Client
export { queryClient, createQueryClient } from "./queryClient";

// Providers
export { Providers } from "./providers";
export type { ProvidersProps } from "./providers";

// API Client
export {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  clearAuthSession,
  clearAuthToken,
  clearTokens,
  getRefreshToken,
  isAuthenticated,
  request,
  setAuthToken,
  setRefreshToken,
  setTokens,
} from "./apiClient";
export { ApiError } from "./apiClient";
export type { ApiErrorResponse, ApiResponse } from "./apiClient";

// Utilities
export {
  cn,
  formatDateOfBirthDisplay,
  formatDateOfBirthForInput,
  getUserDisplayName,
  parseFullName,
} from "./utils";
export type { UserDisplayNameSource } from "./utils";

// Rich text extraction (TipTap/BlockNote blocks)
export { extractTextFromBlocks } from "./richText";

// Date (UTC from API → local display)
export {
  formatUtcToLocalDate,
  formatUtcToLocalDateTime,
  formatUtcToLocalTime,
  parseAgendaTimeAsLocal,
  parseUtcIso,
  toLocalDateKey,
  toUtcIsoString,
} from "./date";

// Hooks
export {
  useScrollPosition,
  useCurrentUserQuery,
  CURRENT_USER_QUERY_KEY,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useLogoutMutation,
  useRegistrationQrQuery,
} from "./hooks";
export type {
  UseScrollPositionReturn,
  Registration,
  RegistrationQrResponse,
} from "./hooks";
