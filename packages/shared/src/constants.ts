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
