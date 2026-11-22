# syntax=docker/dockerfile:1.7
# Build the native SQLite binding in the dependency stage to keep the runtime image small.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm_config_nodedir=/usr/local npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public && npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DATABASE_PATH=/data/app.db
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/data ./data
COPY --from=build /app/drizzle ./drizzle
# better-sqlite3 is a server external package; make sure its native binding is present.
COPY --from=build /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
RUN mkdir -p /data
EXPOSE 3000
# Runs as root: Railway mounts volumes root-owned.
CMD ["node", "server.js"]
