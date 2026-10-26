import { apiClient, request } from '@api/apiClient'

import type {
  CreatePlaceRentalRequest,
  CreatePlaceRequest,
  MyPlacesParams,
  NearbyPlacesParams,
  Place,
  PlaceImageUploadResponse,
  PlaceCatalogParams,
  PlacesListResponse,
  UpdatePlaceRequest,
} from './place.types'

const PLACES_URL = '/v1/places'

export const placesService = {
  create: (data: CreatePlaceRequest) =>
    request<Place, CreatePlaceRequest>({
      method: 'POST',
      url: PLACES_URL,
      data,
    }),

  getMine: (params?: MyPlacesParams) =>
    request<PlacesListResponse>({
      method: 'GET',
      url: `${PLACES_URL}/my`,
      params,
    }),

  getCatalog: (params?: PlaceCatalogParams) =>
    request<PlacesListResponse>({
      method: 'GET',
      url: `${PLACES_URL}/catalog`,
      params,
    }),

  getNearbySuggestions: (params: NearbyPlacesParams) =>
    request<Place[]>({
      method: 'GET',
      url: `${PLACES_URL}/suggestions/nearby`,
      params,
    }),

  getPublicCatalog: (params?: PlaceCatalogParams) =>
    apiClient.get<PlacesListResponse>(`${PLACES_URL}/public`, {
      params,
      skipAuth: true,
    }),

  getPublicBySlug: (slug: string) =>
    apiClient.get<Place>(`${PLACES_URL}/public/by-slug/${slug}`, {
      skipAuth: true,
    }),

  getPublicById: (id: string) =>
    apiClient.get<Place>(`${PLACES_URL}/public/${id}`, {
      skipAuth: true,
    }),

  createRentalRequest: (id: string, data: CreatePlaceRentalRequest) =>
    request<{ message?: string }, CreatePlaceRentalRequest>({
      method: 'POST',
      url: `${PLACES_URL}/${id}/request`,
      data,
    }),

  getOne: (id: string) =>
    request<Place>({
      method: 'GET',
      url: `${PLACES_URL}/${id}`,
    }),

  update: (id: string, data: UpdatePlaceRequest) =>
    request<Place, UpdatePlaceRequest>({
      method: 'PATCH',
      url: `${PLACES_URL}/${id}`,
      data,
    }),

  delete: (id: string) =>
    request<void>({
      method: 'DELETE',
      url: `${PLACES_URL}/${id}`,
    }),

  publish: (id: string) =>
    request<Place>({
      method: 'POST',
      url: `${PLACES_URL}/${id}/publish`,
    }),

  archive: (id: string) =>
    request<Place>({
      method: 'POST',
      url: `${PLACES_URL}/${id}/archive`,
    }),

  uploadImage: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    return request<PlaceImageUploadResponse, FormData>({
      method: 'POST',
      url: `${PLACES_URL}/images/upload`,
      data: formData,
    })
  },
}
