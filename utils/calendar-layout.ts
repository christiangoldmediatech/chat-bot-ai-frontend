export interface LaidOutItem<T> {
  item: T
  startMin: number
  endMin: number
  columnIndex: number
  columnsInCluster: number
}

interface Placed<T> {
  item: T
  startMin: number
  endMin: number
  columnIndex: number
}

export function layoutOverlappingItems<T>(
  rows: Array<{ item: T, startMin: number, endMin: number }>,
): Array<LaidOutItem<T>> {
  const sorted = rows
    .slice()
    .sort((a, b) => (a.startMin - b.startMin) || (b.endMin - a.endMin))

  const placed: Array<Placed<T>> = []
  for (const r of sorted) {
    const busyCols = new Set<number>()
    for (const p of placed) {
      if (p.endMin > r.startMin && p.startMin < r.endMin) {
        busyCols.add(p.columnIndex)
      }
    }
    let col = 0
    while (busyCols.has(col)) col += 1
    placed.push({ item: r.item, startMin: r.startMin, endMin: r.endMin, columnIndex: col })
  }

  const clusters = groupIntoClusters(placed)
  const out: Array<LaidOutItem<T>> = []
  for (const cluster of clusters) {
    const columns = Math.max(...cluster.map(c => c.columnIndex)) + 1
    for (const c of cluster) {
      out.push({
        item: c.item,
        startMin: c.startMin,
        endMin: c.endMin,
        columnIndex: c.columnIndex,
        columnsInCluster: columns,
      })
    }
  }
  return out
}

function groupIntoClusters<T>(placed: Array<Placed<T>>): Array<Array<Placed<T>>> {
  const sorted = placed.slice().sort((a, b) => a.startMin - b.startMin)
  const clusters: Array<Array<Placed<T>>> = []
  let current: Array<Placed<T>> = []
  let currentEnd = -1
  for (const p of sorted) {
    if (current.length === 0 || p.startMin < currentEnd) {
      current.push(p)
      currentEnd = Math.max(currentEnd, p.endMin)
    } else {
      clusters.push(current)
      current = [p]
      currentEnd = p.endMin
    }
  }
  if (current.length > 0) clusters.push(current)
  return clusters
}

export function toWallMinutes(iso: string, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(iso))
  const h = Number(parts.find(p => p.type === 'hour')?.value ?? '0')
  const m = Number(parts.find(p => p.type === 'minute')?.value ?? '0')
  return (h === 24 ? 0 : h) * 60 + m
}

export function toWallDayKey(iso: string, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso))
  const y = parts.find(p => p.type === 'year')?.value ?? ''
  const m = parts.find(p => p.type === 'month')?.value ?? ''
  const d = parts.find(p => p.type === 'day')?.value ?? ''
  return `${y}-${m}-${d}`
}

export function isoWeekdayFromDayKey(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const jsDay = date.getUTCDay()
  return jsDay === 0 ? 7 : jsDay
}

export function addDaysToDayKey(dayKey: string, delta: number): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + delta)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

export function todayDayKeyInTz(tz: string): string {
  return toWallDayKey(new Date().toISOString(), tz)
}

export function startOfIsoWeek(dayKey: string): string {
  const weekday = isoWeekdayFromDayKey(dayKey)
  return addDaysToDayKey(dayKey, -(weekday - 1))
}

export function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function formatMinutesAsTime(mins: number, locale: string): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

export function formatCompactTimeRange(startMin: number, endMin: number, locale: string): string {
  const startIsAm = Math.floor(startMin / 60) < 12
  const endIsAm = Math.floor(endMin / 60) < 12
  const startLabel = formatMinutesAsTime(startMin, locale)
  const endLabel = formatMinutesAsTime(endMin, locale)
  if (startIsAm === endIsAm) {
    const startWithoutSuffix = startLabel.replace(/\s?(AM|PM|a\.?\s?m\.?|p\.?\s?m\.?)$/i, '').trim()
    return `${startWithoutSuffix} – ${endLabel}`
  }
  return `${startLabel} – ${endLabel}`
}

export interface PastelTone {
  bg: string
  ring: string
  text: string
  subText: string
  accent: string
  avatarBg: string
  avatarText: string
}

const PASTEL_TONES: PastelTone[] = [
  { bg: 'bg-emerald-100', ring: 'ring-emerald-400', text: 'text-emerald-900', subText: 'text-emerald-800/70', accent: 'bg-emerald-500', avatarBg: 'bg-emerald-200', avatarText: 'text-emerald-800' },
  { bg: 'bg-sky-100',     ring: 'ring-sky-400',     text: 'text-sky-900',     subText: 'text-sky-800/70',     accent: 'bg-sky-500',     avatarBg: 'bg-sky-200',     avatarText: 'text-sky-800' },
  { bg: 'bg-violet-100',  ring: 'ring-violet-400',  text: 'text-violet-900',  subText: 'text-violet-800/70',  accent: 'bg-violet-500',  avatarBg: 'bg-violet-200',  avatarText: 'text-violet-800' },
  { bg: 'bg-amber-100',   ring: 'ring-amber-400',   text: 'text-amber-900',   subText: 'text-amber-800/70',   accent: 'bg-amber-500',   avatarBg: 'bg-amber-200',   avatarText: 'text-amber-800' },
  { bg: 'bg-rose-100',    ring: 'ring-rose-400',    text: 'text-rose-900',    subText: 'text-rose-800/70',    accent: 'bg-rose-500',    avatarBg: 'bg-rose-200',    avatarText: 'text-rose-800' },
  { bg: 'bg-cyan-100',    ring: 'ring-cyan-400',    text: 'text-cyan-900',    subText: 'text-cyan-800/70',    accent: 'bg-cyan-500',    avatarBg: 'bg-cyan-200',    avatarText: 'text-cyan-800' },
  { bg: 'bg-fuchsia-100', ring: 'ring-fuchsia-400', text: 'text-fuchsia-900', subText: 'text-fuchsia-800/70', accent: 'bg-fuchsia-500', avatarBg: 'bg-fuchsia-200', avatarText: 'text-fuchsia-800' },
  { bg: 'bg-teal-100',    ring: 'ring-teal-400',    text: 'text-teal-900',    subText: 'text-teal-800/70',    accent: 'bg-teal-500',    avatarBg: 'bg-teal-200',    avatarText: 'text-teal-800' },
  { bg: 'bg-indigo-100',  ring: 'ring-indigo-400',  text: 'text-indigo-900',  subText: 'text-indigo-800/70',  accent: 'bg-indigo-500',  avatarBg: 'bg-indigo-200',  avatarText: 'text-indigo-800' },
  { bg: 'bg-lime-100',    ring: 'ring-lime-400',    text: 'text-lime-900',    subText: 'text-lime-800/70',    accent: 'bg-lime-500',    avatarBg: 'bg-lime-200',    avatarText: 'text-lime-800' },
]

const NEUTRAL_TONE: PastelTone = {
  bg: 'bg-slate-100', ring: 'ring-slate-300', text: 'text-slate-700', subText: 'text-slate-500', accent: 'bg-slate-400', avatarBg: 'bg-slate-200', avatarText: 'text-slate-700',
}

export function pastelToneForService(name: string | null | undefined): PastelTone {
  if (!name) return NEUTRAL_TONE
  const normalized = name.trim().toLowerCase()
  if (normalized.length === 0) return NEUTRAL_TONE
  let hash = 5381
  for (let i = 0; i < normalized.length; i += 1) {
    hash = ((hash * 33) ^ normalized.charCodeAt(i)) >>> 0
  }
  return PASTEL_TONES[hash % PASTEL_TONES.length]
}

export function cancelledTone(): PastelTone {
  return NEUTRAL_TONE
}

export function initialsFromName(name: string | null | undefined, fallback: string): string {
  const source = (name?.trim() || fallback).replace(/^\+/, '').trim()
  if (source.length === 0) return '?'
  const parts = source.split(/\s+/).filter(p => p.length > 0)
  if (parts.length === 1) {
    const p = parts[0]
    return (p.length >= 2 ? p.slice(0, 2) : p).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
