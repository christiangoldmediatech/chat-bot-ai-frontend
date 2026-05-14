<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})
const route = useRoute()
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold">Configuración del bot</h1>
    <p class="text-slate-500 mt-1">ID: {{ route.params.id }} — Fase D/F.</p>
  </div>
</template>
