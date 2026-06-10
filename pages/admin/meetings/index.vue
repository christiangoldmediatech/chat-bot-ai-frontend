<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})
</script>

<template>
  <div>
    <header>
      <h1 class="text-2xl font-semibold">{{ $t('meetings.title') }}</h1>
      <p class="text-sm text-slate-500 mt-1">
        {{ $t('meetings.subtitle') }}
      </p>
    </header>

    <div class="mt-6">
      <MeetingsExplorer />
    </div>
  </div>
</template>
