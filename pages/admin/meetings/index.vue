<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})
</script>

<template>
  <div>
    <header>
      <h1 class="text-2xl font-semibold">Reuniones</h1>
      <p class="text-sm text-slate-500 mt-1">
        Todas las reuniones agendadas por los bots. Filtra por bot, cliente o motivo, y agrúpalas como prefieras.
      </p>
    </header>

    <div class="mt-6">
      <MeetingsExplorer />
    </div>
  </div>
</template>
