import { describe, it, expect } from 'vitest'
import { calcFee, netReceived, computeNewExpiry, canRenew, splitName, hasAccess } from '../payments'
import { SUBSCRIPTION_PRICE_BRL, SUBSCRIPTION_DAYS } from '../constants'

const BASE = SUBSCRIPTION_PRICE_BRL // 14.90

describe('calcFee (custo INTERNO do MP — absorvido, não repassado)', () => {
  it('PIX = 0,99%', () => expect(calcFee(BASE, 'pix')).toBe(0.15)) // 0.14751 → 0.15
  it('débito = 1,99%', () => expect(calcFee(BASE, 'debit')).toBe(0.3)) // 0.296 → 0.30
  it('crédito = 4,98% (custo maior que PIX)', () => {
    expect(calcFee(BASE, 'credit')).toBe(0.74) // 0.74202 → 0.74
    expect(calcFee(BASE, 'credit')).toBeGreaterThan(calcFee(BASE, 'pix'))
  })
  it('boleto = custo FIXO de R$ 3,49', () => expect(calcFee(BASE, 'boleto')).toBe(3.49))
  it('saldo MP usa o custo de crédito (conservador)', () => expect(calcFee(BASE, 'wallet')).toBe(calcFee(BASE, 'credit')))
})

describe('netReceived (o que a BetV recebe após o corte do MP)', () => {
  it('PIX deixa quase tudo', () => expect(netReceived(BASE, 'pix')).toBe(14.75)) // 14.90 - 0.15
  it('boleto custa o fixo', () => expect(netReceived(BASE, 'boleto')).toBe(11.41)) // 14.90 - 3.49
  it('cliente paga o MESMO em qualquer método (preço fixo)', () => {
    // o preço cobrado é SUBSCRIPTION_PRICE_BRL; só o custo interno (e o net) varia por método
    expect(SUBSCRIPTION_PRICE_BRL).toBe(14.9)
  })
})

describe('computeNewExpiry (extensão do passe)', () => {
  const now = new Date('2026-06-16T12:00:00Z')
  const days = SUBSCRIPTION_DAYS

  it('sem assinatura → conta a partir de agora', () => {
    const expiry = computeNewExpiry(null, now, days)
    expect(expiry.getTime()).toBe(now.getTime() + days * 86_400_000)
  })

  it('assinatura ativa no futuro → empilha a partir do vencimento', () => {
    const future = new Date('2026-07-01T12:00:00Z')
    const expiry = computeNewExpiry(future, now, days)
    expect(expiry.getTime()).toBe(future.getTime() + days * 86_400_000)
  })

  it('assinatura expirada → conta a partir de agora (não do passado)', () => {
    const past = new Date('2026-06-01T12:00:00Z')
    const expiry = computeNewExpiry(past, now, days)
    expect(expiry.getTime()).toBe(now.getTime() + days * 86_400_000)
  })
})

describe('canRenew (janela de renovação)', () => {
  const now = new Date('2026-06-16T12:00:00Z')
  it('sem passe ativo → pode', () => expect(canRenew(null, now, 2)).toBe(true))
  it('faltam 5 dias → NÃO pode', () => expect(canRenew(new Date('2026-06-21T12:00:00Z'), now, 2)).toBe(false))
  it('faltam 2 dias → pode', () => expect(canRenew(new Date('2026-06-18T12:00:00Z'), now, 2)).toBe(true))
  it('já expirado → pode', () => expect(canRenew(new Date('2026-06-10T12:00:00Z'), now, 2)).toBe(true))
})

describe('hasAccess (gate único estado→acesso)', () => {
  const now = new Date('2026-06-16T12:00:00Z')
  const future = new Date('2026-07-01T12:00:00Z')
  const past = new Date('2026-06-01T12:00:00Z')

  it('trial/active/cancelled com expiraEm no futuro → libera (cancelado mantém até vencer)', () => {
    expect(hasAccess('trial', future, now)).toBe(true)
    expect(hasAccess('active', future, now)).toBe(true)
    expect(hasAccess('cancelled', future, now)).toBe(true)
  })
  it('past_due e expired → BLOQUEIam mesmo com expiraEm futuro', () => {
    expect(hasAccess('past_due', future, now)).toBe(false)
    expect(hasAccess('expired', future, now)).toBe(false)
  })
  it('qualquer estado com expiraEm vencido → bloqueia', () => {
    expect(hasAccess('active', past, now)).toBe(false)
    expect(hasAccess('cancelled', past, now)).toBe(false)
  })
  it('sem expiraEm → bloqueia', () => expect(hasAccess('active', null, now)).toBe(false))
})

describe('splitName', () => {
  it('nome completo → primeiro + resto', () => {
    expect(splitName('Bernardo Iannini Silva')).toEqual({ firstName: 'Bernardo', lastName: 'Iannini Silva' })
  })
  it('nome único repete no sobrenome (MP exige last_name)', () => {
    expect(splitName('Madonna')).toEqual({ firstName: 'Madonna', lastName: 'Madonna' })
  })
  it('normaliza espaços extras', () => {
    expect(splitName('  João   Silva ')).toEqual({ firstName: 'João', lastName: 'Silva' })
  })
  it('vazio', () => expect(splitName('')).toEqual({ firstName: '', lastName: '' }))
})
