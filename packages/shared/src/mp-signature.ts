import 'server-only' // server-only: verificação de assinatura nunca vai pro bundle do browser
import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Validação da assinatura de webhook do Mercado Pago (server-only — usa node:crypto).
 * Não re-exportar de index.ts (quebraria o bundle do browser).
 */

export type MpSignatureParts = { dataId: string; requestId: string; ts: string; v1: string }

/** Decompõe o header `x-signature` ("ts=...,v1=...") em suas partes. Null se malformado. */
export function parseMpSignatureHeader(header: string | null | undefined): { ts: string; v1: string } | null {
  if (!header) return null
  let ts = ''
  let v1 = ''
  for (const part of header.split(',')) {
    const sep = part.indexOf('=') // split só no 1º '=' (valor pode conter '=', ex.: base64)
    if (sep === -1) continue
    const key = part.slice(0, sep).trim()
    const value = part.slice(sep + 1).trim()
    if (key === 'ts') ts = value
    else if (key === 'v1') v1 = value
  }
  return ts && v1 ? { ts, v1 } : null
}

/**
 * Confere a assinatura. Manifesto exigido pelo MP: `id:<dataId>;request-id:<requestId>;ts:<ts>;`
 * HMAC-SHA256 com o webhook secret, comparado em tempo constante.
 */
export function verifyMpSignature(secret: string, parts: MpSignatureParts): boolean {
  if (!secret || !parts.dataId || !parts.ts || !parts.v1) return false
  const manifest = `id:${parts.dataId};request-id:${parts.requestId};ts:${parts.ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')

  const expectedBuf = Buffer.from(expected, 'hex')
  const receivedBuf = Buffer.from(parts.v1, 'hex')
  if (expectedBuf.length !== receivedBuf.length) return false
  return timingSafeEqual(expectedBuf, receivedBuf)
}
