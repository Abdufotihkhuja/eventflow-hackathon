import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

  return useMutation({
    mutationFn: (data: CreatePlaceRequest) => placesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_PLACES_QUERY_KEY })
      toast.success('Площадка создана')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Не удалось создать площадку')
    },
  })
}

export function useUpdatePlace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlaceRequest }) =>
      placesService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MY_PLACES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: [...PLACE_QUERY_KEY, id] })
      queryClient.invalidateQueries({ queryKey: PUBLIC_PLACES_QUERY_KEY })
      toast.success('Площадка обновлена')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Не удалось обновить площадку')
    },
  })
}

export function useDeletePlace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => placesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_PLACES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: PUBLIC_PLACES_QUERY_KEY })
      toast.success('Площадка удалена')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Не удалось удалить площадку')
    },
  })
}

export function usePublishPlace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => placesService.publish(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: MY_PLACES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: [...PLACE_QUERY_KEY, id] })
      queryClient.invalidateQueries({ queryKey: PUBLIC_PLACES_QUERY_KEY })
      toast.success('Площадка опубликована')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Не удалось опубликовать площадку')
    },
  })
}

export function useArchivePlace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => placesService.archive(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: MY_PLACES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: [...PLACE_QUERY_KEY, id] })
      queryClient.invalidateQueries({ queryKey: PUBLIC_PLACES_QUERY_KEY })
      toast.success('Площадка отправлена в архив')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Не удалось архивировать площадку')
    },
  })
}

export function useCreatePlaceRentalRequest() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreatePlaceRentalRequest }) =>
      placesService.createRentalRequest(id, data),
    onSuccess: () => {
      toast.success('Заявка отправлена владельцу площадки')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Не удалось отправить заявку')
    },
  })
}

export function useUploadPlaceImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const response = await placesService.uploadImage(file)
      const url = extractPlaceImageUrl(response)

      if (!url) {
        throw new Error('Сервер не вернул URL загруженного изображения')
      }

      return url
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Не удалось загрузить изображение')
    },
  })
}
