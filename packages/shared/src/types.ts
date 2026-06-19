import type { InferSelectModel } from 'drizzle-orm'
import type {
  users, subscriptions, payments, teams, players, referees,
  matches, probabilities, oddsSnapshots, valueFlags, newsItems,
  chatSessions, chatMessages, betEvaluations, systemHealth,
} from './db/schema'

export type User = InferSelectModel<typeof users>
export type Subscription = InferSelectModel<typeof subscriptions>
export type Payment = InferSelectModel<typeof payments>
export type Team = InferSelectModel<typeof teams>
export type Player = InferSelectModel<typeof players>
export type Referee = InferSelectModel<typeof referees>
export type Match = InferSelectModel<typeof matches>
export type Probability = InferSelectModel<typeof probabilities>
export type OddsSnapshot = InferSelectModel<typeof oddsSnapshots>
export type ValueFlag = InferSelectModel<typeof valueFlags>
export type NewsItem = InferSelectModel<typeof newsItems>
export type ChatSession = InferSelectModel<typeof chatSessions>
export type ChatMessage = InferSelectModel<typeof chatMessages>
export type BetEvaluation = InferSelectModel<typeof betEvaluations>
export type SystemHealth = InferSelectModel<typeof systemHealth>

export type MatchStatus = 'scheduled' | 'live' | 'halftime' | 'finished' | 'postponed' | 'cancelled'

export type MarketType =
  | 'winner'
  | 'over_under_1_5'
  | 'over_under_2_5'
  | 'over_under_3_5'
  | 'btts'
  | 'corners_over_8_5'
  | 'corners_over_9_5'
  | 'corners_over_10_5'
  | 'cards_over_3_5'
  | 'cards_over_4_5'
  | 'cards_over_5_5'
  | 'var_penalty'

export type MatchWithTeams = Match & {
  homeTeam: Team
  awayTeam: Team
  referee?: Referee | null
}

export type ProbabilityMap = Record<string, { outcome: string; probability: number }[]>

export type ValueRadarItem = {
  matchId: number
  market: string
  outcome: string
  modelProb: number
  bestOdds: number
  bestBookmaker: string
  edge: number
  homeTeam: Team
  awayTeam: Team
}

export type TickerEvent = {
  id: string
  type: 'goal' | 'card' | 'odds' | 'var' | 'corner' | 'model' | 'substitution'
  minute?: number
  matchLabel: string
  text: string
  timestamp: number
}

export type ChatRole = 'user' | 'assistant'

export type BetVerdict = 'value' | 'fair' | 'overpriced' | 'no_data'
