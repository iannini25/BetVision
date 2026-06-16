/**
 * Sportmonks token smoke test — run BEFORE flipping the stack to real data, so you
 * never bring the whole stack up blind. Cheap (~3 calls): validates the token, the
 * Copa league/season ids, and the Odds add-on the provider actually needs.
 *
 * Run (local):   SPORTMONKS_TOKEN=xxx pnpm --filter @betv/agent smoke:sportmonks
 * Run (VPS):     cd /opt/betv && docker compose -f docker-compose.yml -f docker-compose.prod.yml \
 *                  run --rm -e SPORTMONKS_TOKEN=xxx agent node --import tsx apps/agent/src/smoke-sportmonks.ts
 *
 * Exit codes: 0 = OK (warnings allowed), 1 = a check failed (do NOT flip), 2 = no token.
 */
import { leagueCurrentSeason, fixturesByDate, preMatchOdds, leagueId, seasonId, type SmRequest } from './providers/sportmonks/endpoints'

const TOKEN = process.env.SPORTMONKS_TOKEN
let ok = true
const pass = (m: string) => console.log('✅ ' + m)
const warn = (m: string) => console.warn('⚠️  ' + m)
const fail = (m: string) => { console.error('❌ ' + m); ok = false }

async function get(req: SmRequest): Promise<{ status: number; body: any }> {
  const url = `${req.url}${req.url.includes('?') ? '&' : '?'}api_token=${TOKEN}`
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    let body: any = null
    try { body = await res.json() } catch { /* non-JSON */ }
    return { status: res.status, body }
  } catch (err) {
    return { status: 0, body: { message: String(err) } }
  }
}

async function main(): Promise<void> {
  if (!TOKEN) {
    console.error('❌ SPORTMONKS_TOKEN não definido. Exporte o token e rode de novo.')
    process.exit(2)
  }
  console.log(`Smoke test Sportmonks — liga ${leagueId()}, temporada esperada ${seasonId()}\n`)

  // 1) Token validity + current season
  const lg = await get(leagueCurrentSeason())
  if (lg.status === 401 || lg.status === 403) {
    fail(`Token inválido ou sem permissão (HTTP ${lg.status}). ${lg.body?.message ?? ''}`)
    process.exit(1)
  }
  if (lg.status !== 200 || !lg.body?.data) {
    fail(`/leagues falhou (HTTP ${lg.status}). ${lg.body?.message ?? 'sem corpo'}`)
    process.exit(1)
  }
  pass(`Token válido. Liga: ${lg.body.data.name} (id ${lg.body.data.id}).`)

  const cs = lg.body.data.currentseason ?? lg.body.data.currentSeason
  if (cs?.id != null) {
    if (String(cs.id) === seasonId()) pass(`WC_SEASON_ID confere: ${seasonId()} (${cs.name ?? ''}).`)
    else warn(`WC_SEASON_ID=${seasonId()}, mas a temporada atual da liga é ${cs.id} (${cs.name ?? ''}). Ajuste WC_SEASON_ID=${cs.id} no .env.`)
  } else {
    warn('Não consegui ler currentSeason — confirme WC_SEASON_ID manualmente no ID Finder.')
  }

  if (lg.body.subscription) console.log('   plano (subscription):', JSON.stringify(lg.body.subscription).slice(0, 500))
  if (lg.body.rate_limit) {
    const r = lg.body.rate_limit
    console.log(`   rate_limit: remaining=${r.remaining} resets_in=${r.resets_in_seconds}s (entity ${r.requested_entity})`)
  }

  // 2) Fixtures of today (needed to pick a fixture for the odds check)
  const today = new Date().toISOString().slice(0, 10)
  const fx = await get(fixturesByDate(today))
  const fixtures: any[] = fx.body?.data ?? []
  if (fx.status !== 200) warn(`/fixtures/date/${today} HTTP ${fx.status} — não deu pra listar jogos.`)
  else pass(`Fixtures hoje (${today}) na temporada ${seasonId()}: ${fixtures.length}.`)

  // 3) Odds add-on — the ONLY paid add-on the provider relies on
  const fixtureId = fixtures[0]?.id
  if (!fixtureId) {
    warn('Sem fixture hoje p/ testar odds. Rode num dia com jogos da Copa, ou cheque o add-on de Odds no painel.')
  } else {
    const od = await get(preMatchOdds(fixtureId))
    const odds: any[] = od.body?.data ?? []
    if (od.status === 403) fail('Add-on de ODDS não coberto (HTTP 403 em /odds/pre-match). odds-sync não geraria value flags.')
    else if (od.status !== 200) warn(`/odds/pre-match HTTP ${od.status} — ${od.body?.message ?? ''}`)
    else if (odds.length === 0) warn(`Odds vazias p/ a fixture ${fixtureId} (jogo sem odds ainda, ou add-on de Odds ausente).`)
    else pass(`Add-on de ODDS ativo: ${odds.length} cotações na fixture ${fixtureId}.`)
  }

  console.log('\nObs.: o provider NÃO usa o add-on de Predictions (probabilidades vêm do motor próprio); só Odds importa aqui.')
  console.log(ok ? '\n✅ Smoke test OK — pode prosseguir com a virada.' : '\n❌ Smoke test com erro(s) acima — NÃO suba a stack até resolver.')
  process.exit(ok ? 0 : 1)
}

void main()
