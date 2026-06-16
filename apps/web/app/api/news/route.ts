import { NextResponse } from 'next/server'
import { getAgentFeed } from '@/services/matches.service'

export async function GET() {
  const news = await getAgentFeed()
  return NextResponse.json({ news })
}
