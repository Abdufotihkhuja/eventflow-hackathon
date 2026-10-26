import type { PlaceCurrency, PlaceStatus, RentalType } from '@api/services'
import { createLabelGetter, translateOptions, type Translator } from '@eventflow/i18n'

export const PLACE_STATUS_LABEL_KEYS = {
  DRAFT: 'places.status.draft',
  PUBLISHED: 'places.status.published',
  ARCHIVED: 'places.status.archived',
} as const satisfies Record<PlaceStatus, string>

export const PLACE_STATUS_STYLES: Record<PlaceStatus, string> = {
  DRAFT: 'border-warning-soft bg-warning-soft text-warning-soft-foreground',
  PUBLISHED: 'border-success-soft bg-success-soft text-success-soft-foreground',
  ARCHIVED: 'border-neutral-soft bg-neutral-soft text-neutral-soft-foreground',
}

export const PLACE_CURRENCY_LABEL_KEYS = {
  RUB: 'places.currency.RUB',
  USD: 'places.currency.USD',
  EUR: 'places.currency.EUR',
  UZS: 'places.currency.UZS',
} as const satisfies Record<PlaceCurrency, string>

export const PLACE_CURRENCY_LABELS: Record<PlaceCurrency, string> = {
  RUB: 'RUB',
  USD: 'USD',
  EUR: 'EUR',
  UZS: 'UZS',
}

export const RENTAL_TYPE_LABEL_KEYS = {
  HOURLY: 'places.rentalType.hourly',
  DAILY: 'places.rentalType.daily',
} as const satisfies Record<RentalType, string>

export const RENTAL_TYPE_DESCRIPTION_KEYS = {
  HOURLY: 'places.rentalDescription.hourly',
  DAILY: 'places.rentalDescription.daily',
} as const satisfies Record<RentalType, string>

export const PLACE_AMENITY_OPTIONS = [
  { value: 'parking', labelKey: 'places.amenity.parking' },
  { value: 'wi-fi', labelKey: 'places.amenity.wifi' },
  { value: 'projector', labelKey: 'places.amenity.projector' },
  { value: 'sound', labelKey: 'places.amenity.sound' },
  { value: 'stage', labelKey: 'places.amenity.stage' },
  { value: 'catering', labelKey: 'places.amenity.catering' },
  { value: 'air-conditioning', labelKey: 'places.amenity.airConditioning' },
  { value: 'wardrobe', labelKey: 'places.amenity.wardrobe' },
  { value: 'security', labelKey: 'places.amenity.security' },
  { value: 'generator', labelKey: 'places.amenity.generator' },
] as const

export const PLACE_AMENITY_LABEL_KEYS = Object.fromEntries(
  PLACE_AMENITY_OPTIONS.map(item => [item.value, item.labelKey])
) as Record<string, string>

export const getPlaceStatusLabel = (t: Translator) =>
  createLabelGetter(PLACE_STATUS_LABEL_KEYS, t)
export const getRentalTypeLabel = (t: Translator) =>
  createLabelGetter(RENTAL_TYPE_LABEL_KEYS, t)
export const getRentalTypeDescription = (t: Translator) =>
  createLabelGetter(RENTAL_TYPE_DESCRIPTION_KEYS, t)
export const getPlaceCurrencyLabel = (t: Translator) =>
  createLabelGetter(PLACE_CURRENCY_LABEL_KEYS, t)
export const getPlaceAmenityLabel = (t: Translator) =>
  createLabelGetter(PLACE_AMENITY_LABEL_KEYS, t)
export const getPlaceAmenityOptions = (t: Translator) => translateOptions(PLACE_AMENITY_OPTIONS, t)
