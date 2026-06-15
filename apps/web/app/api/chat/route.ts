import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { chatMessageSchema } from '@betv/shared'
import { db, schema } from '@/lib/db'
import { replyToChat } from '@/services/chat.service'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = chatMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Mensagem invalida' }, { status: 400 })
    }

    const { message, matchId, sessionId } = parsed.data
    const chatSessionId = sessionId ?? (await createSession(session.userId, message))

    await db.insert(schema.chatMessages).values({ sessionId: chatSessionId, role: 'user', content: message })

    const reply = await replyToChat({ userId: session.userId, sessionId: chatSessionId, message, matchId })

    await db.insert(schema.chatMessages).values({ sessionId: chatSessionId, role: 'assistant', content: reply.response })

    return NextResponse.json({ sessionId: chatSessionId, response: reply.response, evaluation: reply.evaluation })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Erro no chat' }, { status: 500 })
  }
}

async function createSession(userId: string, message: string): Promise<string> {
  const [created] = await db
    .insert(schema.chatSessions)
    .values({ userId, title: message.slice(0, 100) })
    .returning()
  return created.id
}
