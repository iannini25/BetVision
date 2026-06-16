import type { Agent, AgentInput, AgentOutput } from './types'
import { isMockMode } from './types'
import { calculateEdge, impliedProbability } from '../engine/value'

type BetEvalInput = {
  market: string
  outcome: string
  userOdds: number
  bookmaker?: string
  modelProb: number
  matchContext: string
}

type BetEvalOutput = {
  verdict: 'value' | 'fair' | 'overpriced' | 'no_data'
  edge: number
  impliedProb: number
  explanation: string
}

export class BetEvaluator implements Agent<BetEvalInput, BetEvalOutput> {
  name = 'bet-evaluator'

  async run(input: AgentInput<BetEvalInput>): Promise<AgentOutput<BetEvalOutput>> {
    const { modelProb, userOdds, market, outcome, matchContext, bookmaker } = input.data

    const edge = calculateEdge(modelProb, userOdds)
    const implied = impliedProbability(userOdds)

    let verdict: BetEvalOutput['verdict']
    if (edge >= 0.05) verdict = 'value'
    else if (edge >= -0.02) verdict = 'fair'
    else verdict = 'overpriced'

    if (isMockMode()) {
      const explanation = buildMockExplanation(verdict, edge, modelProb, implied, market, outcome, bookmaker)
      return {
        result: { verdict, edge, impliedProb: implied, explanation },
        tokensUsed: 0,
        fromMock: true,
      }
    }

    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: process.env.AI_API_KEY })

    const prompt = `Você é o Avaliador de Bet do BetV. O usuário colou uma odd e quer saber se há valor.

Dados:
- Mercado: ${market}
- Desfecho: ${outcome}
- Odd do usuário: ${userOdds} (${bookmaker || 'casa não informada'})
- Probabilidade do modelo: ${(modelProb * 100).toFixed(1)}%
- Probabilidade implícita na odd: ${(implied * 100).toFixed(1)}%
- Edge calculado: ${(edge * 100).toFixed(1)}%
- Veredito: ${verdict}
- Contexto do jogo: ${matchContext}

REGRAS:
- Use os números EXATOS acima (nunca invente)
- Explique de forma simples o que é edge e o que o veredito significa
- NUNCA diga "aposte" ou "vale a pena apostar"
- Diga apenas se o modelo enxerga VALOR (divergência positiva) ou não
- Termine com: "Informação estatística, não recomendação de aposta."

Responda em PT-BR, máximo 3 parágrafos.`

    const response = await client.messages.create({
      model: process.env.AI_MODEL_CHAT || 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const explanation = response.content[0].type === 'text' ? response.content[0].text : ''
    const tokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

    return {
      result: { verdict, edge, impliedProb: implied, explanation },
      tokensUsed: tokens,
      fromMock: false,
    }
  }
}

function buildMockExplanation(
  verdict: string, edge: number, modelProb: number,
  implied: number, market: string, outcome: string, bookmaker?: string
): string {
  const edgePct = (edge * 100).toFixed(1)
  const modelPct = (modelProb * 100).toFixed(1)
  const impliedPct = (implied * 100).toFixed(1)

  if (verdict === 'value') {
    return `O modelo calcula ${modelPct}% de probabilidade para "${outcome}" no mercado ${market}. A odd ${bookmaker ? `da ${bookmaker}` : ''} implica apenas ${impliedPct}%. Isso gera uma divergência positiva (edge) de +${edgePct}%, o que indica **valor** — o modelo enxerga esse desfecho como mais provável do que as casas precificam.

Informação estatística, não recomendação de aposta.`
  }

  if (verdict === 'fair') {
    return `O modelo calcula ${modelPct}% de probabilidade para "${outcome}". A odd implica ${impliedPct}%, resultando em edge de ${edgePct}%. A precificação está justa — o modelo e as casas concordam aproximadamente.

Informação estatística, não recomendação de aposta.`
  }

  return `O modelo calcula ${modelPct}% de probabilidade para "${outcome}", mas a odd implica ${impliedPct}%. O edge é ${edgePct}% (negativo) — as casas estão precificando esse desfecho como mais provável do que o modelo sugere. Sem valor identificado.

Informação estatística, não recomendação de aposta.`
}
