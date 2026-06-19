import { logger } from './logger'

/**
 * Shared LLM wrapper: Anthropic primary, OpenAI as a resilience fallback.
 *
 *  - Anthropic is tried first (when AI_API_KEY is set), with a short timeout and one
 *    retry on transient errors (429/5xx/network).
 *  - On Anthropic failure — an error after retry, OR a refusal / empty response — and
 *    with OPENAI_API_KEY present, it fails over to OpenAI.
 *  - If only OPENAI_API_KEY is set, OpenAI is used directly.
 *  - If no fallback is configured, the Anthropic error propagates (same as before).
 *  - If both fail, it throws — the caller's worker retries; it does NOT silently mock.
 *
 * `generateText` returns raw text; `generateJson` adds tolerant JSON parsing (strips
 * code fences / surrounding prose) and turns malformed output into a clear domain error
 * instead of a bare SyntaxError. SDKs are imported lazily so mock mode (no keys →
 * neither function is called) loads neither. Provider calls are injectable for unit tests.
 */

export type LlmProvider = 'anthropic' | 'openai'
export type LlmResult = { text: string; tokensUsed: number; provider: LlmProvider }
export type LlmJsonResult<T> = { result: T; tokensUsed: number; provider: LlmProvider }

export type GenerateOptions = {
  prompt: string
  maxTokens: number
  anthropicModel: string
  openaiModel: string
  system?: string
  /** Ask OpenAI for a JSON object response (Anthropic relies on the prompt). */
  json?: boolean
}

type RawResult = { text: string; tokensUsed: number }
type ProviderCall = (opts: GenerateOptions) => Promise<RawResult>
type Log = { warn: (o: unknown, m?: string) => void }
export type GenerateDeps = { callAnthropic?: ProviderCall; callOpenAI?: ProviderCall; log?: Log }

const TIMEOUT_MS = 20_000
const MAX_RETRIES = 1
const BACKOFF_BASE_MS = 400
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function isTransient(err: unknown): boolean {
  const status =
    (err as { status?: number })?.status ?? (err as { response?: { status?: number } })?.response?.status
  if (status === 429 || (status != null && status >= 500 && status < 600)) return true
  // No status (raw network/timeout error): match only unambiguous network tokens — never
  // bare digits, which could appear in a model's message about football scores/ids (false retry).
  return /timeout|etimedout|econnreset|econnrefused|enotfound|eai_again|fetch failed|socket hang up|network|overloaded/i.test(
    String((err as { message?: string })?.message ?? err)
  )
}

async function withRetry(fn: ProviderCall, opts: GenerateOptions): Promise<RawResult> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn(opts)
    } catch (err) {
      if (attempt < MAX_RETRIES && isTransient(err)) {
        await sleep(BACKOFF_BASE_MS * (attempt + 1))
        continue
      }
      throw err
    }
  }
}

/** Run one provider: retry on transient errors, reject an empty/refused response, tag the provider. */
async function runProvider(call: ProviderCall, provider: LlmProvider, opts: GenerateOptions): Promise<LlmResult> {
  const r = await withRetry(call, opts)
  if (!r.text.trim()) throw new Error(`resposta vazia/recusa do provedor ${provider}`)
  return { ...r, provider }
}

export async function generateText(opts: GenerateOptions, deps: GenerateDeps = {}): Promise<LlmResult> {
  const log = deps.log ?? logger
  const callAnthropic = deps.callAnthropic ?? realAnthropic
  const callOpenAI = deps.callOpenAI ?? realOpenAI
  const hasAnthropic = !!process.env.AI_API_KEY
  const hasOpenAI = !!process.env.OPENAI_API_KEY

  if (hasAnthropic) {
    try {
      return await runProvider(callAnthropic, 'anthropic', opts)
    } catch (err) {
      if (!hasOpenAI) throw err // sem fallback configurado → propaga (comportamento atual)
      log.warn({ err: String(err) }, 'Anthropic falhou; tentando fallback OpenAI')
    }
  }

  if (hasOpenAI) return runProvider(callOpenAI, 'openai', opts)

  throw new Error('Nenhum provedor de IA configurado (AI_API_KEY/OPENAI_API_KEY)')
}

/** Like generateText, but parses the response as JSON (tolerant of code fences / surrounding prose). */
export async function generateJson<T>(opts: GenerateOptions, deps: GenerateDeps = {}): Promise<LlmJsonResult<T>> {
  const { text, tokensUsed, provider } = await generateText(opts, deps)
  return { result: parseJson<T>(text), tokensUsed, provider }
}

function parseJson<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/) // last resort: first {...} block embedded in prose
    if (match) {
      try {
        return JSON.parse(match[0]) as T
      } catch {
        /* fall through to the domain error */
      }
    }
    throw new Error(`Resposta do LLM não é JSON válido: ${raw.slice(0, 200)}`)
  }
}

async function realAnthropic(opts: GenerateOptions): Promise<RawResult> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: process.env.AI_API_KEY })
  const res = await client.messages.create(
    {
      model: opts.anthropicModel,
      max_tokens: opts.maxTokens,
      ...(opts.system ? { system: opts.system } : {}),
      messages: [{ role: 'user', content: opts.prompt }],
    },
    { timeout: TIMEOUT_MS }
  )
  if ((res as { stop_reason?: string }).stop_reason === 'refusal') throw new Error('Anthropic recusou a requisição')
  const block = res.content[0]
  const text = block && block.type === 'text' ? block.text : ''
  const tokensUsed = (res.usage?.input_tokens ?? 0) + (res.usage?.output_tokens ?? 0)
  return { text, tokensUsed }
}

async function realOpenAI(opts: GenerateOptions): Promise<RawResult> {
  const { default: OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const messages: { role: 'system' | 'user'; content: string }[] = []
  if (opts.system) messages.push({ role: 'system', content: opts.system })
  messages.push({ role: 'user', content: opts.prompt })
  const res = await client.chat.completions.create(
    {
      model: opts.openaiModel,
      max_tokens: opts.maxTokens,
      messages,
      ...(opts.json ? { response_format: { type: 'json_object' as const } } : {}),
    },
    { timeout: TIMEOUT_MS }
  )
  const text = res.choices[0]?.message?.content ?? ''
  const tokensUsed = res.usage?.total_tokens ?? 0
  return { text, tokensUsed }
}
