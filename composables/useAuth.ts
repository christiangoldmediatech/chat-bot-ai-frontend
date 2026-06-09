import type { AuthResponse, SuperadminAuthResponse } from '~/types/auth'

export interface RegisterInput {
  tenantName: string
  tenantSlug: string
  email: string
  password: string
}

/**
 * Wraps the tenant + superadmin login flows. Each call hits the backend,
 * stores the JWT and user in the matching Pinia store, and returns the
 * response so callers can do post-login navigation.
 */
export function useAuth() {
  const api = useApi()
  const auth = useAuthStore()
  const superadminAuth = useSuperadminAuthStore()

  async function login(email: string, password: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', { email, password })
    auth.setSession(res.accessToken, res.user)
    return res
  }

  async function register(input: RegisterInput): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/register', input)
    auth.setSession(res.accessToken, res.user)
    return res
  }

  function logout(): void {
    auth.clear()
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post<void>('/auth/change-password', { currentPassword, newPassword })
  }

  async function superadminLogin(
    email: string,
    password: string,
  ): Promise<SuperadminAuthResponse> {
    const res = await api.post<SuperadminAuthResponse>(
      '/superadmin/auth/login',
      { email, password },
    )
    superadminAuth.setSession(res.accessToken, res.user)
    return res
  }

  function superadminLogout(): void {
    superadminAuth.clear()
  }

  async function superadminChangePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post<void>('/superadmin/auth/change-password', { currentPassword, newPassword })
  }

  return {
    login,
    register,
    logout,
    changePassword,
    superadminLogin,
    superadminLogout,
    superadminChangePassword,
  }
}
