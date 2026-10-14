<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { DocumentCoverage } from '~/types/document'

const props = defineProps<{
  botId: string
  tenantId?: string
}>()

const { t } = useI18n()
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

const completenessPercent = computed(
  () => coverage.value?.summary.completenessPercent ?? 0,
)
const barColor = computed(() => {
  if (completenessPercent.value >= 80) return 'bg-emerald-500'
  if (completenessPercent.value >= 40) return 'bg-amber-500'
  return 'bg-rose-500'
})

function labelForMissing(field: string): string {
  const key = `admin.documents.coverageMissingField.${field}`
  const translated = t(key)
  return translated === key ? field : translated
}
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <header class="mb-3 flex items-center justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">
          {{ $t('admin.documents.coverageTitle') }}
        </h3>
        <p class="text-xs text-slate-500">
          {{ $t('admin.documents.coverageSubtitle') }}
        </p>
      </div>
      <button
        type="button"
        class="text-xs text-slate-500 hover:text-slate-700"
        :disabled="loading"
        @click="load"
      >
        {{ loading ? $t('admin.documents.coverageRefreshing') : $t('admin.documents.coverageRefresh') }}
      </button>
    </header>

    <div v-if="error" class="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {{ error }}
    </div>

    <div v-else-if="loading && !coverage" class="text-sm text-slate-500">
      {{ $t('admin.documents.coverageLoading') }}
    </div>

    <div v-else-if="coverage" class="space-y-4">
      <!-- Summary bar -->
      <div>
        <div class="flex items-baseline justify-between text-xs text-slate-600">
          <span>
            {{
              $t('admin.documents.coverageServicesComplete', {
                count: coverage.summary.servicesWithCompleteData,
                total: coverage.summary.totalServices,
              })
            }}
          </span>
          <span class="font-semibold text-slate-900">{{ completenessPercent }}%</span>
        </div>
        <div class="mt-1 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            :class="['h-full transition-all', barColor]"
            :style="{ width: `${completenessPercent}%` }"
          />
        </div>
        <p class="mt-2 text-xs text-slate-500">
          {{
            $t('admin.documents.coverageDocsTotal', {
              count: coverage.summary.totalDocs,
            })
          }}
        </p>
      </div>

      <section v-if="coverage.servicesWithIncompleteFields.length > 0">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
          {{ $t('admin.documents.coverageIncompleteTitle') }}
          <span class="ml-1 text-slate-400">({{ coverage.servicesWithIncompleteFields.length }})</span>
        </h4>
        <ul class="space-y-1 text-sm text-slate-700">
          <li
            v-for="s in coverage.servicesWithIncompleteFields"
            :key="s.serviceId"
            class="flex items-center gap-2"
          >
            <span class="inline-block size-1.5 rounded-full bg-rose-500" aria-hidden="true" />
            <span>{{ s.name }}</span>
            <span class="text-xs text-slate-500">
              {{
                $t('admin.documents.coverageIncompleteMissingPrefix', {
                  fields: s.missing.map(labelForMissing).join(', '),
                })
              }}
            </span>
          </li>
        </ul>
        <p class="mt-2 text-xs text-slate-500">
          {{ $t('admin.documents.coverageIncompleteHint') }}
        </p>
      </section>

      <section v-if="coverage.docsWithoutServices.length > 0">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
          {{ $t('admin.documents.coverageDocsListTitle') }}
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
          {{ $t('admin.documents.coverageDocsListHint') }}
        </p>
      </section>

      <div
        v-if="
          coverage.servicesWithIncompleteFields.length === 0 &&
          coverage.summary.totalServices > 0
        "
        class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
      >
        {{ $t('admin.documents.coverageAllGood') }}
      </div>
    </div>
  </div>
</template>
