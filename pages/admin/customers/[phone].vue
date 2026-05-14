<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})
const route = useRoute()
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold">Cliente</h1>
    <p class="text-slate-500 mt-1">Teléfono: {{ route.params.phone }} — Fase F.</p>
  </div>
</template>
