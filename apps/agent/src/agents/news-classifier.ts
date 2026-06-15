import type { Agent, AgentInput, AgentOutput } from './types'
import { isMockMode } from './types'

type NewsInput = {
  title: string
  summary?: string
  source: string
}

type NewsOutput = {
  category: string
  relevance: number
  impact?: string
  matchTeam?: string
}

export class NewsClassifier implements Agent<NewsInput, NewsOutput> {
  name = 'news-classifier'

  async run(input: AgentInput<NewsInput>): Promise<AgentOutput<NewsOutput>> {
    if (isMockMode()) {
      return {
        result: classifyByKeywords(input.data),
        tokensUsed: 0,
        fromMock: true,
      }
    }

    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: process.env.AI_API_KEY })

    const prompt = `Classifique esta notícia esportiva da Copa do Mundo 2026.

Título: ${input.data.title}
${input.data.summary ? `Resumo: ${input.data.summary}` : ''}
Fonte: ${input.data.source}

Retorne JSON: { "category": "LESÃO|ESCALAÇÃO|SUSPENSÃO|TÁTICA|TREINO|MERCADO|OUTRO", "relevance": 1-5, "impact": "descrição curta do impacto nos mercados", "matchTeam": "sigla do time afetado ou null" }`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const parsed = JSON.parse(text) as NewsOutput
    const tokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

    return { result: parsed, tokensUsed: tokens, fromMock: false }
  }
}

function classifyByKeywords(input: NewsInput): NewsOutput {
  const text = `${input.title} ${input.summary || ''}`.toLowerCase()

  if (text.includes('lesão') || text.includes('lesion') || text.includes('machuc') || text.includes('sente'))
    return { category: 'LESÃO', relevance: 5, impact: 'possível desfalque' }
  if (text.includes('escalação') || text.includes('titular') || text.includes('confirma'))
    return { category: 'ESCALAÇÃO', relevance: 4, impact: 'definição de titulares' }
  if (text.includes('suspens') || text.includes('cumpre'))
    return { category: 'SUSPENSÃO', relevance: 4, impact: 'desfalque confirmado' }
  if (text.includes('tática') || text.includes('esquema') || text.includes('treino'))
    return { category: 'TÁTICA', relevance: 3, impact: 'ajuste tático' }

  return { category: 'OUTRO', relevance: 2 }
}
