<script setup lang="ts">
import type { ApiError } from '~/types/api'
import type { Tenant } from '~/types/company'

definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})

const tenant = useTenant()

const data = ref<Tenant | null>(null)
const name = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    data.value = await tenant.me()
    name.value = data.value.name
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    loading.value = false
  }
}

async function onSubmit(): Promise<void> {
  if (!data.value) return
  saving.value = true
  error.value = null
  success.value = null
  try {
    data.value = await tenant.update({ name: name.value })
    success.value = 'Changes saved'
  } catch (err) {
    error.value = (err as ApiError).message
  } finally {
    saving.value = false
  }
}

await load()
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold">My company</h1>
    <p class="text-slate-500 mt-1 text-sm">Details of the tenant your user belongs to.</p>

    <p v-if="error" class="mt-4 rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
      {{ error }}
    </p>

    <p v-if="success" class="mt-4 rounded-md border border-success-200 bg-success-50 p-3 text-sm text-success-700">
      {{ success }}
    </p>

    <SpinnerInline v-if="loading" class="mt-6" />

    <form v-else-if="data" class="mt-6 max-w-xl space-y-4" @submit.prevent="onSubmit">
      <div>
        <label for="name" class="block text-sm font-medium text-slate-700">Name</label>
        <input
          id="name"
          v-model="name"
          type="text"
          required
          minlength="2"
          class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700">Slug</label>
          <div class="mt-1 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{{ data.slug }}</div>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700">Plan</label>
          <div class="mt-1 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{{ data.plan }}</div>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700">Status</label>
          <div class="mt-1 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{{ data.status }}</div>
        </div>
      </div>

      <div class="pt-4">
        <button
          type="submit"
          class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          :disabled="saving"
        >
          {{ saving ? 'Saving…' : 'Save changes' }}
        </button>
      </div>
    </form>
  </div>
</template>
