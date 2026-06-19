import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import * as schema from '../packages/shared/src/db/schema'
import { isSportmonksMode, SUBSCRIPTION_PRICE_BRL } from '../packages/shared/src/constants'
import * as argon2 from 'argon2'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://betv:betv_secret@localhost:5432/betv'

async function seed() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL })
  const db = drizzle(pool, { schema })

  console.log('Seeding BetV database...')

  // Enable pgvector extension
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`)

  // Create pg_notify triggers
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION betv_notify() RETURNS trigger AS $$
    BEGIN
      PERFORM pg_notify('betv_updates', json_build_object(
        'table', TG_TABLE_NAME,
        'op', TG_OP,
        'id', COALESCE(NEW.id, OLD.id)
      )::text);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)

  // 'payments' entra aqui mas o servidor de realtime só entrega payments_update a quem assinou
  // aquele id (filtro por-cliente) — o checkout escuta a própria linha, sem broadcast global.
  const tables = ['matches', 'probabilities', 'value_flags', 'news_items', 'payments']
  for (const t of tables) {
    await db.execute(sql.raw(`
      DROP TRIGGER IF EXISTS ${t}_notify ON ${t};
      CREATE TRIGGER ${t}_notify AFTER INSERT OR UPDATE ON ${t}
      FOR EACH ROW EXECUTE FUNCTION betv_notify();
    `))
  }

  // Seed user: esquema@dinheiro.com.br / Money@26
  const passwordHash = await argon2.hash('Money@26')
  const [user] = await db
    .insert(schema.users)
    .values({
      email: 'esquema@dinheiro.com.br',
      passwordHash,
      name: 'Leandro Firmino',
      emailVerificado: true,
    })
    .onConflictDoNothing({ target: schema.users.email })
    .returning()

  if (user) {
    const now = new Date()
    const expiry = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000)
    await db.insert(schema.subscriptions).values({
      userId: user.id,
      status: 'active',
      inicioEm: now,
      expiraEm: expiry,
    })
    // Pagamento coerente com a assinatura: passe avulso ativo = 1 cobrança PIX aprovada.
    // Roda só na criação do usuário (insert acima é onConflictDoNothing), logo é idempotente.
    await db.insert(schema.payments).values({
      userId: user.id,
      amount: SUBSCRIPTION_PRICE_BRL,
      status: 'approved',
      method: 'pix',
      mpPaymentId: 'seed-pix-approved',
      paidAt: now,
      criadoEm: now,
    })
    console.log(`User created: ${user.email} (passe avulso ativo, 45 dias, 1 PIX aprovado)`)
  }

  // In sportmonks mode the provider populates teams/fixtures/odds, so the mock sport
  // data below must NOT be seeded (it would mix fake matches with real ones). Keep only
  // the user/triggers/extension above and init system_health for the prod worker set.
  if (isSportmonksMode()) {
    const prodWorkers = ['fixtures-sync', 'prematch', 'live-sync', 'odds-sync', 'news-watcher', 'rag-indexer', 'model-tracker', 'archiver']
    for (const w of prodWorkers) {
      await db.insert(schema.systemHealth).values({ worker: w, status: 'ok' }).onConflictDoNothing()
    }
    console.log('Sportmonks mode — mock sport data skipped; provider will populate teams/fixtures/odds.')
    await pool.end()
    return
  }

  // Idempotency guard: extension/triggers/user above are safe to re-apply, but the
  // sport data below lacks unique keys, so skip it once it exists (migrate runs each `up`).
  const seededTeams = await db.select({ id: schema.teams.id }).from(schema.teams).limit(1)
  if (seededTeams.length > 0) {
    console.log('Sport data already present — skipping re-seed (idempotent).')
    await pool.end()
    return
  }

  // Seed teams (Copa 2026)
  const teamsData = [
    { name: 'Brasil', shortName: 'BRA', group: 'C', elo: 2105, form: ['V', 'V', 'V', 'V', 'E'] },
    { name: 'Argentina', shortName: 'ARG', group: 'A', elo: 2143, form: ['V', 'V', 'E', 'V', 'V'] },
    { name: 'França', shortName: 'FRA', group: 'D', elo: 2031, form: ['V', 'E', 'V', 'V', 'D'] },
    { name: 'Alemanha', shortName: 'ALE', group: 'C', elo: 1986, form: ['V', 'D', 'V', 'V', 'E'] },
    { name: 'Inglaterra', shortName: 'ING', group: 'F', elo: 2025, form: ['V', 'V', 'E', 'E', 'V'] },
    { name: 'Portugal', shortName: 'POR', group: 'E', elo: 1992, form: ['V', 'V', 'V', 'E', 'D'] },
    { name: 'Marrocos', shortName: 'MAR', group: 'A', elo: 1850, form: ['V', 'E', 'V', 'D', 'V'] },
    { name: 'Noruega', shortName: 'NOR', group: 'D', elo: 1780, form: ['V', 'D', 'V', 'V', 'E'] },
    { name: 'Colômbia', shortName: 'COL', group: 'E', elo: 1890, form: ['V', 'V', 'D', 'V', 'E'] },
    { name: 'Sérvia', shortName: 'SRB', group: 'F', elo: 1810, form: ['V', 'E', 'V', 'D', 'V'] },
    { name: 'México', shortName: 'MEX', group: 'B', elo: 1830, form: ['V', 'D', 'V', 'V', 'V'] },
    { name: 'África do Sul', shortName: 'RSA', group: 'B', elo: 1620, form: ['D', 'V', 'E', 'D', 'V'] },
  ]

  const insertedTeams = await db
    .insert(schema.teams)
    .values(teamsData)
    .onConflictDoNothing()
    .returning()

  const teamMap = new Map(insertedTeams.map((t) => [t.shortName, t.id]))
  console.log(`${insertedTeams.length} teams seeded`)

  // Seed referees
  const refereesData = [
    { name: 'César Ramos', country: 'México', matchesAnalyzed: 28, avgYellows: 4.8, avgReds: 0.15, penaltyRate: 0.43, rigidity: 76 },
    { name: 'Szymon Marciniak', country: 'Polônia', matchesAnalyzed: 31, avgYellows: 3.6, avgReds: 0.10, penaltyRate: 0.29, rigidity: 55 },
    { name: 'Wilton P. Sampaio', country: 'Brasil', matchesAnalyzed: 24, avgYellows: 3.1, avgReds: 0.08, penaltyRate: 0.25, rigidity: 38 },
    { name: 'Facundo Tello', country: 'Argentina', matchesAnalyzed: 22, avgYellows: 4.2, avgReds: 0.18, penaltyRate: 0.36, rigidity: 68 },
  ]

  const insertedRefs = await db
    .insert(schema.referees)
    .values(refereesData)
    .onConflictDoNothing()
    .returning()
  console.log(`${insertedRefs.length} referees seeded`)

  // Seed matches (today + upcoming)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const matchesData = [
    {
      homeTeamId: teamMap.get('BRA')!,
      awayTeamId: teamMap.get('ALE')!,
      refereeId: insertedRefs.find((r) => r.name === 'Facundo Tello')?.id,
      status: 'live' as const,
      phase: 'Fase de grupos',
      group: 'C',
      venue: 'MetLife Stadium',
      city: 'Nova Jersey',
      iniciaEm: new Date(today.getTime() + 13 * 60 * 60 * 1000),
      homeScore: 2,
      awayScore: 1,
      minute: 67,
      period: '2nd_half',
      events: [
        { type: 'goal', minute: 23, team: 'BRA', player: 'Rodrygo' },
        { type: 'goal', minute: 34, team: 'ALE', player: 'Musiala' },
        { type: 'card', minute: 41, team: 'ALE', player: 'Kimmich', detail: 'yellow' },
        { type: 'var', minute: 58, team: '', detail: 'Checagem de pênalti — nada marcado' },
        { type: 'goal', minute: 62, team: 'BRA', player: 'Vinícius Jr.' },
        { type: 'card', minute: 64, team: 'ALE', player: 'Kimmich', detail: 'yellow' },
      ],
      stats: {
        possession: { home: 54, away: 46 },
        shots: { home: 12, away: 8 },
        shotsOnTarget: { home: 6, away: 3 },
        corners: { home: 7, away: 4 },
        fouls: { home: 9, away: 13 },
      },
    },
    {
      homeTeamId: teamMap.get('ARG')!,
      awayTeamId: teamMap.get('MAR')!,
      refereeId: insertedRefs.find((r) => r.name === 'César Ramos')?.id,
      status: 'scheduled' as const,
      phase: 'Fase de grupos',
      group: 'A',
      venue: 'Hard Rock Stadium',
      city: 'Miami',
      iniciaEm: new Date(today.getTime() + 19 * 60 * 60 * 1000),
    },
    {
      homeTeamId: teamMap.get('FRA')!,
      awayTeamId: teamMap.get('NOR')!,
      status: 'scheduled' as const,
      phase: 'Fase de grupos',
      group: 'D',
      venue: 'SoFi Stadium',
      city: 'Los Angeles',
      iniciaEm: new Date(today.getTime() + 21 * 60 * 60 * 1000),
    },
    {
      homeTeamId: teamMap.get('POR')!,
      awayTeamId: teamMap.get('COL')!,
      status: 'scheduled' as const,
      phase: 'Fase de grupos',
      group: 'E',
      venue: 'AT&T Stadium',
      city: 'Dallas',
      iniciaEm: new Date(today.getTime() + 24 * 60 * 60 * 1000),
    },
  ]

  const insertedMatches = await db
    .insert(schema.matches)
    .values(matchesData)
    .onConflictDoNothing()
    .returning()
  console.log(`${insertedMatches.length} matches seeded`)

  // Seed probabilities for all matches
  for (const match of insertedMatches) {
    const isLive = match.status === 'live'
    const home = teamsData.find((t) => teamMap.get(t.shortName) === match.homeTeamId)
    const away = teamsData.find((t) => teamMap.get(t.shortName) === match.awayTeamId)

    const eloDiff = (home?.elo ?? 1800) - (away?.elo ?? 1800)
    const homeWinBase = Math.min(0.85, Math.max(0.25, 0.5 + eloDiff / 800))

    const probs = [
      { market: 'winner', outcome: `${home?.shortName} vence`, probability: homeWinBase },
      { market: 'winner', outcome: 'Empate', probability: 0.25 },
      { market: 'winner', outcome: `${away?.shortName} vence`, probability: 1 - homeWinBase - 0.25 },
      { market: 'over_under_2_5', outcome: 'Over 2.5', probability: 0.62 + Math.random() * 0.1 },
      { market: 'btts', outcome: 'Sim', probability: 0.48 + Math.random() * 0.12 },
      { market: 'corners_over_9_5', outcome: 'Over 9.5', probability: 0.50 + Math.random() * 0.15 },
      { market: 'cards_over_4_5', outcome: 'Over 4.5', probability: 0.42 + Math.random() * 0.18 },
    ]

    await db.insert(schema.probabilities).values(
      probs.map((p) => ({
        matchId: match.id,
        market: p.market,
        outcome: p.outcome,
        probability: Math.round(p.probability * 100) / 100,
        isLive,
      }))
    )
  }
  console.log('Probabilities seeded')

  // Seed odds snapshots
  const bookmakers = ['Bet365', 'Betano', 'Sportingbet', 'Pixbet', '1xBet']
  for (const match of insertedMatches) {
    const home = teamsData.find((t) => teamMap.get(t.shortName) === match.homeTeamId)
    for (const bk of bookmakers) {
      const baseOdds = 1.5 + Math.random() * 1.5
      await db.insert(schema.oddsSnapshots).values({
        matchId: match.id,
        market: 'winner',
        outcome: `${home?.shortName} vence`,
        bookmaker: bk,
        odds: Math.round(baseOdds * 100) / 100,
      })
    }
  }
  console.log('Odds snapshots seeded')

  // Seed value flags
  const valueData = [
    { matchIdx: 1, market: 'over_under_2_5', outcome: 'Over 2.5', prob: 0.68, odds: 1.62, edge: 0.062 },
    { matchIdx: 0, market: 'corners_over_9_5', outcome: 'Escanteios 10+', prob: 0.57, odds: 1.95, edge: 0.058 },
    { matchIdx: 2, market: 'btts', outcome: 'Ambas marcam', prob: 0.54, odds: 2.05, edge: 0.051 },
    { matchIdx: 3, market: 'cards_over_4_5', outcome: 'Cartões 5+', prob: 0.48, odds: 2.30, edge: 0.046 },
  ]

  for (const v of valueData) {
    if (insertedMatches[v.matchIdx]) {
      await db.insert(schema.valueFlags).values({
        matchId: insertedMatches[v.matchIdx].id,
        market: v.market,
        outcome: v.outcome,
        modelProb: v.prob,
        bestOdds: v.odds,
        bestBookmaker: bookmakers[Math.floor(Math.random() * bookmakers.length)],
        edge: v.edge,
      })
    }
  }
  console.log('Value flags seeded')

  // Seed news items
  const newsData = [
    { matchIdx: 0, title: 'Rüdiger sente a coxa no aquecimento; Schlotterbeck entrou na vaga.', category: 'LESÃO', source: 'Kicker', impact: 'cartões ALE ↑', relevance: 5 },
    { matchIdx: 1, title: 'Scaloni confirma Messi entre os titulares contra o Marrocos.', category: 'ESCALAÇÃO', source: 'TyC Sports', impact: 'ARG vence ↑', relevance: 4 },
    { matchIdx: 2, title: 'Tchouaméni cumpre suspensão; Camavinga deve ser titular pela França.', category: 'SUSPENSÃO', source: "L'Équipe", impact: 'meio-campo FRA', relevance: 4 },
    { matchIdx: 0, title: 'Ancelotti fecha treino e testa linha de cinco contra a Alemanha.', category: 'ESCALAÇÃO', source: 'GE', impact: 'escanteios BRA ↓', relevance: 3 },
  ]

  for (const n of newsData) {
    if (insertedMatches[n.matchIdx]) {
      await db.insert(schema.newsItems).values({
        matchId: insertedMatches[n.matchIdx].id,
        title: n.title,
        category: n.category,
        source: n.source,
        impact: n.impact,
        relevance: n.relevance,
        publishedAt: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000),
      })
    }
  }
  console.log('News items seeded')

  // Seed predictions log (historical)
  const predsData = [
    { market: 'winner', outcome: 'MEX vence', prob: 0.64, result: true },
    { market: 'corners_over_8_5', outcome: 'Escanteios 9+', prob: 0.61, result: false },
    { market: 'over_under_2_5', outcome: 'Over 2.5', prob: 0.71, result: true },
    { market: 'btts', outcome: 'Ambas marcam', prob: 0.56, result: true },
    { market: 'over_under_1_5', outcome: 'Over 1.5', prob: 0.74, result: false },
    { market: 'cards_over_3_5', outcome: 'Cartões 4+', prob: 0.49, result: true },
  ]

  if (insertedMatches[0]) {
    for (const p of predsData) {
      const brier = (p.prob - (p.result ? 1 : 0)) ** 2
      await db.insert(schema.predictionsLog).values({
        matchId: insertedMatches[0].id,
        market: p.market,
        outcome: p.outcome,
        predictedProb: p.prob,
        actualResult: p.result,
        brierScore: Math.round(brier * 1000) / 1000,
        resolvedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      })
    }
  }
  console.log('Predictions log seeded')

  // Seed players
  const playersData = [
    { name: 'Vinícius Jr.', teamShort: 'BRA', position: 'FW', stats: { goalsPer90: 0.78, xgPer90: 0.66, shotsPer90: 3.9, minutes: 562 } },
    { name: 'Rodrygo', teamShort: 'BRA', position: 'FW', stats: { goalsPer90: 0.52, xgPer90: 0.48, shotsPer90: 2.8, minutes: 490 } },
    { name: 'Messi', teamShort: 'ARG', position: 'FW', stats: { goalsPer90: 0.71, xgPer90: 0.58, shotsPer90: 3.4, minutes: 488 } },
    { name: 'Mbappé', teamShort: 'FRA', position: 'FW', stats: { goalsPer90: 1.12, xgPer90: 0.94, shotsPer90: 4.8, minutes: 540 } },
    { name: 'Haaland', teamShort: 'NOR', position: 'FW', stats: { goalsPer90: 1.05, xgPer90: 1.01, shotsPer90: 4.2, minutes: 510 } },
    { name: 'Kane', teamShort: 'ING', position: 'FW', stats: { goalsPer90: 0.88, xgPer90: 0.79, shotsPer90: 3.6, minutes: 540 } },
    { name: 'Musiala', teamShort: 'ALE', position: 'MF', stats: { goalsPer90: 0.45, xgPer90: 0.38, shotsPer90: 2.7, minutes: 505 } },
  ]

  for (const p of playersData) {
    const tid = teamMap.get(p.teamShort)
    if (tid) {
      await db.insert(schema.players).values({
        name: p.name,
        teamId: tid,
        position: p.position,
        stats: p.stats,
      }).onConflictDoNothing()
    }
  }
  console.log('Players seeded')

  // System health init
  const workers = ['fixtures-sync', 'prematch', 'live-engine', 'odds-sync', 'news-watcher', 'rag-indexer', 'model-tracker', 'archiver']
  for (const w of workers) {
    await db.insert(schema.systemHealth).values({
      worker: w,
      status: 'ok',
    }).onConflictDoNothing()
  }
  console.log('System health initialized')

  console.log('Seed complete!')
  await pool.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
