'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

type RealtimeMessage = {
  type: string
  op?: string
  id?: number | string
  timestamp: number
}

type UseRealtimeOptions = {
  matchIds?: number[]
  /** Assina a própria linha de pagamento (checkout): recebe payments_update só deste id. */
  paymentId?: string
  /** Token assinado que autoriza a assinatura da linha de pagamento (verificado no servidor). */
  paymentSubToken?: string
  onMessage?: (msg: RealtimeMessage) => void
}

export function useRealtime(options?: UseRealtimeOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${window.location.host}/ws`

    try {
      const ws = new WebSocket(host)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        if (options?.matchIds) {
          for (const id of options.matchIds) {
            ws.send(JSON.stringify({ type: 'subscribe', matchId: id }))
          }
        }
        if (options?.paymentId && options?.paymentSubToken) {
          ws.send(JSON.stringify({ type: 'subscribe', topic: 'payment', id: options.paymentId, token: options.paymentSubToken }))
        }
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as RealtimeMessage
          options?.onMessage?.(msg)
        } catch { /* ignore parse errors */ }
      }

      ws.onclose = () => {
        setConnected(false)
        reconnectTimeoutRef.current = setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      reconnectTimeoutRef.current = setTimeout(connect, 3000)
    }
  }, [options?.matchIds, options?.paymentId, options?.paymentSubToken, options?.onMessage])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { connected }
}
