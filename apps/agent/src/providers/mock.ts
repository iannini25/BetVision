import { round2, BOOKMAKERS_QUOTING } from '@betv/shared'
import type { DataProvider, ProviderMatch, ProviderLineup, ProviderOdds, ProviderReferee } from './interface'

const MOCK_MATCHES: ProviderMatch[] = [
  {
    externalId: 'mock-bra-ale',
    homeTeam: { name: 'Brasil', shortName: 'BRA' },
    awayTeam: { name: 'Alemanha', shortName: 'ALE' },
    status: 'live',
    startTime: todayAt(13),
    venue: 'MetLife Stadium',
    city: 'Nova Jersey',
    phase: 'Fase de grupos',
    group: 'C',
    homeScore: 2,
    awayScore: 1,
    minute: 67,
    period: '2nd_half',
    events: [
      { type: 'goal', minute: 23, team: 'BRA', player: 'Rodrygo' },
      { type: 'goal', minute: 34, team: 'ALE', player: 'Musiala' },
      { type: 'card', minute: 41, team: 'ALE', player: 'Kimmich', detail: 'yellow' },
      { type: 'var', minute: 58, team: '', detail: 'Checagem de pênalti — nada marcado' },
      { type: 'goal', minute: 62, team: 'BRA', player: 'Vinícius Jr.' },
      { type: 'card', minute: 64, team: 'ALE', player: 'Kimmich', detail: 'yellow' },
    ],
    stats: {
      possession: { home: 54, away: 46 },
      shots: { home: 12, away: 8 },
      shotsOnTarget: { home: 6, away: 3 },
      corners: { home: 7, away: 4 },
      fouls: { home: 9, away: 13 },
    },
  },
  {
    externalId: 'mock-arg-mar',
    homeTeam: { name: 'Argentina', shortName: 'ARG' },
    awayTeam: { name: 'Marrocos', shortName: 'MAR' },
    status: 'scheduled',
    startTime: todayAt(16),
    venue: 'Hard Rock Stadium',
    city: 'Miami',
    phase: 'Fase de grupos',
    group: 'A',
  },
  {
    externalId: 'mock-fra-nor',
    homeTeam: { name: 'França', shortName: 'FRA' },
    awayTeam: { name: 'Noruega', shortName: 'NOR' },
    status: 'scheduled',
    startTime: todayAt(18),
    venue: 'SoFi Stadium',
    city: 'Los Angeles',
    phase: 'Fase de grupos',
    group: 'D',
  },
  {
    externalId: 'mock-por-col',
    homeTeam: { name: 'Portugal', shortName: 'POR' },
    awayTeam: { name: 'Colômbia', shortName: 'COL' },
    status: 'scheduled',
    startTime: todayAt(21),
    venue: 'AT&T Stadium',
    city: 'Dallas',
    phase: 'Fase de grupos',
    group: 'E',
  },
]

const MOCK_LINEUPS: Record<string, ProviderLineup[]> = {
  'mock-bra-ale': [
    {
      teamName: 'Brasil',
      formation: '4-3-3',
      confirmed: true,
      players: [
        { name: 'Alisson', number: 1, position: 'GK' },
        { name: 'Danilo', number: 2, position: 'RB' },
        { name: 'Marquinhos', number: 4, position: 'CB' },
        { name: 'Gabriel Magalhães', number: 3, position: 'CB' },
        { name: 'Wendell', number: 6, position: 'LB' },
        { name: 'Casemiro', number: 5, position: 'CDM' },
        { name: 'Bruno Guimarães', number: 8, position: 'CM' },
        { name: 'Lucas Paquetá', number: 10, position: 'CM' },
        { name: 'Raphinha', number: 11, position: 'RW' },
        { name: 'Vinícius Jr.', number: 7, position: 'LW' },
        { name: 'Rodrygo', number: 9, position: 'ST' },
      ],
    },
    {
      teamName: 'Alemanha',
      formation: '4-2-3-1',
      confirmed: true,
      players: [
        { name: 'Neuer', number: 1, position: 'GK' },
        { name: 'Kimmich', number: 6, position: 'RB' },
        { name: 'Schlotterbeck', number: 4, position: 'CB' },
        { name: 'Tah', number: 5, position: 'CB' },
        { name: 'Raum', number: 3, position: 'LB' },
        { name: 'Andrich', number: 8, position: 'CDM' },
        { name: 'Kroos', number: 10, position: 'CDM' },
        { name: 'Sané', number: 19, position: 'RW' },
        { name: 'Musiala', number: 14, position: 'AM' },
        { name: 'Gnabry', number: 7, position: 'LW' },
        { name: 'Havertz', number: 9, position: 'ST' },
      ],
    },
  ],
}

function todayAt(brtHour: number): Date {
  const now = new Date()
  now.setUTCHours(brtHour + 3, 0, 0, 0)
  return now
}

export class MockProvider implements DataProvider {
  name = 'mock'

  async fetchTodayMatches(): Promise<ProviderMatch[]> {
    return MOCK_MATCHES
  }

  async fetchMatchDetails(externalId: string): Promise<ProviderMatch | null> {
    return MOCK_MATCHES.find((m) => m.externalId === externalId) ?? null
  }

  async fetchLineups(externalId: string): Promise<ProviderLineup[]> {
    return MOCK_LINEUPS[externalId] ?? []
  }

  async fetchOdds(externalId: string): Promise<ProviderOdds[]> {
    const match = MOCK_MATCHES.find((m) => m.externalId === externalId)
    if (!match) return []

    const outcomes = [
      { market: 'winner', outcome: `${match.homeTeam.shortName} vence`, baseOdds: 1.65 },
      { market: 'winner', outcome: 'Empate', baseOdds: 3.60 },
      { market: 'winner', outcome: `${match.awayTeam.shortName} vence`, baseOdds: 4.80 },
      { market: 'over_under_2_5', outcome: 'Over 2.5', baseOdds: 1.62 },
      { market: 'over_under_2_5', outcome: 'Under 2.5', baseOdds: 2.25 },
      { market: 'btts', outcome: 'Sim', baseOdds: 1.85 },
      { market: 'btts', outcome: 'Não', baseOdds: 1.95 },
    ]

    const result: ProviderOdds[] = []
    for (const o of outcomes) {
      for (const bk of BOOKMAKERS_QUOTING) {
        const variance = 0.95 + Math.random() * 0.1
        result.push({
          bookmaker: bk,
          market: o.market,
          outcome: o.outcome,
          odds: round2(o.baseOdds * variance),
        })
      }
    }
    return result
  }

  async fetchMatchReferee(externalId: string): Promise<ProviderReferee | null> {
    const refs: Record<string, ProviderReferee> = {
      'mock-bra-ale': { externalId: 'ref-tello', name: 'Facundo Tello', country: 'Argentina' },
      'mock-arg-mar': { externalId: 'ref-ramos', name: 'César Ramos', country: 'México' },
      'mock-fra-nor': { externalId: 'ref-marciniak', name: 'Szymon Marciniak', country: 'Polônia' },
    }
    return refs[externalId] ?? null
  }
}
