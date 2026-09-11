import type { AuthResponse, SuperadminAuthResponse } from '~/types/auth'

export interface RegisterInput {
  tenantName: string
  tenantSlug: string
  email: string
  password: string
}

export interface PasswordCodeResponse {
  message: string
}

export interface PasswordVerifyResponse {
  token: string
  expiresIn: number
}

export interface PasswordChangeAcceptedResponse {
  accessToken: string
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

  /**
   * Legacy single-shot password change. Kept for backward compat with the
   * current profile.vue form; the F10 refactor swaps callers to the
   * code-verified `changePasswordWithCode` and this can be removed.
   */
  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post<void>('/auth/change-password', { currentPassword, newPassword })
  }

  // ─── Password reset (no session) ────────────────────────────────────────

  async function requestPasswordReset(email: string): Promise<PasswordCodeResponse> {
    return api.post<PasswordCodeResponse>('/auth/password/forgot', { email })
  }

  async function verifyPasswordResetCode(
    email: string,
    code: string,
  ): Promise<PasswordVerifyResponse> {
    return api.post<PasswordVerifyResponse>('/auth/password/verify-code', { email, code })
  }

  async function resetPassword(input: {
    resetToken: string
    newPassword: string
    confirmPassword: string
  }): Promise<void> {
    await api.post<void>('/auth/password/reset', input)
  }

  // ─── Password change (authenticated tenant user) ────────────────────────

  async function requestPasswordChange(): Promise<PasswordCodeResponse> {
    return api.post<PasswordCodeResponse>('/auth/password/change/request', {})
  }

  async function verifyPasswordChangeCode(code: string): Promise<PasswordVerifyResponse> {
    return api.post<PasswordVerifyResponse>('/auth/password/change/verify', { code })
  }

  /**
   * Completes the password change. Backend returns a fresh JWT that replaces
   * the caller's current one — we swap it in the auth store so the user
   * stays signed in on the current tab while every other session is revoked.
   */
  async function changePasswordWithCode(input: {
    changeToken: string
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }): Promise<PasswordChangeAcceptedResponse> {
    const res = await api.post<PasswordChangeAcceptedResponse>('/auth/password/change', input)
    if (auth.user) {
      auth.setSession(res.accessToken, auth.user)
    }
    return res
  }

  // ─── Superadmin login + password variants ───────────────────────────────

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

  /**
   * Legacy single-shot superadmin password change. See changePassword above.
   */
  async function superadminChangePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post<void>('/superadmin/auth/change-password', { currentPassword, newPassword })
  }

  async function superadminRequestPasswordReset(email: string): Promise<PasswordCodeResponse> {
    return api.post<PasswordCodeResponse>('/superadmin/auth/password/forgot', { email })
  }

  async function superadminVerifyPasswordResetCode(
    email: string,
    code: string,
  ): Promise<PasswordVerifyResponse> {
    return api.post<PasswordVerifyResponse>('/superadmin/auth/password/verify-code', {
      email,
      code,
    })
  }

  async function superadminResetPassword(input: {
    resetToken: string
    newPassword: string
    confirmPassword: string
  }): Promise<void> {
    await api.post<void>('/superadmin/auth/password/reset', input)
  }

  async function superadminRequestPasswordChange(): Promise<PasswordCodeResponse> {
    return api.post<PasswordCodeResponse>('/superadmin/auth/password/change/request', {})
  }

  async function superadminVerifyPasswordChangeCode(
    code: string,
  ): Promise<PasswordVerifyResponse> {
    return api.post<PasswordVerifyResponse>('/superadmin/auth/password/change/verify', { code })
  }

  async function superadminChangePasswordWithCode(input: {
    changeToken: string
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }): Promise<PasswordChangeAcceptedResponse> {
    const res = await api.post<PasswordChangeAcceptedResponse>(
      '/superadmin/auth/password/change',
      input,
    )
    if (superadminAuth.user) {
      superadminAuth.setSession(res.accessToken, superadminAuth.user)
    }
    return res
  }

  return {
    login,
    register,
    logout,
    changePassword,
    requestPasswordReset,
    verifyPasswordResetCode,
    resetPassword,
    requestPasswordChange,
    verifyPasswordChangeCode,
    changePasswordWithCode,
    superadminLogin,
    superadminLogout,
    superadminChangePassword,
    superadminRequestPasswordReset,
    superadminVerifyPasswordResetCode,
    superadminResetPassword,
    superadminRequestPasswordChange,
    superadminVerifyPasswordChangeCode,
    superadminChangePasswordWithCode,
  }
}
