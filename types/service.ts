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
  /**
   * Precio ya formateado por el backend según priceType + showPrice + currency.
   * Se usa TAL CUAL en el catálogo del panel — no re-formatear en el cliente
   * para no divergir de lo que ve el LLM en `list_services`.
   */
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
}

export type UpdateServiceInput = Partial<CreateServiceInput>
