<script setup lang="ts">
const { t, locale } = useI18n()

useHead({
  htmlAttrs: {
    lang: () => locale.value,
  },
  title: () => t('meta.title'),
  meta: [
    { name: 'description', content: () => t('meta.description') },
    { property: 'og:title', content: () => t('meta.ogTitle') },
    { property: 'og:description', content: () => t('meta.ogDescription') },
    { name: 'twitter:title', content: () => t('meta.ogTitle') },
    { name: 'twitter:description', content: () => t('meta.ogDescription') },
  ],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
