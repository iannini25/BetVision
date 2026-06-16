# BetV — Virada mock → Sportmonks (dados de futebol reais)

> Passo a passo final, à prova de erro, para ligar o `SPORTMONKS_TOKEN`. Enquanto o token
> não entra, **tudo continua em mock, intacto** — o provider real só liga com
> `DATA_PROVIDER=sportmonks` **E** um token presente.

## Pré-requisitos
- Plano Sportmonks com cobertura da Copa. O provider precisa do **add-on de Odds**
  (`/odds/pre-match`). **NÃO precisa do add-on de Predictions** — as probabilidades vêm do
  motor próprio do BetV. Fixtures/livescores/lineups/stats/standings/squads são do plano base.
- Token de produção gerado no MySportmonks.

---

## CHECKLIST DE VIRADA (na ordem)

### 0. Smoke test do token (ANTES de subir a stack — não queima cota)
Valida token, IDs da Copa e o add-on de Odds com ~3 chamadas baratas. **Se falhar, pare e
resolva — não suba a stack às cegas.**

```bash
# Local (com node_modules):
SPORTMONKS_TOKEN=<seu_token> pnpm --filter @betv/agent smoke:sportmonks

# Na VPS (container descartável; troque o token):
cd /opt/betv
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  run --rm -e SPORTMONKS_TOKEN=<seu_token> -e WC_SEASON_ID=26618 -e WC_LEAGUE_ID=732 \
  agent node --import tsx apps/agent/src/smoke-sportmonks.ts
```
Saída esperada (sucesso):
```
✅ Token válido. Liga: World Cup (id 732).
✅ WC_SEASON_ID confere: 26618 (...).
   plano (subscription): [...]
   rate_limit: remaining=... resets_in=...s (entity League)
✅ Fixtures hoje (AAAA-MM-DD) na temporada 26618: N.
✅ Add-on de ODDS ativo: K cotações na fixture <id>.
✅ Smoke test OK — pode prosseguir com a virada.
```
Falhas claras: `❌ Token inválido (HTTP 401)` · `⚠️ WC_SEASON_ID=... mas a temporada atual
é <id>` (ajuste o `.env`) · `❌ Add-on de ODDS não coberto (HTTP 403)`. Exit code: 0 OK,
1 erro, 2 sem token.

### 1. Editar `/opt/betv/.env`
```
DATA_PROVIDER=sportmonks
SPORTMONKS_TOKEN=<seu_token>
# opcionais (já têm default): WC_SEASON_ID=26618  WC_LEAGUE_ID=732
# WORKER_PROFILE vazio → perfil "prod" é escolhido sozinho quando há token
# AI_*/RESEND_*/MP_* entram aqui quando você ligar essas chaves (independente da Sportmonks)
```

### 2. Subir com banco limpo (recomendado p/ dados 100% reais)
```bash
cd /opt/betv
docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```
Em modo sportmonks o **seed pula os dados esportivos mock** (`db/seed.ts`): o banco nasce só
com usuário/assinatura; `fixtures-sync` popula times/jogos/árbitros reais. (Sem `down -v` os 4
jogos mock do seed conviveriam com os reais — não recomendado.)

### 3. Verificar que virou real (e que o pipeline de valor funciona)
```bash
cd /opt/betv
C="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

# (a) provider real
$C logs agent | grep -i sportmonks      # → "using Sportmonks provider (dados reais)"

# (b) workers do perfil prod escrevendo (incl. o probabilities-sync, sem o qual o Radar fica vazio)
docker exec betv-postgres-1 psql -U betv -d betv -tA -c \
 "SELECT worker, metadata FROM system_health WHERE worker IN
  ('fixtures-sync','probabilities','live-sync','odds-sync','sportmonks-api') ORDER BY worker;"
#  fixtures-sync → {"fixturesInserted">0,...}   probabilities → {"matches">0}
#  odds-sync     → {"valueFlags">0,...}         sportmonks-api→ {"remaining":...}

# (c) há probabilidades E value flags (o pareamento odds×modelo funcionou)
docker exec betv-postgres-1 psql -U betv -d betv -tA -c \
 "SELECT 'probs='||count(*) FROM probabilities;
  SELECT 'value_flags='||count(*) FROM value_flags WHERE active;
  SELECT 'teams='||count(*) FROM teams;"   # teams cresce além dos 12 do seed

# (d) ⚠️ AVISO IMPORTANTE: se odds-sync snapshotou odds mas não pareou nenhuma value flag,
#     ele loga isto — significa probabilities ausentes ou chaves de outcome divergentes:
$C logs agent | grep -i "no value flags paired"   # NÃO deve aparecer; se aparecer, é problema
```
Telas que viram reais: Hoje (fixtures), Match Center (placar/eventos/stats ao vivo, odds, escalações,
árbitro), Radar de Valor, Explorar (times/jogadores). Probabilidades: sempre do motor próprio.

### 4. Rollback para mock (se algo der errado)
```bash
# em /opt/betv/.env: DATA_PROVIDER=mock  (e/ou remover SPORTMONKS_TOKEN)
docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

---

## Deploy: GitHub Actions + cron de pull-deploy (rede de segurança)
Cada push em `main` dispara o GitHub Actions (SSH → deploy). Como o runner às vezes não
alcança a VPS (timeout transitório de rede), há um **cron de pull-deploy** na VPS que garante
o deploy mesmo se o Actions falhar — os dois convivem (quem pega o commit novo primeiro
deploya; o outro vira no-op).

- **Como funciona:** `/usr/local/bin/betv-pull-deploy.sh` (cópia de `scripts/betv-pull-deploy.sh`)
  roda a cada 2 min: `git fetch`; se atrás de `origin/main`, `reset --hard` + `up --build -d`
  (rebuild só dispara quando há commit novo) + `image prune`. `flock` evita sobreposição; log em
  `/var/log/betv-pull-deploy.log`.
- **Ligar:**
  ```bash
  cp /opt/betv/scripts/betv-pull-deploy.sh /usr/local/bin/ && chmod +x /usr/local/bin/betv-pull-deploy.sh
  ( crontab -l 2>/dev/null | grep -v betv-pull-deploy; \
    echo '*/2 * * * * /usr/local/bin/betv-pull-deploy.sh >> /var/log/betv-pull-deploy.log 2>&1' ) | crontab -
  ```
- **Desligar:** `crontab -l | grep -v betv-pull-deploy | crontab -`
- **Ver:** `tail -f /var/log/betv-pull-deploy.log`
- **Atualizar o script** (após mudar no repo): re-copie a linha do `cp` acima.
- Fix durável p/ o timeout do Actions (opcional): liberar os ranges de IP do GitHub Actions no
  firewall da Hostinger.

---

## Notas desta fase
- **Embedding é LOCAL** (determinístico) — o RAG não precisa de chave de embedding agora.
  `AI_EMBEDDING_MODEL` fica vazio. Um provedor real (ex.: Voyage) é **roadmap futuro**, não requisito.
- Model IDs da IA: ANALYSIS=`claude-opus-4-8`, CHAT=`claude-sonnet-4-6`, classificador=`claude-haiku-4-5`.
  As chaves de IA/Resend/Mercado Pago são independentes da Sportmonks (ligue quando quiser).

## Pendências conhecidas da virada
- **Stats por-90 de jogador:** roster real via `fetchTeams`, mas as métricas por jogador exigem o
  include `season.statistics` (não mapeado) — ficam vazias até então.
- **Médias agregadas de árbitro** (cartões/pênaltis): hoje do motor/seed; puxá-las da Sportmonks
  exige o include de histórico do árbitro (confirmar no plano).
- **IDs da Copa:** o smoke test (passo 0) já valida `WC_SEASON_ID`/`WC_LEAGUE_ID`.
