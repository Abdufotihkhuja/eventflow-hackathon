export * from './api/use-places'
export * from './lib/constants'

/** URL обложки площадки (coverImage, imageUrls или images из API) */
export function getPlaceCoverUrl(place: {
  coverImage?: string | null
  imageUrls?: string[]
  images?: Array<{ url: string }>
}): string | undefined {
  return (
    place.coverImage ??
    place.imageUrls?.[0] ??
    place.images?.[0]?.url
  )
}

/** Все URL изображений площадки (для галереи) */
export function getPlaceImageUrls(place: {
  coverImage?: string | null
  imageUrls?: string[]
  images?: Array<{ url: string }>
}): string[] {
  if (place.imageUrls?.length) return place.imageUrls
  const imgUrls = place.images?.map(i => i.url) ?? []
  if (place.coverImage) {
    return [place.coverImage, ...imgUrls.filter(u => u !== place.coverImage)]
  }
  return imgUrls
}

/** Минимальная цена площадки (для превью в каталоге) */
export function getPlaceMinPrice(place: {
  price?: number
  pricePerHour?: number | null
  pricePerDay?: number | null
}): { amount: number; suffix: string } | null {
  if (place.pricePerHour != null && place.pricePerHour > 0) {
    return { amount: place.pricePerHour, suffix: '/час' }
  }
  if (place.pricePerDay != null && place.pricePerDay > 0) {
    return { amount: place.pricePerDay, suffix: '/сутки' }
  }
  if (place.price != null && place.price > 0) {
    return { amount: place.price, suffix: '' }
  }
  return null
}

/** Проверяет, доступен ли определённый тип аренды */
export function isRentalTypeAvailable(
  place: { pricePerHour?: number | null; pricePerDay?: number | null; price?: number },
  type: 'HOURLY' | 'DAILY',
): boolean {
  if (type === 'HOURLY') return (place.pricePerHour ?? 0) > 0
  return (place.pricePerDay ?? 0) > 0
}
