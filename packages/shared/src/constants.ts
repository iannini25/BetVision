export const MARKETS = {
  WINNER: 'winner',
  OVER_UNDER_1_5: 'over_under_1_5',
  OVER_UNDER_2_5: 'over_under_2_5',
  OVER_UNDER_3_5: 'over_under_3_5',
  BTTS: 'btts',
  CORNERS_8_5: 'corners_over_8_5',
  CORNERS_9_5: 'corners_over_9_5',
  CORNERS_10_5: 'corners_over_10_5',
  CARDS_3_5: 'cards_over_3_5',
  CARDS_4_5: 'cards_over_4_5',
  CARDS_5_5: 'cards_over_5_5',
  VAR_PENALTY: 'var_penalty',
} as const

export const MARKET_LABELS: Record<string, string> = {
  winner: 'Vencedor',
  over_under_1_5: 'Over/Under 1.5',
  over_under_2_5: 'Over/Under 2.5',
  over_under_3_5: 'Over/Under 3.5',
  btts: 'Ambas Marcam',
  corners_over_8_5: 'Escanteios 9+',
  corners_over_9_5: 'Escanteios 10+',
  corners_over_10_5: 'Escanteios 11+',
  cards_over_3_5: 'Cartões 4+',
  cards_over_4_5: 'Cartões 5+',
  cards_over_5_5: 'Cartões 6+',
  var_penalty: 'VAR/Pênalti',
}

export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  HALFTIME: 'halftime',
  FINISHED: 'finished',
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled',
} as const

export const SUBSCRIPTION_PRICE_BRL = 14.90
export const SUBSCRIPTION_DAYS = 45
export const EXPIRATION_WARNING_DAYS = 5

/** O passe só pode ser renovado a partir de quando faltam estes dias para expirar. */
export const RENEWAL_UNLOCK_DAYS = 2

/**
 * Taxas de recebimento do Mercado Pago, repassadas ao cliente (total = valor + taxa).
 * Percentuais sobre o valor, exceto boleto (valor fixo em R$). Única fonte da verdade —
 * o painel de taxa do checkout e o cálculo do total no backend leem daqui.
 * `wallet` (saldo MP) não tem taxa publicada no briefing; usamos a de crédito por
 * conservadorismo (nunca cobrar a menos). Confirmar quando a chave real entrar.
 */
export const MP_FEES = {
  pix: 0.0099,
  debit: 0.0199,
  credit: 0.0498,
  wallet: 0.0498,
  boletoFixed: 3.49,
} as const

/**
 * Real Sportmonks data is used only when the mode is selected AND a token is present.
 * Single source of truth for the gate — the agent providers, workers, and the seed all
 * consult this so they can never disagree (a mismatch would mix mock with real data).
 */
export function isSportmonksMode(): boolean {
  return (process.env.DATA_PROVIDER || 'mock') === 'sportmonks' && !!process.env.SPORTMONKS_TOKEN
}

export const TIMEZONE_BR = 'America/Sao_Paulo'

export const TICKER_EVENT_COLORS: Record<string, string> = {
  goal: '#4ADE80',
  card: '#FBBF24',
  odds: '#A78BFA',
  var: '#38BDF8',
  corner: '#4ADE80',
  model: '#A78BFA',
  substitution: '#9AA3B8',
}

/** Neutral fallback for event types not present in TICKER_EVENT_COLORS. */
export const TICKER_EVENT_FALLBACK_COLOR = '#9AA3B8'

/** Colors for the agent-feed categories emitted by the NewsClassifier. */
export const NEWS_CATEGORY_COLORS: Record<string, string> = {
  'LESÃO': '#FB4D6D',
  'ESCALAÇÃO': '#A78BFA',
  'SUSPENSÃO': '#FBBF24',
  'TÁTICA': '#38BDF8',
  'TREINO': '#38BDF8',
  'MERCADO': '#4ADE80',
  'OUTRO': '#9AA3B8',
}
export const NEWS_CATEGORY_FALLBACK_COLOR = '#A78BFA'

export const RIGIDITY_LABELS: Record<string, { label: string; color: string }> = {
  lenient: { label: 'LENIENTE', color: '#4ADE80' },
  moderate: { label: 'MODERADO', color: '#FBBF24' },
  strict: { label: 'RÍGIDO', color: '#FB4D6D' },
}

export const FORM_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  W: { bg: 'rgba(34,197,94,0.13)', border: 'rgba(34,197,94,0.35)', text: '#4ADE80' },
  V: { bg: 'rgba(34,197,94,0.13)', border: 'rgba(34,197,94,0.35)', text: '#4ADE80' },
  D: { bg: 'rgba(251,191,36,0.13)', border: 'rgba(251,191,36,0.35)', text: '#FBBF24' },
  E: { bg: 'rgba(251,191,36,0.13)', border: 'rgba(251,191,36,0.35)', text: '#FBBF24' },
  L: { bg: 'rgba(251,77,109,0.13)', border: 'rgba(251,77,109,0.35)', text: '#FB4D6D' },
}
