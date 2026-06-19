import 'server-only'
import { and, asc, desc, eq, inArray, or } from 'drizzle-orm'
import { BOOKMAKERS_PARSING } from '@betv/shared'
import { db, schema } from '@/lib/db'

const DISCLAIMER = 'Informação estatística, não recomendação de aposta.'

export type BetVerdict = 'value' | 'fair' | 'overpriced'

export type ChatReply = {
  response: string
  evaluation?: {
    market: string
    outcome: string
    userOdds: number
    modelProb: number
    impliedProb: number
    edge: number
    verdict: BetVerdict
  }
}

type ParsedBet = { odds: number; bookmaker?: string; market: string; outcomeKind: OutcomeKind }
type OutcomeKind = { type: 'team-win' | 'draw' } | { type: 'fixed'; outcome: string }

/**
 * The chat's brain. If the message is a pasted odd (market + odd + house), it maps to
 * a market, pulls the model's probability for that match, computes the edge and a value
 * verdict, and records it. Otherwise it answers informationally. It never advises betting.
 */
export async function replyToChat(input: {
  userId: string
  sessionId?: string
  message: string
  matchId?: number
}): Promise<ChatReply> {
  const bet = parsePastedBet(input.message)
  if (bet) return evaluatePastedBet(bet, input)
  return { response: informationalReply(input.message) }
}

async function evaluatePastedBet(
  bet: ParsedBet,
  input: { userId: string; sessionId?: string; message: string; matchId?: number }
): Promise<ChatReply> {
  const match = await resolveMatch(input.matchId, input.message)
  if (!match) {
    return { response: `Não localizei o jogo dessa aposta. Me diga o confronto (ex: "Brasil x Alemanha"). ${DISCLAIMER}` }
  }

  const outcome = await resolveOutcome(bet, match, input.message)
  const modelProb = await latestProbability(match.id, bet.market, outcome)
  if (modelProb == null) {
    return {
      response: `Ainda não tenho probabilidade do modelo para "${outcome}" (${marketLabel(bet.market)}) nesse jogo. ${DISCLAIMER}`,
    }
  }

  const impliedProb = 1 / bet.odds
  const edge = modelProb * bet.odds - 1
  const verdict = verdictFromEdge(edge)

  await db.insert(schema.betEvaluations).values({
    userId: input.userId,
    sessionId: input.sessionId,
    matchId: match.id,
    market: bet.market,
    outcome,
    userOdds: bet.odds,
    bookmaker: bet.bookmaker,
    modelProb,
    edge,
    verdict,
  })

  return {
    response: explainEvaluation({ outcome, market: bet.market, odds: bet.odds, bookmaker: bet.bookmaker, modelProb, impliedProb, edge, verdict }),
    evaluation: { market: bet.market, outcome, userOdds: bet.odds, modelProb, impliedProb, edge, verdict },
  }
}

function parsePastedBet(message: string): ParsedBet | null {
  const oddMatch = message.match(/\b(\d{1,2}[.,]\d{1,2})\b/)
  if (!oddMatch) return null
  const odds = parseFloat(oddMatch[1].replace(',', '.'))
  if (!Number.isFinite(odds) || odds <= 1) return null

  const market = detectMarket(message)
  if (!market) return null

  const bookmaker = BOOKMAKERS_PARSING.find((b) => message.toLowerCase().includes(b.toLowerCase()))
  return { odds, bookmaker, market: market.market, outcomeKind: market.outcomeKind }
}

function detectMarket(message: string): { market: string; outcomeKind: OutcomeKind } | null {
  const m = message.toLowerCase()
  if (/(empate|draw)/.test(m)) return { market: 'winner', outcomeKind: { type: 'draw' } }
  if (/(escanteio|c[oô]rner|cantos)/.test(m)) return { market: 'corners_over_9_5', outcomeKind: { type: 'fixed', outcome: 'Over 9.5' } }
  if (/(cart[aã]o|cart[oõ]es|card)/.test(m)) return { market: 'cards_over_4_5', outcomeKind: { type: 'fixed', outcome: 'Over 4.5' } }
  if (/(ambas marcam|ambos marcam|btts)/.test(m)) return { market: 'btts', outcomeKind: { type: 'fixed', outcome: 'Sim' } }
  if (/(over|mais de|acima de).*(2[.,]5)|2[.,]5.*(gols|over)/.test(m)) return { market: 'over_under_2_5', outcomeKind: { type: 'fixed', outcome: 'Over 2.5' } }
  if (/(vence|vit[oó]ria|ganha|win)/.test(m)) return { market: 'winner', outcomeKind: { type: 'team-win' } }
  return null
}

async function resolveMatch(matchId: number | undefined, message: string) {
  if (matchId) {
    const [m] = await db.select().from(schema.matches).where(eq(schema.matches.id, matchId)).limit(1)
    if (m) return m
  }
  // Infer from a team name/short name mentioned in the message.
  const teams = await db.select().from(schema.teams)
  const lower = message.toLowerCase()
  const mentioned = teams.find((t) => lower.includes(t.name.toLowerCase()) || lower.includes(t.shortName.toLowerCase()))
  if (mentioned) {
    const [m] = await db
      .select()
      .from(schema.matches)
      .where(or(eq(schema.matches.homeTeamId, mentioned.id), eq(schema.matches.awayTeamId, mentioned.id)))
      .orderBy(desc(schema.matches.iniciaEm))
      .limit(1)
    if (m) return m
  }
  // No team named: assume the bet is about the game in focus — the live one, else the next.
  return fallbackMatch()
}

async function fallbackMatch() {
  const [live] = await db.select().from(schema.matches).where(eq(schema.matches.status, 'live')).limit(1)
  if (live) return live
  const [next] = await db
    .select()
    .from(schema.matches)
    .where(eq(schema.matches.status, 'scheduled'))
    .orderBy(asc(schema.matches.iniciaEm))
    .limit(1)
  return next
}

async function resolveOutcome(
  bet: ParsedBet,
  match: typeof schema.matches.$inferSelect,
  message: string
): Promise<string> {
  if (bet.outcomeKind.type === 'fixed') return bet.outcomeKind.outcome
  if (bet.outcomeKind.type === 'draw') return 'Empate'

  // team-win: use whichever of the two sides is named in the message, else the home side.
  const sideIds = [match.homeTeamId, match.awayTeamId].filter((id): id is number => id != null)
  const sides = sideIds.length ? await db.select().from(schema.teams).where(inArray(schema.teams.id, sideIds)) : []
  const lower = message.toLowerCase()
  const picked =
    sides.find((t) => lower.includes(t.name.toLowerCase()) || lower.includes(t.shortName.toLowerCase())) ??
    sides.find((t) => t.id === match.homeTeamId)
  return `${picked?.shortName ?? 'CASA'} vence`
}

async function latestProbability(matchId: number, market: string, outcome: string): Promise<number | null> {
  const [row] = await db
    .select({ probability: schema.probabilities.probability })
    .from(schema.probabilities)
    .where(
      and(
        eq(schema.probabilities.matchId, matchId),
        eq(schema.probabilities.market, market),
        eq(schema.probabilities.outcome, outcome)
      )
    )
    .orderBy(desc(schema.probabilities.calculadoEm))
    .limit(1)
  return row?.probability ?? null
}

function verdictFromEdge(edge: number): BetVerdict {
  if (edge >= 0.05) return 'value'
  if (edge >= -0.02) return 'fair'
  return 'overpriced'
}

function explainEvaluation(e: {
  outcome: string
  market: string
  odds: number
  bookmaker?: string
  modelProb: number
  impliedProb: number
  edge: number
  verdict: BetVerdict
}): string {
  const model = (e.modelProb * 100).toFixed(1)
  const implied = (e.impliedProb * 100).toFixed(1)
  const edgePct = (e.edge * 100).toFixed(1)
  const house = e.bookmaker ? ` (${e.bookmaker})` : ''
  const head = `${marketLabel(e.market)}: "${e.outcome}" a ${e.odds.toFixed(2)}${house}.`

  if (e.verdict === 'value') {
    return `${head} O modelo calcula ${model}% e a odd implica ${implied}%, gerando edge de +${edgePct}%. O modelo enxerga VALOR: vê o desfecho como mais provável do que as casas precificam. ${DISCLAIMER}`
  }
  if (e.verdict === 'fair') {
    return `${head} O modelo calcula ${model}% e a odd implica ${implied}% (edge ${edgePct}%). Precificação justa: modelo e casas concordam aproximadamente. ${DISCLAIMER}`
  }
  return `${head} O modelo calcula ${model}%, mas a odd implica ${implied}% (edge ${edgePct}%). Sem valor: as casas precificam o desfecho como mais provável do que o modelo. ${DISCLAIMER}`
}

function marketLabel(market: string): string {
  const labels: Record<string, string> = {
    winner: 'Vencedor',
    over_under_2_5: 'Over/Under 2.5',
    btts: 'Ambas marcam',
    corners_over_9_5: 'Escanteios',
    cards_over_4_5: 'Cartões',
  }
  return labels[market] ?? market
}

function informationalReply(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('favorito')) {
    return `Pelos dados do modelo, te mostro a probabilidade de cada favorito do dia por mercado. ${DISCLAIMER}`
  }
  if (/(arbitro|árbitro|cart[aã]o)/.test(lower)) {
    return `Posso detalhar o perfil de rigidez do árbitro escalado e como ele afeta o mercado de cartões. ${DISCLAIMER}`
  }
  if (/(valor|edge)/.test(lower)) {
    return `O Radar de Valor lista as maiores divergências modelo×odds do dia. Edge positivo = o modelo vê o desfecho como mais provável do que as casas precificam. ${DISCLAIMER}`
  }
  return `Cole uma odd no formato "mercado + odd + casa" (ex: "Brasil vence a 1.65 na Bet365") e eu comparo com a probabilidade do motor e calculo o edge. ${DISCLAIMER}`
}
