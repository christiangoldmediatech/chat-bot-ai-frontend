export type UserRole = 'OWNER' | 'ADMIN' | 'AGENT'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  tenantId: string
}

export interface AuthResponse {
  accessToken: string
  user: AuthUser
}

export interface SuperadminUser {
  id: string
  email: string
}

export interface SuperadminAuthResponse {
  accessToken: string
  user: SuperadminUser
}
