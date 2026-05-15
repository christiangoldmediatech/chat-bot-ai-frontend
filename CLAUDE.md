# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Admin panel for the chat-bot-ai multi-tenant WhatsApp bot SaaS. Nuxt 3 + TypeScript (strict) + Pinia + Tailwind, running as a pure SPA (`ssr: false` in `nuxt.config.ts`) against a NestJS backend.

## Commands

Node version is pinned to **22.13.1** (`.nvmrc`). Run `nvm use` before installing.

| Task | Command |
|---|---|
| Dev server (binds to `:8080`, override with `PORT=…`) | `npm run dev` |
| Lint | `npm run lint` / `npm run lint:fix` |
| Type check (`vue-tsc --noEmit` via Nuxt) | `npm run typecheck` |
| Production build | `npm run build` |
| Preview build | `npm run preview` |
| SSG export | `npm run generate` |

Backend base URL is read from `NUXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:3000/api/v1`). The `/api/v1` version prefix is part of the value, not added by code.

## Architecture

### SPA + two-tier auth

The app serves two distinct user populations from one codebase:

- **Tenant admin** (`/admin/*`, `/login`, `/register`) — uses `useAuthStore` (Pinia, persisted in `localStorage` key `cbai.auth`) and `middleware/auth.ts`.
- **Platform superadmin** (`/superadmin/*`, `/superadmin/login`) — uses `useSuperadminAuthStore` (key `cbai.superadmin.auth`) and `middleware/superadmin-auth.ts`.

Both stores share the same shape (`token`, `user`, `hydrate/setSession/clear`) but are deliberately separate so a superadmin and a tenant user can be logged in side-by-side in the same browser without colliding. `plugins/auth.client.ts` hydrates both from `localStorage` before any middleware runs.

### API client (`composables/useApi.ts`)

All HTTP goes through `useApi()`, which returns typed `get/post/patch/put/delete` helpers. Two behaviors are load-bearing:

1. **Token routing by path prefix.** If the request path starts with `/superadmin`, it attaches the superadmin token; otherwise the tenant token. Never bypass this by calling `$fetch` directly — the wrong token would be sent (or none at all).
2. **401 → clear + redirect.** A `401` response clears the matching store and navigates to the right login page (`/login` or `/superadmin/login`). Errors are normalized to `ApiError { status, message }` before being thrown, with NestJS's `message` arrays joined into a single string.

Domain composables (`useBots`, `useCompanies`, `useConversations`, `useCustomers`, `useDashboard`, `useDocuments`, `useCalendarIntegration`, `useTenant`) are thin wrappers around `useApi` that expose typed CRUD per resource. New backend endpoints should follow this pattern rather than calling `useApi` from pages directly.

### Type contracts

All request/response shapes live in `types/` (one file per domain). Backend enum literals (`BOT` / `HUMAN` / `CLOSED`, plan names like `FREE`/`PRO`/`ENTERPRISE`, status `ACTIVE`/`SUSPENDED`) are part of the contract and must match the NestJS side exactly — they are surfaced in the UI as-is, not translated.

### Pages and layouts

- `layouts/default.vue` — centered card, used for login/register.
- `layouts/admin.vue` — sidebar + header chrome for `/admin/*`.
- `layouts/superadmin.vue` — dark theme chrome for `/superadmin/*`.

Pages set their layout and middleware via `definePageMeta({ layout, middleware })`. Inside `<script setup>`, the typical flow is: declare a reactive `loading`/`error` pair, await the composable in setup or in a `load()` function, render `Loading…` / error / data branches in the template.

## Conventions to preserve

- **UI language is English.** All user-facing strings (button labels, headings, placeholders, validation errors, toast messages, empty states, confirm dialogs) must be English. Backend enum constants are not translated. See `memory/project_ui_language_english.md` in the Claude memory dir.
- **Don't introduce SSR-only code.** `ssr: false` is intentional (avoids tokens-in-cookies plumbing). Anything that reads `localStorage` or `window` should be inside a `.client.ts` file or guarded by `import.meta.client`.
- **ESLint rule overrides** live in `eslint.config.mjs`. `vue/multi-word-component-names` is intentionally off so single-word page components are allowed.
- **Tailwind `brand-*` palette** is defined in `tailwind.config.ts`; reuse it instead of hard-coding hexes.
- **Dev port is 8080**, not 3000 — that's reserved for the NestJS backend.
