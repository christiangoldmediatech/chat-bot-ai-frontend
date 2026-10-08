#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const LOCALE_DIR = join(ROOT, 'i18n', 'locales')
const SOURCE_DIRS = ['pages', 'components', 'layouts', 'composables', 'stores', 'middleware']
const LOCALES = ['en', 'es']

function flatten(obj, prefix = '', out = {}) {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const next = prefix ? `${prefix}.${key}` : key
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        flatten(value, next, out)
      } else {
        out[next] = String(value)
      }
    }
  }
  return out
}

function statSyncSafe(p) {
  try {
    return statSync(p)
  } catch {
    return null
  }
}

function walkFiles(dir, exts) {
  if (!statSyncSafe(dir)) return []
  const result = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSyncSafe(full)
    if (!st) continue
    if (st.isDirectory()) {
      result.push(...walkFiles(full, exts))
    } else if (exts.some(ext => entry.endsWith(ext))) {
      result.push(full)
    }
  }
  return result
}

const T_CALL = /(?<![\w$])\$?t\(\s*['"`]([^'"`$]+)['"`]/g
const T_TEMPLATE = /(?<![\w$])\$?t\(\s*`([^`]*\$\{[^`]*\})`/g

function extractKeys(file) {
  const text = readFileSync(file, 'utf8')
  const literals = new Set()
  const dynamic = new Set()
  let m
  T_CALL.lastIndex = 0
  while ((m = T_CALL.exec(text)) !== null) literals.add(m[1])
  T_TEMPLATE.lastIndex = 0
  while ((m = T_TEMPLATE.exec(text)) !== null) dynamic.add(m[1])
  return { literals, dynamic }
}

const flats = {}
for (const locale of LOCALES) {
  const path = join(LOCALE_DIR, `${locale}.json`)
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  flats[locale] = flatten(raw)
}

const localeKeys = Object.fromEntries(
  LOCALES.map(l => [l, new Set(Object.keys(flats[l]))]),
)

const missingInEn = Array.from(localeKeys.es).filter(k => !localeKeys.en.has(k))
const missingInEs = Array.from(localeKeys.en).filter(k => !localeKeys.es.has(k))

const files = []
for (const d of SOURCE_DIRS) files.push(...walkFiles(join(ROOT, d), ['.vue', '.ts']))

const usedLiteral = new Set()
const dynamicPatterns = new Set()
for (const f of files) {
  const { literals, dynamic } = extractKeys(f)
  literals.forEach(k => usedLiteral.add(k))
  dynamic.forEach(k => dynamicPatterns.add(`${f}: ${k}`))
}

const unresolved = Array.from(usedLiteral).filter(k => !localeKeys.en.has(k) && !localeKeys.es.has(k))

let failed = false
console.log(`Scanned ${files.length} source files.`)
console.log(`Locale keys — en: ${localeKeys.en.size}, es: ${localeKeys.es.size}`)

if (missingInEn.length) {
  console.error(`\nKeys present in es.json but missing in en.json (${missingInEn.length}):`)
  missingInEn.slice(0, 50).forEach(k => console.error(`  - ${k}`))
  if (missingInEn.length > 50) console.error(`  … and ${missingInEn.length - 50} more`)
  failed = true
}
if (missingInEs.length) {
  console.error(`\nKeys present in en.json but missing in es.json (${missingInEs.length}):`)
  missingInEs.slice(0, 50).forEach(k => console.error(`  - ${k}`))
  if (missingInEs.length > 50) console.error(`  … and ${missingInEs.length - 50} more`)
  failed = true
}
if (unresolved.length) {
  console.error(`\nKeys referenced in source but not defined in any locale (${unresolved.length}):`)
  unresolved.slice(0, 50).forEach(k => console.error(`  - ${k}`))
  if (unresolved.length > 50) console.error(`  … and ${unresolved.length - 50} more`)
  failed = true
}

if (dynamicPatterns.size > 0) {
  console.warn(`\nDynamic key patterns detected (${dynamicPatterns.size}) — review manually:`)
  Array.from(dynamicPatterns).slice(0, 15).forEach(p => console.warn(`  - ${p}`))
  if (dynamicPatterns.size > 15) console.warn(`  … and ${dynamicPatterns.size - 15} more`)
}

if (failed) {
  process.exit(1)
}
console.log('\ni18n check passed.')
