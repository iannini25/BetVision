import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifyMpSignature, parseMpSignatureHeader } from '../mp-signature'

const SECRET = 'whsec_test_betv'
const dataId = '123456789'
const requestId = 'req-abc-123'
const ts = '1718539200'

// v1 esperado, derivado do manifesto EXATO do MP (pina o formato do manifesto).
const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
const goodV1 = createHmac('sha256', SECRET).update(manifest).digest('hex')

describe('verifyMpSignature', () => {
  it('aceita assinatura correta', () => {
    expect(verifyMpSignature(SECRET, { dataId, requestId, ts, v1: goodV1 })).toBe(true)
  })
  it('rejeita v1 adulterado', () => {
    const tampered = goodV1.slice(0, -1) + (goodV1.endsWith('a') ? 'b' : 'a')
    expect(verifyMpSignature(SECRET, { dataId, requestId, ts, v1: tampered })).toBe(false)
  })
  it('rejeita secret errado', () => {
    expect(verifyMpSignature('outro_secret', { dataId, requestId, ts, v1: goodV1 })).toBe(false)
  })
  it('rejeita quando dataId/ts/v1 mudam (manifesto diferente)', () => {
    expect(verifyMpSignature(SECRET, { dataId: '999', requestId, ts, v1: goodV1 })).toBe(false)
    expect(verifyMpSignature(SECRET, { dataId, requestId, ts: '0', v1: goodV1 })).toBe(false)
  })
  it('rejeita partes vazias', () => {
    expect(verifyMpSignature('', { dataId, requestId, ts, v1: goodV1 })).toBe(false)
    expect(verifyMpSignature(SECRET, { dataId, requestId, ts, v1: '' })).toBe(false)
  })
})

describe('parseMpSignatureHeader', () => {
  it('extrai ts e v1', () => {
    expect(parseMpSignatureHeader(`ts=${ts}, v1=${goodV1}`)).toEqual({ ts, v1: goodV1 })
  })
  it('null para header ausente/malformado', () => {
    expect(parseMpSignatureHeader(null)).toBeNull()
    expect(parseMpSignatureHeader('lixo')).toBeNull()
    expect(parseMpSignatureHeader(`ts=${ts}`)).toBeNull()
  })
})
