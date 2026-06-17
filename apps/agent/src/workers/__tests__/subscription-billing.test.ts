import { describe, it, expect } from 'vitest'
import { isPreChargeDue } from '../subscription-billing'

const now = new Date('2026-06-17T09:00:00Z')
const DAY = 24 * 60 * 60 * 1000
const D = (iso: string) => new Date(iso)

describe('isPreChargeDue (aviso pré-cobrança do trial)', () => {
  it('trial cobra em ~12h (dentro da janela de 1 dia) e não avisado → avisa', () => {
    expect(isPreChargeDue({ status: 'trial', trialEndsAt: D('2026-06-17T21:00:00Z'), preChargeWarnedAt: null }, now, DAY)).toBe(true)
  })
  it('trial cobra só em ~2 dias (fora da janela) → ainda não', () => {
    expect(isPreChargeDue({ status: 'trial', trialEndsAt: D('2026-06-19T09:00:00Z'), preChargeWarnedAt: null }, now, DAY)).toBe(false)
  })
  it('JÁ avisado neste ciclo → NÃO reenvia (idempotência)', () => {
    expect(isPreChargeDue({ status: 'trial', trialEndsAt: D('2026-06-17T21:00:00Z'), preChargeWarnedAt: D('2026-06-17T08:00:00Z') }, now, DAY)).toBe(false)
  })
  it('trial já passou (cobrança no passado) → não', () => {
    expect(isPreChargeDue({ status: 'trial', trialEndsAt: D('2026-06-16T21:00:00Z'), preChargeWarnedAt: null }, now, DAY)).toBe(false)
  })
  it('não é trial (active) → não', () => {
    expect(isPreChargeDue({ status: 'active', trialEndsAt: D('2026-06-17T21:00:00Z'), preChargeWarnedAt: null }, now, DAY)).toBe(false)
  })
})
