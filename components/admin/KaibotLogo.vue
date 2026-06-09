<script setup lang="ts">
interface Props {
  size?: number | string
  alt?: string
  rounded?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 36,
  alt: 'Kaibot',
  rounded: 'rounded-xl',
})

const dimension = computed(() =>
  typeof props.size === 'number' ? `${props.size}px` : props.size,
)
</script>

<template>
  <img
    src="/kaibot-logo.png"
    :alt="alt"
    :width="dimension"
    :height="dimension"
    :style="{ width: dimension, height: dimension }"
    :class="['object-contain shrink-0 select-none', rounded]"
    draggable="false"
  >
</template>
