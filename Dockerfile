# syntax=docker/dockerfile:1.7

# ---- Builder ----
FROM node:22.13.1-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG NUXT_PUBLIC_API_BASE_URL
ENV NUXT_PUBLIC_API_BASE_URL=$NUXT_PUBLIC_API_BASE_URL

RUN npm run build

# ---- Runner ----
FROM node:22.13.1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=8080

COPY --from=builder /app/.output ./.output

EXPOSE 8080

CMD ["node", ".output/server/index.mjs"]
