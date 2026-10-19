# Code Review Rules — Chat Bot AI Frontend (Nuxt 3 + Vue + i18n)

## Contexto del proyecto

- **Frontend (este repo)**: Nuxt 3 + Vue 3 + TypeScript strict + Pinia + Tailwind CSS + i18n. SPA pura (`ssr: false`) para el panel admin de LURVIAX (plataforma multi-tenant de bots de WhatsApp con IA).
- **Backend**: repo hermano `chat-bot-ai-backend` (NestJS 10 + Prisma + PostgreSQL + pgvector). Expone `/api/v1/*` con JWT. El contrato de endpoints, DTOs y enums vive ahí; cualquier cambio público del backend debe reflejarse acá antes del merge.
- **Dos poblaciones de usuarios en un mismo codebase**:
  - **Tenant admin** → `/admin/*`, `/login`, `/register` con `useAuthStore` (Pinia, `cbai.auth`) y `middleware/auth.ts`.
  - **Platform superadmin** → `/superadmin/*`, `/superadmin/login` con `useSuperadminAuthStore` (`cbai.superadmin.auth`) y `middleware/superadmin-auth.ts`.
  - Son stores deliberadamente separados para permitir login simultáneo sin colisión.
- **API client único**: `composables/useApi.ts`. Toda llamada HTTP pasa por `useApi()` — nunca `$fetch` directo.
- **Node pinned**: 22.13.1 (ver `.nvmrc`). Correr `nvm use` antes de `npm install`.

## Idioma y comunicación

- REQUIRE: todo **código fuente en inglés** — identificadores, variables, funciones, componentes, archivos, mensajes de commit.
- REQUIRE: la **conversación con el usuario (Christian) va en español**. Explicaciones, propuestas, aclaraciones del asistente en español.
- REQUIRE: todo **texto UI** (botones, labels, errores user-facing, placeholders, títulos) pasa por `$t('clave')` con claves definidas en `i18n/locales/es.json` **y** `i18n/locales/en.json` desde el primer commit. **Nunca hardcodear strings en el template**.
- REQUIRE: `npm run i18n:check` debe pasar antes de pushear (verifica paridad de claves entre `es.json` y `en.json`).

## Workflow de ramas (MANDATORY)

- REQUIRE: **todo cambio o fix debe ir en una nueva rama**. Si no estás en una rama dedicada al alcance del cambio, crear una antes de tocar código. Esto fija el alcance de cada rama y evita mezclar features/bugfixes en la misma branch.
- REQUIRE: nombre de rama descriptivo que refleje el alcance (`fix-<thing>-cb`, `feature-<thing>-cb`, `implement-<thing>-cb`, `chore-<thing>-cb`).
- REJECT: commitear cambios directamente a `main` o reusar una rama que ya tiene otro alcance (ej. meter un fix en una rama abierta para un feature distinto).
- REJECT: usar la rama de un PR anterior que ya se mergeó para un cambio nuevo.

## General

- REJECT: `console.log` en producción (usar logger centralizado o removerlos antes del commit).
- REJECT: secrets, tokens, API keys hardcodeadas. Usar `runtimeConfig` (`NUXT_PUBLIC_*` para público, `NUXT_*` para privado del server).
- REJECT: `any` sin justificación. Preferir `unknown` + narrow, o tipar la respuesta de la API con interfaces explícitas.
- REJECT: promesas sin `await` ni manejo de error.
- REJECT: **comentarios en el código salvo que sean estrictamente necesarios**. Solo se justifican cuando explican un *por qué* no obvio (workaround, bug de librería, invariante oculta). Nombres bien elegidos reemplazan comentarios.

## Arquitectura Nuxt 3

- REQUIRE: lógica reutilizable en `composables/` (nombres `useX`). Lógica de dominio en `stores/` (Pinia).
- REQUIRE: componentes agrupados por dominio en `components/<area>/<ComponentName.vue>` siguiendo PascalCase.
- REQUIRE: páginas en `pages/` siguen la convención de file-based routing de Nuxt.
- REQUIRE: SSR deshabilitado (`ssr: false`) — no asumir contexto server-side; el código corre en el navegador.
- REJECT: fetch directo con `$fetch` o `fetch()` desde componentes/pages. Siempre vía `useApi()`.
- REJECT: estado global fuera de Pinia (no usar `useState()` para auth/datos del usuario).

## Autenticación (dos tiers separados)

- REQUIRE: endpoints `/superadmin/*` usan `useSuperadminAuthStore` + `middleware/superadmin-auth.ts`. Todos los demás usan `useAuthStore` + `middleware/auth.ts`.
- REQUIRE: `useApi()` enruta el token automáticamente según el prefijo de la URL (`/superadmin` vs resto). No bypassar esta lógica.
- REQUIRE: `plugins/auth.client.ts` hidrata ambos stores desde `localStorage` antes de que corra cualquier middleware.
- REJECT: mezclar tokens entre tiers (usar token de tenant para llamar `/superadmin/*` o viceversa).
- REJECT: persistir auth en cookies o `sessionStorage`. El contrato es `localStorage` con claves `cbai.auth` y `cbai.superadmin.auth`.

## i18n (crítico)

- REQUIRE: claves i18n organizadas por feature/dominio (ej. `admin.conversations.header`, `superadmin.companies.table.columns.name`).
- REQUIRE: cada clave nueva se agrega en **ambos** archivos (`es.json` + `en.json`) en el mismo commit.
- REQUIRE: usar `$t('clave', { param })` para interpolar valores. No concatenar strings con `+`.
- REJECT: textos hardcodeados en templates, aunque sean "temporales" o estén dentro de condiciones (`v-if`).
- REJECT: usar `$t()` para strings que no son UI (claves de enum internas, códigos, nombres de archivos).

## Timezones y fechas

- REQUIRE: usar `utils/business-date.ts` (`formatBusinessDateTime`, `assertDateRangeValid`, `DEFAULT_BUSINESS_TIMEZONE`) y `composables/useBusinessTimezone` para formato user-facing.
- REQUIRE: `<input type="date">` envía raw `YYYY-MM-DD`. El backend hace la conversión a TZ-aware. **No pre-convertir a ISO** en el frontend.
- REQUIRE: Luxon para operaciones de fecha. No usar `new Date()` para parsing de strings de usuario.

## Backend coupling (contratos públicos)

- REQUIRE: cualquier cambio en los tipos de response, enums (`UserRole`, `ConversationStatus`, etc.) o paths de endpoints `/api/v1/*` debe revisarse contra el backend en el repo hermano `chat-bot-ai-backend` antes del merge.
- REQUIRE: si el backend agrega un endpoint o cambia la shape de un response, actualizar los tipos en `types/` o inline en el store/composable que lo consume.
- REJECT: inventar shape de response "porque todavía no está en el backend". Si no está, abrir issue/coordinar antes.

## Estilo y formato

- REQUIRE: ESLint pasa en todo archivo tocado (`npm run lint`). Fix automático con `npm run lint:fix`.
- REQUIRE: TypeScript strict — type check pasa (`npm run typecheck` → `vue-tsc --noEmit`).
- REQUIRE: Tailwind para estilos. Reusar design tokens definidos en `tailwind.config.ts`.
- REJECT: estilos inline con `style="..."` salvo cálculos dinámicos justificados.
- REJECT: CSS fuera de Tailwind o `<style scoped>` cuando una utility class resuelve el caso.

## Build y deploy

- REQUIRE: `npm run build` pasa limpio antes de PR (Nuxt build con `NODE_OPTIONS=--max-old-space-size=8192`).
- REQUIRE: no romper `npm run generate` si se usa SSG en algún endpoint del admin.
- REJECT: dejar deps en `dependencies` que son solo de desarrollo. Review de `package.json` antes del merge.

## Formato de respuesta del review

- Violación REJECT → **STATUS: FAILED** con archivo, línea y motivo específico.
- Solo PREFER no cumplido → **STATUS: PASSED** con notas.
- Mezcla de ambos → **STATUS: FAILED** (gana el REJECT).
