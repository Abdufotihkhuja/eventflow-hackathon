export const places = {
  title: "Venues",
  status: {
    draft: "Draft",
    published: "Published",
    archived: "Archived",
  },
  rentalType: {
    hourly: "Hourly",
    daily: "Daily",
  },
  rentalDescription: {
    hourly: "Payment for each hour of use",
    daily: "Fixed price per day",
  },
  currency: {
    RUB: "RUB",
    USD: "USD",
    EUR: "EUR",
    UZS: "UZS",
  },
  amenity: {
    parking: "Parking",
    wifi: "Wi-Fi",
    projector: "Projector",
    sound: "Sound and microphones",
    stage: "Stage",
    catering: "Catering",
    airConditioning: "Air conditioning",
    wardrobe: "Wardrobe",
    security: "Security",
    generator: "Backup power",
  },
  catalog: {
    sortNewest: "Newest first",
    sortPriceAsc: "Lowest price first",
    sortPriceDesc: "Highest price first",
    sortNearest: "Near me",
  },
} as const;
