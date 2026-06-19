# syntax=docker/dockerfile:1
# Workers + AI agents + RAG indexer. Runs TypeScript directly via tsx (no separate compile step).
# Also serves as the image for the one-shot `migrate` service (drizzle push + seed).

FROM node:20-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY apps/agent/package.json apps/agent/
COPY apps/realtime/package.json apps/realtime/
COPY packages/shared/package.json packages/shared/
COPY packages/emails/package.json packages/emails/
RUN pnpm install --frozen-lockfile

FROM deps AS runner
ENV NODE_ENV=production
COPY . .
WORKDIR /app/apps/agent
CMD ["node", "--import", "tsx", "src/index.ts"]
