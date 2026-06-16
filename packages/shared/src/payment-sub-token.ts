import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Token de assinatura da linha de pagamento no WebSocket: o cliente só consegue assinar a PRÓPRIA
 * linha (o backend emite o token para o pagamento que ele criou; o realtime verifica).
 *
 * Puro node:crypto, SEM `server-only` — é importado tanto pelo web (emite) quanto pelo realtime
 * (verifica, processo node puro). Formato compacto: `<expMs>.<hmacHex(paymentId.expMs)>`.
 */

export function signPaymentSubToken(paymentId: string, secret: string, ttlMs: number, nowMs: number = Date.now()): string {
  const exp = nowMs + ttlMs
  const sig = createHmac('sha256', secret).update(`${paymentId}.${exp}`).digest('hex')
  return `${exp}.${sig}`
}

export function verifyPaymentSubToken(
  token: string,
  paymentId: string,
  secret: string,
  nowMs: number = Date.now()
): boolean {
  if (!token || !secret || !paymentId) return false
  const dot = token.indexOf('.')
  if (dot === -1) return false

  const exp = Number(token.slice(0, dot))
  const sig = token.slice(dot + 1)
  if (!Number.isFinite(exp) || exp < nowMs) return false

  const expected = createHmac('sha256', secret).update(`${paymentId}.${exp}`).digest('hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  const receivedBuf = Buffer.from(sig, 'hex')
  if (expectedBuf.length !== receivedBuf.length) return false
  return timingSafeEqual(expectedBuf, receivedBuf)
}
