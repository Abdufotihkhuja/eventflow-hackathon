import type { EventDescription } from './event.types'

export const PLACE_STATUSES = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const

export type PlaceStatus = (typeof PLACE_STATUSES)[keyof typeof PLACE_STATUSES]

export const PLACE_CURRENCIES = {
  RUB: 'RUB',
  USD: 'USD',
  EUR: 'EUR',
  UZS: 'UZS',
} as const

export type PlaceCurrency = (typeof PLACE_CURRENCIES)[keyof typeof PLACE_CURRENCIES]

export const RENTAL_TYPES = {
  HOURLY: 'HOURLY',
  DAILY: 'DAILY',
} as const

export type RentalType = (typeof RENTAL_TYPES)[keyof typeof RENTAL_TYPES]

export type PlaceOrganization = {
  id: string
  organizationName?: string | null
  name?: string | null
  logoUrl?: string | null
  email?: string | null
}

export type PlaceImage = {
  id: string
  url: string
  sortOrder?: number
}

export type Place = {
  id: string
  organizationId?: string
  organization?: PlaceOrganization
  title: string
  slug: string
  description?: EventDescription
  shortDescription?: string | null
  translations?: Record<string, unknown>
  translationMeta?: Record<string, unknown>
  richTranslations?: Record<string, unknown>
  richTranslationMeta?: Record<string, unknown>
  /** @deprecated — используй pricePerHour / pricePerDay */
  price?: number
  pricePerHour?: number | null
  pricePerDay?: number | null
  currency: PlaceCurrency
  hourlyConditions?: string | null
  dailyConditions?: string | null
  capacity?: number | null
  amenities?: string[]
  address: string
  addressNotes?: string | null
  city?: string | null
  latitude: number
  longitude: number
  placeId?: string | null
  coverImage?: string | null
  images?: PlaceImage[]
  imageUrls?: string[]
  status?: PlaceStatus
  createdAt?: string
  updatedAt?: string
}

export type PlaceCatalogParams = {
  page?: number
  limit?: number
  search?: string
  city?: string
  currency?: PlaceCurrency
  minPrice?: number
  maxPrice?: number
  latitude?: number
  longitude?: number
  radiusKm?: number
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'nearest'
  organizationId?: string
}

export type MyPlacesParams = {
  page?: number
  limit?: number
  search?: string
  status?: PlaceStatus
}

export type NearbyPlacesParams = {
  latitude?: number
  longitude?: number
  radiusKm?: number
  limit?: number
}

export type PlacesListResponse = {
  data: Place[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type CreatePlaceRequest = {
  title: string
  slug?: string
  description?: EventDescription
  shortDescription?: string
  translations?: Record<string, unknown>
  translationMeta?: Record<string, unknown>
  richTranslations?: Record<string, unknown>
  richTranslationMeta?: Record<string, unknown>
  pricePerHour?: number
  pricePerDay?: number
  currency?: PlaceCurrency
  hourlyConditions?: string
  dailyConditions?: string
  capacity?: number
  amenities?: string[]
  address: string
  addressNotes?: string
  city?: string
  latitude: number
  longitude: number
  placeId?: string
  imageUrls: string[]
  organizationId?: string
}

export type UpdatePlaceRequest = Partial<CreatePlaceRequest>

export type CreatePlaceRentalRequest = {
  rentalType: RentalType
  phone: string
  comment?: string
}

export type PlaceImageUploadResponse =
  | string
  | {
      url?: string
      imageUrl?: string
      fileUrl?: string
      location?: string
      path?: string
    }
