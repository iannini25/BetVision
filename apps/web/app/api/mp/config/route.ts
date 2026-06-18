import { NextResponse } from 'next/server'
import { isMockMP } from '@betv/shared/mercadopago/client'

// Lê o env em CADA request: sem isto o Next congela a resposta no build (quando MP_ACCESS_TOKEN
// ainda estava vazio), e o checkout ficaria preso em mock mesmo com a chave real no runtime.
export const dynamic = 'force-dynamic'

// Config em runtime: o checkout decide mock × Brick real sem NEXT_PUBLIC no build (flip por env).
export async function GET() {
  const mock = isMockMP()
  return NextResponse.json({ mock, publicKey: mock ? null : process.env.MP_PUBLIC_KEY || null })
}
