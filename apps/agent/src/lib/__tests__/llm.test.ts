import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { generateText, generateJson, type GenerateOptions } from '../llm'

const OPTS: GenerateOptions = {
  prompt: 'oi',
  maxTokens: 100,
  anthropicModel: 'claude-x',
  openaiModel: 'gpt-x',
}
const silentLog = { warn: () => {} }
const ok = (text: string, tokensUsed = 7) => async () => ({ text, tokensUsed })
const boom = (msg = 'down', status?: number) => async () => {
  const err = new Error(msg) as Error & { status?: number }
  if (status != null) err.status = status
  throw err
}

describe('generateText (Anthropic primário, OpenAI fallback)', () => {
  const saved = { ai: process.env.AI_API_KEY, oa: process.env.OPENAI_API_KEY }
  beforeEach(() => {
    delete process.env.AI_API_KEY
    delete process.env.OPENAI_API_KEY
  })
  afterEach(() => {
    if (saved.ai === undefined) delete process.env.AI_API_KEY
    else process.env.AI_API_KEY = saved.ai
    if (saved.oa === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = saved.oa
  })

  it('usa Anthropic quando ele responde (sem tocar no OpenAI)', async () => {
    process.env.AI_API_KEY = 'a'
    process.env.OPENAI_API_KEY = 'o'
    let openaiCalls = 0
    const r = await generateText(OPTS, {
      callAnthropic: ok('resposta anthropic', 42),
      callOpenAI: async () => { openaiCalls++; return { text: 'x', tokensUsed: 0 } },
      log: silentLog,
    })
    expect(r).toEqual({ text: 'resposta anthropic', tokensUsed: 42, provider: 'anthropic' })
    expect(openaiCalls).toBe(0)
  })

  it('faz failover para o OpenAI quando o Anthropic lança erro', async () => {
    process.env.AI_API_KEY = 'a'
    process.env.OPENAI_API_KEY = 'o'
    const r = await generateText(OPTS, {
      callAnthropic: boom('anthropic 500', 500),
      callOpenAI: ok('resposta openai', 13),
      log: silentLog,
    })
    expect(r).toEqual({ text: 'resposta openai', tokensUsed: 13, provider: 'openai' })
  })

  it('trata resposta vazia/recusa do Anthropic como falha e faz failover', async () => {
    process.env.AI_API_KEY = 'a'
    process.env.OPENAI_API_KEY = 'o'
    const r = await generateText(OPTS, {
      callAnthropic: ok('   '), // só espaço = vazio
      callOpenAI: ok('veio do openai', 5),
      log: silentLog,
    })
    expect(r.provider).toBe('openai')
    expect(r.text).toBe('veio do openai')
  })

  it('propaga o erro do Anthropic quando não há OpenAI configurado', async () => {
    process.env.AI_API_KEY = 'a'
    let openaiCalls = 0
    await expect(
      generateText(OPTS, {
        callAnthropic: boom('anthropic caiu'),
        callOpenAI: async () => { openaiCalls++; return { text: 'x', tokensUsed: 0 } },
        log: silentLog,
      })
    ).rejects.toThrow('anthropic caiu')
    expect(openaiCalls).toBe(0)
  })

  it('usa o OpenAI direto quando só ele está configurado', async () => {
    process.env.OPENAI_API_KEY = 'o'
    let anthropicCalls = 0
    const r = await generateText(OPTS, {
      callAnthropic: async () => { anthropicCalls++; return { text: 'x', tokensUsed: 0 } },
      callOpenAI: ok('openai sozinho', 9),
      log: silentLog,
    })
    expect(r).toEqual({ text: 'openai sozinho', tokensUsed: 9, provider: 'openai' })
    expect(anthropicCalls).toBe(0)
  })

  it('lança quando ambos os provedores falham', async () => {
    process.env.AI_API_KEY = 'a'
    process.env.OPENAI_API_KEY = 'o'
    await expect(
      generateText(OPTS, {
        callAnthropic: boom('anthropic caiu'),
        callOpenAI: boom('openai caiu'),
        log: silentLog,
      })
    ).rejects.toThrow('openai caiu')
  })

  it('lança quando nenhum provedor está configurado', async () => {
    await expect(
      generateText(OPTS, { callAnthropic: ok('x'), callOpenAI: ok('y'), log: silentLog })
    ).rejects.toThrow(/Nenhum provedor/)
  })

  it('re-tenta o Anthropic uma vez em erro transitório (429) e então sucede', async () => {
    process.env.AI_API_KEY = 'a'
    let calls = 0
    const r = await generateText(OPTS, {
      callAnthropic: async () => {
        calls++
        if (calls === 1) {
          const err = new Error('rate limited') as Error & { status?: number }
          err.status = 429
          throw err
        }
        return { text: 'sucesso na 2a', tokensUsed: 3 }
      },
      log: silentLog,
    })
    expect(calls).toBe(2)
    expect(r).toEqual({ text: 'sucesso na 2a', tokensUsed: 3, provider: 'anthropic' })
  })

  it('NÃO re-tenta em erro não-transitório cuja mensagem contém dígitos (ex.: placar)', async () => {
    process.env.AI_API_KEY = 'a' // sem OpenAI: erro propaga, e contamos as chamadas
    let calls = 0
    await expect(
      generateText(OPTS, {
        callAnthropic: async () => { calls++; throw new Error('modelo recusou: "Brasil 5 a 0 aos 533 min"') },
        log: silentLog,
      })
    ).rejects.toThrow(/recusou/)
    expect(calls).toBe(1) // dígitos no texto não podem ser lidos como 5xx/429
  })

  it('re-tenta em erro transitório por status 503', async () => {
    process.env.AI_API_KEY = 'a'
    let calls = 0
    const r = await generateText(OPTS, {
      callAnthropic: async () => {
        calls++
        if (calls === 1) {
          const err = new Error('service unavailable') as Error & { status?: number }
          err.status = 503
          throw err
        }
        return { text: 'ok', tokensUsed: 1 }
      },
      log: silentLog,
    })
    expect(calls).toBe(2)
    expect(r.provider).toBe('anthropic')
  })

  it('lança quando o OpenAI (fallback) responde vazio', async () => {
    process.env.AI_API_KEY = 'a'
    process.env.OPENAI_API_KEY = 'o'
    await expect(
      generateText(OPTS, {
        callAnthropic: boom('anthropic indisponível'), // não-transitório → sem delay de retry
        callOpenAI: ok('   '),
        log: silentLog,
      })
    ).rejects.toThrow(/vazia.*openai/)
  })
})

describe('generateJson', () => {
  const savedAi = process.env.AI_API_KEY
  beforeEach(() => { process.env.AI_API_KEY = 'a'; delete process.env.OPENAI_API_KEY })
  afterEach(() => {
    if (savedAi === undefined) delete process.env.AI_API_KEY
    else process.env.AI_API_KEY = savedAi
  })

  it('parseia JSON válido e carrega tokens/provider', async () => {
    const r = await generateJson<{ category: string; relevance: number }>(OPTS, {
      callAnthropic: ok('{"category":"LESÃO","relevance":5}', 11),
      log: silentLog,
    })
    expect(r).toEqual({ result: { category: 'LESÃO', relevance: 5 }, tokensUsed: 11, provider: 'anthropic' })
  })

  it('tolera JSON embrulhado em code fence ```json', async () => {
    const r = await generateJson<{ a: number }>(OPTS, {
      callAnthropic: ok('```json\n{"a":1}\n```'),
      log: silentLog,
    })
    expect(r.result).toEqual({ a: 1 })
  })

  it('extrai o objeto quando vem cercado de prosa', async () => {
    const r = await generateJson<{ ok: boolean }>(OPTS, {
      callAnthropic: ok('Claro! Aqui está: {"ok":true} — espero ajudar.'),
      log: silentLog,
    })
    expect(r.result).toEqual({ ok: true })
  })

  it('lança erro de domínio (não SyntaxError nu) quando não há JSON', async () => {
    await expect(
      generateJson(OPTS, { callAnthropic: ok('desculpe, não posso responder isso'), log: silentLog })
    ).rejects.toThrow(/não é JSON válido/)
  })
})
