import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// /api/mp e /api/cadastro são públicos no middleware: cada rota confere o ator (sessão completa OU
// cookie de checkout escopado) por conta própria — o fluxo cadastro-first ocorre antes de haver sessão.
const PUBLIC_PATHS = ['/login', '/cadastro', '/esqueci-senha', '/redefinir-senha', '/criar-senha', '/verificar-email', '/landing', '/checkout', '/api/auth', '/api/webhooks', '/api/cadastro', '/api/mp']
const secret = new TextEncoder().encode(process.env.AUTH_SESSION_SECRET || 'dev-secret-change-me-in-production')

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname === '/') {
    return NextResponse.next()
  }

  // API routes check session
  const token = request.cookies.get('betv-session')?.value
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Sessão expirada' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|images/|brand/|partner-logos/).*)'],
}
