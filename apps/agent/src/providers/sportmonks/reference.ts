import type { SportmonksClient } from './client'
import { reference as refEndpoints } from './endpoints'
import type { SmType } from './types'

// Event type_ids confirmed in the BetV Sportmonks study (stable). Anything not here
// is ignored by the timeline mapper.
export const EVENT_TYPES: Record<number, { type: string; detail?: string }> = {
  14: { type: 'goal' },
  16: { type: 'goal', detail: 'penalty' },
  19: { type: 'goal', detail: 'own' },
  18: { type: 'substitution' },
  83: { type: 'card', detail: 'yellow' },
  84: { type: 'card', detail: 'red' },
  10: { type: 'var' },
  1697: { type: 'var' },
}

// state_id -> internal match status (study §6.3 table).
const STATE_STATUS: Record<number, string> = {
  1: 'scheduled', 13: 'scheduled', 16: 'scheduled', 26: 'scheduled',
  2: 'live', 4: 'live', 6: 'live', 9: 'live', 18: 'live', 21: 'live', 22: 'live', 25: 'live',
  3: 'halftime',
  5: 'finished', 7: 'finished', 8: 'finished', 17: 'finished',
  10: 'postponed', 12: 'cancelled',
}

export function statusFromStateId(stateId: number | undefined): string {
  return (stateId != null && STATE_STATUS[stateId]) || 'scheduled'
}

// Period label by state_id, for the live header.
export function periodFromStateId(stateId: number | undefined): string | undefined {
  if (stateId === 2) return '1st_half'
  if (stateId === 22) return '2nd_half'
  if (stateId === 3) return 'halftime'
  return undefined
}

// Statistic type_ids are not enumerated in the study, so resolve them by NAME from
// /types — robust if Sportmonks renumbers. Maps to the internal stat keys the UI shows.
const STAT_NAME_MATCHERS: { key: string; pattern: RegExp }[] = [
  { key: 'possession', pattern: /possession/i },
  { key: 'shotsOnTarget', pattern: /shots?\s*on\s*target|on\s*target/i },
  { key: 'shots', pattern: /shots?\s*(total)?$|total\s*shots/i },
  { key: 'corners', pattern: /corner/i },
  { key: 'fouls', pattern: /foul/i },
]

/** Loads + caches the /types name map, then resolves a statistic type_id to a stat key. */
export class SmReference {
  private typeNames = new Map<number, string>()
  private loaded = false
  constructor(private client: SportmonksClient) {}

  async ensure(): Promise<void> {
    if (this.loaded) return
    try {
      const types = await this.client.request<SmType[]>(refEndpoints.types())
      for (const t of types) if (t.name) this.typeNames.set(t.id, t.name)
    } catch {
      // Reference is best-effort; without it, stats simply won't be labelled.
    }
    this.loaded = true
  }

  statKey(typeId: number): string | null {
    const name = this.typeNames.get(typeId)
    if (!name) return null
    return STAT_NAME_MATCHERS.find((m) => m.pattern.test(name))?.key ?? null
  }
}
