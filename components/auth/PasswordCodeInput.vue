<script setup lang="ts">
interface Props {
  modelValue: string
  length?: number
  disabled?: boolean
  autofocus?: boolean
  hasError?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  length: 6,
  disabled: false,
  autofocus: true,
  hasError: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'complete', value: string): void
}>()

const boxes = ref<Array<HTMLInputElement | null>>([])
const digits = ref<string[]>(splitCode(props.modelValue, props.length))

function splitCode(raw: string, len: number): string[] {
  const cleaned = raw.replace(/\D/g, '').slice(0, len).split('')
  while (cleaned.length < len) cleaned.push('')
  return cleaned
}

watch(
  () => props.modelValue,
  (next) => {
    const asArray = splitCode(next, props.length)
    if (asArray.join('') !== digits.value.join('')) {
      digits.value = asArray
    }
  },
)

function emitCurrent(): void {
  const value = digits.value.join('')
  emit('update:modelValue', value)
  if (value.length === props.length && !value.includes('')) {
    emit('complete', value)
  }
}

function onInput(idx: number, event: Event): void {
  const input = event.target as HTMLInputElement
  const cleaned = input.value.replace(/\D/g, '')
  if (cleaned.length === 0) {
    digits.value[idx] = ''
    input.value = ''
    emitCurrent()
    return
  }
  if (cleaned.length > 1) {
    // User typed / pasted multiple chars into a single box — spread them.
    for (let i = 0; i < cleaned.length && idx + i < props.length; i++) {
      digits.value[idx + i] = cleaned[i] ?? ''
    }
    const nextIdx = Math.min(idx + cleaned.length, props.length - 1)
    focusBox(nextIdx)
  } else {
    digits.value[idx] = cleaned
    input.value = cleaned
    if (idx < props.length - 1) focusBox(idx + 1)
  }
  emitCurrent()
}

function onKeydown(idx: number, event: KeyboardEvent): void {
  if (event.key === 'Backspace') {
    if (digits.value[idx]) {
      digits.value[idx] = ''
      emitCurrent()
      event.preventDefault()
      return
    }
    if (idx > 0) {
      focusBox(idx - 1)
      digits.value[idx - 1] = ''
      emitCurrent()
      event.preventDefault()
    }
    return
  }
  if (event.key === 'ArrowLeft' && idx > 0) {
    focusBox(idx - 1)
    event.preventDefault()
    return
  }
  if (event.key === 'ArrowRight' && idx < props.length - 1) {
    focusBox(idx + 1)
    event.preventDefault()
  }
}

function onPaste(event: ClipboardEvent): void {
  const text = event.clipboardData?.getData('text') ?? ''
  const cleaned = text.replace(/\D/g, '').slice(0, props.length)
  if (!cleaned) return
  event.preventDefault()
  digits.value = splitCode(cleaned, props.length)
  const focusIdx = Math.min(cleaned.length, props.length - 1)
  focusBox(focusIdx)
  emitCurrent()
}

function focusBox(idx: number): void {
  const el = boxes.value[idx]
  if (el) {
    el.focus()
    el.select()
  }
}

onMounted(() => {
  if (props.autofocus) {
    nextTick(() => focusBox(0))
  }
})
</script>

<template>
  <div
    class="flex gap-2 sm:gap-3"
    role="group"
    :aria-label="$t('auth.password.code.inputLabel')"
    @paste="onPaste"
  >
    <input
      v-for="(_, idx) in length"
      :key="idx"
      :ref="(el) => (boxes[idx] = el as HTMLInputElement)"
      :value="digits[idx]"
      inputmode="numeric"
      autocomplete="one-time-code"
      maxlength="1"
      :disabled="disabled"
      :aria-label="`${$t('auth.password.code.inputLabel')} ${idx + 1}`"
      class="size-12 sm:size-14 rounded-2xl bg-white/85 text-center text-xl sm:text-2xl font-semibold text-slate-900 tabular-nums shadow-sm transition ring-1 focus:outline-none focus:ring-2"
      :class="[
        hasError
          ? 'ring-danger-300 focus:ring-danger-500'
          : 'ring-slate-200/80 focus:ring-slate-900',
        disabled ? 'opacity-60 cursor-not-allowed' : '',
      ]"
      @input="onInput(idx, $event)"
      @keydown="onKeydown(idx, $event)"
    />
  </div>
</template>
