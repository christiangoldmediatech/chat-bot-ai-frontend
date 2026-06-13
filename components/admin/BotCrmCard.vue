<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Plan } from '~/types/company'
import type {
  CrmCustomAuthType,
  CrmIntegration,
  CrmWebhookMethod,
  TestPushResult,
  UpsertCustomWebhookInput,
  ZohoRegion,
} from '~/types/crm-integration'
import type { IntegrationProvider } from '~/types/integration'

const props = defineProps<{
  botId: string
  /** Plan del tenant dueño del bot — usado para decidir si mostrar upsell o el form. */
  plan: Plan
  /** Si está presente, el composable enruta por las rutas superadmin. */
  tenantId?: string
}>()

const { t } = useI18n()
const crm = useCrmIntegration(props.tenantId)

const integrations = ref<CrmIntegration[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)

const selectedProvider = ref<IntegrationProvider>('CUSTOM_WEBHOOK')

// Custom webhook form state
const form = reactive({
  customName: '',
  customEndpointUrl: '',
  customMethod: 'POST' as CrmWebhookMethod,
  customAuthType: 'NONE' as CrmCustomAuthType,
  customAuthSecret: '',
  customAuthHeaderName: '',
  customHeadersText: '',
  customPayloadTemplateText: '',
  customSuccessStatusCodesText: '200, 201, 202',
  customLeadIdJsonPath: '',
  customLeadUrlTemplate: '',
  isActive: true,
})
const saving = ref(false)
const saveError = ref<string | null>(null)

// Disconnect (works for any selected provider)
const disconnecting = ref(false)
const confirmingDisconnect = ref(false)
const confirmingDisconnectProvider = ref<IntegrationProvider | null>(null)

// Test push
const testing = ref(false)
const testResult = ref<TestPushResult | null>(null)

// HubSpot connect flow
const hubspotConnecting = ref(false)
const hubspotConnectError = ref<string | null>(null)
const hubspotCallbackBanner = ref<{ kind: 'success' | 'error'; message: string } | null>(null)

// Salesforce connect flow
const salesforceConnecting = ref(false)
const salesforceConnectError = ref<string | null>(null)
const salesforceCallbackBanner = ref<{ kind: 'success' | 'error'; message: string } | null>(null)
const salesforceSandbox = ref(false)

// Zoho connect flow
const zohoConnecting = ref(false)
const zohoConnectError = ref<string | null>(null)
const zohoCallbackBanner = ref<{ kind: 'success' | 'error'; message: string } | null>(null)
const zohoRegion = ref<ZohoRegion>('us')

const isPremium = computed(() => props.plan === 'PREMIUM')

const customWebhookIntegration = computed<CrmIntegration | null>(() => {
  return integrations.value.find((i) => i.provider === 'CUSTOM_WEBHOOK') ?? null
})

const hubspotIntegration = computed<CrmIntegration | null>(() => {
  return integrations.value.find((i) => i.provider === 'HUBSPOT') ?? null
})

const salesforceIntegration = computed<CrmIntegration | null>(() => {
  return integrations.value.find((i) => i.provider === 'SALESFORCE') ?? null
})

const zohoIntegration = computed<CrmIntegration | null>(() => {
  return integrations.value.find((i) => i.provider === 'ZOHO_CRM') ?? null
})

const hasIntegration = computed(() => customWebhookIntegration.value !== null)
const hasHubSpot = computed(() => hubspotIntegration.value !== null)
const hasSalesforce = computed(() => salesforceIntegration.value !== null)
const hasZoho = computed(() => zohoIntegration.value !== null)

const submitLabel = computed(() =>
  hasIntegration.value
    ? t('admin.crm.customWebhook.submitUpdate')
    : t('admin.crm.customWebhook.submitCreate'),
)

const placeholdersList = computed(() =>
  'phone, name, email, summary, botName, tenantName, tenantSlug, conversationUrl, caseId, customerProfileJson, lastMessages, timestamp',
)

// Ejemplo de placeholder para el hint del payload. Lo construimos en JS y no
// inline en el template porque la cadena literal "{{name}}" choca con el
// parser de Vue (interpreta `{{ }}` como mustache aunque esté dentro de
// comillas simples) y rompe el build con "Unterminated string constant".
const samplePlaceholder = `{{${'name'}}}`
const sampleLeadIdPlaceholder = `{{${'leadId'}}}`

const lastSyncText = computed(() => {
  const integ = customWebhookIntegration.value
  if (!integ) return null
  if (!integ.lastSyncAt) return t('admin.crm.status.lastSyncNever')
  const formatted = new Date(integ.lastSyncAt).toLocaleString()
  return t('admin.crm.status.lastSyncAt', { date: formatted })
})

const lastErrorText = computed(() => {
  const integ = customWebhookIntegration.value
  if (!integ || !integ.lastSyncError) return null
  return t('admin.crm.status.lastError', { message: integ.lastSyncError })
})

function loadFormFrom(integ: CrmIntegration | null): void {
  if (!integ) {
    form.customName = ''
    form.customEndpointUrl = ''
    form.customMethod = 'POST'
    form.customAuthType = 'NONE'
    form.customAuthSecret = ''
    form.customAuthHeaderName = ''
    form.customHeadersText = ''
    form.customPayloadTemplateText = JSON.stringify(
      {
        phone: '{{phone}}',
        name: '{{name}}',
        email: '{{email}}',
        summary: '{{summary}}',
        source: 'WhatsApp Bot - {{botName}}',
        conversationUrl: '{{conversationUrl}}',
      },
      null,
      2,
    )
    form.customSuccessStatusCodesText = '200, 201, 202'
    form.customLeadIdJsonPath = ''
    form.customLeadUrlTemplate = ''
    form.isActive = true
    return
  }
  form.customName = integ.customName ?? ''
  form.customEndpointUrl = integ.customEndpointUrl ?? ''
  form.customMethod = integ.customMethod ?? 'POST'
  form.customAuthType = integ.customAuthType ?? 'NONE'
  form.customAuthSecret = ''
  form.customAuthHeaderName = integ.customAuthHeaderName ?? ''
  form.customHeadersText = integ.customHeaders
    ? JSON.stringify(integ.customHeaders, null, 2)
    : ''
  form.customPayloadTemplateText = integ.customPayloadTemplate
    ? JSON.stringify(integ.customPayloadTemplate, null, 2)
    : ''
  form.customSuccessStatusCodesText = integ.customSuccessStatusCodes.join(', ')
  form.customLeadIdJsonPath = integ.customLeadIdJsonPath ?? ''
  form.customLeadUrlTemplate = integ.customLeadUrlTemplate ?? ''
  form.isActive = integ.isActive
}

function inferZohoRegionFromApiDomain(apiDomain: string): ZohoRegion {
  if (apiDomain.includes('zohoapis.eu')) return 'eu'
  if (apiDomain.includes('zohoapis.in')) return 'in'
  if (apiDomain.includes('zohoapis.com.au')) return 'au'
  if (apiDomain.includes('zohoapis.jp')) return 'jp'
  if (apiDomain.includes('zohoapis.com.cn')) return 'cn'
  return 'us'
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    integrations.value = await crm.list(props.botId)
    loadFormFrom(customWebhookIntegration.value)
    // Auto-select tab:
    //   1. If the URL says we just came back from an OAuth callback, prefer
    //      the provider that triggered it — that's what the user expects
    //      to see right after pressing "Connect".
    //   2. Otherwise pick the integration most recently updated (so the
    //      last one the user touched is on top).
    if (callbackProvider.value) {
      selectedProvider.value = callbackProvider.value
      if (callbackProvider.value === 'SALESFORCE' && salesforceIntegration.value) {
        salesforceSandbox.value = salesforceIntegration.value.isSandbox
      }
    } else if (integrations.value.length > 0) {
      const mostRecent = [...integrations.value].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0]
      selectedProvider.value = mostRecent.provider
      if (mostRecent.provider === 'SALESFORCE') {
        salesforceSandbox.value = mostRecent.isSandbox
      }
    }
    // Pre-seed Zoho region from existing integration's apiDomain, if any.
    if (zohoIntegration.value?.apiDomain) {
      zohoRegion.value = inferZohoRegionFromApiDomain(zohoIntegration.value.apiDomain)
    }
  } catch (err) {
    loadError.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

// Reset test push result when the user switches tabs.
watch(selectedProvider, () => {
  testResult.value = null
})

function parseJsonObject(text: string, fieldKey: string): Record<string, unknown> | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  try {
    const parsed = JSON.parse(trimmed)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('not an object')
    }
    return parsed as Record<string, unknown>
  } catch {
    throw new Error(`${fieldKey}: ${t('admin.crm.errors.invalidJson')}`)
  }
}

function parseSuccessCodes(text: string): number[] | undefined {
  const trimmed = text.trim()
  if (!trimmed) return undefined
  const codes = trimmed
    .split(/[,\s]+/)
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => !Number.isNaN(n))
  return codes.length > 0 ? codes : undefined
}

async function onSave(): Promise<void> {
  saveError.value = null
  if (!form.customEndpointUrl.trim()) {
    saveError.value = t('admin.crm.errors.requiredEndpoint')
    return
  }
  if (!form.customPayloadTemplateText.trim()) {
    saveError.value = t('admin.crm.errors.requiredTemplate')
    return
  }

  let headers: Record<string, unknown> | null
  let template: Record<string, unknown> | null
  try {
    headers = form.customHeadersText.trim()
      ? parseJsonObject(form.customHeadersText, t('admin.crm.customWebhook.customHeadersLabel'))
      : null
    template = parseJsonObject(
      form.customPayloadTemplateText,
      t('admin.crm.customWebhook.payloadTemplateLabel'),
    )
  } catch (err) {
    saveError.value = (err as Error).message
    return
  }
  if (!template) {
    saveError.value = t('admin.crm.errors.requiredTemplate')
    return
  }

  const input: UpsertCustomWebhookInput = {
    customName: form.customName.trim() || undefined,
    customEndpointUrl: form.customEndpointUrl.trim(),
    customMethod: form.customMethod,
    customAuthType: form.customAuthType,
    customAuthHeaderName:
      form.customAuthType === 'API_KEY_HEADER'
        ? form.customAuthHeaderName.trim() || undefined
        : undefined,
    customHeaders: (headers as Record<string, string>) ?? undefined,
    customPayloadTemplate: template,
    customSuccessStatusCodes: parseSuccessCodes(form.customSuccessStatusCodesText),
    customLeadIdJsonPath: form.customLeadIdJsonPath.trim() || undefined,
    customLeadUrlTemplate: form.customLeadUrlTemplate.trim() || undefined,
    isActive: form.isActive,
  }
  if (form.customAuthSecret.length > 0) {
    input.customAuthSecret = form.customAuthSecret
  }

  saving.value = true
  try {
    const saved = hasIntegration.value
      ? await crm.patchCustom(props.botId, input)
      : await crm.upsertCustom(props.botId, input)
    // Replace or append the integration in the local cache.
    const idx = integrations.value.findIndex((i) => i.id === saved.id)
    if (idx >= 0) integrations.value.splice(idx, 1, saved)
    else integrations.value.push(saved)
    loadFormFrom(saved)
    testResult.value = null
  } catch (err) {
    saveError.value = (err as ApiError).message
  } finally {
    saving.value = false
  }
}

async function onTestPush(): Promise<void> {
  const integ = customWebhookIntegration.value
  if (!integ) return
  testing.value = true
  testResult.value = null
  try {
    testResult.value = await crm.testPush(props.botId, integ.id)
  } catch (err) {
    testResult.value = {
      ok: false,
      leadId: null,
      leadUrl: null,
      error: (err as ApiError).message,
      durationMs: null,
    }
  } finally {
    testing.value = false
  }
}

function askDisconnect(provider: IntegrationProvider = 'CUSTOM_WEBHOOK'): void {
  confirmingDisconnectProvider.value = provider
  confirmingDisconnect.value = true
}

function disconnectTargetIntegration(): CrmIntegration | null {
  const provider = confirmingDisconnectProvider.value ?? 'CUSTOM_WEBHOOK'
  return integrations.value.find((i) => i.provider === provider) ?? null
}

async function onConfirmDisconnect(): Promise<void> {
  confirmingDisconnect.value = false
  const integ = disconnectTargetIntegration()
  confirmingDisconnectProvider.value = null
  if (!integ) return
  disconnecting.value = true
  try {
    await crm.disconnect(props.botId, integ.id)
    integrations.value = integrations.value.filter((i) => i.id !== integ.id)
    if (integ.provider === 'CUSTOM_WEBHOOK') {
      loadFormFrom(null)
      testResult.value = null
    }
  } catch (err) {
    saveError.value = (err as ApiError).message
  } finally {
    disconnecting.value = false
  }
}

async function onConnectHubSpot(): Promise<void> {
  hubspotConnectError.value = null
  hubspotConnecting.value = true
  try {
    const { url } = await crm.hubspotConnectUrl(props.botId)
    // Full-page redirect — the callback redirects back to the bot detail
    // page with `?crm=success|error` and `#crm` so the user lands on this
    // section.
    window.location.href = url
  } catch (err) {
    hubspotConnectError.value = (err as ApiError).message
    hubspotConnecting.value = false
  }
}

async function onTestPushHubSpot(): Promise<void> {
  const integ = hubspotIntegration.value
  if (!integ) return
  testing.value = true
  testResult.value = null
  try {
    testResult.value = await crm.testPush(props.botId, integ.id)
  } catch (err) {
    testResult.value = {
      ok: false,
      leadId: null,
      leadUrl: null,
      error: (err as ApiError).message,
      durationMs: null,
    }
  } finally {
    testing.value = false
  }
}

async function onConnectSalesforce(): Promise<void> {
  salesforceConnectError.value = null
  salesforceConnecting.value = true
  try {
    const { url } = await crm.salesforceConnectUrl(props.botId, salesforceSandbox.value)
    window.location.href = url
  } catch (err) {
    salesforceConnectError.value = (err as ApiError).message
    salesforceConnecting.value = false
  }
}

async function onTestPushSalesforce(): Promise<void> {
  const integ = salesforceIntegration.value
  if (!integ) return
  testing.value = true
  testResult.value = null
  try {
    testResult.value = await crm.testPush(props.botId, integ.id)
  } catch (err) {
    testResult.value = {
      ok: false,
      leadId: null,
      leadUrl: null,
      error: (err as ApiError).message,
      durationMs: null,
    }
  } finally {
    testing.value = false
  }
}

async function onConnectZoho(): Promise<void> {
  zohoConnectError.value = null
  zohoConnecting.value = true
  try {
    const { url } = await crm.zohoConnectUrl(props.botId, zohoRegion.value)
    window.location.href = url
  } catch (err) {
    zohoConnectError.value = (err as ApiError).message
    zohoConnecting.value = false
  }
}

async function onTestPushZoho(): Promise<void> {
  const integ = zohoIntegration.value
  if (!integ) return
  testing.value = true
  testResult.value = null
  try {
    testResult.value = await crm.testPush(props.botId, integ.id)
  } catch (err) {
    testResult.value = {
      ok: false,
      leadId: null,
      leadUrl: null,
      error: (err as ApiError).message,
      durationMs: null,
    }
  } finally {
    testing.value = false
  }
}

/**
 * Reads the OAuth callback hints from the query string. The backend's
 * redirect includes `?crm=success|error&provider=hubspot|salesforce` so we
 * know exactly which provider just completed (or failed) the dance and can
 * surface the right banner AND auto-select its tab.
 */
const callbackProvider = ref<'HUBSPOT' | 'SALESFORCE' | 'ZOHO_CRM' | null>(null)

function handleCallbackQuery(): void {
  const route = useRoute()
  const crmParam = route.query.crm
  if (crmParam !== 'success' && crmParam !== 'error') return
  const isSuccess = crmParam === 'success'
  const reason = (route.query.reason as string | undefined) ?? ''
  const provider = (route.query.provider as string | undefined)?.toLowerCase() ?? ''

  if (provider === 'hubspot') {
    callbackProvider.value = 'HUBSPOT'
    hubspotCallbackBanner.value = {
      kind: isSuccess ? 'success' : 'error',
      message: isSuccess
        ? t('admin.crm.hubspot.callbackSuccess')
        : t('admin.crm.hubspot.callbackError', { reason: reason || '—' }),
    }
  } else if (provider === 'salesforce') {
    callbackProvider.value = 'SALESFORCE'
    salesforceCallbackBanner.value = {
      kind: isSuccess ? 'success' : 'error',
      message: isSuccess
        ? t('admin.crm.salesforce.callbackSuccess')
        : t('admin.crm.salesforce.callbackError', { reason: reason || '—' }),
    }
  } else if (provider === 'zoho') {
    callbackProvider.value = 'ZOHO_CRM'
    zohoCallbackBanner.value = {
      kind: isSuccess ? 'success' : 'error',
      message: isSuccess
        ? t('admin.crm.zoho.callbackSuccess')
        : t('admin.crm.zoho.callbackError', { reason: reason || '—' }),
    }
  }
}

onMounted(() => {
  handleCallbackQuery()
  void load()
})
</script>

<template>
  <section class="rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-sm font-semibold text-slate-900">{{ $t('admin.crm.sectionTitle') }}</h2>
        <p class="text-xs text-slate-500 mt-1">{{ $t('admin.crm.sectionDescription') }}</p>
      </div>
      <span
        v-if="hasIntegration"
        :class="customWebhookIntegration?.isActive ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-50 text-slate-600 ring-slate-200'"
        class="text-[11px] font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 ring-1"
      >
        {{ customWebhookIntegration?.isActive ? $t('admin.crm.status.active') : $t('admin.crm.status.paused') }}
      </span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="mt-6 flex justify-center">
      <SpinnerInline />
    </div>

    <!-- Load error -->
    <div
      v-else-if="loadError"
      class="mt-6 rounded-lg border border-danger-200 bg-danger-50 text-danger-700 text-xs p-3"
    >
      {{ loadError }}
    </div>

    <!-- Upsell when plan != PREMIUM -->
    <div
      v-else-if="!isPremium"
      class="mt-6 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-5"
    >
      <div class="flex items-start gap-3">
        <div class="rounded-lg bg-violet-100 p-2 text-violet-700">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
            <path d="M12 2 14.39 8.26 21 9.27l-4.5 4.39L17.78 21 12 17.77 6.22 21l1.28-7.34L3 9.27l6.61-1.01L12 2Z" />
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-violet-900">{{ $t('admin.crm.upsell.title') }}</h3>
          <p class="text-xs text-violet-800 mt-1">{{ $t('admin.crm.upsell.description') }}</p>
          <NuxtLink
            v-if="!tenantId"
            to="/admin/company"
            class="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-violet-900 hover:text-violet-700"
          >
            {{ $t('admin.crm.upsell.cta') }}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5">
              <path fill-rule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clip-rule="evenodd" />
            </svg>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Premium content -->
    <template v-else>
      <!-- Provider selector -->
      <div class="mt-6">
        <p class="text-xs font-semibold text-slate-600 mb-2">{{ $t('admin.crm.providers.label') }}</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <button
            type="button"
            :class="selectedProvider === 'CUSTOM_WEBHOOK' ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-slate-300 bg-white'"
            class="text-left rounded-xl border p-3 transition"
            @click="selectedProvider = 'CUSTOM_WEBHOOK'"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-slate-900">{{ $t('admin.crm.providers.customWebhook.label') }}</span>
            </div>
            <p class="text-xs text-slate-500 mt-1">{{ $t('admin.crm.providers.customWebhook.description') }}</p>
          </button>

          <button
            type="button"
            :class="selectedProvider === 'HUBSPOT' ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-slate-300 bg-white'"
            class="text-left rounded-xl border p-3 transition"
            @click="selectedProvider = 'HUBSPOT'"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-slate-900">{{ $t('admin.crm.providers.hubspot.label') }}</span>
              <span
                v-if="hasHubSpot"
                class="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
              >
                {{ $t('admin.crm.status.connected') }}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-1">{{ $t('admin.crm.providers.hubspot.description') }}</p>
          </button>

          <button
            type="button"
            :class="selectedProvider === 'SALESFORCE' ? 'border-sky-400 bg-sky-50' : 'border-slate-200 hover:border-slate-300 bg-white'"
            class="text-left rounded-xl border p-3 transition"
            @click="selectedProvider = 'SALESFORCE'"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-slate-900">{{ $t('admin.crm.providers.salesforce.label') }}</span>
              <span
                v-if="hasSalesforce"
                class="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
              >
                {{ $t('admin.crm.status.connected') }}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-1">{{ $t('admin.crm.providers.salesforce.description') }}</p>
          </button>

          <button
            type="button"
            :class="selectedProvider === 'ZOHO_CRM' ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-slate-300 bg-white'"
            class="text-left rounded-xl border p-3 transition"
            @click="selectedProvider = 'ZOHO_CRM'"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-slate-900">{{ $t('admin.crm.providers.zohoCrm.label') }}</span>
              <span
                v-if="hasZoho"
                class="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
              >
                {{ $t('admin.crm.status.connected') }}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-1">{{ $t('admin.crm.providers.zohoCrm.description') }}</p>
          </button>
        </div>
      </div>

      <!-- HubSpot OAuth panel -->
      <div v-if="selectedProvider === 'HUBSPOT'" class="mt-6">
        <div
          v-if="hubspotCallbackBanner"
          :class="hubspotCallbackBanner.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-danger-200 bg-danger-50 text-danger-700'"
          class="mb-4 rounded-lg border p-3 text-xs"
        >
          {{ hubspotCallbackBanner.message }}
        </div>

        <!-- Connected state -->
        <div v-if="hasHubSpot" class="rounded-xl border border-orange-200 bg-orange-50/60 p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-slate-900">{{ $t('admin.crm.hubspot.connected') }}</p>
              <dl class="mt-2 grid grid-cols-1 gap-1 text-xs">
                <div class="flex gap-2">
                  <dt class="text-slate-500 w-24 shrink-0">{{ $t('admin.crm.hubspot.accountLabel') }}</dt>
                  <dd class="text-slate-900 font-mono break-all">{{ hubspotIntegration?.accountEmail ?? '—' }}</dd>
                </div>
                <div class="flex gap-2">
                  <dt class="text-slate-500 w-24 shrink-0">{{ $t('admin.crm.hubspot.portalLabel') }}</dt>
                  <dd class="text-slate-900 font-mono">{{ hubspotIntegration?.accountId ?? '—' }}</dd>
                </div>
                <div v-if="hubspotIntegration?.lastSyncAt" class="flex gap-2">
                  <dt class="text-slate-500 w-24 shrink-0">{{ $t('admin.crm.status.lastSyncAt', { date: new Date(hubspotIntegration.lastSyncAt).toLocaleString() }).split(':')[0] }}</dt>
                  <dd class="text-slate-900">{{ new Date(hubspotIntegration.lastSyncAt).toLocaleString() }}</dd>
                </div>
              </dl>
              <p
                v-if="hubspotIntegration?.lastSyncError"
                class="mt-2 text-[11px] text-danger-700 bg-danger-50 ring-1 ring-danger-200 rounded-md px-2 py-1"
              >
                {{ hubspotIntegration.lastSyncError }}
              </p>
            </div>
            <span
              :class="hubspotIntegration?.isActive ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'"
              class="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ring-1"
            >
              {{ hubspotIntegration?.isActive ? $t('admin.crm.status.active') : $t('admin.crm.status.paused') }}
            </span>
          </div>

          <div class="mt-4 flex flex-wrap gap-2 items-center">
            <button
              type="button"
              :disabled="testing"
              class="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-xs font-semibold px-3.5 py-2 shadow-sm transition"
              @click="onTestPushHubSpot"
            >
              <SpinnerInline v-if="testing" />
              <span>{{ testing ? $t('admin.crm.testPush.running') : $t('admin.crm.testPush.button') }}</span>
            </button>
            <button
              type="button"
              :disabled="disconnecting"
              class="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-danger-50 disabled:opacity-60 text-danger-700 text-xs font-semibold px-3.5 py-2 ring-1 ring-danger-200 transition"
              @click="askDisconnect('HUBSPOT')"
            >
              {{ disconnecting ? $t('admin.crm.hubspot.disconnecting') : $t('admin.crm.hubspot.disconnect') }}
            </button>
          </div>

          <!-- Test push result -->
          <div
            v-if="testResult"
            :class="testResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-danger-200 bg-danger-50 text-danger-700'"
            class="mt-4 rounded-lg border p-3 text-xs"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-semibold">{{ testResult.ok ? $t('admin.crm.testPush.success') : $t('admin.crm.testPush.failure') }}</p>
                <p v-if="testResult.ok && testResult.leadId" class="mt-0.5 font-mono break-all">
                  {{ $t('admin.crm.testPush.successWithLead', { leadId: testResult.leadId, duration: testResult.durationMs ?? '?' }) }}
                </p>
                <p v-else-if="testResult.ok" class="mt-0.5">
                  {{ $t('admin.crm.testPush.successNoLead', { duration: testResult.durationMs ?? '?' }) }}
                </p>
                <p v-else class="mt-0.5 font-mono break-words">{{ testResult.error }}</p>
                <a
                  v-if="testResult.ok && testResult.leadUrl"
                  :href="testResult.leadUrl"
                  target="_blank"
                  rel="noopener"
                  class="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold underline"
                >
                  {{ testResult.leadUrl }}
                </a>
              </div>
              <button
                type="button"
                class="text-[11px] text-slate-500 hover:text-slate-700"
                @click="testResult = null"
              >
                {{ $t('admin.crm.testPush.dismiss') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Disconnected state — connect button -->
        <div v-else class="rounded-xl border border-orange-200 bg-orange-50/60 p-4">
          <p class="text-sm text-slate-700">{{ $t('admin.crm.providers.hubspot.description') }}</p>
          <button
            type="button"
            :disabled="hubspotConnecting"
            class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-xs font-semibold px-3.5 py-2 shadow-sm transition"
            @click="onConnectHubSpot"
          >
            <SpinnerInline v-if="hubspotConnecting" />
            <span>{{ hubspotConnecting ? $t('admin.crm.hubspot.connecting') : $t('admin.crm.hubspot.connectButton') }}</span>
          </button>
          <p
            v-if="hubspotConnectError"
            class="mt-2 text-xs text-danger-700 bg-danger-50 ring-1 ring-danger-200 rounded-md px-2 py-1"
          >
            {{ hubspotConnectError }}
          </p>
        </div>
      </div>

      <!-- Salesforce OAuth panel -->
      <div v-if="selectedProvider === 'SALESFORCE'" class="mt-6">
        <div
          v-if="salesforceCallbackBanner"
          :class="salesforceCallbackBanner.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-danger-200 bg-danger-50 text-danger-700'"
          class="mb-4 rounded-lg border p-3 text-xs"
        >
          {{ salesforceCallbackBanner.message }}
        </div>

        <!-- Connected state -->
        <div v-if="hasSalesforce" class="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-slate-900">{{ $t('admin.crm.salesforce.connected') }}</p>
              <dl class="mt-2 grid grid-cols-1 gap-1 text-xs">
                <div class="flex gap-2">
                  <dt class="text-slate-500 w-24 shrink-0">{{ $t('admin.crm.salesforce.accountLabel') }}</dt>
                  <dd class="text-slate-900 font-mono break-all">{{ salesforceIntegration?.accountEmail || '—' }}</dd>
                </div>
                <div class="flex gap-2">
                  <dt class="text-slate-500 w-24 shrink-0">{{ $t('admin.crm.salesforce.instanceLabel') }}</dt>
                  <dd class="text-slate-900 font-mono break-all">{{ salesforceIntegration?.instanceUrl || '—' }}</dd>
                </div>
              </dl>
              <p
                v-if="salesforceIntegration?.lastSyncError"
                class="mt-2 text-[11px] text-danger-700 bg-danger-50 ring-1 ring-danger-200 rounded-md px-2 py-1"
              >
                {{ salesforceIntegration.lastSyncError }}
              </p>
            </div>
            <div class="flex flex-col gap-1 items-end">
              <span
                :class="salesforceIntegration?.isActive ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'"
                class="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ring-1"
              >
                {{ salesforceIntegration?.isActive ? $t('admin.crm.status.active') : $t('admin.crm.status.paused') }}
              </span>
              <span
                :class="salesforceIntegration?.isSandbox ? 'bg-amber-100 text-amber-700 ring-amber-200' : 'bg-sky-100 text-sky-700 ring-sky-200'"
                class="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ring-1"
              >
                {{ salesforceIntegration?.isSandbox ? $t('admin.crm.salesforce.sandboxBadge') : $t('admin.crm.salesforce.productionBadge') }}
              </span>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2 items-center">
            <button
              type="button"
              :disabled="testing"
              class="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-semibold px-3.5 py-2 shadow-sm transition"
              @click="onTestPushSalesforce"
            >
              <SpinnerInline v-if="testing" />
              <span>{{ testing ? $t('admin.crm.testPush.running') : $t('admin.crm.testPush.button') }}</span>
            </button>
            <button
              type="button"
              :disabled="disconnecting"
              class="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-danger-50 disabled:opacity-60 text-danger-700 text-xs font-semibold px-3.5 py-2 ring-1 ring-danger-200 transition"
              @click="askDisconnect('SALESFORCE')"
            >
              {{ disconnecting ? $t('admin.crm.salesforce.disconnecting') : $t('admin.crm.salesforce.disconnect') }}
            </button>
          </div>

          <div
            v-if="testResult"
            :class="testResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-danger-200 bg-danger-50 text-danger-700'"
            class="mt-4 rounded-lg border p-3 text-xs"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-semibold">{{ testResult.ok ? $t('admin.crm.testPush.success') : $t('admin.crm.testPush.failure') }}</p>
                <p v-if="testResult.ok && testResult.leadId" class="mt-0.5 font-mono break-all">
                  {{ $t('admin.crm.testPush.successWithLead', { leadId: testResult.leadId, duration: testResult.durationMs ?? '?' }) }}
                </p>
                <p v-else-if="testResult.ok" class="mt-0.5">
                  {{ $t('admin.crm.testPush.successNoLead', { duration: testResult.durationMs ?? '?' }) }}
                </p>
                <p v-else class="mt-0.5 font-mono break-words">{{ testResult.error }}</p>
                <a
                  v-if="testResult.ok && testResult.leadUrl"
                  :href="testResult.leadUrl"
                  target="_blank"
                  rel="noopener"
                  class="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold underline"
                >
                  {{ testResult.leadUrl }}
                </a>
              </div>
              <button
                type="button"
                class="text-[11px] text-slate-500 hover:text-slate-700"
                @click="testResult = null"
              >
                {{ $t('admin.crm.testPush.dismiss') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Disconnected state — sandbox toggle + connect button -->
        <div v-else class="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
          <p class="text-sm text-slate-700">{{ $t('admin.crm.providers.salesforce.description') }}</p>

          <fieldset class="mt-4">
            <legend class="text-xs font-semibold text-slate-700">
              {{ $t('admin.crm.salesforce.envToggleLabel') }}
            </legend>
            <div class="mt-2 flex gap-3">
              <label class="inline-flex items-center gap-2 text-xs">
                <input
                  v-model="salesforceSandbox"
                  :value="false"
                  type="radio"
                  name="sf-env"
                  class="text-sky-600 focus:ring-sky-400"
                >
                <span>{{ $t('admin.crm.salesforce.envProduction') }}</span>
              </label>
              <label class="inline-flex items-center gap-2 text-xs">
                <input
                  v-model="salesforceSandbox"
                  :value="true"
                  type="radio"
                  name="sf-env"
                  class="text-amber-600 focus:ring-amber-400"
                >
                <span>{{ $t('admin.crm.salesforce.envSandbox') }}</span>
              </label>
            </div>
            <p class="mt-2 text-[11px] text-slate-500">{{ $t('admin.crm.salesforce.envHint') }}</p>
          </fieldset>

          <button
            type="button"
            :disabled="salesforceConnecting"
            class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-semibold px-3.5 py-2 shadow-sm transition"
            @click="onConnectSalesforce"
          >
            <SpinnerInline v-if="salesforceConnecting" />
            <span>{{ salesforceConnecting ? $t('admin.crm.salesforce.connecting') : $t('admin.crm.salesforce.connectButton') }}</span>
          </button>
          <p
            v-if="salesforceConnectError"
            class="mt-2 text-xs text-danger-700 bg-danger-50 ring-1 ring-danger-200 rounded-md px-2 py-1"
          >
            {{ salesforceConnectError }}
          </p>
        </div>
      </div>

      <!-- Zoho OAuth panel -->
      <div v-if="selectedProvider === 'ZOHO_CRM'" class="mt-6">
        <div
          v-if="zohoCallbackBanner"
          :class="zohoCallbackBanner.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-danger-200 bg-danger-50 text-danger-700'"
          class="mb-4 rounded-lg border p-3 text-xs"
        >
          {{ zohoCallbackBanner.message }}
        </div>

        <!-- Connected state -->
        <div v-if="hasZoho" class="rounded-xl border border-red-200 bg-red-50/60 p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-slate-900">{{ $t('admin.crm.zoho.connected') }}</p>
              <dl class="mt-2 grid grid-cols-1 gap-1 text-xs">
                <div class="flex gap-2">
                  <dt class="text-slate-500 w-24 shrink-0">{{ $t('admin.crm.zoho.accountLabel') }}</dt>
                  <dd class="text-slate-900 font-mono break-all">{{ zohoIntegration?.accountEmail || '—' }}</dd>
                </div>
                <div class="flex gap-2">
                  <dt class="text-slate-500 w-24 shrink-0">{{ $t('admin.crm.zoho.apiDomainLabel') }}</dt>
                  <dd class="text-slate-900 font-mono break-all">{{ zohoIntegration?.apiDomain || '—' }}</dd>
                </div>
                <div class="flex gap-2">
                  <dt class="text-slate-500 w-24 shrink-0">{{ $t('admin.crm.zoho.regionLabel') }}</dt>
                  <dd class="text-slate-900 font-mono">{{ zohoRegion.toUpperCase() }}</dd>
                </div>
              </dl>
              <p
                v-if="zohoIntegration?.lastSyncError"
                class="mt-2 text-[11px] text-danger-700 bg-danger-50 ring-1 ring-danger-200 rounded-md px-2 py-1"
              >
                {{ zohoIntegration.lastSyncError }}
              </p>
            </div>
            <span
              :class="zohoIntegration?.isActive ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'"
              class="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ring-1"
            >
              {{ zohoIntegration?.isActive ? $t('admin.crm.status.active') : $t('admin.crm.status.paused') }}
            </span>
          </div>

          <div class="mt-4 flex flex-wrap gap-2 items-center">
            <button
              type="button"
              :disabled="testing"
              class="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold px-3.5 py-2 shadow-sm transition"
              @click="onTestPushZoho"
            >
              <SpinnerInline v-if="testing" />
              <span>{{ testing ? $t('admin.crm.testPush.running') : $t('admin.crm.testPush.button') }}</span>
            </button>
            <button
              type="button"
              :disabled="disconnecting"
              class="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-danger-50 disabled:opacity-60 text-danger-700 text-xs font-semibold px-3.5 py-2 ring-1 ring-danger-200 transition"
              @click="askDisconnect('ZOHO_CRM')"
            >
              {{ disconnecting ? $t('admin.crm.zoho.disconnecting') : $t('admin.crm.zoho.disconnect') }}
            </button>
          </div>

          <div
            v-if="testResult"
            :class="testResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-danger-200 bg-danger-50 text-danger-700'"
            class="mt-4 rounded-lg border p-3 text-xs"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-semibold">{{ testResult.ok ? $t('admin.crm.testPush.success') : $t('admin.crm.testPush.failure') }}</p>
                <p v-if="testResult.ok && testResult.leadId" class="mt-0.5 font-mono break-all">
                  {{ $t('admin.crm.testPush.successWithLead', { leadId: testResult.leadId, duration: testResult.durationMs ?? '?' }) }}
                </p>
                <p v-else-if="testResult.ok" class="mt-0.5">
                  {{ $t('admin.crm.testPush.successNoLead', { duration: testResult.durationMs ?? '?' }) }}
                </p>
                <p v-else class="mt-0.5 font-mono break-words">{{ testResult.error }}</p>
                <a
                  v-if="testResult.ok && testResult.leadUrl"
                  :href="testResult.leadUrl"
                  target="_blank"
                  rel="noopener"
                  class="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold underline"
                >
                  {{ testResult.leadUrl }}
                </a>
              </div>
              <button
                type="button"
                class="text-[11px] text-slate-500 hover:text-slate-700"
                @click="testResult = null"
              >
                {{ $t('admin.crm.testPush.dismiss') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Disconnected state — region selector + connect button -->
        <div v-else class="rounded-xl border border-red-200 bg-red-50/60 p-4">
          <p class="text-sm text-slate-700">{{ $t('admin.crm.providers.zohoCrm.description') }}</p>

          <fieldset class="mt-4">
            <legend class="text-xs font-semibold text-slate-700">
              {{ $t('admin.crm.zoho.regionToggleLabel') }}
            </legend>
            <div class="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
              <label
                v-for="r in (['us','eu','in','au','jp','cn'] as const)"
                :key="r"
                class="inline-flex items-center gap-2 text-xs rounded-lg border px-2.5 py-1.5 cursor-pointer"
                :class="zohoRegion === r ? 'border-red-400 bg-red-100/60' : 'border-slate-200 bg-white hover:border-slate-300'"
              >
                <input
                  v-model="zohoRegion"
                  :value="r"
                  type="radio"
                  name="zoho-region"
                  class="text-red-600 focus:ring-red-400"
                >
                <span>{{ $t(`admin.crm.zoho.regions.${r}`) }}</span>
              </label>
            </div>
            <p class="mt-2 text-[11px] text-slate-500">{{ $t('admin.crm.zoho.regionHint') }}</p>
            <p class="mt-1 text-[11px] text-amber-700">{{ $t('admin.crm.zoho.reauthorizeNotice') }}</p>
          </fieldset>

          <button
            type="button"
            :disabled="zohoConnecting"
            class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-semibold px-3.5 py-2 shadow-sm transition"
            @click="onConnectZoho"
          >
            <SpinnerInline v-if="zohoConnecting" />
            <span>{{ zohoConnecting ? $t('admin.crm.zoho.connecting') : $t('admin.crm.zoho.connectButton') }}</span>
          </button>
          <p
            v-if="zohoConnectError"
            class="mt-2 text-xs text-danger-700 bg-danger-50 ring-1 ring-danger-200 rounded-md px-2 py-1"
          >
            {{ zohoConnectError }}
          </p>
        </div>
      </div>

      <!-- Custom webhook form -->
      <div v-if="selectedProvider === 'CUSTOM_WEBHOOK'" class="mt-6">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-slate-900">{{ $t('admin.crm.customWebhook.formTitle') }}</h3>
          <span
            v-if="hasIntegration"
            class="text-[11px] font-medium rounded-full px-2 py-0.5 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          >
            {{ $t('admin.crm.status.connected') }}
          </span>
        </div>
        <p class="text-xs text-slate-500 mb-4">{{ $t('admin.crm.customWebhook.formDescription') }}</p>

        <!-- Status row -->
        <div v-if="hasIntegration" class="mb-4 flex flex-wrap gap-2 text-[11px]">
          <span
            v-if="lastSyncText"
            class="rounded-full bg-slate-100 text-slate-600 px-2.5 py-1 ring-1 ring-slate-200"
          >
            {{ lastSyncText }}
          </span>
          <span
            v-if="lastErrorText"
            class="rounded-full bg-danger-50 text-danger-700 px-2.5 py-1 ring-1 ring-danger-200 max-w-md truncate"
          >
            {{ lastErrorText }}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label class="block">
            <span class="text-xs font-medium text-slate-700">{{ $t('admin.crm.customWebhook.customNameLabel') }}</span>
            <input
              v-model="form.customName"
              type="text"
              :placeholder="$t('admin.crm.customWebhook.customNamePlaceholder')"
              class="mt-1 block w-full rounded-lg border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
            >
            <span class="text-[11px] text-slate-500 mt-1 block">{{ $t('admin.crm.customWebhook.customNameHint') }}</span>
          </label>

          <label class="block">
            <span class="text-xs font-medium text-slate-700">{{ $t('admin.crm.customWebhook.methodLabel') }}</span>
            <select
              v-model="form.customMethod"
              class="mt-1 block w-full rounded-lg border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
            >
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
            </select>
          </label>
        </div>

        <label class="block mt-3">
          <span class="text-xs font-medium text-slate-700">{{ $t('admin.crm.customWebhook.endpointLabel') }}</span>
          <input
            v-model="form.customEndpointUrl"
            type="url"
            :placeholder="$t('admin.crm.customWebhook.endpointPlaceholder')"
            class="mt-1 block w-full rounded-lg border-slate-200 bg-white px-3 py-2 text-sm font-mono shadow-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
            required
          >
        </label>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <label class="block">
            <span class="text-xs font-medium text-slate-700">{{ $t('admin.crm.customWebhook.authTypeLabel') }}</span>
            <select
              v-model="form.customAuthType"
              class="mt-1 block w-full rounded-lg border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
            >
              <option value="NONE">{{ $t('admin.crm.customWebhook.authNone') }}</option>
              <option value="BEARER">{{ $t('admin.crm.customWebhook.authBearer') }}</option>
              <option value="BASIC">{{ $t('admin.crm.customWebhook.authBasic') }}</option>
              <option value="API_KEY_HEADER">{{ $t('admin.crm.customWebhook.authApiKey') }}</option>
            </select>
          </label>

          <label v-if="form.customAuthType === 'API_KEY_HEADER'" class="block">
            <span class="text-xs font-medium text-slate-700">{{ $t('admin.crm.customWebhook.authHeaderNameLabel') }}</span>
            <input
              v-model="form.customAuthHeaderName"
              type="text"
              :placeholder="$t('admin.crm.customWebhook.authHeaderNamePlaceholder')"
              class="mt-1 block w-full rounded-lg border-slate-200 bg-white px-3 py-2 text-sm font-mono shadow-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
            >
          </label>
        </div>

        <label v-if="form.customAuthType !== 'NONE'" class="block mt-3">
          <span class="text-xs font-medium text-slate-700">{{ $t('admin.crm.customWebhook.authSecretLabel') }}</span>
          <input
            v-model="form.customAuthSecret"
            type="password"
            :placeholder="$t('admin.crm.customWebhook.authSecretPlaceholder')"
            autocomplete="off"
            class="mt-1 block w-full rounded-lg border-slate-200 bg-white px-3 py-2 text-sm font-mono shadow-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
          >
          <span class="text-[11px] text-slate-500 mt-1 block">
            {{ customWebhookIntegration?.hasAuthSecret ? $t('admin.crm.customWebhook.authSecretMasked') : $t('admin.crm.customWebhook.authSecretHint') }}
          </span>
        </label>

        <label class="block mt-3">
          <span class="text-xs font-medium text-slate-700">{{ $t('admin.crm.customWebhook.customHeadersLabel') }}</span>
          <textarea
            v-model="form.customHeadersText"
            rows="3"
            :placeholder="$t('admin.crm.customWebhook.customHeadersPlaceholder')"
            class="mt-1 block w-full rounded-lg border-slate-200 bg-white px-3 py-2 text-xs font-mono shadow-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
          />
        </label>

        <label class="block mt-3">
          <span class="text-xs font-medium text-slate-700">{{ $t('admin.crm.customWebhook.payloadTemplateLabel') }}</span>
          <textarea
            v-model="form.customPayloadTemplateText"
            rows="10"
            class="mt-1 block w-full rounded-lg border-slate-200 bg-white px-3 py-2 text-xs font-mono shadow-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
            required
          />
          <span class="text-[11px] text-slate-500 mt-1 block">
            {{ $t('admin.crm.customWebhook.payloadTemplateHint', { placeholder: samplePlaceholder, list: placeholdersList }) }}
          </span>
        </label>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <label class="block">
            <span class="text-xs font-medium text-slate-700">{{ $t('admin.crm.customWebhook.successCodesLabel') }}</span>
            <input
              v-model="form.customSuccessStatusCodesText"
              type="text"
              :placeholder="$t('admin.crm.customWebhook.successCodesPlaceholder')"
              class="mt-1 block w-full rounded-lg border-slate-200 bg-white px-3 py-2 text-sm font-mono shadow-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
            >
            <span class="text-[11px] text-slate-500 mt-1 block">{{ $t('admin.crm.customWebhook.successCodesHint') }}</span>
          </label>

          <label class="block">
            <span class="text-xs font-medium text-slate-700">{{ $t('admin.crm.customWebhook.leadIdPathLabel') }}</span>
            <input
              v-model="form.customLeadIdJsonPath"
              type="text"
              :placeholder="$t('admin.crm.customWebhook.leadIdPathPlaceholder')"
              class="mt-1 block w-full rounded-lg border-slate-200 bg-white px-3 py-2 text-sm font-mono shadow-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
            >
          </label>

          <label class="block">
            <span class="text-xs font-medium text-slate-700">{{ $t('admin.crm.customWebhook.leadUrlTemplateLabel') }}</span>
            <input
              v-model="form.customLeadUrlTemplate"
              type="text"
              :placeholder="$t('admin.crm.customWebhook.leadUrlTemplatePlaceholder')"
              class="mt-1 block w-full rounded-lg border-slate-200 bg-white px-3 py-2 text-sm font-mono shadow-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
            >
            <span class="text-[11px] text-slate-500 mt-1 block">
              {{ $t('admin.crm.customWebhook.leadUrlTemplateHint', { leadIdPlaceholder: sampleLeadIdPlaceholder }) }}
            </span>
          </label>
        </div>

        <label class="flex items-center gap-2 mt-4">
          <input v-model="form.isActive" type="checkbox" class="rounded text-violet-600 focus:ring-violet-400">
          <span class="text-xs font-medium text-slate-700">{{ $t('admin.crm.customWebhook.isActiveLabel') }}</span>
          <span class="text-[11px] text-slate-500">— {{ $t('admin.crm.customWebhook.isActiveHint') }}</span>
        </label>

        <div
          v-if="saveError"
          class="mt-3 rounded-lg border border-danger-200 bg-danger-50 text-danger-700 text-xs p-3"
        >
          {{ saveError }}
        </div>

        <div class="mt-5 flex flex-wrap gap-2 items-center">
          <button
            type="button"
            :disabled="saving"
            class="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold px-3.5 py-2 shadow-sm transition"
            @click="onSave"
          >
            <SpinnerInline v-if="saving" />
            <span>{{ saving ? $t('admin.crm.customWebhook.saving') : submitLabel }}</span>
          </button>

          <button
            v-if="hasIntegration"
            type="button"
            :disabled="testing"
            class="inline-flex items-center gap-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 disabled:opacity-60 text-violet-900 text-xs font-semibold px-3.5 py-2 shadow-sm transition"
            @click="onTestPush"
          >
            <SpinnerInline v-if="testing" />
            <span>{{ testing ? $t('admin.crm.testPush.running') : $t('admin.crm.testPush.button') }}</span>
          </button>

          <button
            v-if="hasIntegration"
            type="button"
            :disabled="disconnecting"
            class="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-danger-50 disabled:opacity-60 text-danger-700 text-xs font-semibold px-3.5 py-2 ring-1 ring-danger-200 transition"
            @click="askDisconnect('CUSTOM_WEBHOOK')"
          >
            {{ disconnecting ? $t('admin.crm.customWebhook.disconnecting') : $t('admin.crm.customWebhook.disconnect') }}
          </button>
        </div>

        <!-- Test push result -->
        <div
          v-if="testResult"
          :class="testResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-danger-200 bg-danger-50 text-danger-700'"
          class="mt-4 rounded-lg border p-3 text-xs"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="font-semibold">{{ testResult.ok ? $t('admin.crm.testPush.success') : $t('admin.crm.testPush.failure') }}</p>
              <p v-if="testResult.ok && testResult.leadId" class="mt-0.5 font-mono break-all">
                {{ $t('admin.crm.testPush.successWithLead', { leadId: testResult.leadId, duration: testResult.durationMs ?? '?' }) }}
              </p>
              <p v-else-if="testResult.ok" class="mt-0.5">
                {{ $t('admin.crm.testPush.successNoLead', { duration: testResult.durationMs ?? '?' }) }}
              </p>
              <p v-else class="mt-0.5 font-mono break-words">{{ testResult.error }}</p>
            </div>
            <button
              type="button"
              class="text-[11px] text-slate-500 hover:text-slate-700"
              @click="testResult = null"
            >
              {{ $t('admin.crm.testPush.dismiss') }}
            </button>
          </div>
        </div>
        <p v-else-if="hasIntegration" class="mt-3 text-[11px] text-slate-500">
          {{ $t('admin.crm.testPush.notice') }}
        </p>
      </div>
    </template>

    <ConfirmDialog
      :open="confirmingDisconnect"
      :title="confirmingDisconnectProvider === 'HUBSPOT' ? $t('admin.crm.hubspot.disconnect') : confirmingDisconnectProvider === 'SALESFORCE' ? $t('admin.crm.salesforce.disconnect') : confirmingDisconnectProvider === 'ZOHO_CRM' ? $t('admin.crm.zoho.disconnect') : $t('admin.crm.customWebhook.disconnect')"
      :message="confirmingDisconnectProvider === 'HUBSPOT' ? $t('admin.crm.hubspot.confirmDisconnect') : confirmingDisconnectProvider === 'SALESFORCE' ? $t('admin.crm.salesforce.confirmDisconnect') : confirmingDisconnectProvider === 'ZOHO_CRM' ? $t('admin.crm.zoho.confirmDisconnect') : $t('admin.crm.customWebhook.confirmDisconnect')"
      :confirm-label="confirmingDisconnectProvider === 'HUBSPOT' ? $t('admin.crm.hubspot.disconnect') : confirmingDisconnectProvider === 'SALESFORCE' ? $t('admin.crm.salesforce.disconnect') : confirmingDisconnectProvider === 'ZOHO_CRM' ? $t('admin.crm.zoho.disconnect') : $t('admin.crm.customWebhook.disconnect')"
      @confirm="onConfirmDisconnect"
      @cancel="confirmingDisconnect = false; confirmingDisconnectProvider = null"
    />
  </section>
</template>
