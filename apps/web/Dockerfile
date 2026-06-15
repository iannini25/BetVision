# syntax=docker/dockerfile:1
# Debian slim (glibc) so argon2 loads its prebuilt binary — alpine/musl would force a source build.

FROM node:20-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ---- deps: all workspace manifests for a deterministic, cache-friendly install ----
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY apps/agent/package.json apps/agent/
COPY apps/realtime/package.json apps/realtime/
COPY packages/shared/package.json packages/shared/
COPY packages/emails/package.json packages/emails/
RUN pnpm install --frozen-lockfile

# ---- builder: compile the Next standalone bundle ----
FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_STANDALONE=1
# A reachable URL is only needed if a page touches the DB at build time; this dummy keeps build hermetic.
ENV DATABASE_URL=postgresql://betv:betv_secret@postgres:5432/betv
RUN pnpm --filter @betv/web build

# ---- runner: minimal standalone server ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
# Next's file tracer drops argon2's native prebuilds/ from the standalone bundle.
# Restore the full package so node-gyp-build can load the glibc .node at runtime.
COPY --from=builder /app/node_modules/.pnpm/argon2@0.44.0/node_modules/argon2 ./node_modules/.pnpm/argon2@0.44.0/node_modules/argon2
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
