import type { FetchOptions } from 'ofetch'

import type { ApiError } from '~/types/api'

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

interface RequestOptions extends Omit<FetchOptions, 'method' | 'body' | 'baseURL'> {
  query?: Record<string, unknown>
}

interface NestErrorPayload {
  statusCode?: number
  message?: string | string[]
  error?: string
}

function isSuperadminPath(path: string): boolean {
  return path.startsWith('/superadmin')
}

function normalizeError(err: unknown): ApiError {
  // ofetch wraps non-2xx in a FetchError with `.response` and `.data` set.
  const fetchErr = err as {
    response?: { status?: number }
    data?: NestErrorPayload
    message?: string
  }
  const status = fetchErr.response?.status ?? 0
  const payload = fetchErr.data
  let message = 'Unexpected error'
  if (payload?.message) {
    message = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message
  } else if (fetchErr.message) {
    message = fetchErr.message
  }
  return { status, message }
}

/**
 * Central API client. Returns typed `get/post/patch/delete` helpers that
 * attach the right bearer token (tenant or platform-admin, decided by the
 * path), normalize errors, and trigger a logout+redirect on 401.
 */
export function useApi() {
  const config = useRuntimeConfig()
  const auth = useAuthStore()
  const superadminAuth = useSuperadminAuthStore()
  const baseURL = config.public.apiBaseUrl

  async function request<T>(
    method: Method,
    path: string,
    body?: unknown,
    opts: RequestOptions = {},
  ): Promise<T> {
    const superadmin = isSuperadminPath(path)
    const token = superadmin ? superadminAuth.token : auth.token

    try {
      return await $fetch<T>(path, {
        ...opts,
        baseURL,
        method,
        // $fetch's body type is a union we can't satisfy from a generic
        // `unknown` parameter; the runtime cast is safe because ofetch
        // serializes plain objects to JSON.
        body: body as Record<string, unknown> | BodyInit | null | undefined,
        headers: {
          ...(opts.headers ?? {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
    } catch (err) {
      const apiError = normalizeError(err)
      if (apiError.status === 401) {
        if (superadmin) {
          superadminAuth.clear()
          await navigateTo('/superadmin/login')
        } else {
          auth.clear()
          await navigateTo('/login')
        }
      }
      throw apiError
    }
  }

  return {
    get: <T>(path: string, opts?: RequestOptions): Promise<T> =>
      request<T>('GET', path, undefined, opts),
    post: <T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> =>
      request<T>('POST', path, body, opts),
    patch: <T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> =>
      request<T>('PATCH', path, body, opts),
    put: <T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> =>
      request<T>('PUT', path, body, opts),
    delete: <T = void>(path: string, opts?: RequestOptions): Promise<T> =>
      request<T>('DELETE', path, undefined, opts),
  }
}
