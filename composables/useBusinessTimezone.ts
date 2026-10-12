import { DEFAULT_BUSINESS_TIMEZONE } from '~/utils/business-date'

export function useBusinessTimezone(): ComputedRef<string> {
  const route = useRoute()
  return computed(() => {
    const q = route.query.tz
    if (typeof q === 'string' && q.length > 0) return q
    return DEFAULT_BUSINESS_TIMEZONE
  })
}
