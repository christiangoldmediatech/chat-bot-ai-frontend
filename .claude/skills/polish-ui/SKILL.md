---
name: polish-ui
description: Review and improve the visual design, accessibility, component reuse, and UX states of Vue/Nuxt files in this admin panel. Use proactively whenever you create or edit a `.vue` file under `pages/`, `components/`, or `layouts/`. The platform follows a glassmorphic + airy aesthetic (Linear / Cron / Things feel): translucent cards (`bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass`), `rounded-2xl`/`rounded-3xl` corners, neutral dark CTAs (`bg-slate-900 hover:bg-slate-800`), sky-tinted backgrounds (`bg-sky-day` for auth, `bg-mist-light` for admin), three semantic palettes (`primary` indigo for accents/links, `success` WhatsApp green, `danger` rose), and the platform-wide Poppins font. Enforces reuse of shared components (SpinnerInline, EmptyState, DataTable, StatCard, SuperadminStatCard, ConfirmDialog, BotStatusBadge), keyboard/screen-reader accessibility, and consistent loading/error/empty patterns.
---

# polish-ui — design pass for this admin panel

You are touching a `.vue` file in this Nuxt SPA. Before you finalize the diff, do a design pass against the rules below. These are not generic best-practices — they're the patterns this codebase has settled on, and breaking them creates visual drift that is expensive to undo.

The four axes to check, in order: **visual polish → component reuse → accessibility → UX states**. When in doubt, mirror the nearest sibling file (`pages/admin/**` is light, `pages/superadmin/**` is dark).

---

## 1. Visual polish

### Typography — Poppins everywhere

The platform uses **Poppins** as its single typeface. It is wired in two places:

- `nuxt.config.ts` injects the Google Fonts `<link>` (weights 300/400/500/600/700) into `<head>`.
- `tailwind.config.ts` sets `fontFamily.sans = ['Poppins', …defaults]`, so `font-sans` (applied by `assets/css/main.css` on `html`) resolves to Poppins, with Tailwind's default stack as fallback.

**Do not** apply `font-family` per component, do not `@import` Poppins again in CSS, and do not introduce a second display face. If a screen needs heavier emphasis, change the weight (`font-medium` → `font-semibold` → `font-bold`), never the family. Monospaced data (IDs, tokens, phones, slugs) keeps `font-mono` — that's Tailwind's stack, intentional contrast.

### The 3 semantic palettes

The platform has three named palettes, each with its own identity. They are defined in `tailwind.config.ts` and should be used **instead of** Tailwind's raw `indigo-*` / `emerald-*` / `red-*` defaults so the identity stays consistent.

| Palette | Identity | Anchor (`-500`) | Tailwind prefix | Where it lives |
|---|---|---|---|---|
| **Primary** | Modern AI agent indigo. Linear/Vercel-AI feel — sober, intelligent. | `#6366F1` | `primary-*` (alias `brand-*`) | Brand chrome, primary CTAs, focus rings, links, dashboard accents |
| **Success** | WhatsApp green. `-500` is `#25D366` (logo) and `-900` is `#075E54` (WhatsApp dark teal). | `#25D366` | `success-*` | Active/connected status, success banners, "Configured", message-sent confirmations |
| **Danger** | Modern rose/coral. Not Bootstrap red — warmer, more 2026. | `#F43F5E` | `danger-*` | Destructive buttons, error banners, "Not configured", SUSPENDED tenants |

Light-mode usage:

- Primary CTA: `bg-primary-600 hover:bg-primary-700 text-white`
- Success banner: `border border-success-200 bg-success-50 text-success-700`
- Danger banner / outline destructive: `border border-danger-200 bg-danger-50 text-danger-700`

Dark-mode (superadmin) usage:

- Primary surface accents: `bg-primary-700` / `text-primary-300`
- Success pill: `bg-success-950 border-success-800 text-success-300`
- Danger pill / banner: `bg-danger-950 border-danger-800 text-danger-300`

Notes:

- `brand-*` is an **alias** of `primary-*` so legacy markup keeps working. New code prefers `primary-*`.
- The success palette is deliberately WhatsApp-anchored because the product is a WhatsApp bot platform — "success" and "the channel" share a visual identity. Don't reach for Tailwind's default `emerald-*` for confirmations.
- **Amber** (`amber-50/200/700/…`) is allowed in a narrow fourth role: in-between/HUMAN/warning states (a conversation handed to a human agent, a tenant in SUSPENDED state). It is not a palette, it is a status pill. Don't extend amber beyond that.
- **Slate** is the neutral chrome scale (backgrounds, borders, body text). Not one of the three palettes.

### Subtle chrome gradients

Three named gradients live in `tailwind.config.ts` under `backgroundImage`. Use them only on **chrome surfaces** — headers, sidebars, login/register cards, dashboard hero cards. Do **not** put gradients on buttons, ordinary cards, table rows, or status pills (they reduce legibility and undercut the brand palette).

| Class | Where to use |
|---|---|
| `bg-chrome-light` | Admin header / sidebar background (replaces solid `bg-white` on `layouts/admin.vue` chrome) |
| `bg-chrome-dark` | Superadmin header / sidebar background |
| `bg-hero-primary` | Login/register card, dashboard hero card, empty-state hero |
| `bg-hero-success` | Success-themed hero (e.g. "Bot connected" confirmation pages) |
| `bg-hero-danger` | Destructive confirmation hero (use sparingly — ConfirmDialog itself stays solid) |

Rule of thumb: if a surface is **decorative** (frames the work area or sets the tone of a landing screen), gradient OK. If a surface is **functional** (data, form, button), keep it flat.

### Glassmorphism & spacing

The platform looks like Linear / Cron / Things: airy backgrounds, translucent cards, dark neutral CTAs, generous rounding. Don't fight it.

**Backgrounds (set by layouts — don't override):**
- Auth (`layouts/default.vue`) — `bg-sky-day` (sky-blue → white → faint indigo).
- Admin (`layouts/admin.vue`) — `bg-mist-light` (barely-there cool gradient that lifts glass cards).
- Superadmin (`layouts/superadmin.vue`) — `bg-slate-900` solid; sidebars/headers add `bg-slate-950/70 backdrop-blur-xl` on top.

**Cards (always glass on this codebase):**
- Light — `rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass p-5`
- Dark — `rounded-2xl bg-slate-900/70 backdrop-blur-xl ring-1 ring-slate-700/50 shadow-glass-lg p-5`
- Dashed empty containers — `rounded-2xl border border-dashed border-slate-300/60 bg-white/40 backdrop-blur-xl p-12` (light) / `border-slate-700/60 bg-slate-900/40` (dark)

Custom shadow tokens live in `tailwind.config.ts`: `shadow-glass` (subtle, default for cards) and `shadow-glass-lg` (heavier, for hero cards and modals).

**Form fields:**
- Modern (auth-style) input: wrap input in a labeled glass row — `rounded-2xl bg-white/80 ring-1 ring-slate-200/80 px-4 py-3 focus-within:ring-2 focus-within:ring-slate-900 transition`, with an inline icon and a transparent input (`bg-transparent text-sm focus:outline-none`).
- Classic (admin form) input: `rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900`. Inputs inside dense forms can keep this style.
- Spacing: `space-y-3` (auth glass forms) or `space-y-4`/`space-y-5` (classic admin forms).

**Buttons:**
- **Primary (filled, neutral dark)** — `rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 transition-colors shadow-glass`. Use for `Sign in`, `Save`, `Create`, `Get Started`. This is the platform's main CTA shape.
- Secondary — `rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors`. Use for `Cancel`, table action links, back buttons.
- Destructive (outline) — `rounded-xl border border-danger-200 px-3 py-1.5 text-sm text-danger-700 hover:bg-danger-50 transition-colors`
- Destructive (solid, inside ConfirmDialog) — `bg-danger-600 hover:bg-danger-700 text-white`

`primary-*` (indigo) is now an **accent palette** — links, focus rings on classic inputs, info-toned hovers — not a CTA color. The screenshot reference uses dark neutral for primary actions; resist re-introducing colored CTAs.

**Headings:**
- h1 page title — `text-2xl font-semibold tracking-tight` (or `text-3xl` on auth hero)
- h2 section — `text-base font-semibold text-slate-900`
- card title — `text-sm font-semibold text-slate-900`
- Auth hero subtitle — `text-sm text-slate-500 text-center max-w-xs mx-auto`

**Help text** below a field: `mt-1 text-xs text-slate-500`. **Field labels** on classic forms: `block text-sm font-medium text-slate-700` (admin) / `text-slate-300` (superadmin). On glass forms, labels are tiny captions above the input row: `ml-1 text-xs font-medium text-slate-600`.

**Stat numbers:** `text-3xl font-semibold` above `text-xs uppercase tracking-wider text-slate-500`. Use `StatCard` (admin) / `SuperadminStatCard` (dark) — don't inline.

**Auth pages — special pattern:**
```vue
<div class="w-full max-w-md">
  <!-- Floating brand icon -->
  <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white shadow-glass ring-1 ring-slate-900/5">
    <svg class="size-6 text-slate-900">…</svg>
  </div>
  <!-- Glass card -->
  <div class="mt-5 rounded-3xl bg-white/70 backdrop-blur-2xl ring-1 ring-white/60 shadow-glass-lg p-8 sm:p-10">
    <h1 class="text-2xl font-semibold text-slate-900 text-center tracking-tight">…</h1>
    <p class="mt-2 text-sm text-slate-500 text-center max-w-xs mx-auto">…</p>
    <form class="mt-8 space-y-3"> … glass inputs … </form>
  </div>
</div>
```

---

## 2. Component reuse

Before writing markup, check whether one of these covers it. Duplicating their markup is the most common drift.

| Need | Use | Source |
|---|---|---|
| "Are you sure?" modal before destructive action | `<ConfirmDialog :open :title message @cancel @confirm>` | `components/admin/ConfirmDialog.vue` |
| Card showing one metric | `<StatCard label value hint />` | `components/admin/StatCard.vue` |
| Tabular list with built-in loading/empty rows | `<DataTable :rows :columns :loading :empty-message />` | `components/admin/DataTable.vue` |
| Empty state with title + description + optional CTA slot | `<EmptyState title description>…</EmptyState>` | `components/admin/EmptyState.vue` |
| Active/Inactive badge | `<BotStatusBadge :is-active />` | `components/admin/BotStatusBadge.vue` |
| Chat bubble list | `<ChatMessages :messages />` | `components/admin/ChatMessages.vue` |
| Sidebar list of conversations | `<ConversationList :conversations />` | `components/admin/ConversationList.vue` |

If a new shared component is genuinely needed, place it under `components/admin/`, give it minimal typed props, and only use the 3 semantic palettes inside it.

> Stat cards in the dark superadmin layout are still re-implemented inline. If you find yourself adding a fourth dark stat card, extract a `SuperadminStatCard` instead of pasting the markup again.

---

## 3. Accessibility

- Every `<input>`/`<textarea>`/`<select>` has a paired `<label>` with matching `for`/`id`. If a control has no visible label, set `aria-label`.
- Buttons that toggle state should reflect it with `aria-pressed` or `aria-expanded`.
- Status pills convey **color and text** — the enum name (BOT/HUMAN/ACTIVE/SUSPENDED) lives inside the pill, color reinforces.
- `placeholder` is not a label. Keep the `<label>` even with a placeholder.
- Form errors live in a styled `<p>` near the field or above submit: `rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700`. Don't only paint the input red.
- Inputs already get `focus:ring-1 focus:ring-primary-500`; preserve focus rings on buttons (don't add `outline-none` without a replacement).
- Destructive buttons in a row never get smaller than non-destructive ones.
- Poppins at small sizes can look thin. Use `font-medium` (500) on body buttons and labels — `font-normal` (400) is for paragraph copy.
- Color is never the only signal: combine with text or icon, especially on status pills and active/inactive toggles.

---

## 4. UX states (loading, error, empty, success)

Every page that fetches data renders four explicit branches. Convention:

```vue
<p v-if="error" class="mt-4 rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
  {{ error }}
</p>

<div v-if="loading" class="mt-6 text-sm text-slate-500">Loading…</div>

<EmptyState
  v-else-if="items.length === 0"
  title="…"
  description="…"
  class="mt-6"
>
  <NuxtLink … /> <!-- optional CTA -->
</EmptyState>

<!-- v-else: data -->
```

- **Loading** copy is `Loading…` (single ellipsis character). All UI strings are English — see `memory/project_ui_language_english.md`.
- **Errors** show `err.message` from `ApiError` directly — `useApi` normalizes Nest's message arrays. Don't wrap in "Something went wrong".
- **Empty states** must have title + one-sentence description, plus a CTA when there's a primary action ("+ Create bot", "+ Create company").
- **Success** banners use the success palette: `rounded-md border border-success-200 bg-success-50 p-3 text-sm text-success-700` (admin) or `border-success-800 bg-success-950 text-success-300` (superadmin). The banner stays until navigation — no auto-clear.
- **In-flight buttons** swap their label (`'Saving…'`, `'Creating…'`, `'Signing in…'`) and set `:disabled="saving"` with `disabled:opacity-60`. Pattern: `{{ saving ? 'Saving…' : 'Save changes' }}`.
- **Destructive flows** route through `ConfirmDialog`, never `window.confirm`. The dialog `message` describes the cascade (users, bots, conversations, documents) — deletion in this app cascades hard.

---

## 5. Workflow modes

### Mode A — single-file polish (default trigger)

When invoked because the user edited or created **one** `.vue` file:

1. Read the file **and** one sibling file in the same directory to anchor local style.
2. Apply the checklist top-down: visual → reuse → a11y → states.
3. For new pages, verify `definePageMeta({ layout, middleware })` — `'admin' + 'auth'` for tenant, `'superadmin' + 'superadmin-auth'` for platform, `'default'` (no middleware) for auth screens.
4. If you introduce a new Tailwind class that depends on `primary-*` / `success-*` / `danger-*` / `bg-chrome-*` / `bg-hero-*`, confirm it is defined in `tailwind.config.ts` — otherwise the JIT will silently drop it.
5. Run `npm run lint` and `npm run typecheck` before declaring done.

Don't refactor unrelated screens. Note neighboring drift as a follow-up.

### Mode B — platform-wide refresh

When the user explicitly asks for a full platform polish ("mejorar el UX/UI de toda la plataforma", "apply the new palette everywhere", "refresh all screens"):

1. **Foundation first** — touch the files every screen renders before touching individual pages:
   - `tailwind.config.ts` — palette and gradient tokens
   - `nuxt.config.ts` / `assets/css/main.css` — font and base layer
   - `layouts/admin.vue`, `layouts/superadmin.vue`, `layouts/default.vue` — backgrounds
   - `components/admin/AdminHeader.vue`, `AdminSidebar.vue` — chrome
2. **Bulk renames are safer than per-file edits** for palette swaps. Use a single `perl -i -pe` pass across `pages/`, `components/`, `layouts/`:
   - `emerald-N` → `success-N`
   - `red-N` → `danger-N`
   - Leave `amber-*` (HUMAN/SUSPENDED status) and `blue-*` (BOT status pill) alone.
3. **Then walk the screens by frequency of view**: entry screens (login/register) → admin dashboard → admin lists (bots, conversations, customers) → admin detail pages → superadmin equivalents. Apply heroes/gradients only where the surface is decorative (login card backdrop, dashboard hero strip), not on data surfaces.
4. **Verify after each batch**: `npm run lint && npm run typecheck`. Do not skip — Tailwind's JIT silently drops unknown classes, so a typo in `success-` won't fail typecheck but will render colorless.
5. **Click-test the screens** at `http://localhost:8080` after each batch. Loading/empty/error branches are easy to leave un-restyled because they only render in degenerate states.
6. **Commit in slices** — one commit per batch (foundation, bulk-rename, login flows, admin pages, superadmin pages). Keeps the diff reviewable and lets the user roll back a single slice if a screen regresses.

In Mode B, the goal is consistency across the platform, not perfection per screen. Resist re-architecting any component — only swap classes, add gradients to chrome, and reuse shared components where markup was duplicated.
