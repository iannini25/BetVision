import type { DataProvider } from './interface'
import { MockProvider } from './mock'

export function createDataProvider(): DataProvider {
  const provider = process.env.DATA_PROVIDER || 'mock'

  switch (provider) {
    case 'sportmonks':
      // Future: return new SportmonksProvider()
      console.log('[Provider] Sportmonks not yet implemented, falling back to mock')
      return new MockProvider()
    case 'api-football':
      // Future: return new ApiFootballProvider()
      console.log('[Provider] API-Football not yet implemented, falling back to mock')
      return new MockProvider()
    case 'mock':
    default:
      console.log('[Provider] Using mock data provider')
      return new MockProvider()
  }
}

export type { DataProvider, ProviderMatch, ProviderLineup, ProviderOdds, ProviderReferee } from './interface'
