<template>
  <main class="relative min-h-screen flex items-center justify-center overflow-hidden p-4 text-pearl">
    <div class="pointer-events-none absolute inset-0 -z-10 bg-home-mesh" aria-hidden="true" />
    <div class="pointer-events-none absolute inset-0 -z-10 bg-home-mesh-glow" aria-hidden="true" />
    <slot />
  </main>
</template>
