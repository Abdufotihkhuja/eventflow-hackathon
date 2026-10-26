/**
 * Хуки для управления подборками (Super Admin)
 * Endpoints: GET/POST/PATCH/DELETE /collections, /collections/:id/events
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { superAdminService } from '@api/services'
import type {
  GetAdminCollectionsParams,
  GetAdminCollectionsResponse,
  GetAvailableCollectionEventsParams,
  GetAvailableCollectionEventsResponse,
  CreateAdminCollectionRequest,
  UpdateAdminCollectionRequest,
  AddEventsToCollectionRequest,
  RemoveEventsFromCollectionRequest,
  ReorderCollectionEventsRequest,
} from '@api/services/superAdmin.types'

export const ADMIN_COLLECTIONS_QUERY_KEY = ['super-admin', 'collections'] as const
export const ADMIN_COLLECTION_QUERY_KEY = ['super-admin', 'collection'] as const
export const ADMIN_COLLECTION_EVENTS_QUERY_KEY = ['super-admin', 'collection', 'events'] as const
export const AVAILABLE_COLLECTION_EVENTS_QUERY_KEY = [
  'super-admin',
  'collections',
  'available-events',
] as const
export const CHECK_COLLECTION_SLUG_QUERY_KEY = ['super-admin', 'collections', 'check-slug'] as const

/** Допустимые символы slug по API: a-z, 0-9, дефис */
export const SLUG_VALID_REGEX = /^[a-z0-9-]+$/

export function useAdminCollections(params?: GetAdminCollectionsParams) {
  return useQuery<GetAdminCollectionsResponse>({
    queryKey: [...ADMIN_COLLECTIONS_QUERY_KEY, params],
    queryFn: () => superAdminService.getCollections(params),
    staleTime: 30 * 1000,
  })
}

export function useAdminCollection(id: string | null) {
  return useQuery({
    queryKey: [...ADMIN_COLLECTION_QUERY_KEY, id],
    queryFn: () => superAdminService.getCollection(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

export function useAdminCollectionEvents(id: string | null) {
  return useQuery({
    queryKey: [...ADMIN_COLLECTION_EVENTS_QUERY_KEY, id],
    queryFn: () => superAdminService.getCollectionEvents(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

/** GET /collections/available-events — события для выбора в подборку (PUBLISHED/COMPLETED, минимальные поля) */
export function useAvailableCollectionEvents(
  params?: GetAvailableCollectionEventsParams,
  options?: { enabled?: boolean }
) {
  return useQuery<GetAvailableCollectionEventsResponse>({
    queryKey: [...AVAILABLE_COLLECTION_EVENTS_QUERY_KEY, params],
    queryFn: () => superAdminService.getAvailableCollectionEvents(params),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000,
  })
}

/** Проверка доступности slug (GET check-slug). Вызывать с debounced значением. */
export function useCheckCollectionSlug(debouncedSlug: string, excludeId?: string) {
  const slugTrim = debouncedSlug.trim().toLowerCase()
  const isValidFormat = SLUG_VALID_REGEX.test(slugTrim)

  return useQuery({
    queryKey: [...CHECK_COLLECTION_SLUG_QUERY_KEY, slugTrim, excludeId],
    queryFn: () =>
      superAdminService.checkCollectionSlug({ slug: slugTrim, excludeId: excludeId || undefined }),
    enabled: slugTrim.length > 0 && isValidFormat,
    staleTime: 60 * 1000,
  })
}

export function useUploadCollectionCover() {
  const t = useT()

  return useMutation({
    mutationFn: (file: File) => superAdminService.uploadCollectionCover(file),
    onError: () => {
      toast.error(t('admin.toasts.collectionCoverUploadError'))
    },
  })
}

export function useCreateAdminCollection() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAdminCollectionRequest) => superAdminService.createCollection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'collections'] })
      toast.success(t('admin.toasts.collectionCreated'))
    },
    onError: () => {
      toast.error(t('admin.toasts.collectionCreateError'))
    },
  })
}

export function useUpdateAdminCollection() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdminCollectionRequest }) =>
      superAdminService.updateCollection(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'collections'] })
      queryClient.invalidateQueries({ queryKey: [...ADMIN_COLLECTION_QUERY_KEY, id] })
      queryClient.invalidateQueries({ queryKey: [...ADMIN_COLLECTION_EVENTS_QUERY_KEY, id] })
      toast.success(t('admin.toasts.collectionUpdated'))
    },
    onError: () => {
      toast.error(t('admin.toasts.collectionUpdateError'))
    },
  })
}

export function useDeleteAdminCollection() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => superAdminService.deleteCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'collections'] })
      toast.success(t('admin.toasts.collectionDeleted'))
    },
    onError: () => {
      toast.error(t('admin.toasts.collectionDeleteError'))
    },
  })
}

export function useAddEventsToCollection() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddEventsToCollectionRequest }) =>
      superAdminService.addEventsToCollection(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_COLLECTIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: [...ADMIN_COLLECTION_QUERY_KEY, id] })
      queryClient.invalidateQueries({ queryKey: [...ADMIN_COLLECTION_EVENTS_QUERY_KEY, id] })
      toast.success(t('admin.toasts.collectionEventsAdded'))
    },
    onError: () => {
      toast.error(t('admin.toasts.collectionEventsAddError'))
    },
  })
}

export function useRemoveEventsFromCollection() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RemoveEventsFromCollectionRequest }) =>
      superAdminService.removeEventsFromCollection(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_COLLECTIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: [...ADMIN_COLLECTION_QUERY_KEY, id] })
      queryClient.invalidateQueries({ queryKey: [...ADMIN_COLLECTION_EVENTS_QUERY_KEY, id] })
      toast.success(t('admin.toasts.collectionEventsRemoved'))
    },
    onError: () => {
      toast.error(t('admin.toasts.collectionEventsRemoveError'))
    },
  })
}

export function useReorderCollectionEvents() {
  const t = useT()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReorderCollectionEventsRequest }) =>
      superAdminService.reorderCollectionEvents(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_COLLECTIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: [...ADMIN_COLLECTION_QUERY_KEY, id] })
      queryClient.invalidateQueries({ queryKey: [...ADMIN_COLLECTION_EVENTS_QUERY_KEY, id] })
      toast.success(t('admin.toasts.collectionEventsReordered'))
    },
    onError: () => {
      toast.error(t('admin.toasts.collectionEventsReorderError'))
    },
  })
}
