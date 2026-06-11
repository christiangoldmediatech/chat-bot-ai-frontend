<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'auth',
})
</script>

<template>
  <div>
    <header class="flex items-start gap-4 flex-wrap">
      <div
        class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white ring-1 ring-emerald-300/60 shadow-[0_8px_24px_-10px_rgba(16,185,129,0.45)]"
        aria-hidden="true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">{{ $t('meetings.title') }}</h1>
        <p class="text-sm text-slate-500 mt-1 max-w-2xl">
          {{ $t('meetings.subtitle') }}
        </p>
      </div>
    </header>

    <div class="mt-6">
      <MeetingsExplorer />
    </div>
  </div>
</template>
