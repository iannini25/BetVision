import type {
  DataProvider, ProviderMatch, ProviderLineup, ProviderOdds, ProviderReferee, ProviderTeam,
} from '../interface'
import type { SportmonksClient } from './client'
import { SmReference } from './reference'
import * as ep from './endpoints'
import { mapFixtureToMatch, mapLineups, mapOdds, participant, participantShort } from './mappers'
import { shortCode } from './normalize'
import type { SmFixture, SmOdd, SmTeam, SmReferee } from './types'

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

function mapReferee(r: SmReferee): ProviderReferee {
  return {
    externalId: String(r.id),
    name: r.common_name || r.fullname || r.name || 'Árbitro',
    country: r.country?.name ?? '',
  }
}

function mapTeam(t: SmTeam): ProviderTeam {
  return {
    externalId: String(t.id),
    name: t.name,
    shortName: shortCode(t),
    players: (t.players ?? []).map((p) => ({
      externalId: String(p.player_id ?? ''),
      name: p.player_name ?? 'Jogador',
    })),
  }
}

/**
 * Sportmonks Football API v3 provider. Fulfills the DataProvider contract (plus the
 * optional richer reads) by composing the resilient client + reference resolver +
 * pure mappers. Holds no business logic — only fetch + map.
 */
export class SportmonksProvider implements DataProvider {
  name = 'sportmonks'
  private reference: SmReference

  constructor(private client: SportmonksClient, reference?: SmReference) {
    this.reference = reference ?? new SmReference(client)
  }

  async fetchTodayMatches(): Promise<ProviderMatch[]> {
    await this.reference.ensure()
    const fixtures = await this.client.request<SmFixture[]>(ep.fixturesByDate(todayUtc()))
    return (fixtures ?? []).map((f) => mapFixtureToMatch(f, (id) => this.reference.statKey(id)))
  }

  async fetchMatchDetails(externalId: string): Promise<ProviderMatch | null> {
    await this.reference.ensure()
    const fixture = await this.client.request<SmFixture>(ep.fixtureById(externalId))
    return fixture ? mapFixtureToMatch(fixture, (id) => this.reference.statKey(id)) : null
  }

  async fetchLineups(externalId: string): Promise<ProviderLineup[]> {
    const fixture = await this.client.request<SmFixture>(ep.fixtureById(externalId))
    return fixture ? mapLineups(fixture) : []
  }

  async fetchOdds(externalId: string): Promise<ProviderOdds[]> {
    const fixture = await this.client.request<SmFixture>(ep.fixtureById(externalId))
    if (!fixture) return []
    const homeShort = participantShort(participant(fixture, 'home'))
    const awayShort = participantShort(participant(fixture, 'away'))
    const odds = await this.client.request<SmOdd[]>(ep.preMatchOdds(externalId))
    return mapOdds(odds ?? [], { homeShort, awayShort })
  }

  async fetchMatchReferee(externalId: string): Promise<ProviderReferee | null> {
    const fixture = await this.client.request<SmFixture>(ep.fixtureById(externalId))
    const ref = fixture?.referees?.[0]
    return ref ? mapReferee(ref) : null
  }

  async fetchLiveMatches(): Promise<ProviderMatch[]> {
    await this.reference.ensure()
    const fixtures = await this.client.request<SmFixture[]>(ep.livescoresInplay())
    return (fixtures ?? []).map((f) => mapFixtureToMatch(f, (id) => this.reference.statKey(id)))
  }

  async fetchTeams(): Promise<ProviderTeam[]> {
    const teams = await this.client.request<SmTeam[]>(ep.teamsBySeason())
    return (teams ?? []).map(mapTeam)
  }
}
