// Mirrors the backend Prisma enum ServicePriceType.
export type ServicePriceType = 'FIXED' | 'FROM' | 'QUOTE'

export interface Service {
  id: string
  botId: string
  name: string
  slug: string
  description: string
  shortDescription: string | null
  mediaAssetId: string | null
  priceCents: number
  currency: string
  priceType: ServicePriceType
  showPrice: boolean
  isActive: boolean
  sortOrder: number
  durationMinutes: number
  priceFormatted: string
  createdAt: string
  updatedAt: string
}

export interface CreateServiceInput {
  name: string
  slug: string
  description: string
  shortDescription?: string
  priceCents: number
  currency?: string
  priceType?: ServicePriceType
  showPrice?: boolean
  isActive?: boolean
  sortOrder?: number
  durationMinutes?: number
}

export type UpdateServiceInput = Partial<CreateServiceInput>
