import { NextResponse } from 'next/server'
import { isMockMP } from '@betv/shared/mercadopago/client'

// Config em runtime: o checkout decide mock × Brick real sem NEXT_PUBLIC no build (flip por env).
export async function GET() {
  const mock = isMockMP()
  return NextResponse.json({ mock, publicKey: mock ? null : process.env.MP_PUBLIC_KEY || null })
}
