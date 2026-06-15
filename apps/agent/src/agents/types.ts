export type AgentInput<T = unknown> = {
  data: T
  matchId?: number
  context?: string
}

export type AgentOutput<T = unknown> = {
  result: T
  tokensUsed: number
  fromMock: boolean
}

export interface Agent<TInput, TOutput> {
  name: string
  run(input: AgentInput<TInput>): Promise<AgentOutput<TOutput>>
}

export function isMockMode(): boolean {
  return !process.env.AI_API_KEY
}
