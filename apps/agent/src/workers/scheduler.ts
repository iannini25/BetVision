import { Queue, Worker as BullWorker, type ConnectionOptions } from 'bullmq'
import cron from 'node-cron'
import { logger } from '../lib/logger'
import { recordHeartbeat } from './heartbeat'
import { WORKERS } from './registry'

const QUEUE_NAME = 'betv-jobs'

// Pass options (not an instance) so BullMQ builds its own client and we avoid
// cross-version ioredis type clashes. maxRetriesPerRequest must be null for BullMQ.
function redisConnection(): ConnectionOptions {
  const url = new URL(process.env.REDIS_URL || 'redis://localhost:6379')
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  }
}

/**
 * Scheduling (node-cron) is separated from execution (one BullMQ worker that
 * dispatches by job name). cron enqueues on each cadence; the worker runs the
 * handler, then stamps a heartbeat. BullMQ gives retries, concurrency and history.
 */
export function startScheduler() {
  const handlers = new Map(WORKERS.map((w) => [w.name, w.handler]))
  const queue = new Queue(QUEUE_NAME, { connection: redisConnection() })

  const worker = new BullWorker(
    QUEUE_NAME,
    async (job) => {
      const handler = handlers.get(job.name)
      if (!handler) throw new Error(`No handler registered for "${job.name}"`)
      const meta = await handler()
      await recordHeartbeat(job.name, meta)
      return meta
    },
    { connection: redisConnection(), concurrency: 3 }
  )

  worker.on('completed', (job, result) => logger.debug({ worker: job.name, result }, 'job completed'))
  worker.on('failed', (job, err) => logger.error({ worker: job?.name, err: err.message }, 'job failed'))

  for (const def of WORKERS) {
    cron.schedule(def.cron, () => void enqueue(queue, def.name))
    void enqueue(queue, def.name) // run once at boot for immediate data + heartbeats
  }

  logger.info({ workers: WORKERS.map((w) => w.name) }, `Scheduler online: BullMQ "${QUEUE_NAME}" + node-cron`)
  return { queue, worker }
}

function enqueue(queue: Queue, name: string): Promise<unknown> {
  // jobId = worker name: a new tick is coalesced while the previous run is still
  // queued/active (no overlap, no backlog) — this also serializes the live-engine,
  // so two ticks can't double-advance the same match. removeOnComplete/Fail frees
  // the id for the next tick.
  return queue
    .add(name, {}, { jobId: name, removeOnComplete: true, removeOnFail: true })
    .catch((err) => logger.error({ name, err: err.message }, 'enqueue failed'))
}
