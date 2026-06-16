/**
 * Single source of truth for bookmaker lists, previously duplicated across
 * odds-sync, the mock provider and chat.service. Two distinct uses, two names:
 *  - QUOTING: the houses the mock odds engine actually quotes (Radar/OddsTable).
 *  - PARSING: the superset the chat recognizes when a user pastes "...na <casa>",
 *    so a pasted odd is never rejected just because we don't quote that house.
 * PARSING is built FROM QUOTING so the lists never drift apart.
 */
export const BOOKMAKERS_QUOTING = ['Bet365', 'Betano', 'Sportingbet', 'Pixbet', '1xBet'] as const

export const BOOKMAKERS_PARSING = [
  ...BOOKMAKERS_QUOTING,
  'Betfair',
  'KTO',
  'Stake',
  'EstrelaBet',
] as const
