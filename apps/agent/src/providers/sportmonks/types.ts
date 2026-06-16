// Minimal raw shapes for the Sportmonks Football API v3 responses we consume.
// Everything is optional/defensive — the v3 API omits fields it has no value for
// (e.g. statistics return only recorded values, never zero-filled).

export type SmEnvelope<T> = {
  data: T
  pagination?: { has_more?: boolean; next_page?: string | null; current_page?: number }
  rate_limit?: { resets_in_seconds?: number; remaining?: number; requested_entity?: string }
  subscription?: unknown[]
  timezone?: string
  message?: string // present on errors (e.g. 429)
}

export type SmParticipant = {
  id: number
  name: string
  short_code?: string | null
  image_path?: string | null
  placeholder?: boolean
  meta?: { location?: 'home' | 'away'; winner?: boolean | null; position?: number }
}

export type SmScore = {
  id: number
  description?: string // 'CURRENT', '1ST_HALF', ...
  score?: { goals?: number; participant?: 'home' | 'away' }
  participant_id?: number
}

export type SmEvent = {
  id: number
  type_id: number
  participant_id?: number | null
  player_name?: string | null
  related_player_name?: string | null
  minute?: number | null
  extra_minute?: number | null
  result?: string | null
  addition?: string | null
  sort_order?: number | null
}

export type SmStatistic = {
  id: number
  type_id: number
  participant_id?: number
  location?: 'home' | 'away'
  data?: { value?: number } | number | null
}

export type SmLineupPlayer = {
  id: number
  player_id?: number
  player_name?: string
  jersey_number?: number | null
  formation_position?: number | null
  position_id?: number | null
  type_id?: number | null // starter vs bench
  team_id?: number
}

export type SmFormation = { participant_id?: number; formation?: string | null }

export type SmReferee = {
  id: number
  common_name?: string | null
  fullname?: string | null
  name?: string | null
  country?: { name?: string } | null
  meta?: { type_id?: number } | null
}

export type SmVenue = { name?: string | null; city_name?: string | null } | null

export type SmFixture = {
  id: number
  name?: string | null
  league_id?: number
  season_id?: number
  stage_id?: number | null
  round_id?: number | null
  group_id?: number | null
  state_id?: number
  starting_at?: string | null
  starting_at_timestamp?: number | null
  result_info?: string | null
  placeholder?: boolean
  participants?: SmParticipant[]
  scores?: SmScore[]
  events?: SmEvent[]
  statistics?: SmStatistic[]
  lineups?: SmLineupPlayer[]
  formations?: SmFormation[]
  referees?: SmReferee[]
  venue?: SmVenue
}

export type SmOdd = {
  id: number
  fixture_id?: number
  market_id?: number
  bookmaker_id?: number
  label?: string | null
  name?: string | null
  value?: string | null
  total?: string | null
  handicap?: string | null
  market_description?: string | null
  bookmaker?: { id: number; name?: string } | null
  market?: { id: number; name?: string } | null
}

export type SmTeamPlayer = { player_id?: number; player_name?: string; position_id?: number | null }
export type SmTeam = {
  id: number
  name: string
  short_code?: string | null
  image_path?: string | null
  players?: SmTeamPlayer[]
}

export type SmType = { id: number; name?: string; code?: string; model_type?: string }
export type SmState = { id: number; state?: string; name?: string }
export type SmMarket = { id: number; name?: string }
export type SmBookmaker = { id: number; name?: string; legacy_id?: number | null }
