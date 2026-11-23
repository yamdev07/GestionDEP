# ---- Base ----
# Debian slim : OpenSSL présent, compatible avec les moteurs Prisma.
FROM node:22-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- Dépendances ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Génère le client Prisma puis compile l'app Next.js
RUN npx prisma generate
RUN npm run build

# ---- Image finale ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# On garde node_modules complet : fournit aussi la CLI Prisma
# nécessaire pour synchroniser la base au démarrage.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh
# Normalise d'éventuelles fins de ligne Windows (CRLF -> LF) et rend exécutable.
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
