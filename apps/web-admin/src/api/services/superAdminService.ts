import { adminSdk } from '@api/adminSdk'
import { api } from '@api/config'

import type {
  ExportAdminUsersParams,
  ExportAdminUsersResult,
  GetSystemStatsResponse,
  GetAdminUsersParams,
  GetAdminUsersResponse,
  AdminUser,
  UpdateAdminUserRequest,
  GetAdminOrganizationsParams,
  GetAdminOrganizationsResponse,
  AdminOrganization,
  UpdateAdminOrganizationRequest,
  GetAdminEventsParams,
  GetAdminEventsResponse,
  AdminEvent,
  UpdateAdminEventRequest,
  SetAdminEventStatusRequest,
  GetVerificationCodesParams,
  GetVerificationCodesResponse,
  GetAdminBlogPostsParams,
  GetAdminBlogPostsResponse,
  AdminBlogPost,
  RejectBlogPostRequest,
  GetAdminCategoriesParams,
  GetAdminCategoriesResponse,
  AdminCategory,
  CreateAdminCategoryRequest,
  UpdateAdminCategoryRequest,
  CategoryIconUploadResponse,
  CheckCategorySlugResponse,
  GetAdminBlogCategoriesParams,
  GetAdminBlogCategoriesResponse,
  AdminBlogCategory,
  CreateAdminBlogCategoryRequest,
  UpdateAdminBlogCategoryRequest,
  CheckBlogCategorySlugResponse,
  GetAvailableCollectionEventsParams,
  GetAvailableCollectionEventsResponse,
  CollectionEventRelation,
  GetAdminCollectionsParams,
  GetAdminCollectionsResponse,
  AdminCollection,
  CreateAdminCollectionRequest,
  UpdateAdminCollectionRequest,
  AddEventsToCollectionRequest,
  RemoveEventsFromCollectionRequest,
  ReorderCollectionEventsRequest,
  CheckCollectionSlugResponse,
  CollectionCoverUploadResponse,
} from './superAdmin.types'

/** Сборка книги на всей базе занимает больше дефолтных 15 с клиента. */
const EXPORT_TIMEOUT_MS = 180_000

const FALLBACK_EXPORT_FILENAME = 'users.xlsx'

/** Имя файла из Content-Disposition; при любом сюрпризе — запасное. */
function parseFilename(contentDisposition: unknown): string {
  if (typeof contentDisposition !== 'string') return FALLBACK_EXPORT_FILENAME
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition)
  if (!match?.[1]) return FALLBACK_EXPORT_FILENAME
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

export const superAdminService = {
  getMe: () =>
    adminSdk.session.getMe().then((session) => {
      const fullName = [
        session.currentAccount.firstName,
        session.currentAccount.lastName,
      ]
        .filter(Boolean)
        .join(' ')
        .trim()
      const resolvedName = session.currentAccount.displayName ?? fullName

      return {
        id: session.currentAccount.id,
        email: session.currentAccount.email,
        name: resolvedName || 'Super Admin',
      }
    }),

  createAdmin: (data: { email: string; password: string; name: string }) =>
    adminSdk.profile.createAdmin(data) as Promise<AdminUser>,

  getStats: () => adminSdk.stats.getSystem() as Promise<GetSystemStatsResponse>,

  getUsers: (params?: GetAdminUsersParams) =>
    adminSdk.users.getList(params) as Promise<GetAdminUsersResponse>,

  getUser: (userId: string) =>
    adminSdk.users.getById(userId) as Promise<AdminUser>,

  updateUser: (userId: string, data: UpdateAdminUserRequest) =>
    adminSdk.users.update(userId, data) as Promise<AdminUser>,

  archiveUser: (userId: string, reason?: string) =>
    adminSdk.users.archive(userId, reason ? { reason } : undefined),

  restoreUser: (userId: string) => adminSdk.users.restore(userId),

  hardDeleteUser: (userId: string) => adminSdk.users.hardDelete(userId),

  /**
   * Выгрузка пользователей в XLSX. Идёт мимо SDK и request-обёртки: ответ —
   * бинарный файл, а не JSON-конверт. Файл собирает бэкенд по всей выборке,
   * поэтому таймаут больше дефолтного.
   */
  exportUsers: async ({
    fields,
    search,
    isEmailVerified,
    status,
    locale,
  }: ExportAdminUsersParams): Promise<ExportAdminUsersResult> => {
    const response = await api.get<Blob>('/api/v1/super-admin/users/export', {
      params: {
        fields: fields.join(','),
        ...(search ? { search } : {}),
        ...(isEmailVerified !== undefined ? { isEmailVerified } : {}),
        ...(status ? { status } : {}),
        ...(locale ? { locale } : {}),
      },
      responseType: 'blob',
      timeout: EXPORT_TIMEOUT_MS,
    })

    return {
      blob: response.data,
      filename: parseFilename(response.headers['content-disposition']),
      total: Number(response.headers['x-export-total'] ?? 0),
    }
  },

  getOrganizations: (params?: GetAdminOrganizationsParams) =>
    adminSdk.organizations.getList(
      params,
    ) as Promise<GetAdminOrganizationsResponse>,

  getOrganization: (orgId: string) =>
    adminSdk.organizations.getById(orgId) as Promise<AdminOrganization>,

  updateOrganization: (orgId: string, data: UpdateAdminOrganizationRequest) =>
    adminSdk.organizations.update(orgId, data) as Promise<AdminOrganization>,

  getPendingOrganizations: (params?: GetAdminOrganizationsParams) =>
    adminSdk.organizations.getPending(
      params,
    ) as Promise<GetAdminOrganizationsResponse>,

  approveOrganization: (orgId: string) =>
    adminSdk.organizations.approve(orgId) as Promise<AdminOrganization>,

  rejectOrganization: (orgId: string, data?: { reason?: string }) =>
    adminSdk.organizations.reject(orgId, data) as Promise<AdminOrganization>,

  archiveOrganization: (orgId: string, reason?: string) =>
    adminSdk.organizations.archive(orgId, reason ? { reason } : undefined),

  restoreOrganization: (orgId: string) => adminSdk.organizations.restore(orgId),

  getOrganizationDeletePreview: (orgId: string) =>
    adminSdk.organizations.getDeletePreview(orgId),

  hardDeleteOrganization: (orgId: string, confirmation: string) =>
    adminSdk.organizations.hardDelete(orgId, { confirmation }),

  getEvents: (params?: GetAdminEventsParams) =>
    adminSdk.events.getList(params) as Promise<GetAdminEventsResponse>,

  getPendingEvents: (params?: GetAdminEventsParams) =>
    adminSdk.events.getPending(params) as Promise<GetAdminEventsResponse>,

  approveEvent: (eventId: string) => adminSdk.events.approve(eventId),

  rejectEvent: (eventId: string, data?: { reason?: string }) =>
    adminSdk.events.reject(eventId, data),

  getEvent: (eventId: string) =>
    adminSdk.events.getById(eventId) as Promise<AdminEvent>,

  updateEvent: (eventId: string, data: UpdateAdminEventRequest) =>
    adminSdk.events.update(eventId, data) as Promise<AdminEvent>,

  setEventStatus: (eventId: string, data: SetAdminEventStatusRequest) =>
    adminSdk.events.setStatus(eventId, data) as Promise<AdminEvent>,

  toggleFeaturedEvent: (eventId: string) =>
    adminSdk.events.toggleFeatured(eventId) as Promise<AdminEvent>,

  deleteEvent: (eventId: string, data?: { reason?: string }) =>
    adminSdk.events.delete(eventId, data),

  getVerificationCodes: (params?: GetVerificationCodesParams) =>
    adminSdk.verificationCodes.getList(
      params,
    ) as Promise<GetVerificationCodesResponse>,

  getBlogPosts: (params?: GetAdminBlogPostsParams) =>
    adminSdk.blogPosts.getList(params) as Promise<GetAdminBlogPostsResponse>,

  getPendingBlogPosts: (params?: GetAdminBlogPostsParams) =>
    adminSdk.blogPosts.getPending(params) as Promise<GetAdminBlogPostsResponse>,

  getBlogPost: (postId: string) =>
    adminSdk.blogPosts.getById(postId) as Promise<AdminBlogPost>,

  approveBlogPost: (postId: string) =>
    adminSdk.blogPosts.approve(postId) as Promise<AdminBlogPost>,

  rejectBlogPost: (postId: string, data?: RejectBlogPostRequest) =>
    adminSdk.blogPosts.reject(postId, data) as Promise<AdminBlogPost>,

  deleteBlogPost: (postId: string) => adminSdk.blogPosts.delete(postId),

  getCategories: (params?: GetAdminCategoriesParams) =>
    adminSdk.categories.getList(params) as Promise<GetAdminCategoriesResponse>,

  checkCategorySlug: (params: { slug: string; excludeId?: string }) =>
    adminSdk.categories.checkSlug(params) as Promise<CheckCategorySlugResponse>,

  getCategory: (id: string) =>
    adminSdk.categories.getById(id) as Promise<AdminCategory>,

  uploadCategoryIcon: (file: File) =>
    adminSdk.categories.uploadIcon(file) as Promise<CategoryIconUploadResponse>,

  createCategory: (data: CreateAdminCategoryRequest) =>
    adminSdk.categories.create(data) as Promise<AdminCategory>,

  updateCategory: (id: string, data: UpdateAdminCategoryRequest) =>
    adminSdk.categories.update(id, data) as Promise<AdminCategory>,

  deleteCategory: (id: string) => adminSdk.categories.delete(id),

  // ===== Blog Categories =====

  getBlogCategories: (params?: GetAdminBlogCategoriesParams) =>
    adminSdk.blogCategories.getList(
      params,
    ) as Promise<GetAdminBlogCategoriesResponse>,

  checkBlogCategorySlug: (params: { slug: string; excludeId?: string }) =>
    adminSdk.blogCategories.checkSlug(
      params,
    ) as Promise<CheckBlogCategorySlugResponse>,

  getBlogCategory: (id: string) =>
    adminSdk.blogCategories.getById(id) as Promise<AdminBlogCategory>,

  createBlogCategory: (data: CreateAdminBlogCategoryRequest) =>
    adminSdk.blogCategories.create(data) as Promise<AdminBlogCategory>,

  updateBlogCategory: (id: string, data: UpdateAdminBlogCategoryRequest) =>
    adminSdk.blogCategories.update(id, data) as Promise<AdminBlogCategory>,

  deleteBlogCategory: (id: string) => adminSdk.blogCategories.delete(id),

  checkCollectionSlug: (params: { slug: string; excludeId?: string }) =>
    adminSdk.collections.checkSlug(
      params,
    ) as Promise<CheckCollectionSlugResponse>,

  uploadCollectionCover: (file: File) =>
    adminSdk.collections.uploadCover(
      file,
    ) as Promise<CollectionCoverUploadResponse>,

  getAvailableCollectionEvents: (params?: GetAvailableCollectionEventsParams) =>
    adminSdk.collections.getAvailableEvents(
      params,
    ) as Promise<GetAvailableCollectionEventsResponse>,

  getCollections: (params?: GetAdminCollectionsParams) =>
    adminSdk.collections.getList(
      params,
    ) as Promise<GetAdminCollectionsResponse>,

  getCollection: (id: string) =>
    adminSdk.collections.getById(id) as Promise<
      AdminCollection & { events?: AdminEvent[] }
    >,

  getCollectionEvents: (id: string) =>
    adminSdk.collections.getEvents(id) as Promise<CollectionEventRelation[]>,

  createCollection: (data: CreateAdminCollectionRequest) =>
    adminSdk.collections.create(data) as Promise<AdminCollection>,

  updateCollection: (id: string, data: UpdateAdminCollectionRequest) =>
    adminSdk.collections.update(id, data) as Promise<AdminCollection>,

  deleteCollection: (id: string) => adminSdk.collections.delete(id),

  addEventsToCollection: (id: string, data: AddEventsToCollectionRequest) =>
    adminSdk.collections.addEvents(id, data),

  removeEventsFromCollection: (
    id: string,
    data: RemoveEventsFromCollectionRequest,
  ) => adminSdk.collections.removeEvents(id, data),

  reorderCollectionEvents: (id: string, data: ReorderCollectionEventsRequest) =>
    adminSdk.collections.reorderEvents(id, data),
} as const
