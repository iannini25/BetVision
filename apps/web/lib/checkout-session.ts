import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { signPaymentSubToken } from '@betv/shared/payment-sub-token'
import { getSession } from './auth'

// Cookie curto e ESCOPADO para o fluxo cadastro-first: permite criar/consultar o pagamento ANTES
// de existir senha/sessão, sem dar acesso ao app. Nunca é tratado como sessão completa pelo middleware.
const CHECKOUT_COOKIE = 'betv-checkout'
const RAW_SECRET = process.env.AUTH_SESSION_SECRET || 'dev-secret-change-me-in-production'
const secret = new TextEncoder().encode(RAW_SECRET)
const SECURE_COOKIE = (process.env.APP_URL ?? '').startsWith('https://')
const SUB_TOKEN_TTL_MS = 60 * 60 * 1000

/**
 * Token que autoriza o cliente a assinar a própria linha de pagamento no WebSocket.
 * `issuedAtMs` ancora a expiração na CRIAÇÃO do pagamento (não em cada poll), senão o polling
 * do status renovaria o TTL para sempre.
 */
export function mintPaymentSubToken(paymentId: string, issuedAtMs: number = Date.now()): string {
  return signPaymentSubToken(paymentId, RAW_SECRET, SUB_TOKEN_TTL_MS, issuedAtMs)
}

type CheckoutPayload = { userId: string; scope: 'checkout' }

export async function createCheckoutSession(userId: string): Promise<void> {
  const token = await new SignJWT({ userId, scope: 'checkout' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret)

  const cookieStore = await cookies()
  cookieStore.set(CHECKOUT_COOKIE, token, {
    httpOnly: true,
    secure: SECURE_COOKIE,
    sameSite: 'lax',
    maxAge: 60 * 60,
    path: '/',
  })
}

async function getCheckoutActor(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(CHECKOUT_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    const p = payload as unknown as CheckoutPayload
    return p.scope === 'checkout' && p.userId ? p.userId : null
  } catch {
    return null
  }
}

/** Ator autorizado a operar um pagamento: sessão completa (renovação) OU cookie de checkout (cadastro-first). */
export async function getPaymentActor(): Promise<{ userId: string } | null> {
  const session = await getSession()
  if (session) return { userId: session.userId }
  const checkoutUserId = await getCheckoutActor()
  return checkoutUserId ? { userId: checkoutUserId } : null
}
