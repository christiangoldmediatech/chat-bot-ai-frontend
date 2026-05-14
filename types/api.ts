export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

// Shape thrown by useApi on non-2xx. We unwrap NestJS's standard error envelope
// so the UI can do `try { } catch (e: ApiError) { e.message }`.
export interface ApiError {
  status: number
  message: string
  fieldErrors?: Record<string, string[]>
}
