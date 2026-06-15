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
}

export interface DataProvider {
  name: string
  fetchTodayMatches(): Promise<ProviderMatch[]>
  fetchMatchDetails(externalId: string): Promise<ProviderMatch | null>
  fetchLineups(externalId: string): Promise<ProviderLineup[]>
  fetchOdds(externalId: string): Promise<ProviderOdds[]>
  fetchMatchReferee(externalId: string): Promise<ProviderReferee | null>
}
