<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type {
  CreateTemplateInput,
  TemplateVariable,
  WhatsappTemplate,
  WhatsappTemplateCategory,
  WhatsappTemplateStatus,
} from '~/types/whatsapp-template'

const props = defineProps<{
  botId: string
  tenantId?: string
}>()

const { t } = useI18n()
const api = useTemplates(props.tenantId)

const items = ref<WhatsappTemplate[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)

const formOpen = ref(false)
const editing = ref<WhatsappTemplate | null>(null)
const formError = ref<string | null>(null)
const saving = ref(false)
const removingId = ref<string | null>(null)
const confirmingRemove = ref<WhatsappTemplate | null>(null)

const testOpen = ref<WhatsappTemplate | null>(null)
const testTo = ref('')
const testValues = ref<string[]>([])
const testSending = ref(false)
const testError = ref<string | null>(null)
const testSuccess = ref<string | null>(null)

const form = reactive<CreateTemplateInput>({
  name: '',
  language: 'es_MX',
  category: 'UTILITY',
  bodyPreview: '',
  variables: [],
  status: 'ACTIVE',
})

const categoryOptions: WhatsappTemplateCategory[] = ['UTILITY', 'MARKETING', 'AUTHENTICATION']
const statusOptions: WhatsappTemplateStatus[] = ['ACTIVE', 'PAUSED']

async function load(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    items.value = await api.listForBot(props.botId)
  }
  catch (err) {
    loadError.value = (err as ApiError).message || t('admin.templates.errors.loadFailed')
  }
  finally {
    loading.value = false
  }
}

function openCreate(): void {
  editing.value = null
  form.name = ''
  form.language = 'es_MX'
  form.category = 'UTILITY'
  form.bodyPreview = ''
  form.variables = []
  form.status = 'ACTIVE'
  formError.value = null
  formOpen.value = true
}

function openEdit(row: WhatsappTemplate): void {
  editing.value = row
  form.name = row.name
  form.language = row.language
  form.category = row.category
  form.bodyPreview = row.bodyPreview
  form.variables = row.variables.map(v => ({ ...v }))
  form.status = row.status
  formError.value = null
  formOpen.value = true
}

function addVariable(): void {
  const nextIndex = (form.variables?.length ?? 0) + 1
  if (!form.variables) form.variables = []
  form.variables.push({ index: nextIndex, label: '', example: '' })
}

function removeVariable(idx: number): void {
  if (!form.variables) return
  form.variables.splice(idx, 1)
  form.variables.forEach((v, i) => {
    v.index = i + 1
  })
}

async function onSave(): Promise<void> {
  saving.value = true
  formError.value = null
  const payload: CreateTemplateInput = {
    name: form.name.trim(),
    language: form.language.trim(),
    category: form.category,
    bodyPreview: form.bodyPreview,
    variables: form.variables?.map(v => ({
      index: v.index,
      label: v.label.trim(),
      example: v.example?.trim() || undefined,
    })) ?? [],
    status: form.status,
  }
  try {
    if (editing.value) {
      await api.update(props.botId, editing.value.id, payload)
    }
    else {
      await api.create(props.botId, payload)
    }
    formOpen.value = false
    await load()
  }
  catch (err) {
    const apiErr = err as ApiError
    if (apiErr.status === 409) {
      formError.value = t('admin.templates.errors.duplicate')
    }
    else {
      formError.value = apiErr.message || t('admin.templates.errors.generic')
    }
  }
  finally {
    saving.value = false
  }
}

async function onConfirmRemove(): Promise<void> {
  const row = confirmingRemove.value
  if (!row) return
  removingId.value = row.id
  try {
    await api.remove(props.botId, row.id)
    confirmingRemove.value = null
    await load()
  }
  catch (err) {
    loadError.value = (err as ApiError).message
  }
  finally {
    removingId.value = null
  }
}

function openTest(row: WhatsappTemplate): void {
  testOpen.value = row
  testTo.value = ''
  testValues.value = row.variables.map(v => v.example ?? '')
  testError.value = null
  testSuccess.value = null
}

async function onTestSend(): Promise<void> {
  const row = testOpen.value
  if (!row) return
  testSending.value = true
  testError.value = null
  testSuccess.value = null
  try {
    const res = await api.testSend(props.botId, row.id, {
      to: testTo.value.trim(),
      variables: testValues.value,
    })
    testSuccess.value = t('admin.templates.testSend.successBody', { wamid: res.wamid })
  }
  catch (err) {
    testError.value = (err as ApiError).message || t('admin.templates.errors.generic')
  }
  finally {
    testSending.value = false
  }
}

function renderedPreview(row: WhatsappTemplate): string {
  let out = row.bodyPreview
  row.variables.forEach((v) => {
    const example = v.example ?? `{${v.label}}`
    out = out.replaceAll(`{{${v.index}}}`, example)
  })
  return out
}

watch(() => props.botId, () => { void load() }, { immediate: true })
</script>

<template>
  <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5">
    <header class="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div class="min-w-0">
        <h2 class="text-base font-semibold text-slate-900">{{ t('admin.templates.sectionTitle') }}</h2>
        <p class="mt-1 text-sm text-slate-600 max-w-prose">{{ t('admin.templates.sectionDescription') }}</p>
        <p class="mt-2 text-xs text-slate-500">
          {{ t('admin.templates.metaHelp') }}
          <a
            href="https://business.facebook.com/wa/manage/message-templates/"
            target="_blank"
            rel="noopener"
            class="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
          >{{ t('admin.templates.metaHelpLink') }}</a>
          {{ t('admin.templates.metaHelpSuffix') }}
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 transition"
        @click="openCreate"
      >
        {{ t('admin.templates.actions.create') }}
      </button>
    </header>

    <div v-if="loadError" class="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {{ loadError }}
    </div>

    <div v-if="loading" class="py-10 flex justify-center">
      <SpinnerInline />
    </div>

    <div v-else-if="!items.length" class="py-10 text-center">
      <p class="text-sm font-medium text-slate-700">{{ t('admin.templates.list.empty') }}</p>
      <p class="mt-1 text-xs text-slate-500">{{ t('admin.templates.list.emptyHint') }}</p>
    </div>

    <ul v-else class="divide-y divide-slate-200/70">
      <li
        v-for="row in items"
        :key="row.id"
        class="py-3 flex flex-wrap items-start justify-between gap-3"
      >
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <code class="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">{{ row.name }}</code>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">{{ row.language }}</span>
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
              :class="row.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
            >{{ t(`admin.templates.list.status.${row.status}`) }}</span>
            <span class="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-700">
              {{ t(`admin.templates.list.category.${row.category}`) }}
            </span>
          </div>
          <p class="mt-1.5 text-sm text-slate-800 whitespace-pre-wrap">{{ renderedPreview(row) }}</p>
          <p v-if="row.variables.length" class="mt-1 text-xs text-slate-500">
            {{ t('admin.templates.list.variablesCount', { n: row.variables.length }, row.variables.length) }}
          </p>
        </div>
        <div class="flex shrink-0 gap-2">
          <button
            type="button"
            class="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition"
            @click="openTest(row)"
          >
            {{ t('admin.templates.actions.testSend') }}
          </button>
          <button
            type="button"
            class="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
            @click="openEdit(row)"
          >
            {{ t('admin.templates.actions.edit') }}
          </button>
          <button
            type="button"
            class="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition disabled:opacity-50"
            :disabled="removingId === row.id"
            @click="confirmingRemove = row"
          >
            {{ t('admin.templates.actions.delete') }}
          </button>
        </div>
      </li>
    </ul>

    <Modal
      :open="formOpen"
      :title="editing ? t('admin.templates.form.title.edit') : t('admin.templates.form.title.create')"
      size="lg"
      @close="formOpen = false"
    >
      <form class="space-y-4" @submit.prevent="onSave">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label class="block text-sm">
            <span class="font-medium text-slate-800">{{ t('admin.templates.form.name') }}</span>
            <input
              v-model="form.name"
              required
              pattern="^[a-z0-9_]+$"
              class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
            >
            <span class="mt-1 block text-xs text-slate-500">{{ t('admin.templates.form.nameHint') }}</span>
          </label>
          <label class="block text-sm">
            <span class="font-medium text-slate-800">{{ t('admin.templates.form.language') }}</span>
            <input
              v-model="form.language"
              required
              class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
            >
            <span class="mt-1 block text-xs text-slate-500">{{ t('admin.templates.form.languageHint') }}</span>
          </label>
          <label class="block text-sm">
            <span class="font-medium text-slate-800">{{ t('admin.templates.form.category') }}</span>
            <select
              v-model="form.category"
              class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
            >
              <option v-for="c in categoryOptions" :key="c" :value="c">{{ t(`admin.templates.list.category.${c}`) }}</option>
            </select>
          </label>
          <label class="block text-sm">
            <span class="font-medium text-slate-800">{{ t('admin.templates.form.status') }}</span>
            <select
              v-model="form.status"
              class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
            >
              <option v-for="s in statusOptions" :key="s" :value="s">{{ t(`admin.templates.list.status.${s}`) }}</option>
            </select>
          </label>
        </div>
        <label class="block text-sm">
          <span class="font-medium text-slate-800">{{ t('admin.templates.form.bodyPreview') }}</span>
          <textarea
            v-model="form.bodyPreview"
            rows="4"
            required
            class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
          />
          <span class="mt-1 block text-xs text-slate-500">{{ t('admin.templates.form.bodyPreviewHint') }}</span>
        </label>

        <div class="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-slate-800">{{ t('admin.templates.form.variables') }}</p>
              <p class="text-xs text-slate-500">{{ t('admin.templates.form.variablesHint') }}</p>
            </div>
            <button
              type="button"
              class="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition"
              @click="addVariable"
            >
              {{ t('admin.templates.form.addVariable') }}
            </button>
          </div>
          <ul v-if="form.variables?.length" class="mt-3 space-y-2">
            <li
              v-for="(v, i) in form.variables"
              :key="i"
              class="grid grid-cols-12 gap-2 items-start"
            >
              <input
                v-model.number="v.index"
                type="number"
                min="1"
                class="col-span-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                :aria-label="t('admin.templates.form.variableIndex')"
              >
              <input
                v-model="v.label"
                required
                :placeholder="t('admin.templates.form.variableLabel')"
                class="col-span-4 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              >
              <input
                v-model="v.example"
                :placeholder="t('admin.templates.form.variableExample')"
                class="col-span-5 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              >
              <button
                type="button"
                class="col-span-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100 transition"
                @click="removeVariable(i)"
              >
                ×
              </button>
            </li>
          </ul>
        </div>

        <div v-if="formError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {{ formError }}
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
            @click="formOpen = false"
          >
            {{ t('admin.templates.actions.cancel') }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 transition disabled:opacity-60"
            :disabled="saving"
            @click="onSave"
          >
            {{ saving ? t('admin.templates.actions.saving') : t('admin.templates.actions.save') }}
          </button>
        </div>
      </template>
    </Modal>

    <Modal
      :open="confirmingRemove !== null"
      :title="t('admin.templates.actions.delete')"
      size="sm"
      @close="confirmingRemove = null"
    >
      <p class="text-sm text-slate-700">{{ t('admin.templates.actions.confirmDelete') }}</p>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
            @click="confirmingRemove = null"
          >
            {{ t('admin.templates.actions.cancel') }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 transition disabled:opacity-60"
            :disabled="removingId !== null"
            @click="onConfirmRemove"
          >
            {{ t('admin.templates.actions.delete') }}
          </button>
        </div>
      </template>
    </Modal>

    <Modal
      :open="testOpen !== null"
      :title="t('admin.templates.testSend.title')"
      :subtitle="t('admin.templates.testSend.subtitle')"
      size="md"
      @close="testOpen = null"
    >
      <form v-if="testOpen" class="space-y-3" @submit.prevent="onTestSend">
        <label class="block text-sm">
          <span class="font-medium text-slate-800">{{ t('admin.templates.testSend.to') }}</span>
          <input
            v-model="testTo"
            required
            :placeholder="t('admin.templates.testSend.toPlaceholder')"
            class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
          >
        </label>
        <label
          v-for="(v, i) in testOpen.variables"
          :key="v.index"
          class="block text-sm"
        >
          <span class="font-medium text-slate-800">{{ t('admin.templates.testSend.variable', { label: v.label }) }}</span>
          <input
            v-model="testValues[i]"
            class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
          >
        </label>

        <div v-if="testError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <p class="font-medium">{{ t('admin.templates.testSend.errorTitle') }}</p>
          <p class="mt-1">{{ testError }}</p>
        </div>
        <div v-if="testSuccess" class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <p class="font-medium">{{ t('admin.templates.testSend.successTitle') }}</p>
          <p class="mt-1 break-all">{{ testSuccess }}</p>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
            @click="testOpen = null"
          >
            {{ t('admin.templates.actions.cancel') }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-60"
            :disabled="testSending"
            @click="onTestSend"
          >
            {{ testSending ? t('admin.templates.actions.sending') : t('admin.templates.actions.testSend') }}
          </button>
        </div>
      </template>
    </Modal>
  </section>
</template>
