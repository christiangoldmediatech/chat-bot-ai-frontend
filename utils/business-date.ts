import { DateTime } from 'luxon'

export const DEFAULT_BUSINESS_TIMEZONE = 'America/Guayaquil'

export function formatBusinessDateTime(
  iso: string | null | undefined,
  timezone: string,
  locale: string,
): string {
  if (!iso) return ''
  const dt = DateTime.fromISO(iso).setZone(timezone).setLocale(locale)
  if (!dt.isValid) return ''
  return dt.toFormat('dd/MM/yyyy HH:mm')
}

export function formatBusinessDate(
  iso: string | null | undefined,
  timezone: string,
  locale: string,
): string {
  if (!iso) return ''
  const dt = DateTime.fromISO(iso).setZone(timezone).setLocale(locale)
  if (!dt.isValid) return ''
  return dt.toFormat('dd/MM/yyyy')
}

export function assertDateRangeValid(
  from?: string | null,
  to?: string | null,
): boolean {
  if (!from || !to) return true
  return from <= to
}
