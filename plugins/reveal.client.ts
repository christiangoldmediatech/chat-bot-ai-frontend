/**
 * `v-reveal` directive — fade + offset reveal when the element enters the
 * viewport. Uses IntersectionObserver and disconnects once revealed so it
 * costs nothing after the first trigger.
 *
 * Variants (via modifiers):
 *   v-reveal           → fade + slide up (default)
 *   v-reveal.left      → fade + slide from the left
 *   v-reveal.right     → fade + slide from the right
 *   v-reveal.scale     → fade + scale up
 *
 * Delay (via value, ms) — used to stagger sibling reveals:
 *   v-reveal="120"
 */
export default defineNuxtPlugin((nuxtApp) => {
  type RevealEl = HTMLElement & { _revealObserver?: IntersectionObserver }

  nuxtApp.vueApp.directive('reveal', {
    mounted(el: RevealEl, binding) {
      const variant = binding.modifiers.left
        ? 'reveal-left'
        : binding.modifiers.right
          ? 'reveal-right'
          : binding.modifiers.scale
            ? 'reveal-scale'
            : 'reveal-up'

      const delay = typeof binding.value === 'number' ? binding.value : 0

      el.classList.add('reveal-init', variant)
      if (delay > 0) el.style.transitionDelay = `${delay}ms`

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              el.classList.add('reveal-in')
              observer.unobserve(el)
            }
          })
        },
        { threshold: 0.12, rootMargin: '0px 0px -64px 0px' },
      )

      observer.observe(el)
      el._revealObserver = observer
    },
    unmounted(el: RevealEl) {
      el._revealObserver?.disconnect()
    },
  })
})
