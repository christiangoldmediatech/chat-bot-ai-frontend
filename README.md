# chat-bot-ai-frontend

Admin panel for the chat-bot-ai multi-tenant WhatsApp bot SaaS. Built with Nuxt 3 + TypeScript + Pinia + Tailwind.

## Requirements

- **Node 22.13.1** (see `.nvmrc`). `nvm use` if you have nvm; otherwise install that exact version.

## Setup

```bash
cp .env.example .env
nvm use            # picks up Node 22.13.1
npm install
npm run dev        # http://localhost:8080  → backend at NUXT_PUBLIC_API_BASE_URL
```

The Nuxt dev server binds to **port 8080** so it does not clash with the NestJS backend on 3000. Override with `PORT=… npm run dev` if needed.

## Scripts

| Script | Purpose |
|---|---|
| `dev` | Nuxt dev server |
| `build` | Production build |
| `preview` | Preview production build |
| `generate` | SSG export |
| `lint` / `lint:fix` | ESLint |
| `typecheck` | `vue-tsc --noEmit` via `nuxt typecheck` |

## Env vars

| Variable | Default | Notes |
|---|---|---|
| `NUXT_PUBLIC_API_BASE_URL` | `http://localhost:3000/api/v1` | Backend base URL. Must include the `/api/v1` prefix. |
