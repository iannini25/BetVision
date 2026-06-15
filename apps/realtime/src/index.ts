import { WebSocketServer, WebSocket } from 'ws'
import pg from 'pg'
import pino from 'pino'

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' })
const PORT = parseInt(process.env.PORT || '4000', 10)
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://betv:betv_secret@localhost:5432/betv'
const RECONNECT_DELAY_MS = 2000

const clients = new Set<WebSocket>()

async function start() {
  await connectListener()

  const wss = new WebSocketServer({ port: PORT })
  logger.info(`WebSocket server running on port ${PORT}`)

  wss.on('connection', (ws) => {
    clients.add(ws)
    logger.debug(`Client connected (total: ${clients.size})`)

    ws.on('message', (raw) => handleMessage(ws, raw.toString()))
    ws.on('close', () => {
      clients.delete(ws)
      logger.debug(`Client disconnected (total: ${clients.size})`)
    })
    ws.on('error', (err) => {
      logger.error({ err }, 'WebSocket error')
      clients.delete(ws)
    })

    ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }))
  })

  const shutdown = async () => {
    logger.info('Shutting down...')
    for (const ws of clients) ws.close()
    wss.close()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

/**
 * Hold a Postgres LISTEN connection, re-broadcasting every NOTIFY to clients.
 * A dropped connection (PG restart, network blip, failover) would otherwise either
 * crash the process (unhandled 'error') or silently freeze every live screen — so we
 * always attach an error handler and reconnect-with-re-LISTEN.
 */
async function connectListener(): Promise<void> {
  const client = new pg.Client({ connectionString: DATABASE_URL })

  const reconnect = (reason: string) => {
    logger.warn({ reason }, 'PG listener lost; reconnecting...')
    client.removeAllListeners()
    client.end().catch(() => {})
    setTimeout(() => void connectListener().catch((e) => logger.error({ e }, 'reconnect failed')), RECONNECT_DELAY_MS)
  }

  client.on('error', (err) => reconnect(err.message))
  client.on('end', () => reconnect('connection ended'))
  client.on('notification', (msg) => {
    if (!msg.payload) return
    try {
      broadcast(JSON.parse(msg.payload))
    } catch {
      logger.warn('Invalid notification payload')
    }
  })

  try {
    await client.connect()
    await client.query('LISTEN betv_updates')
    logger.info('Listening on pg channel: betv_updates')
  } catch (err) {
    reconnect(err instanceof Error ? err.message : 'connect failed')
  }
}

function handleMessage(ws: WebSocket, raw: string): void {
  let msg: { type?: string }
  try {
    msg = JSON.parse(raw)
  } catch {
    ws.send(JSON.stringify({ error: 'Invalid message format' }))
    return
  }
  // Fan-out is server-wide today, so subscribe/unsubscribe need no per-client state;
  // we only answer keepalive pings.
  if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
}

function broadcast(data: { table: string; op: string; id: number | string }): void {
  const message = JSON.stringify({
    type: `${data.table}_update`,
    op: data.op,
    id: data.id,
    timestamp: Date.now(),
  })
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(message)
  }
}

start().catch((err) => {
  logger.fatal({ err }, 'Failed to start realtime server')
  process.exit(1)
})
