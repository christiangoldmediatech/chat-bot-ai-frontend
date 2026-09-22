<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { DocumentCoverage } from '~/types/document'

const props = defineProps<{
  botId: string
  tenantId?: string
}>()

const docs = useDocuments(props.tenantId)
const coverage = ref<DocumentCoverage | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    coverage.value = await docs.getCoverage(props.botId)
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

onMounted(load)
defineExpose({ reload: load })

const coveragePercent = computed(() => coverage.value?.summary.coveragePercent ?? 0)
const barColor = computed(() => {
  if (coveragePercent.value >= 80) return 'bg-emerald-500'
  if (coveragePercent.value >= 40) return 'bg-amber-500'
  return 'bg-rose-500'
})

const missingLabelMap: Record<string, string> = {
  description: 'descripción',
  priceCents: 'precio',
}
function labelForMissing(field: string): string {
  return missingLabelMap[field] ?? field
}
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <header class="mb-3 flex items-center justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">
          Cobertura de documentos
        </h3>
        <p class="text-xs text-slate-500">
          Qué falta por configurar para que el bot responda con base propia.
        </p>
      </div>
      <button
        type="button"
        class="text-xs text-slate-500 hover:text-slate-700"
        :disabled="loading"
        @click="load"
      >
        {{ loading ? 'Actualizando…' : 'Actualizar' }}
      </button>
    </header>

    <div v-if="error" class="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {{ error }}
    </div>

    <div v-else-if="loading && !coverage" class="text-sm text-slate-500">
      Cargando…
    </div>

    <div v-else-if="coverage" class="space-y-4">
      <!-- Summary bar -->
      <div>
        <div class="flex items-baseline justify-between text-xs text-slate-600">
          <span>
            {{ coverage.summary.servicesCovered }} de
            {{ coverage.summary.totalServices }} servicios con documento
          </span>
          <span class="font-semibold text-slate-900">{{ coveragePercent }}%</span>
        </div>
        <div class="mt-1 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            :class="['h-full transition-all', barColor]"
            :style="{ width: `${coveragePercent}%` }"
          />
        </div>
        <p class="mt-2 text-xs text-slate-500">
          {{ coverage.summary.totalDocs }} documentos publicados;
          {{ coverage.summary.docsWithoutServiceLink }} sin servicio asociado.
        </p>
      </div>

      <!-- Servicios sin doc -->
      <section v-if="coverage.servicesWithoutDocs.length > 0">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
          Servicios sin documento
          <span class="ml-1 text-slate-400">({{ coverage.servicesWithoutDocs.length }})</span>
        </h4>
        <ul class="space-y-1 text-sm text-slate-700">
          <li
            v-for="s in coverage.servicesWithoutDocs"
            :key="s.serviceId"
            class="flex items-center gap-2"
          >
            <span class="inline-block size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
            {{ s.name }}
          </li>
        </ul>
        <p class="mt-2 text-xs text-slate-500">
          Sin documento, el bot solo puede usar el nombre, la descripción y el precio del catálogo. Sube un `.md` con reglas extras para mejorar sus respuestas sobre este servicio.
        </p>
      </section>

      <!-- Docs sin servicio -->
      <section v-if="coverage.docsWithoutServices.length > 0">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
          Documentos sin servicio asociado
          <span class="ml-1 text-slate-400">({{ coverage.docsWithoutServices.length }})</span>
        </h4>
        <ul class="space-y-1 text-sm text-slate-700">
          <li
            v-for="d in coverage.docsWithoutServices"
            :key="d.documentId"
            class="flex items-center gap-2"
          >
            <span class="inline-block size-1.5 rounded-full bg-slate-400" aria-hidden="true" />
            <span>{{ d.title || d.fileName }}</span>
            <span v-if="d.documentType" class="text-xs text-slate-500">— {{ d.documentType }}</span>
          </li>
        </ul>
        <p class="mt-2 text-xs text-slate-500">
          Puede ser normal (políticas, ubicación, FAQ, pagos) o falta asociarlos a un servicio. Revisa cada uno en la lista de documentos.
        </p>
      </section>

      <!-- Servicios con campos incompletos -->
      <section v-if="coverage.servicesWithIncompleteFields.length > 0">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
          Servicios con datos incompletos
          <span class="ml-1 text-slate-400">({{ coverage.servicesWithIncompleteFields.length }})</span>
        </h4>
        <ul class="space-y-1 text-sm text-slate-700">
          <li
            v-for="s in coverage.servicesWithIncompleteFields"
            :key="s.serviceId"
            class="flex items-center gap-2"
          >
            <span class="inline-block size-1.5 rounded-full bg-rose-500" aria-hidden="true" />
            {{ s.name }}
            <span class="text-xs text-slate-500">
              — falta {{ s.missing.map(labelForMissing).join(', ') }}
            </span>
          </li>
        </ul>
      </section>

      <div
        v-if="
          coverage.servicesWithoutDocs.length === 0 &&
          coverage.docsWithoutServices.length === 0 &&
          coverage.servicesWithIncompleteFields.length === 0
        "
        class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
      >
        Todo cuadra. Cada servicio tiene al menos un documento y no hay campos vacíos.
      </div>
    </div>
  </div>
</template>
