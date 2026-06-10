import type { PlanDetails } from '~/types/company'

/**
 * Public, cached read of the subscription plan catalog. The list is small
 * and changes rarely — fetched once per app lifetime.
 */
export function usePlans() {
  const api = useApi()
  const state = useState<PlanDetails[] | null>('plans-catalog', () => null)

  async function list(): Promise<PlanDetails[]> {
    if (state.value) return state.value
    state.value = await api.get<PlanDetails[]>('/plans')
    return state.value
  }

  return { list, state: readonly(state) }
}
