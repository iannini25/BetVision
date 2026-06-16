# BetV — Virada mock → Sportmonks (dados de futebol reais)

> Como ligar o `SPORTMONKS_TOKEN` na VPS e validar que o sistema passou a usar dados
> reais. Enquanto o token não entra, **tudo continua em mock, intacto** — o provider real
> só liga com `DATA_PROVIDER=sportmonks` **E** um token presente.

## Pré-requisitos
- Plano Sportmonks com cobertura da Copa (recomendado **WC All-In**: fixtures + live +
  standings + squads + **predictions + odds**). Sem o add-on de odds/predictions, esses
  includes voltam vazios (o motor próprio do BetV continua calculando as probabilidades).
- Token de produção gerado no MySportmonks.

## Passo a passo (na VPS)

1. **Editar `/opt/betv/.env`:**
   ```
   DATA_PROVIDER=sportmonks
   SPORTMONKS_TOKEN=<seu_token>
   # opcionais (já têm default): WC_SEASON_ID=26618  WC_LEAGUE_ID=732
   # WORKER_PROFILE fica vazio → perfil "prod" é escolhido sozinho quando há token
   ```

2. **Subir com banco limpo (recomendado p/ dados 100% reais):**
   ```bash
   cd /opt/betv
   docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
   ```
   Em modo sportmonks o **seed pula os dados esportivos mock** (`db/seed.ts`), então o banco
   nasce só com usuário/assinatura; o worker `fixtures-sync` popula times/jogos/árbitros reais.
   (Se preferir **não** apagar o banco, use `up -d` sem `down -v` — mas aí os 4 jogos mock do
   seed convivem com os reais; não recomendado.)

3. **Confirmar que está chamando a API (e não o mock):**
   ```bash
   # log do provider
   docker compose -f docker-compose.yml -f docker-compose.prod.yml logs agent | grep -i sportmonks
   #  → "using Sportmonks provider (dados reais)"

   # heartbeats / rate-limit da API
   docker exec betv-postgres-1 psql -U betv -d betv -tA -c \
     "SELECT worker, metadata FROM system_health WHERE worker IN ('fixtures-sync','live-sync','sportmonks-api');"
   #  fixtures-sync → {"fixturesInserted": N>0, "teamsSynced": ...}
   #  live-sync     → {"liveUpdated": ...}
   #  sportmonks-api→ {"entity": "...", "remaining": ..., "resetsInSeconds": ...}

   # times deixam de ser os 12 do seed
   docker exec betv-postgres-1 psql -U betv -d betv -tA -c "SELECT count(*) FROM teams;"
   ```

## O que passa a ter dado real
| Tela / feature | Fonte real |
|---|---|
| Hoje (grid de jogos) | `fixtures-sync` → `/fixtures/date` |
| Match Center: placar/eventos/stats ao vivo | `live-sync` → `/livescores/inplay` |
| Match Center: probabilidades | **motor próprio** sobre os dados reais (sempre) |
| Match Center: odds (tabela por casa) | `odds-sync` → `/odds/pre-match` |
| Match Center: escalações | `prematch` → `fetchLineups` |
| Match Center: árbitro | `/fixtures/{id}?include=referees` |
| Radar de Valor | `odds-sync` cruza odds reais × probabilidade do motor |
| Explorar (times/jogadores) | `fetchTeams` → `/teams/seasons/{id}?include=players` |

## Resiliência (já embutida)
- Rate-limit **por entidade** + backoff respeitando `retry_after` (429); timeout; cache curto
  no Redis; **degradação graciosa** (devolve o último dado bom do cache se um endpoint cair).
- Cadência de produção (PARTE G do doc mestre) entra junto com o modo sportmonks.

## Rollback para mock
```bash
# em /opt/betv/.env: DATA_PROVIDER=mock  (e/ou remover SPORTMONKS_TOKEN)
docker compose -f docker-compose.yml -f docker-compose.prod.yml down -v
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

## Pendências conhecidas da virada
- **Stats por-90 de jogador**: `fetchTeams` traz o elenco (roster) real, mas as estatísticas
  por jogador exigem includes adicionais (`season.statistics`) ainda não mapeados — o roster
  fica real, as métricas por-90 ficam vazias até esse mapeamento.
- **Estatísticas agregadas de árbitro** (médias de cartões/pênaltis): hoje vêm do seed/motor;
  para puxá-las da Sportmonks é preciso o include de histórico do árbitro (a confirmar no plano).
- **Embedding real** (RAG): Anthropic não tem embedding 1ª-parte; em mock o RAG usa embedding
  local determinístico. Para embeddings reais, usar Voyage (`AI_EMBEDDING_MODEL`) — confirmar o id.
- **IDs da Copa**: validar `WC_SEASON_ID`/`WC_LEAGUE_ID` no go-live via `/leagues/732?include=currentSeason`.
