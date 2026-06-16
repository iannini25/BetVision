import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'betv-session'
const secret = new TextEncoder().encode(
  process.env.AUTH_SESSION_SECRET || 'dev-secret-change-me-in-production'
)
// Mark the cookie Secure only when actually served over HTTPS (derived from APP_URL),
// not merely in production: during the HTTP-by-IP phase APP_URL is http://, so a Secure
// cookie would never be sent back. Flips to Secure automatically once APP_URL is https://.
const SECURE_COOKIE = (process.env.APP_URL ?? '').startsWith('https://')

type SessionPayload = {
  userId: string
  email: string
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: SECURE_COOKIE,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })

  return token
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
