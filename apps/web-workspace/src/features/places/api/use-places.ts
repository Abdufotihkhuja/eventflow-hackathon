import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useT } from '@eventflow/i18n/react'
import { toast } from 'sonner'

import { placesService } from '@api/services'
import type {
  CreatePlaceRentalRequest,
  CreatePlaceRequest,
  MyPlacesParams,
  PlaceCatalogParams,
  PlaceImageUploadResponse,
  UpdatePlaceRequest,
} from '@api/services'

export const MY_PLACES_QUERY_KEY = ['places', 'my'] as const
export const PLACE_QUERY_KEY = ['places', 'detail'] as const
export const PUBLIC_PLACES_QUERY_KEY = ['places', 'public'] as const
export const PUBLIC_PLACE_QUERY_KEY = ['places', 'public-detail'] as const

function extractPlaceImageUrl(response: PlaceImageUploadResponse): string | undefined {
  if (typeof response === 'string') {
    return response
  }

  return response.url ?? response.imageUrl ?? response.fileUrl ?? response.location ?? response.path
}

export function useMyPlaces(params?: MyPlacesParams) {
  return useQuery({
    queryKey: [...MY_PLACES_QUERY_KEY, params],
    queryFn: () => placesService.getMine(params),
    staleTime: 30_000,
  })
}

export function usePlace(id: string | null) {
  return useQuery({
    queryKey: [...PLACE_QUERY_KEY, id],
    queryFn: () => placesService.getOne(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  })
}

export function usePublicPlaces(params?: PlaceCatalogParams) {
  return useQuery({
    queryKey: [...PUBLIC_PLACES_QUERY_KEY, params],
    queryFn: () => placesService.getPublicCatalog(params),
    staleTime: 60_000,
  })
}

export function usePublicPlaceBySlug(slug: string | null) {
  return useQuery({
    queryKey: [...PUBLIC_PLACE_QUERY_KEY, slug],
    queryFn: () => placesService.getPublicBySlug(slug!),
    enabled: Boolean(slug),
    staleTime: 60_000,
  })
}

export function useCreatePlace() {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: (data: CreatePlaceRequest) => placesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_PLACES_QUERY_KEY })
      toast.success(t('toasts.places.created'))
    },
    onError: (error: Error) => {
      toast.error(error.message || t('toasts.places.createError'))
    },
  })
}

export function useUpdatePlace() {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlaceRequest }) =>
      placesService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MY_PLACES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: [...PLACE_QUERY_KEY, id] })
      queryClient.invalidateQueries({ queryKey: PUBLIC_PLACES_QUERY_KEY })
      toast.success(t('toasts.places.updated'))
    },
    onError: (error: Error) => {
      toast.error(error.message || t('toasts.places.updateError'))
    },
  })
}

export function useDeletePlace() {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: (id: string) => placesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_PLACES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: PUBLIC_PLACES_QUERY_KEY })
      toast.success(t('toasts.places.deleted'))
    },
    onError: (error: Error) => {
      toast.error(error.message || t('toasts.places.deleteError'))
    },
  })
}

export function usePublishPlace() {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: (id: string) => placesService.publish(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: MY_PLACES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: [...PLACE_QUERY_KEY, id] })
      queryClient.invalidateQueries({ queryKey: PUBLIC_PLACES_QUERY_KEY })
      toast.success(t('toasts.places.published'))
    },
    onError: (error: Error) => {
      toast.error(error.message || t('toasts.places.publishError'))
    },
  })
}

export function useArchivePlace() {
  const queryClient = useQueryClient()
  const t = useT()

  return useMutation({
    mutationFn: (id: string) => placesService.archive(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: MY_PLACES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: [...PLACE_QUERY_KEY, id] })
      queryClient.invalidateQueries({ queryKey: PUBLIC_PLACES_QUERY_KEY })
      toast.success(t('toasts.places.archived'))
    },
    onError: (error: Error) => {
      toast.error(error.message || t('toasts.places.archiveError'))
    },
  })
}

export function useCreatePlaceRentalRequest() {
  const t = useT()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreatePlaceRentalRequest }) =>
      placesService.createRentalRequest(id, data),
    onSuccess: () => {
      toast.success(t('toasts.places.rentalRequestSent'))
    },
    onError: (error: Error) => {
      toast.error(error.message || t('toasts.places.rentalRequestError'))
    },
  })
}

export function useUploadPlaceImage() {
  const t = useT()

  return useMutation({
    mutationFn: async (file: File) => {
      const response = await placesService.uploadImage(file)
      const url = extractPlaceImageUrl(response)

      if (!url) {
        throw new Error(t('toasts.places.uploadMissingUrl'))
      }

      return url
    },
    onError: (error: Error) => {
      toast.error(error.message || t('toasts.places.uploadImageError'))
    },
  })
}
