import type { PlaceCurrency, PlaceStatus, RentalType } from '@api/services'

export const PLACE_STATUS_LABEL_KEYS: Record<PlaceStatus, string> = {
  DRAFT: 'places.status.draft',
  PUBLISHED: 'places.status.published',
  ARCHIVED: 'places.status.archived',
}

export const PLACE_STATUS_STYLES: Record<PlaceStatus, string> = {
  DRAFT: 'border-warning/20 bg-warning-soft text-warning-soft-foreground',
  PUBLISHED: 'border-success/20 bg-success-soft text-success-soft-foreground',
  ARCHIVED: 'border-border bg-neutral-soft text-neutral-soft-foreground',
}

export const PLACE_CURRENCY_LABEL_KEYS: Record<PlaceCurrency, string> = {
  RUB: 'RUB',
  USD: 'USD',
  EUR: 'EUR',
  UZS: 'UZS',
}

export const RENTAL_TYPE_LABEL_KEYS: Record<RentalType, string> = {
  HOURLY: 'places.rentalType.hourly',
  DAILY: 'places.rentalType.daily',
}

export const RENTAL_TYPE_DESCRIPTION_KEYS: Record<RentalType, string> = {
  HOURLY: 'places.rentalDescription.hourly',
  DAILY: 'places.rentalDescription.daily',
}

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
