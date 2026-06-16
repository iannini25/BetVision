import { describe, it, expect } from 'vitest'
import { signPaymentSubToken, verifyPaymentSubToken } from '../payment-sub-token'

const SECRET = 'auth-secret'
const PID = 'pay-uuid-1'
const now = 1_700_000_000_000

describe('payment-sub-token', () => {
  it('aceita o token da própria linha', () => {
    const t = signPaymentSubToken(PID, SECRET, 60_000, now)
    expect(verifyPaymentSubToken(t, PID, SECRET, now + 1_000)).toBe(true)
  })
  it('rejeita token de OUTRA linha de pagamento', () => {
    const t = signPaymentSubToken(PID, SECRET, 60_000, now)
    expect(verifyPaymentSubToken(t, 'pay-uuid-2', SECRET, now + 1_000)).toBe(false)
  })
  it('rejeita secret errado', () => {
    const t = signPaymentSubToken(PID, SECRET, 60_000, now)
    expect(verifyPaymentSubToken(t, PID, 'outro', now + 1_000)).toBe(false)
  })
  it('rejeita token expirado', () => {
    const t = signPaymentSubToken(PID, SECRET, 60_000, now)
    expect(verifyPaymentSubToken(t, PID, SECRET, now + 60_001)).toBe(false)
  })
  it('rejeita lixo / vazio / sig não-hex', () => {
    expect(verifyPaymentSubToken('', PID, SECRET, now)).toBe(false)
    expect(verifyPaymentSubToken('semponto', PID, SECRET, now)).toBe(false)
    expect(verifyPaymentSubToken(`${now + 60_000}.deadbeef`, PID, SECRET, now)).toBe(false)
    expect(verifyPaymentSubToken(`${now + 60_000}.zzzznothex`, PID, SECRET, now)).toBe(false)
  })
})
