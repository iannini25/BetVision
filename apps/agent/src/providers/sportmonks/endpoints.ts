// URL builders for the Sportmonks v3 endpoints the BetV consumes. Each returns the
// rate-limit ENTITY bucket (limits are per-entity, not per-endpoint), the URL (token
// added by the client), and a suggested cache TTL in seconds.

const FOOTBALL = 'https://api.sportmonks.com/v3/football'
const CORE = 'https://api.sportmonks.com/v3/core'

// Copa 2026 ids — overridable per the study (validate at boot via /leagues/732).
export const seasonId = (): string => process.env.WC_SEASON_ID || '26618'
export const leagueId = (): string => process.env.WC_LEAGUE_ID || '732'

export type SmRequest = { entity: string; url: string; cacheTtl: number }

const DAY = 86400
const WEEK = 7 * DAY

// Fixtures of a given day for the World Cup season (grid "Hoje").
export function fixturesByDate(date: string): SmRequest {
  return {
    entity: 'Fixture',
    url: `${FOOTBALL}/fixtures/date/${date}?include=participants;scores;league;referees&filters=fixtureSeasons:${seasonId()}`,
    cacheTtl: 60,
  }
}

// Full single fixture (Match Center): everything in one call.
export function fixtureById(id: string | number): SmRequest {
  return {
    entity: 'Fixture',
    url: `${FOOTBALL}/fixtures/${id}?include=participants;scores;events;statistics;lineups;formations;referees;venue`,
    cacheTtl: 30,
  }
}

// Live matches now (livescores use the Fixture entity bucket).
export function livescoresInplay(): SmRequest {
  return {
    entity: 'Fixture',
    url: `${FOOTBALL}/livescores/inplay?filters=fixtureLeagues:${leagueId()}&include=participants;scores;events;statistics`,
    cacheTtl: 8,
  }
}

// Pre-match odds for a fixture across bookmakers.
export function preMatchOdds(fixtureId: string | number): SmRequest {
  return {
    entity: 'Odd',
    url: `${FOOTBALL}/odds/pre-match/fixtures/${fixtureId}?include=bookmaker;market`,
    cacheTtl: 60,
  }
}

// All World Cup squads (teams + players) for Explorar/profiles.
export function teamsBySeason(): SmRequest {
  return { entity: 'Team', url: `${FOOTBALL}/teams/seasons/${seasonId()}?include=players`, cacheTtl: DAY }
}

// Reference data — cached a week, resolved locally afterwards.
export const reference = {
  types: (): SmRequest => ({ entity: 'Type', url: `${CORE}/types`, cacheTtl: WEEK }),
  states: (): SmRequest => ({ entity: 'State', url: `${FOOTBALL}/states`, cacheTtl: WEEK }),
  markets: (): SmRequest => ({ entity: 'Market', url: `${FOOTBALL}/markets`, cacheTtl: WEEK }),
  bookmakers: (): SmRequest => ({ entity: 'Bookmaker', url: `${FOOTBALL}/bookmakers`, cacheTtl: WEEK }),
}
