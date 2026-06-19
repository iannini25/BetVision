import { describe, it, expect } from 'vitest'
import { isWarningDue } from '../subscription-expiry'

const now = new Date('2026-06-16T12:00:00Z')
const D = (iso: string) => new Date(iso)

describe('isWarningDue', () => {
  it('vence em 5 dias e não avisado → avisa', () => {
    expect(isWarningDue({ status: 'active', expiraEm: D('2026-06-21T12:00:00Z'), expiryWarnedAt: null }, now, 5)).toBe(true)
  })
  it('vence em 6 dias → ainda não', () => {
    expect(isWarningDue({ status: 'active', expiraEm: D('2026-06-22T12:00:00Z'), expiryWarnedAt: null }, now, 5)).toBe(false)
  })
  it('já avisado neste ciclo → não reenvia', () => {
    expect(isWarningDue({ status: 'active', expiraEm: D('2026-06-21T12:00:00Z'), expiryWarnedAt: D('2026-06-16T09:00:00Z') }, now, 5)).toBe(false)
  })
  it('já expirado → não (não é aviso, é expiração)', () => {
    expect(isWarningDue({ status: 'active', expiraEm: D('2026-06-10T12:00:00Z'), expiryWarnedAt: null }, now, 5)).toBe(false)
  })
  it('assinatura não-ativa → não', () => {
    expect(isWarningDue({ status: 'expired', expiraEm: D('2026-06-18T12:00:00Z'), expiryWarnedAt: null }, now, 5)).toBe(false)
  })
})
