# BetV — Arquitetura Completa do Sistema (Documento Mestre Exaustivo)
**Copiloto de inteligência estatística para apostas · Copa do Mundo 2026 · Mercado BR**
Versão 3.0 · Inventário completo para construção no Claude Code
Deploy: **VPS Hostinger KVM 2** (2 vCPU · 8 GB RAM · 100 GB NVMe · Ubuntu 24.04) · Domínio **betv.online**
Stack base: **React** (via Next.js 14 App Router) — 100% React, sem exceção.

---

# PARTE A — STACK TECNOLÓGICA COMPLETA

## A.1 Frontend (100% React)
| Item | Tecnologia | Versão alvo |
|---|---|---|
| Framework | **React 18** via **Next.js 14** (App Router, Server + Client Components) | 14.2+ |
| Linguagem | **TypeScript** (strict) | 5.4+ |
| Estilo | **Tailwind CSS** + CSS variables (tokens do mock) | 3.4+ |
| Componentes UI | Design system próprio BetV (derivado de `BetV App.dc.html`) | — |
| Estado servidor | **TanStack Query (React Query)** — cache, revalidação, infinito | 5+ |
| Estado cliente | **Zustand** (sessão UI, filtros, jogo selecionado) | 4+ |
| Realtime client | Hook próprio `useRealtime` sobre **WebSocket** nativo | — |
| Animação código | **anime.js v4** (`vendor/anime`) — contadores, ticker, transições | 4.4.1 |
| Animação Lottie | **lottie-react** (skill iconsax) — ícones animados | — |
| Animação SVG | **SVGator player** (skill svgator) — logo, cenas | — |
| Animação vídeo | **Jitter** embeds (skill jitter) — hero/motion | — |
| Ícones | **Iconsax** (`iconsax-reactjs`) — única fonte | — |
| Gráficos | **Recharts** (tela Modelo, sparklines de odds) | 2+ |
| Formulários | **React Hook Form** + **Zod** (validação compartilhada) | — |
| Datas/fuso | **date-fns** + **date-fns-tz** (America/Sao_Paulo) | — |
| Tabela | **TanStack Table** (odds comparativas, histórico) | 8+ |

## A.2 Backend
| Item | Tecnologia |
|---|---|
| API HTTP | **Next.js Route Handlers** (`app/api/**`) |
| Workers/agentes | **Node.js 20** + **TypeScript**, processo separado |
| Fila/jobs | **BullMQ** (sobre Redis) |
| Scheduler | **node-cron** + BullMQ repeatable jobs |
| Process manager | **PM2** (dentro do container `agent`) |
| Auth | Sessão **JWT** (cookie HTTP-only) + verificação no middleware |
| Hash de senha | **argon2** (fallback bcrypt) |
| ORM/migrations | **Drizzle ORM** + drizzle-kit (migrations versionadas) |
| Validação | **Zod** (mesmos schemas do front, em `packages/shared`) |
| Logs | **pino** (estruturado) + pino-pretty em dev |

## A.3 Dados e infraestrutura
| Item | Tecnologia |
|---|---|
| Banco | **PostgreSQL 16** |
| Vetores (RAG) | **pgvector** (extensão do Postgres) |
| Cache/fila | **Redis 7** |
| Realtime | **Postgres LISTEN/NOTIFY → WebSocket** (serviço `realtime` com `ws`) |
| Reverse proxy | **Caddy 2** (HTTPS automático Let's Encrypt) |
| Orquestração | **Docker Compose** (7 serviços) |
| Boot | **systemd** unit garante `docker compose up` no reinício |
| Monitor | **Uptime Kuma** (Docker) + tabela `system_health` |
| Backup | cron `pg_dump` → `/backups` (retenção 7 dias) |

## A.4 Integrações externas (somente estas)
| Serviço | Uso | Var. de ambiente |
|---|---|---|
| **API de futebol** (Sportmonks preferida / API-Football fallback) | jogos, escalações, eventos, stats, árbitros, odds, lesões | `DATA_PROVIDER`, `SPORTMONKS_TOKEN`, `APIFOOTBALL_KEY` |
| **API de IA** (Anthropic/Claude) | agentes, análises, chat, embeddings | `AI_API_KEY`, `AI_MODEL_ANALYSIS`, `AI_MODEL_CHAT`, `AI_EMBEDDING_MODEL` |
| **Resend** | e-mail transacional (boas-vindas, verificação, reset) | `RESEND_API_KEY`, `RESEND_FROM` |
| **Mercado Pago** | pagamento PIX que libera acesso | `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` |
| RSS (ge, ESPN, Lance) | notícias/lesões (sem API key) | — |

## A.5 Caminho para "React puro" no futuro
Tudo já é React. Se um dia sair do Next.js para SPA React pura (Vite):
- **Componentes e hooks** (`components/`, `hooks/`) migram 1:1 (são React puro, sem dependência de Next).
- **Route Handlers** (`app/api`) viram um servidor **Express/Fastify** separado (a lógica já está isolada em `services/`, não nas rotas).
- **Roteamento** App Router → **React Router**.
- **SSR** vira CSR (o dashboard é client-side de qualquer forma; só landing perderia SSR).
Por isso a regra do projeto: **nenhuma regra de negócio dentro de componente ou de route handler** — sempre em `services/`/`agent/`, que são agnósticos de framework.

---

# PARTE B — MAPA COMPLETO DE PÁGINAS (TODAS)

Legenda de fase: 🟢 construir agora · 🟡 stub preparado (construir depois) · estado de acesso entre colchetes.

## B.1 Área pública / autenticação
| # | Rota | Página | Fase | Conteúdo |
|---|---|---|---|---|
| P00 | `/` | Redirecionador | 🟢 | logado→`/hoje`; deslogado→`/login` (landing só na fase futura) |
| P01 | `/login` | Login | 🟢 | e-mail+senha, link mágico opcional, erro gentil, link "esqueci senha" |
| P02 | `/esqueci-senha` | Recuperar senha | 🟢 | envia e-mail (Resend) com token |
| P03 | `/redefinir-senha/[token]` | Nova senha | 🟢 | valida `auth_tokens`, troca senha |
| P04 | `/verificar-email/[token]` | Verificação | 🟢 | marca `email_verificado` |
| P05 | `/landing` | Landing pública | 🟡 | stub vazio preparado (rota + componente placeholder) |

## B.2 Aplicação (protegida por sessão + assinatura ativa)
| # | Rota | Página | Fase | Conteúdo principal |
|---|---|---|---|---|
| P10 | `/hoje` | **Dashboard "Hoje"** | 🟢 | header (relógio BRT, status do agente), live ticker, grid de MatchCards do dia, Radar de Valor, feed do agente |
| P11 | `/jogo/[id]` | **Match Center** | 🟢 | 3 estados (pré/ao vivo/encerrado); tabs Probabilidades · Escalações · Árbitro · Notícias · Odds; análise IA |
| P12 | `/explorar` | Explorar (hub) | 🟢 | busca + 3 abas (Seleções, Jogadores, Árbitros) |
| P12a | `/explorar/selecoes` | Seleções | 🟢 | cards com forma WWDLW, Elo, próximos jogos |
| P12b | `/explorar/jogadores` | Jogadores | 🟢 | stats por 90 min, lesão, filtro por seleção |
| P12c | `/explorar/arbitros` | Árbitros (lista) | 🟢 | médias de cartões/pênaltis, rigidez |
| P13 | `/arbitro/[id]` | **Perfil do Árbitro** | 🟢 | gauge de rigidez, médias vs competição, jogos apitados, "como afeta os mercados" (IA) |
| P14 | `/selecao/[id]` | Perfil da Seleção | 🟢 | elenco, forma, confrontos, próximos jogos, stats agregadas |
| P15 | `/jogador/[id]` | Perfil do Jogador | 🟢 | stats detalhadas, histórico, situação física |
| P16 | `/chat` | **Chat BetV** | 🟢 | conversa, avaliação de bet/odd, sugestões em chips, ProbBars inline; também acessível como bolha flutuante em todas as telas |
| P17 | `/modelo` | **Modelo / Performance** | 🟢 | acurácia por mercado, Brier explicado, previsões×resultados, transparência |
| P18 | `/conta` | Minha Conta | 🟢 | passe ativo (dias restantes), histórico de pagamentos, preferências de notificação, danger zone (LGPD) |
| P19 | `/checkout` | Compra (UI final) | 🟡 | stub — backend pronto, tela bonita depois |
| P20 | `/renovar` | Renovação (UI final) | 🟡 | stub — idem |
| P21 | `/acesso-expirado` | Paywall/Passe expirado | 🟢 (simples) | estado mínimo; design final junto do checkout |

## B.3 Estados de sistema / utilitárias
| # | Rota/cond. | Item | Fase |
|---|---|---|---|
| P30 | `not-found.tsx` | 404 temático | 🟢 |
| P31 | `error.tsx` | Erro com retry | 🟢 |
| P32 | manutenção | "Agente reorganizando dados" | 🟢 |
| P33 | offline/reconexão | banner de reconexão do realtime | 🟢 |
| P34 | skeletons | loading shimmer de cada página principal | 🟢 |

---

# PARTE C — FUNCIONALIDADES COMPLETAS (TODAS)

## C.1 Autenticação e conta
- C1.1 Login e-mail/senha (sessão JWT cookie HTTP-only).
- C1.2 Link mágico (magic link) opcional.
- C1.3 Logout.
- C1.4 Recuperação de senha (token via Resend).
- C1.5 Verificação de e-mail.
- C1.6 Edição de perfil (nome) + troca de senha.
- C1.7 Exclusão de conta (LGPD, remoção em até 30 dias).
- C1.8 Middleware de proteção: sessão + assinatura ativa; redireciona conforme estado.
- C1.9 **Seed:** usuário `esquema@dinheiro.com.br` / `Money@26` (hash), assinatura ativa 45 dias.

## C.2 Pagamento e acesso (backend 🟢, UI final 🟡)
- C2.1 Criar pagamento PIX no Mercado Pago (QR + copia-e-cola).
- C2.2 Webhook `payment.updated` com validação de assinatura + idempotência.
- C2.3 Aprovação → cria/ativa usuário + `subscription` 45 dias → dispara Resend.
- C2.4 Renovação (+45 dias a partir do vencimento ou de hoje).
- C2.5 Aviso de expiração próxima (5 dias).
- C2.6 Histórico de pagamentos com "recibo".

## C.3 E-mail transacional (Resend)
- C3.1 Boas-vindas + instruções de login (após pagamento).
- C3.2 Verificação de e-mail.
- C3.3 Reset de senha.
- C3.4 (futuro) Aviso de expiração / alertas — preparado.

## C.4 Dashboard "Hoje" (tempo real)
- C4.1 Relógio ao vivo em horário de Brasília.
- C4.2 Status do agente ("monitorando N jogos" + LiveDot).
- C4.3 Live ticker de eventos (gols, cartões, VAR, odds, recálculos do modelo).
- C4.4 Grid de jogos do dia (ao vivo primeiro, depois por horário BRT).
- C4.5 MatchCard com anel de probabilidade do favorito + chips de insight.
- C4.6 **Radar de Valor**: maiores divergências modelo×odds do dia.
- C4.7 Feed "Últimas do agente" (notícias classificadas, relevância ≥3).
- C4.8 Atualização automática via realtime (sem refresh).

## C.5 Match Center
- C5.1 Cabeçalho do confronto (bandeiras, fase/grupo, estádio+cidade, horário BRT, árbitro com link).
- C5.2 **Pré-jogo:** probabilidades por mercado (vencedor, over/under, BTTS, escanteios, cartões, VAR) com anel + ProbBars.
- C5.3 Escalações (provável → confirmada) com formação.
- C5.4 Bloco do árbitro escalado (resumo + link pro perfil).
- C5.5 Notícias do jogo (classificadas).
- C5.6 **Odds:** tabela comparativa por casa, melhor odd destacada, selos VALOR.
- C5.7 Análise pré-jogo gerada por IA (InsightCard).
- C5.8 **Ao vivo:** placar + minuto pulsando, timeline de eventos, stats em barras duplas (posse, chutes, escanteios), probabilidades live reordenando com flash.
- C5.9 Mini-insights ao vivo da IA em eventos-chave.
- C5.10 **Encerrado:** resultado + "o que o modelo acertou" (✓/✗ por mercado) + aviso de arquivamento em 48 h.

## C.6 Explorar (Seleções / Jogadores / Árbitros)
- C6.1 Busca global por nome.
- C6.2 Seleções: forma, Elo, próximos jogos, link pro perfil.
- C6.3 Jogadores: stats por 90 min, status físico, filtro por seleção.
- C6.4 Árbitros: médias (amarelos, vermelhos, pênaltis, faltas), índice de rigidez.
- C6.5 Perfis dedicados (seleção, jogador, árbitro) com histórico e contexto IA.

## C.7 Chat inteligente (núcleo)
- C7.1 Conversa em PT-BR ancorada nos dados do jogo (RAG).
- C7.2 **Avaliação de bet/odd colada** ("vale Brasil -1.5 a 2.10 na casa X?"): mapeia mercado → busca prob do motor → calcula edge → veredito de **valor** (nunca recomendação).
- C7.3 Sugestões de pergunta em chips.
- C7.4 Probabilidades citadas renderizam como mini ProbBar inline.
- C7.5 Histórico de sessões e mensagens.
- C7.6 Registro de avaliações em `bet_evaluations`.
- C7.7 Rate limit por usuário (custo).
- C7.8 Disclaimer fixo de compliance (informativo, 18+, sem garantia).
- C7.9 Bolha flutuante acessível de qualquer tela.

## C.8 Modelo / Performance (transparência)
- C8.1 Acurácia por mercado (gráfico).
- C8.2 Brier score explicado em linguagem simples.
- C8.3 Histórico previsão × resultado real.
- C8.4 "Nossos acertos e erros, em público."

## C.9 Inteligência de fundo (workers/agentes — invisível ao usuário, sustenta tudo)
- C9.1 Sincronização de jogos/árbitros/elencos/forma.
- C9.2 Cálculo de probabilidades pré e ao vivo (motor determinístico).
- C9.3 Snapshots de odds de todas as casas + cálculo de value flags.
- C9.4 Classificação de notícias por IA.
- C9.5 Geração de análises pré-jogo e mini-insights ao vivo.
- C9.6 Indexação RAG (embeddings).
- C9.7 Tracking de acurácia (Brier).
- C9.8 Arquivamento de jogos +48 h.
- C9.9 Heartbeat e alertas de saúde dos workers.

## C.10 Transversais
- C10.1 Fuso horário Brasília em toda exibição.
- C10.2 Responsivido (desktop completo + mobile com bottom bar de 4 itens).
- C10.3 Acessibilidade AA, foco visível, `prefers-reduced-motion`.
- C10.4 Compliance 18+ / jogo responsável / disclaimer em todas as telas com odds ou probabilidade.
- C10.5 Listar todas as casas de aposta sem priorizar nenhuma.

---

# PARTE D — INVENTÁRIO DE ENDPOINTS DA API (TODOS)

Base: `app/api/`. Todos validam sessão+assinatura, exceto auth e webhook.

## D.1 Auth
- `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/session`
- `POST /api/auth/magic-link` · `POST /api/auth/magic-link/verify`
- `POST /api/auth/forgot-password` · `POST /api/auth/reset-password`
- `POST /api/auth/verify-email`

## D.2 Conta / pagamento
- `GET /api/account` · `PATCH /api/account` · `DELETE /api/account`
- `GET /api/account/payments`
- `POST /api/mp/criar-pagamento` (gera PIX)
- `POST /api/webhooks/mercadopago` (público, assinado)

## D.3 Jogos e dados (leitura, alimentam o dashboard)
- `GET /api/matches?date=hoje` · `GET /api/matches/[id]`
- `GET /api/matches/[id]/probabilities` · `/odds` · `/lineups` · `/news` · `/events`
- `GET /api/value-radar?date=hoje`
- `GET /api/teams/[id]` · `GET /api/players/[id]` · `GET /api/referees/[id]`
- `GET /api/explore/teams` · `/players` · `/referees` (com busca/paginação)
- `GET /api/model/performance`

## D.4 Chat
- `POST /api/chat` (stream) — pergunta + contexto de jogo + avaliação de bet
- `GET /api/chat/sessions` · `GET /api/chat/sessions/[id]`

## D.5 Realtime (serviço `realtime`, fora do Next)
- `WS /ws` — inscrição por `match_id`; canais: `match_update`, `prob_update`, `value_update`, `news_update`, `agent_status`

## D.6 Interno (somente serviço `agent`, sem exposição pública)
- Acesso direto ao Postgres (service role) para upsert de dados, probabilidades, análises, embeddings.

---

# PARTE E — BANCO DE DADOS (TODAS AS TABELAS)

(Schema detalhado igual à v2; lista completa para o inventário.)
**Identidade/acesso:** `users`, `subscriptions`, `payments`, `auth_tokens`.
**Esportivo:** `teams`, `players`, `referees`, `matches`, `lineups`.
**Inteligência:** `probabilities` (append-only), `odds_snapshots`, `value_flags`, `news_items`, `ai_analyses`, `predictions_log`.
**Chat/RAG:** `chat_sessions`, `chat_messages`, `bet_evaluations`, `rag_chunks` (pgvector).
**Sistema:** `system_health`.

Índices-chave: `matches(status, inicia_em)`; `probabilities(match_id, market, calculado_em desc)`; `odds_snapshots(match_id, market)`; `news_items(match_id, relevancia desc)`; HNSW em `rag_chunks(embedding)`.
Triggers de `pg_notify('betv_updates', …)` em `matches`, `probabilities`, `value_flags`, `news_items`.

---

# PARTE F — AGENTES DE IA E MOTOR (TODOS)

## F.1 Agentes (multi-agente orquestrado)
1. **Orquestrador** — roteia tarefas, controla orçamento de tokens, agrega.
2. **Coletor** — ETL da API → schema (determinístico; LLM só p/ casar nomes ambíguos).
3. **Analista de Árbitro** — perfil de rigidez + parágrafo interpretativo.
4. **Analista Pré-Jogo** — análise textual pré-jogo (cita números do motor).
5. **Agente Ao Vivo** — micro-insights em eventos-chave.
6. **Avaliador de Bet** — interpreta odd colada, calcula edge, dá veredito de valor.
7. **Classificador de Notícias** — categoria/relevância/vínculo (Haiku, JSON).

Contrato comum: `run(input):Output` tipado, dependências injetadas, prompt versionado em `agent/prompts/*.md`, log de tokens, compliance no system prompt.

## F.2 Motor de probabilidades (determinístico, `engine/`, com testes)
- `poisson.ts` — gols/vencedor/over-under/BTTS (Dixon-Coles).
- `corners.ts` — escanteios.
- `cards.ts` — cartões (multiplicador do árbitro + fator fase).
- `var.ts` — VAR/pênalti (frequência histórica).
- `value.ts` — edge = prob×odd−1 → value_flags.
Calibração via backtest (Copa 2022, Euro 2024, Copa América 2024). Brier contínuo em `predictions_log`.

## F.3 RAG (`rag/`)
- `indexer.ts` — gera embeddings de análises/notícias/perfis/históricos → `rag_chunks`.
- `retriever.ts` — busca híbrida (filtro estrutural + similaridade pgvector) → contexto.

---

# PARTE G — WORKERS (TODOS, serviço `agent` 24/7)

| Worker | Frequência | Função |
|---|---|---|
| `fixtures-sync` | 06:00 BRT + 6/6h | jogos, árbitro, elencos, forma → probs pré |
| `prematch` | T-90→T-0, 10/10min | escalação provável→confirmada; recalcula; analista pré |
| `live-engine` | 20-30s por jogo live | eventos+stats; recalcula prob live; agente ao vivo |
| `odds-sync` | 1-2min (jogos do dia) | snapshots de odds; recomputa value_flags |
| `news-watcher` | 10/10min | RSS → classificador de notícias → feed |
| `rag-indexer` | gatilho por novo dado | embeddings → rag_chunks |
| `model-tracker` | pós-jogo | Brier previsto×real → predictions_log |
| `archiver` | 1/1h | arquiva +48h; limpa value_flags; vacuum leve |

Todos com heartbeat em `system_health` (Uptime Kuma alerta).

---

# PARTE H — COMPONENTES DO DESIGN SYSTEM (TODOS)

Derivados do mock `BetV App.dc.html`. Em `apps/web/components/`.

**Marca/base:** `BetVLogo`, `EyeRing` (anel de probabilidade — assinatura), `LiveDot`, `BrandButton`, `GhostButton`, `GlassCard`, `Skeleton`, `Toast`, `EmptyState`, `Disclaimer18`, `Tabs`.
**Domínio:** `MatchCard`, `ProbBar`, `OddsChip`, `OddsTable`, `ValueFlag`, `InsightCard`, `NewsItem`, `RefereeGauge`, `FormBadge` (WWDLW), `EloBadge`, `LiveTicker`, `EventTimeline`, `StatBars`, `ScoreBig`, `MinuteClock`, `BrtClock`, `AgentStatus`.
**Chat:** `ChatBubble`, `ChatLauncher` (flutuante), `ChatMessage`, `InlineProbBar`, `SuggestionChips`, `TypingDots`, `BetEvaluationCard`.
**Layout:** `SidebarDesktop`, `BottomBarMobile`, `AppHeader`, `ScreenTransition`.
**Gráficos (Modelo):** `AccuracyChart`, `BrierExplainer`, `PredictionHistory`.

Hooks: `useRealtime`, `useMatches`, `useMatch`, `useProbabilities`, `useOdds`, `useValueRadar`, `useChat`, `useSession`, `useBrtClock`, `useReducedMotion`.

---

# PARTE I — TOPOLOGIA, ESTRUTURA DE PASTAS E DEPLOY

## I.1 Docker Compose (7 serviços)
`caddy` (443/80, HTTPS auto) · `web` (Next.js) · `realtime` (WS) · `agent` (workers+IA, PM2) · `postgres` (16+pgvector) · `redis` (7) · `uptime-kuma`. Todos `restart: unless-stopped`. systemd sobe no boot. Backup cron diário.

## I.2 Estrutura de pastas (monorepo)
```
betv/
├── docker-compose.yml · Caddyfile · .env
├── CLAUDE.md · skills-lock.json · .claude/ · .agents/ · vendor/anime/
├── apps/
│   ├── web/   (React/Next: páginas B.1-B.3, components H, app/api D)
│   │   ├── app/ (auth) (app) _stubs/{landing,checkout,renovar}
│   │   ├── components/  hooks/  lib/  services/   ← regra de negócio em services/
│   ├── realtime/        (WS: Postgres NOTIFY → cliente)
│   └── agent/  (providers/ engine/ agents/ prompts/ rag/ workers/)
├── packages/
│   ├── shared/  (tipos, zod schemas, constantes de mercados, cliente db)
│   └── emails/  (templates Resend)
└── db/  (migrations/  seed.ts)
```
Regra de portabilidade React: **zero lógica de negócio em componentes ou route handlers** — tudo em `services/` e `agent/` (agnósticos de framework), para a futura migração Next→Vite/React Router ser indolor.

## I.3 Variáveis de ambiente (completas)
`NODE_ENV, TZ=UTC, APP_URL, DATABASE_URL, REDIS_URL, AUTH_SESSION_SECRET, DATA_PROVIDER, SPORTMONKS_TOKEN, APIFOOTBALL_KEY, AI_API_KEY, AI_MODEL_ANALYSIS, AI_MODEL_CHAT, AI_EMBEDDING_MODEL, RESEND_API_KEY, RESEND_FROM, MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET`.
DNS: SPF/DKIM de betv.online no Resend; A record → IP da VPS.

## I.4 Segurança
argon2; cookie HTTP-only+SameSite; CSRF; `ufw` (22/80/443); SSH por chave; fail2ban; webhook MP assinado+idempotente; rate limit (Redis); Postgres/Redis sem porta pública.

## I.5 Custos
VPS ~R$35-50 · API futebol ~R$200-450 · API IA ~R$50-200 · Resend grátis (início) · MP ~1% PIX. **Total ~R$300-500/mês.** Break-even ~25-35 assinantes (R$14,90).

---

# PARTE J — ESCOPO DA FASE E ROADMAP

**🟢 Agora:** dashboard completo (P10-P18, P21 simples, P30-P34) com dados reais; toda a IA (agentes F, motor, RAG); workers G; auth (C1) com seed; Resend (C3); backend de pagamento (C2 backend).
**🟡 Stub preparado:** landing (P05), checkout/renovação UI final (P19/P20).
**Roadmap:** landing → telas de pagamento final → push/PWA → escala multiusuário → mais ligas pós-Copa → possível migração cloud.

---

### Resumo (1 parágrafo)
BetV é um copiloto de apostas 100% React (Next.js→portável para React puro) que roda inteiro numa VPS Hostinger KVM 2 em betv.online: coleta estatísticas via API, calcula probabilidades reais com motor determinístico (Poisson/Dixon-Coles + perfil de árbitro), enriquece com 7 agentes de IA e RAG (pgvector), e entrega num dashboard que se atualiza sozinho (realtime via Postgres NOTIFY→WebSocket) e num chat que avalia qualquer odd colada — sempre informando probabilidade e valor, nunca recomendando. Login com usuário semeado, e-mail via Resend, acesso liberado por PIX (Mercado Pago). Landing e telas de checkout ficam mapeadas como stubs para a próxima fase.
