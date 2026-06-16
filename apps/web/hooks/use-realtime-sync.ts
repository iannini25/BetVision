'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRealtime } from './use-realtime'

type RealtimeMessage = { type: string; op?: string; id?: number | string }

/**
 * Bridges the WebSocket stream to React Query: when the agent writes to the DB,
 * Postgres NOTIFY -> realtime server -> this hook invalidates the affected queries,
 * so active screens refetch and update with no manual refresh and no polling.
 * Mount once (in the app layout) to cover every screen.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient()

  const onMessage = useCallback(
    (msg: RealtimeMessage) => {
      switch (msg.type) {
        case 'matches_update':
          queryClient.invalidateQueries({ queryKey: ['matches'] })
          if (msg.id != null) queryClient.invalidateQueries({ queryKey: ['match', Number(msg.id)] })
          // A status change (e.g. live -> finished) must refresh the Radar so a finished
          // match's flag stops showing as live; getValueRadar also filters finished games.
          queryClient.invalidateQueries({ queryKey: ['value-radar'] })
          break
        case 'probabilities_update':
          // Only ['match-probs']: /api/matches carries no probability data, and ['matches']
          // is already refreshed by matches_update on every tick.
          queryClient.invalidateQueries({ queryKey: ['match-probs'] })
          break
        case 'value_flags_update':
          queryClient.invalidateQueries({ queryKey: ['value-radar'] })
          // odds-sync writes odds_snapshots in the same tick (snapshots don't notify),
          // so a value-flag NOTIFY is our cue to refresh the Match Center odds table too.
          queryClient.invalidateQueries({ queryKey: ['match-odds'] })
          break
        case 'news_items_update':
          queryClient.invalidateQueries({ queryKey: ['match-news'] })
          queryClient.invalidateQueries({ queryKey: ['agent-feed'] })
          break
      }
    },
    [queryClient]
  )

  return useRealtime({ onMessage })
}
