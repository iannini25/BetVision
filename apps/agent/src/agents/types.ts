export type AgentInput<T = unknown> = {
  data: T
  matchId?: number
  context?: string
}

export type AgentOutput<T = unknown> = {
  result: T
  tokensUsed: number
  fromMock: boolean
  /** Which LLM produced this (when not from mock) — for observability/logs. */
  provider?: 'anthropic' | 'openai'
}

export interface Agent<TInput, TOutput> {
  name: string
  run(input: AgentInput<TInput>): Promise<AgentOutput<TOutput>>
}

export function isMockMode(): boolean {
  // Real AI runs if EITHER provider is configured (Anthropic primary, OpenAI fallback).
  return !process.env.AI_API_KEY && !process.env.OPENAI_API_KEY
}
