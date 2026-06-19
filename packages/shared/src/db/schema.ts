import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  uuid,
  index,
  varchar,
  serial,
} from 'drizzle-orm/pg-core'
// sql is used in consuming code, not directly in the schema

// ========== IDENTITY / ACCESS ==========

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  // Coletados no cadastro / pagamento; nullable para o usuário semeado e o fluxo legado.
  phone: varchar('phone', { length: 20 }),
  cpf: varchar('cpf', { length: 14 }),
  mpCustomerId: varchar('mp_customer_id', { length: 255 }),
  emailVerificado: boolean('email_verificado').default(false).notNull(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow().notNull(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).defaultNow().notNull(),
  deletadoEm: timestamp('deletado_em', { withTimezone: true }),
})

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // trial | active | cancelled | past_due | expired (varchar, sem pg-enum)
  status: varchar('status', { length: 20 }).notNull().default('active'),
  // avulso_pix | avulso_cartao | recorrente_cartao
  type: varchar('type', { length: 20 }).notNull().default('avulso_pix'),
  inicioEm: timestamp('inicio_em', { withTimezone: true }).defaultNow().notNull(),
  expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
  // --- Assinatura recorrente (cartão) ---
  mpPreapprovalId: varchar('mp_preapproval_id', { length: 255 }),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  nextChargeAt: timestamp('next_charge_at', { withTimezone: true }),
  consentAt: timestamp('consent_at', { withTimezone: true }),
  consentVersion: varchar('consent_version', { length: 40 }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  // Aviso pré-cobrança do trial já enviado neste ciclo (idempotência).
  preChargeWarnedAt: timestamp('pre_charge_warned_at', { withTimezone: true }),
  // Quando o e-mail de "expira em X dias" foi enviado neste ciclo (idempotência do cron avulso).
  // Zerado a cada renovação para reativar o aviso no próximo ciclo.
  expiryWarnedAt: timestamp('expiry_warned_at', { withTimezone: true }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow().notNull(),
})

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mpPaymentId: varchar('mp_payment_id', { length: 255 }),
  amount: real('amount').notNull(), // total cobrado (valor base + taxa)
  feeAmount: real('fee_amount'), // taxa repassada ao cliente (net = amount - fee)
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  mpStatusDetail: varchar('mp_status_detail', { length: 60 }),
  method: varchar('method', { length: 20 }).notNull().default('pix'), // pix|credit|debit|boleto|wallet
  installments: integer('installments'),
  pixQrCode: text('pix_qr_code'), // imagem (base64) do QR
  pixCopiaECola: text('pix_copia_e_cola'), // código copia-e-cola
  boletoUrl: text('boleto_url'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow().notNull(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).defaultNow().notNull(),
})

// Cartões salvos no Mercado Pago para renovação 1-clique (camada preparada p/ preapproval futuro).
export const paymentCards = pgTable('payment_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mpCustomerId: varchar('mp_customer_id', { length: 255 }).notNull(),
  mpCardId: varchar('mp_card_id', { length: 255 }).notNull(),
  lastFour: varchar('last_four', { length: 4 }).notNull(),
  brand: varchar('brand', { length: 30 }).notNull(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow().notNull(),
})

export const authTokens = pgTable('auth_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 30 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow().notNull(),
})

// ========== SPORTS ==========

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  externalId: varchar('external_id', { length: 50 }),
  name: varchar('name', { length: 255 }).notNull(),
  shortName: varchar('short_name', { length: 10 }).notNull(),
  flagUrl: text('flag_url'),
  group: varchar('group_name', { length: 10 }),
  elo: integer('elo').default(1500),
  form: jsonb('form').$type<string[]>().default([]),
  stats: jsonb('stats').$type<Record<string, number>>().default({}),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).defaultNow().notNull(),
})

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  externalId: varchar('external_id', { length: 50 }),
  name: varchar('name', { length: 255 }).notNull(),
  teamId: integer('team_id').references(() => teams.id),
  position: varchar('position', { length: 30 }),
  stats: jsonb('stats').$type<Record<string, number>>().default({}),
  injury: jsonb('injury').$type<{ status: string; description?: string } | null>(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).defaultNow().notNull(),
})

export const referees = pgTable('referees', {
  id: serial('id').primaryKey(),
  externalId: varchar('external_id', { length: 50 }),
  name: varchar('name', { length: 255 }).notNull(),
  country: varchar('country', { length: 100 }),
  matchesAnalyzed: integer('matches_analyzed').default(0),
  avgYellows: real('avg_yellows').default(0),
  avgReds: real('avg_reds').default(0),
  avgFouls: real('avg_fouls').default(0),
  penaltyRate: real('penalty_rate').default(0),
  rigidity: real('rigidity').default(50),
  stats: jsonb('stats').$type<Record<string, number>>().default({}),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).defaultNow().notNull(),
})

export const matches = pgTable(
  'matches',
  {
    id: serial('id').primaryKey(),
    externalId: varchar('external_id', { length: 50 }),
    homeTeamId: integer('home_team_id').references(() => teams.id),
    awayTeamId: integer('away_team_id').references(() => teams.id),
    refereeId: integer('referee_id').references(() => referees.id),
    status: varchar('status', { length: 20 }).notNull().default('scheduled'),
    phase: varchar('phase', { length: 50 }),
    group: varchar('group_name', { length: 10 }),
    venue: varchar('venue', { length: 255 }),
    city: varchar('city', { length: 255 }),
    iniciaEm: timestamp('inicia_em', { withTimezone: true }).notNull(),
    homeScore: integer('home_score'),
    awayScore: integer('away_score'),
    minute: integer('minute'),
    period: varchar('period', { length: 20 }),
    events: jsonb('events').$type<MatchEvent[]>().default([]),
    stats: jsonb('stats').$type<Record<string, { home: number; away: number }>>().default({}),
    archived: boolean('archived').default(false),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusIniciaIdx: index('matches_status_inicia_idx').on(table.status, table.iniciaEm),
  })
)

export const lineups = pgTable('lineups', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
  teamId: integer('team_id').notNull().references(() => teams.id),
  formation: varchar('formation', { length: 20 }),
  confirmed: boolean('confirmed').default(false),
  players: jsonb('lineup_players').$type<LineupPlayer[]>().default([]),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).defaultNow().notNull(),
})

// ========== INTELLIGENCE ==========

export const probabilities = pgTable(
  'probabilities',
  {
    id: serial('id').primaryKey(),
    matchId: integer('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
    market: varchar('market', { length: 50 }).notNull(),
    outcome: varchar('outcome', { length: 50 }).notNull(),
    probability: real('probability').notNull(),
    isLive: boolean('is_live').default(false),
    calculadoEm: timestamp('calculado_em', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    probMatchMarketIdx: index('prob_match_market_idx').on(table.matchId, table.market, table.calculadoEm),
  })
)

export const oddsSnapshots = pgTable(
  'odds_snapshots',
  {
    id: serial('id').primaryKey(),
    matchId: integer('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
    market: varchar('market', { length: 50 }).notNull(),
    outcome: varchar('outcome', { length: 50 }).notNull(),
    bookmaker: varchar('bookmaker', { length: 100 }).notNull(),
    odds: real('odds').notNull(),
    capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    oddsMatchMarketIdx: index('odds_match_market_idx').on(table.matchId, table.market),
  })
)

export const valueFlags = pgTable('value_flags', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
  market: varchar('market', { length: 50 }).notNull(),
  outcome: varchar('outcome', { length: 50 }).notNull(),
  modelProb: real('model_prob').notNull(),
  bestOdds: real('best_odds').notNull(),
  bestBookmaker: varchar('best_bookmaker', { length: 100 }),
  edge: real('edge').notNull(),
  active: boolean('active').default(true),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow().notNull(),
})

export const newsItems = pgTable(
  'news_items',
  {
    id: serial('id').primaryKey(),
    matchId: integer('match_id').references(() => matches.id),
    teamId: integer('team_id').references(() => teams.id),
    title: text('title').notNull(),
    summary: text('summary'),
    source: varchar('source', { length: 100 }),
    sourceUrl: text('source_url'),
    category: varchar('category', { length: 30 }),
    relevance: integer('relevance').default(0),
    impact: text('impact'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    newsMatchRelevanceIdx: index('news_match_relevance_idx').on(table.matchId, table.relevance),
  })
)

export const aiAnalyses = pgTable('ai_analyses', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 30 }).notNull(),
  content: text('content').notNull(),
  tokensUsed: integer('tokens_used'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow().notNull(),
})

export const predictionsLog = pgTable('predictions_log', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id').notNull().references(() => matches.id),
  market: varchar('market', { length: 50 }).notNull(),
  outcome: varchar('outcome', { length: 50 }).notNull(),
  predictedProb: real('predicted_prob').notNull(),
  actualResult: boolean('actual_result'),
  brierScore: real('brier_score'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow().notNull(),
})

// ========== CHAT / RAG ==========

export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow().notNull(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).defaultNow().notNull(),
})

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 10 }).notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow().notNull(),
})

export const betEvaluations = pgTable('bet_evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  sessionId: uuid('session_id').references(() => chatSessions.id),
  matchId: integer('match_id').references(() => matches.id),
  market: varchar('market', { length: 50 }).notNull(),
  outcome: varchar('outcome', { length: 50 }).notNull(),
  userOdds: real('user_odds').notNull(),
  bookmaker: varchar('bookmaker', { length: 100 }),
  modelProb: real('model_prob').notNull(),
  edge: real('edge').notNull(),
  verdict: varchar('verdict', { length: 30 }).notNull(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow().notNull(),
})

export const ragChunks = pgTable(
  'rag_chunks',
  {
    id: serial('id').primaryKey(),
    content: text('content').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    embedding: text('embedding'),
    matchId: integer('match_id').references(() => matches.id),
    type: varchar('type', { length: 30 }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow().notNull(),
  }
)

// ========== SYSTEM ==========

export const systemHealth = pgTable('system_health', {
  id: serial('id').primaryKey(),
  worker: varchar('worker', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('ok'),
  lastHeartbeat: timestamp('last_heartbeat', { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
})

// ========== TYPES ==========

export type MatchEvent = {
  type: string
  minute: number
  team: string
  player?: string
  detail?: string
}

export type LineupPlayer = {
  playerId?: number
  name: string
  number?: number
  position?: string
  isCaptain?: boolean
}
