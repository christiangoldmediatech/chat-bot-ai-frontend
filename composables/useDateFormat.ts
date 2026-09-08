/**
 * Formateo consistente de fechas en el dashboard. Todo pasa por Intl (sin
 * librerías externas). El locale del usuario decide el orden dd/mm vs mm/dd;
 * los tests deben usar `es-EC` para reproducir el layout esperado.
 */
export function useDateFormat() {
  const { locale } = useI18n()
  const intlLocale = () => (locale.value === 'es' ? 'es-EC' : 'en-US')

  return {
    day(iso: string | Date): string {
      const d = typeof iso === 'string' ? new Date(iso) : iso
      return d.toLocaleDateString(intlLocale(), {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    },
    dayLong(iso: string | Date): string {
      const d = typeof iso === 'string' ? new Date(iso) : iso
      return d.toLocaleDateString(intlLocale(), {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    },
    time(iso: string | Date): string {
      const d = typeof iso === 'string' ? new Date(iso) : iso
      return d.toLocaleTimeString(intlLocale(), {
        hour: '2-digit',
        minute: '2-digit',
      })
    },
    dayAndTime(iso: string | Date): string {
      const d = typeof iso === 'string' ? new Date(iso) : iso
      return d.toLocaleString(intlLocale(), {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    },
    /** Compact number (1.2k, 34.5k, 2.1M). Falls back to raw when < 1000. */
    compact(n: number): string {
      if (Math.abs(n) < 1000) return String(n)
      return new Intl.NumberFormat(intlLocale(), {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(n)
    },
    /** Full number with thousands separators. Used in tooltips. */
    full(n: number): string {
      return new Intl.NumberFormat(intlLocale()).format(n)
    },
    /** Percentage from a ratio 0..1. */
    percent(ratio: number, digits = 0): string {
      return new Intl.NumberFormat(intlLocale(), {
        style: 'percent',
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(ratio)
    },
  }
}
