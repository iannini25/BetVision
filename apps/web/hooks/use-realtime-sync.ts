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
          break
        case 'probabilities_update':
          queryClient.invalidateQueries({ queryKey: ['matches'] })
          queryClient.invalidateQueries({ queryKey: ['match-probs'] })
          break
        case 'value_flags_update':
          queryClient.invalidateQueries({ queryKey: ['value-radar'] })
          break
        case 'news_items_update':
          queryClient.invalidateQueries({ queryKey: ['match-news'] })
          break
      }
    },
    [queryClient]
  )

  return useRealtime({ onMessage })
}
