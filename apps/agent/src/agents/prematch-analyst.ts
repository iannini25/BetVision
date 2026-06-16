import type { Agent, AgentInput, AgentOutput } from './types'
import { isMockMode } from './types'
import { generateJson } from '../lib/llm'

type PrematchInput = {
  homeTeam: string
  awayTeam: string
  homeElo: number
  awayElo: number
  referee?: string
  homeWinProb: number
  over25Prob: number
  bttsProb: number
  venue?: string
}

type PrematchOutput = {
  analysis: string
  keyFactors: string[]
}

const MOCK_ANALYSES: Record<string, PrematchOutput> = {
  default: {
    analysis: `Confronto equilibrado com leve vantagem para o mandante, considerando o Elo superior e a forma recente. O modelo indica probabilidade de jogo aberto com mais de 2.5 gols. O perfil do árbitro sugere jogo com cartões moderados. Fique atento à escalação confirmada para ajustes no modelo.

**Disclaimer:** Análise estatística informativa. Não constitui recomendação de aposta.`,
    keyFactors: [
      'Diferença de Elo favorece o mandante',
      'Histórico de jogos abertos entre as seleções',
      'Árbitro com perfil moderado a rígido',
    ],
  },
}

export class PrematchAnalyst implements Agent<PrematchInput, PrematchOutput> {
  name = 'prematch-analyst'

  async run(input: AgentInput<PrematchInput>): Promise<AgentOutput<PrematchOutput>> {
    if (isMockMode()) {
      const mockResult = MOCK_ANALYSES.default
      return { result: mockResult, tokensUsed: 0, fromMock: true }
    }

    const prompt = `Você é o analista pré-jogo do BetV, um copiloto de apostas esportivas focado na Copa do Mundo 2026.

Analise o confronto:
- ${input.data.homeTeam} (Elo ${input.data.homeElo}) vs ${input.data.awayTeam} (Elo ${input.data.awayElo})
- Local: ${input.data.venue || 'Não informado'}
- Árbitro: ${input.data.referee || 'Não confirmado'}
- Probabilidades do modelo: ${input.data.homeTeam} vence ${(input.data.homeWinProb * 100).toFixed(0)}%, Over 2.5 ${(input.data.over25Prob * 100).toFixed(0)}%, BTTS ${(input.data.bttsProb * 100).toFixed(0)}%

REGRAS:
- Cite SEMPRE os números do modelo (nunca invente probabilidades)
- NUNCA recomende apostar ou sugira que algo é "certo"
- Seja informativo, objetivo, em PT-BR
- Termine com disclaimer: "Análise estatística informativa. Não constitui recomendação de aposta."

Retorne em JSON: { "analysis": "texto", "keyFactors": ["fator1", "fator2", "fator3"] }`

    const { result: parsed, tokensUsed, provider } = await generateJson<PrematchOutput>({
      prompt,
      maxTokens: 800,
      anthropicModel: process.env.AI_MODEL_ANALYSIS || 'claude-opus-4-8',
      openaiModel: process.env.OPENAI_MODEL_ANALYSIS || 'gpt-4o',
      json: true,
    })

    return { result: parsed, tokensUsed, fromMock: false, provider }
  }
}
