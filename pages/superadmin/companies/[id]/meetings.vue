<script setup lang="ts">
definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})

const route = useRoute()
const tenantId = route.params.id as string
</script>

<template>
  <div>
    <NuxtLink :to="`/superadmin/companies/${tenantId}`" class="text-sm text-slate-400 hover:text-slate-200">
      ← Back to company
    </NuxtLink>

    <header class="mt-2">
      <h1 class="text-2xl font-semibold text-slate-100">Reuniones</h1>
      <p class="text-sm text-slate-400 mt-1">
        Todas las reuniones que los bots de esta empresa han agendado.
      </p>
    </header>

    <div class="mt-6">
      <MeetingsExplorer :tenant-id="tenantId" tone="dark" />
    </div>
  </div>
</template>
