# Progresso de Construcao — BetV

## Fase 0-5 — Fundacao + Banco + Shared + Motor + Providers + Agentes IA
Tudo completo. Motor com 14 testes verdes. MockProvider com Copa 2026. 3 agentes IA com mock.

## Fase 6 — RAG
- [x] indexer.ts com embeddings deterministicos locais (sem chave de API)
- [x] retriever.ts com busca hibrida (keyword + filtro por match_id/type)
- [x] Funciona sem chave — mock embeddings baseados em hash de caracteres

## Fase 7 — Workers
- [x] Entry point do agent com heartbeat
- [x] 8 workers registrados no system_health
- [ ] Implementacao completa BullMQ + node-cron (workers fazem log mas nao processam dados reais)

## Fase 8 — Realtime
- [x] WebSocket server com pg LISTEN/NOTIFY
- [x] Subscribe/unsubscribe por match_id, fan-out, reconnect

## Fase 9 — API (COMPLETA — 21 endpoints)
- [x] Auth: login, logout, session, forgot-password, reset-password, verify-email
- [x] Matches: lista, detalhes, probabilities, odds, news
- [x] Value Radar, Model Performance
- [x] Explore: teams, players, referees
- [x] Perfis: teams/[id], players/[id], referees/[id]
- [x] Chat POST (mock AI, salva no banco)
- [x] Account: GET, PATCH, DELETE + payments
- [x] Mercado Pago: criar-pagamento, webhook
- [x] **VERIFICADO**: todos respondendo com dados reais do PostgreSQL

## Fase 10 — Frontend (COMPLETA — 14 paginas + 21 rotas API)
- [x] Design system completo (LiveDot, GlassCard, Skeleton, ProbBar, EyeRing, etc.)
- [x] Layout: SidebarDesktop, BottomBarMobile, AppHeader
- [x] Todas as paginas: Login, Hoje, Explorar, Chat, Modelo, Conta, Match Center
- [x] Perfis: /selecao/[id], /jogador/[id], /arbitro/[id]
- [x] Auth pages: /redefinir-senha/[token], /verificar-email/[token], /esqueci-senha
- [x] Estados: 404, Error, Acesso Expirado
- [x] Stubs: Landing, Checkout

## Fase 11 — Fiacao (COMPLETA)
- [x] Docker Compose Postgres + Redis sobem e se comunicam
- [x] Schema push (drizzle-kit) + seed executados com sucesso
- [x] Login funciona ponta a ponta (banco -> API -> JWT cookie)
- [x] **Hoje, Explorar, Modelo, Conta, Chat agora usam React Query** (dados do banco, nao hardcoded)
- [x] Dockerfiles para web (standalone via NEXT_STANDALONE), realtime (tsx), agent (tsx)
- [x] Caddyfile para dev (auto_https off, porta 80)
- [x] docker-compose.yml com URLs internas (postgres:5432, redis:6379)

## Fase 12 — Qualidade
- [x] **14 testes do motor passam** (poisson 6, value 5, cards 3)
- [x] **pnpm build passa** sem erros (14 pages + 21 API routes)
- [x] **Login verificado**: esquema@dinheiro.com.br / Money@26 autentica e retorna JWT
- [x] **Dados do banco confirmados**: matches, model performance, chat — todos fluem do Postgres
- [x] **Smoke test**: /login 200, paginas protegidas 307 (redirect)

## Fase 13 — Fechamento no Docker (Docker Desktop + WSL2)

### Passo 1 — Stack Docker de pe (7 servicos) ✅ PROVADO
- [x] Corrigidos os 3 Dockerfiles: removido `COPY ... 2>/dev/null || true` (sintaxe invalida que abortava o build), base `node:20-bookworm-slim` (glibc, para argon2 carregar prebuild), copia de todos os manifests no estagio `deps`.
- [x] `.dockerignore` criado — host `node_modules` (binarios Windows) nunca vazam para a imagem Linux.
- [x] Bug do `argon2` no Next standalone: o tracer derruba `prebuilds/`; runner do web recopia o pacote completo do builder.
- [x] Serviço `migrate` one-shot (drizzle-kit push --force + seed) no fluxo do compose, com gate `service_completed_successfully` para web/realtime/agent.
- [x] **`docker compose up --build` sobe os 7 servicos** (caddy, web, realtime, agent, postgres+pgvector, redis, uptime-kuma); migrate exit 0.
- [x] **Login pela stack via Caddy (porta 80)**: `POST /api/auth/login` → 200, cookie `betv-session` HttpOnly/Secure, `hasActiveSubscription:true`.
- [x] `/api/matches` com sessao via :80 retorna dados reais do Postgres.
- [x] **WS via Caddy** (`/ws` → realtime:4000): handshake `101 Switching Protocols` + `{"type":"connected"}`.

### Passo 2 — Workers de verdade (BullMQ + node-cron) ✅ PROVADO
- [x] Arquitetura: node-cron agenda → 1 BullMQ worker despacha por nome → grava heartbeat em `system_health`.
- [x] Os 8 workers processam de verdade (não só log): fixtures-sync, prematch, **live-engine**, odds-sync, news-watcher, rag-indexer, model-tracker, archiver.
- [x] **live-engine mock avança o jogo sozinho**: a cada ~5s incrementa minuto, gera eventos (gol/cartão/VAR/escanteio), placar, recalcula probabilidades pelo motor (Poisson/Dixon-Coles + corners/cards/var) e grava (append-only) → dispara `pg_notify`.
  - Evidência: live-engine levou o jogo de `min 70 (BRA 2-1)` para `min 73 (BRA 3-1)` em segundos; metadata `{"minute":73,"fixture":"BRA 3-1 ALE"}`.
- [x] odds-sync deriva odds das probs do modelo, snapshot + recomputa value_flags via `findValue` (evidência: 290 snapshots, 44 value flags num tick).
- [x] rag-indexer indexa notícias + gols ao vivo em `rag_chunks` (idempotente por conteúdo).
- [x] Heartbeats: os 8 workers com `status=ok`, `last_heartbeat` recente e metadata com contadores reais.
- [x] Seed idempotente (migrate roda a cada `up` sem duplicar dados esportivos).
- [x] Redis `noeviction` (exigência do BullMQ). 14 testes do motor seguem verdes; agent typecheck limpo.

### Passo 3 — Realtime ponta a ponta ✅ PROVADO
- [x] Hook `useRealtimeSync` liga o WebSocket ao React Query: nas mensagens `matches_update`/`probabilities_update`/`value_flags_update`/`news_items_update` invalida as queries → telas refazem fetch (sem polling, sem refresh). Montado no layout `(app)`.
- [x] Banner acessível de reconexão (`role=status`, `aria-live`) quando o WS cai (P33).
- [x] **Prova e2e (headless, igual ao browser)**: cliente WS via Caddy:80 recebe `OPEN`; live-engine gera `probabilities_update`×8 + `matches_update`; um `UPDATE matches SET minute=68` manual disparou outro `matches_update`; `/api/matches` (o que o cliente refaz no invalidate) passou a retornar `minute=70`.
- [x] Chat avalia odd colada: `chat.service.ts` (regra fora do route handler) parseia mercado+odd+casa, busca prob do motor, calcula edge, dá veredito de valor e grava em `bet_evaluations`. Disclaimer sempre; nunca recomenda.
  - Evidência: "Brasil vence a 1.65 na Bet365" → winner/"BRA vence", modelo 30,0%, implícita 60,6%, edge −50,5%, veredito `overpriced`.

### Passo 4 — Qualidade final ✅
- [x] **Varredura formal** (clean-code odores C/E/F/G/J/N/T + segurança + corretude + a11y) via revisão multi-agente (28 agentes, verificação adversarial). Sem achados de segurança confirmados (queries parametrizadas `$1`, auth+zod ok, sem segredos hardcoded).
- [x] **RAG na prática**: `retrieveChunks("brasil gol")` retorna 5 chunks (gols indexados pelo rag-indexer).
- [x] **14 testes** verdes · `pnpm typecheck` limpo nos 4 pacotes (corrigido o script raiz, que era `tsc --build` sem config) · `pnpm build` (web) verde.
- [x] **Smoke test**: todas as páginas via Caddy retornam 200 (`/`→307 p/ /hoje, 404 correto). Corrigidos 5 `use(params)` (sintaxe Next 15) que davam 500 nas rotas dinâmicas.
- [x] **Correções aplicadas pós-review:**
  - realtime (HIGH): `pg.Client` ganhou handler de `error` + reconexão com re-`LISTEN` (evita freeze silencioso do dashboard); removido estado morto `subscribedMatches`; fecha sockets no shutdown.
  - scheduler: `jobId` por worker (coalesce) — sem backlog e **serializa o live-engine** (elimina a corrida de ticks concorrentes).
  - live-engine/odds-sync: números mágicos → constantes nomeadas (G25); `currentLiveMatch` com `ORDER BY id`.
  - a11y: `:focus-visible` global (foco visível em todo lugar, WCAG 2.4.7); `text-muted` #5F6B85→#8893AC (AA: 3.33:1→5.78:1); `<label>`+`role=alert` em /redefinir-senha; `role=status aria-live` em /verificar-email.

#### Pendências anotadas (com código do odor / motivo)
- **G5** — `roundTo` reimplementado 5× (odds-sync/live-engine/model-tracker/mock/matches.service). Recomendado: `packages/shared/src/num.ts` e importar nos dois pacotes. Não feito agora p/ limitar blast-radius cross-package; é matematicamente trivial.
- **G5/G11 (low)** — `BOOKMAKERS` superset no chat (9, p/ parsing) × 5 no odds-sync/seed (p/ cotação). Sem impacto comportamental (verificado); recomendado constante compartilhada com nomes distintos.
- **Perf** — rag-indexer revarre todas as notícias/jogos por tick; bounded na demo, recomendado cursor incremental + filtro `archived=false`.
- **Resiliência** — `use-realtime` (hook pré-existente) sem guarda contra sockets sobrepostos num flapping; recomendado guard de reconexão.
- **Lint** — repo sem config de ESLint (script `lint` aspiracional). Gate estático atual = `tsc` strict (noUnusedLocals/Params/noFallthrough), limpo. Recomendado adicionar `eslint-config-next` + `@typescript-eslint`.
- **Conteúdo** — `/jogo/[id]` (Match Center) renderiza mock; falta ligar abas às APIs reais (fora dos 4 pendentes).
