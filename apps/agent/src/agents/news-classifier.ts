import type { Agent, AgentInput, AgentOutput } from './types'
import { isMockMode } from './types'
import { generateJson } from '../lib/llm'

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

    const prompt = `Classifique esta notícia esportiva da Copa do Mundo 2026.

Título: ${input.data.title}
${input.data.summary ? `Resumo: ${input.data.summary}` : ''}
Fonte: ${input.data.source}

Retorne JSON: { "category": "LESÃO|ESCALAÇÃO|SUSPENSÃO|TÁTICA|TREINO|MERCADO|OUTRO", "relevance": 1-5, "impact": "descrição curta do impacto nos mercados", "matchTeam": "sigla do time afetado ou null" }`

    const { result: parsed, tokensUsed, provider } = await generateJson<NewsOutput>({
      prompt,
      maxTokens: 200,
      anthropicModel: 'claude-haiku-4-5-20251001',
      openaiModel: process.env.OPENAI_MODEL_CHAT || 'gpt-4o-mini',
      json: true,
    })

    return { result: parsed, tokensUsed, fromMock: false, provider }
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
