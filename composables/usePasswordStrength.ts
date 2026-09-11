/**
 * Password strength scoring (0-4) used by the meter component in the reset
 * and change flows. Mirrors the backend policy (min 12 chars + letter +
 * digit) but exposes granular feedback for UX. Not a real entropy check —
 * do NOT use for anything security-critical; the backend is source of
 * truth for what's accepted.
 */

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  label:
    | 'auth.password.strength.veryWeak'
    | 'auth.password.strength.weak'
    | 'auth.password.strength.medium'
    | 'auth.password.strength.strong'
    | 'auth.password.strength.veryStrong'
  color: string
  meetsPolicy: boolean
}

const MIN_LENGTH = 12

export function scorePassword(value: string): PasswordStrength {
  const hasLetter = /[A-Za-z]/.test(value)
  const hasDigit = /\d/.test(value)
  const hasUpper = /[A-Z]/.test(value)
  const hasSymbol = /[^A-Za-z0-9]/.test(value)
  const meetsPolicy = value.length >= MIN_LENGTH && hasLetter && hasDigit

  let points = 0
  if (value.length >= 8) points++
  if (value.length >= 12) points++
  if (value.length >= 16) points++
  if (hasUpper && hasLetter) points++
  if (hasDigit) points++
  if (hasSymbol) points++

  let score: PasswordStrength['score'] = 0
  if (points <= 1) score = 0
  else if (points === 2) score = 1
  else if (points === 3) score = 2
  else if (points === 4) score = 3
  else score = 4

  const labels: PasswordStrength['label'][] = [
    'auth.password.strength.veryWeak',
    'auth.password.strength.weak',
    'auth.password.strength.medium',
    'auth.password.strength.strong',
    'auth.password.strength.veryStrong',
  ]
  const colors = [
    'bg-danger-500',
    'bg-danger-400',
    'bg-amber-400',
    'bg-emerald-500',
    'bg-emerald-600',
  ]

  return {
    score,
    label: labels[score]!,
    color: colors[score]!,
    meetsPolicy,
  }
}
