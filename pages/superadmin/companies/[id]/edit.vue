<script setup lang="ts">
definePageMeta({
  layout: 'superadmin',
  middleware: 'superadmin-auth',
})
const route = useRoute()
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold">Editar empresa</h1>
    <p class="text-slate-300 mt-1">ID: {{ route.params.id }} — Fase G.</p>
  </div>
</template>
