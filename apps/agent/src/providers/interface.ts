export type ProviderMatch = {
  externalId: string
  homeTeam: { name: string; shortName: string }
  awayTeam: { name: string; shortName: string }
  status: string
  startTime: Date
  venue?: string
  city?: string
  phase?: string
  group?: string
  homeScore?: number
  awayScore?: number
  minute?: number
  period?: string
  events?: ProviderEvent[]
  stats?: Record<string, { home: number; away: number }>
}

export type ProviderEvent = {
  type: string
  minute: number
  team: string
  player?: string
  detail?: string
}

export type ProviderLineup = {
  teamName: string
  formation?: string
  confirmed: boolean
  players: { name: string; number?: number; position?: string }[]
}

export type ProviderOdds = {
  bookmaker: string
  market: string
  outcome: string
  odds: number
}

export type ProviderReferee = {
  externalId: string
  name: string
  country: string
  // Optional aggregate stats (real providers may supply; mock omits — engine derives).
  avgYellows?: number
  avgReds?: number
  avgFouls?: number
  penaltyRate?: number
}

export type ProviderPlayer = {
  externalId: string
  name: string
  position?: string
  stats?: Record<string, number>
}

export type ProviderTeam = {
  externalId: string
  name: string
  shortName: string
  group?: string
  players?: ProviderPlayer[]
}

export interface DataProvider {
  name: string
  fetchTodayMatches(): Promise<ProviderMatch[]>
  fetchMatchDetails(externalId: string): Promise<ProviderMatch | null>
  fetchLineups(externalId: string): Promise<ProviderLineup[]>
  fetchOdds(externalId: string): Promise<ProviderOdds[]>
  fetchMatchReferee(externalId: string): Promise<ProviderReferee | null>
  // Optional richer reads. Real providers (Sportmonks) implement them; the mock omits
  // them, and the gated ingestion only calls them when present — keeping mock intact.
  fetchLiveMatches?(): Promise<ProviderMatch[]>
  fetchTeams?(): Promise<ProviderTeam[]>
}
