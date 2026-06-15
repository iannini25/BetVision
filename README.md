# BetV — Copiloto de Apostas Inteligente

Copiloto de inteligência estatística para apostas esportivas (Copa do Mundo 2026, mercado BR).
100% React (Next.js 14) · motor determinístico de probabilidades · 7 agentes/workers · realtime sem polling · chat que avalia odds — sempre **informando**, nunca recomendando.

> **Modo mock obrigatório:** o sistema inteiro roda ponta a ponta **sem nenhuma chave de API**. Cada integração tem um flag no `.env`; cole a chave e reinicie para "virar real".

---

## Subir tudo (Docker — caminho principal)

Pré-requisito: Docker Desktop (ou Docker Engine + Compose v2).

```bash
docker compose up --build
```

Isso builda as 3 imagens (web, realtime, agent) e sobe os **7 serviços**:

| Serviço | Papel | Porta |
|---|---|---|
| `caddy` | reverse proxy (HTTP + WebSocket) | **80** (público) |
| `web` | Next.js (frontend + 21 rotas de API) | interna 3000 |
| `realtime` | WebSocket: Postgres NOTIFY → clientes | interna 4000 |
| `agent` | workers (BullMQ + node-cron) + IA + RAG | — |
| `postgres` | PostgreSQL 16 + pgvector | 5433→5432 |
| `redis` | fila/cache (BullMQ) | 6380→6379 |
| `uptime-kuma` | monitor de saúde | 3001 |

Um serviço one-shot **`migrate`** roda automaticamente antes do app: cria o schema (`drizzle-kit push`) e o seed (idempotente). web/realtime/agent só sobem depois que ele termina com sucesso.

Acesse **http://localhost** (via Caddy). Login semeado:

| Campo | Valor |
|---|---|
| E-mail | `esquema@dinheiro.com.br` |
| Senha | `Money@26` |
| Assinatura | ativa, 45 dias |

Para reiniciar do zero (apaga volumes/dados): `docker compose down -v && docker compose up --build`.

### O que acontece sozinho (sem chave)
- O worker **live-engine** avança o jogo ao vivo a cada ~5s (minuto, gol/cartão/VAR, placar), recalcula as probabilidades pelo motor e grava → dispara `pg_notify`.
- O **realtime** propaga via WebSocket e o **dashboard se atualiza sem refresh** (React Query invalida e refaz fetch).
- **odds-sync** gera odds a partir do modelo e recomputa o Radar de Valor; **rag-indexer** indexa notícias e gols.

---

## Desenvolvimento local (sem Docker para o app)

```bash
cp .env.example .env
pnpm install
docker compose up postgres redis -d            # só banco + redis
cd packages/shared && DATABASE_URL="postgresql://betv:betv_secret@localhost:5433/betv" npx drizzle-kit push --force && cd ../..
DATABASE_URL="postgresql://betv:betv_secret@localhost:5433/betv" pnpm db:seed
DATABASE_URL="postgresql://betv:betv_secret@localhost:5433/betv" pnpm dev          # web
DATABASE_URL="postgresql://betv:betv_secret@localhost:5433/betv" pnpm dev:realtime # WebSocket (4000)
DATABASE_URL="postgresql://betv:betv_secret@localhost:5433/betv" REDIS_URL="redis://localhost:6380" pnpm dev:agent # workers
```

---

## Variáveis de ambiente — virada mock → real

Sem a chave, cada integração roda em **mock**. O `.env` (ou o bloco `environment` no `docker-compose.yml` para o Docker) é onde se cola cada chave. Vire **uma de cada vez, testando**:

| Ordem | Variável(eis) | Onde colar | Como testar a virada |
|---|---|---|---|
| 1 | `DATABASE_URL`, `REDIS_URL` | já configurados no compose | obrigatórios |
| 2 | `AUTH_SESSION_SECRET` | `.env` / compose (web) | `openssl rand -hex 32`; reinicie web; refaça login |
| 3 | `DATA_PROVIDER=sportmonks` + `SPORTMONKS_TOKEN` (ou `APIFOOTBALL_KEY`) | `.env` / compose (web **e** agent) | `GET /api/matches` passa a trazer jogos reais |
| 4 | `AI_API_KEY` (+ `AI_MODEL_ANALYSIS`, `AI_MODEL_CHAT`) | `.env` / compose (agent **e** web) | chat/análises deixam de ser pré-escritos |
| 5 | `RESEND_API_KEY` + `RESEND_FROM` | `.env` / compose (web) | e-mail de verificação/reset chega de verdade |
| 6 | `MP_ACCESS_TOKEN` + `MP_WEBHOOK_SECRET` | `.env` / compose (web) | `POST /api/mp/criar-pagamento` retorna PIX real; webhook valida HMAC |

> No Docker, as variáveis de runtime ficam no bloco `environment:` de cada serviço em `docker-compose.yml`. `DATA_PROVIDER` e `AI_API_KEY` afetam **agent** (workers/IA) e **web** (rotas) — cole nos dois.

---

## Verificação rápida

```bash
# Login pela stack (porta pública do Caddy)
curl -i -X POST http://localhost/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"esquema@dinheiro.com.br","password":"Money@26"}'

# Heartbeat dos 8 workers
docker compose exec postgres psql -U betv -d betv -c \
  "SELECT worker, status, last_heartbeat, metadata FROM system_health ORDER BY worker;"

# Motor (14 testes) · typecheck
pnpm --filter @betv/agent exec vitest run
pnpm typecheck
```

## O que ficou como stub (próxima fase)
- `/landing` — landing pública (placeholder)
- `/checkout`, `/renovar` — UI final de pagamento (o **backend** de pagamento existe)
- `/jogo/[id]` (Match Center) renderiza dados representativos; falta ligar nas APIs reais por aba.

## Stack
Next.js 14 · React 18 · TypeScript · Tailwind · Drizzle ORM · PostgreSQL 16 + pgvector · Redis 7 · BullMQ · node-cron · anime.js v4 · Caddy 2 · Docker Compose.

## Arquitetura
```
betv/
├── apps/web/        Next.js (frontend + API). Regra de negócio em services/, não em route handlers.
├── apps/realtime/   WebSocket (pg_notify → clientes)
├── apps/agent/      workers/ (BullMQ + node-cron) · engine/ (motor) · agents/ (IA) · rag/
├── packages/shared/ tipos, schemas zod, constantes, cliente db (Drizzle)
├── packages/emails/ templates Resend
└── db/seed.ts       seed idempotente (usuário, Copa 2026, probabilidades)
```
Regra de portabilidade: **zero regra de negócio em componente ou route handler** — tudo em `services/`/`agent/` (agnósticos de framework) para a futura migração Next→React puro.
