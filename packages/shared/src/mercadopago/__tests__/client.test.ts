import { describe, it, expect } from 'vitest'
import {
  RealMercadoPagoClient,
  MockMercadoPagoClient,
  MercadoPagoError,
  type MpPaymentRequest,
} from '../client'

function res(status: number, body: unknown): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as unknown as Response
}
const noSleep = async () => {}

const pixReq: MpPaymentRequest = {
  externalReference: 'uuid-1',
  amount: 15.05,
  method: 'pix',
  description: 'Passe da Copa',
  payer: { email: 'a@b.com' },
}

describe('RealMercadoPagoClient', () => {
  it('envia Bearer + X-Idempotency-Key (= externalReference) e normaliza PIX', async () => {
    let seenUrl = ''
    let seenInit: RequestInit = {}
    const client = new RealMercadoPagoClient({
      accessToken: 'secret',
      sleep: noSleep,
      fetchFn: (async (url: string, init: RequestInit) => {
        seenUrl = url
        seenInit = init
        return res(201, {
          id: 999,
          status: 'pending',
          external_reference: 'uuid-1',
          point_of_interaction: { transaction_data: { qr_code: 'QR', qr_code_base64: 'B64' } },
        })
      }) as unknown as typeof fetch,
    })

    const out = await client.createPayment(pixReq)

    expect(seenUrl).toBe('https://api.mercadopago.com/v1/payments')
    const headers = seenInit.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer secret')
    expect(headers['X-Idempotency-Key']).toBe('uuid-1')
    const body = JSON.parse(seenInit.body as string)
    expect(body.payment_method_id).toBe('pix')
    expect(body.external_reference).toBe('uuid-1')
    expect(out).toMatchObject({ id: '999', status: 'pending', pixQrCode: 'QR', pixQrCodeBase64: 'B64' })
  })

  it('wallet (saldo MP) não envia token/issuer de cartão', async () => {
    let body: Record<string, unknown> = {}
    const client = new RealMercadoPagoClient({
      accessToken: 't',
      sleep: noSleep,
      fetchFn: (async (_url: string, init: RequestInit) => {
        body = JSON.parse(init.body as string)
        return res(201, { id: 1, status: 'pending' })
      }) as unknown as typeof fetch,
    })
    await client.createPayment({ ...pixReq, method: 'wallet', paymentMethodId: 'account_money', token: 'should-not-send' })
    expect(body.payment_method_id).toBe('account_money')
    expect(body.token).toBeUndefined()
    expect(body.issuer_id).toBeUndefined()
  })

  it('re-tenta um 429 e então sucede', async () => {
    let calls = 0
    const client = new RealMercadoPagoClient({
      accessToken: 't',
      sleep: noSleep,
      random: () => 0.5,
      fetchFn: (async () => {
        calls++
        if (calls === 1) return res(429, { message: 'rate' })
        return res(201, { id: 1, status: 'approved' })
      }) as unknown as typeof fetch,
    })
    const out = await client.getPayment('1')
    expect(out.status).toBe('approved')
    expect(calls).toBe(2)
  })

  it('lança 4xx (≠429) imediatamente, sem retry', async () => {
    let calls = 0
    const client = new RealMercadoPagoClient({
      accessToken: 't',
      sleep: noSleep,
      fetchFn: (async () => {
        calls++
        return res(400, { message: 'bad request' })
      }) as unknown as typeof fetch,
    })
    await expect(client.getPayment('1')).rejects.toBeInstanceOf(MercadoPagoError)
    expect(calls).toBe(1)
  })

  it('re-tenta 5xx até o limite e então lança', async () => {
    let calls = 0
    const client = new RealMercadoPagoClient({
      accessToken: 't',
      sleep: noSleep,
      random: () => 0.5,
      maxRetries: 2,
      fetchFn: (async () => {
        calls++
        return res(500, { message: 'oops' })
      }) as unknown as typeof fetch,
    })
    await expect(client.getPayment('1')).rejects.toBeInstanceOf(MercadoPagoError)
    expect(calls).toBe(3) // 1 + 2 retries
  })
})

describe('MockMercadoPagoClient', () => {
  it('PIX devolve QR determinístico, status pending e id derivado do externalReference', async () => {
    const out = await new MockMercadoPagoClient().createPayment(pixReq)
    expect(out.id).toBe('mock-uuid-1')
    expect(out.status).toBe('pending')
    expect(out.pixQrCode).toBeTruthy()
    expect(out.externalReference).toBe('uuid-1')
  })

  it('cartão não traz QR de PIX', async () => {
    const out = await new MockMercadoPagoClient().createPayment({ ...pixReq, method: 'credit' })
    expect(out.pixQrCode).toBeUndefined()
  })

  it('preapproval mock: authorized + nextPaymentDate ~ trial; cancel → cancelled', async () => {
    const mock = new MockMercadoPagoClient()
    const pre = await mock.createPreapproval({
      externalReference: 'sub-1',
      cardToken: 'tok',
      payerEmail: 'a@b.com',
      amount: 14.9,
      frequencyDays: 30,
      trialDays: 2,
      reason: 'BetV',
    })
    expect(pre.id).toBe('mock-pre-sub-1')
    expect(pre.status).toBe('authorized')
    expect(pre.nextPaymentDate).toBeTruthy()
    expect((await mock.cancelPreapproval('mock-pre-sub-1')).status).toBe('cancelled')
  })
})

const preReq = {
  externalReference: 'sub-1',
  cardToken: 'card-tok',
  payerEmail: 'a@b.com',
  amount: 14.9,
  frequencyDays: 30,
  trialDays: 2,
  reason: 'BetV — Assinatura',
}

describe('RealMercadoPagoClient — preapproval', () => {
  it('createPreapproval envia free_trial nativo + status authorized + idempotency key', async () => {
    let seenUrl = ''
    let seenInit: RequestInit = {}
    const client = new RealMercadoPagoClient({
      accessToken: 'secret',
      sleep: noSleep,
      fetchFn: (async (url: string, init: RequestInit) => {
        seenUrl = url
        seenInit = init
        return res(201, { id: 'pre-9', status: 'authorized', next_payment_date: '2026-06-18T10:00:00Z' })
      }) as unknown as typeof fetch,
    })

    const out = await client.createPreapproval(preReq)

    expect(seenUrl).toBe('https://api.mercadopago.com/preapproval')
    expect((seenInit.headers as Record<string, string>)['X-Idempotency-Key']).toBe('sub-1')
    const body = JSON.parse(seenInit.body as string)
    expect(body.status).toBe('authorized')
    expect(body.card_token_id).toBe('card-tok')
    expect(body.auto_recurring.free_trial).toEqual({ frequency: 2, frequency_type: 'days' })
    expect(body.auto_recurring.frequency).toBe(30)
    expect(body.auto_recurring.transaction_amount).toBe(14.9)
    expect(out).toEqual({ id: 'pre-9', status: 'authorized', nextPaymentDate: '2026-06-18T10:00:00Z' })
  })

  it('cancelPreapproval usa PUT com status cancelled', async () => {
    let seenMethod = ''
    let seenBody = ''
    const client = new RealMercadoPagoClient({
      accessToken: 't',
      sleep: noSleep,
      fetchFn: (async (_url: string, init: RequestInit) => {
        seenMethod = init.method as string
        seenBody = init.body as string
        return res(200, { id: 'pre-9', status: 'cancelled' })
      }) as unknown as typeof fetch,
    })
    const out = await client.cancelPreapproval('pre-9')
    expect(seenMethod).toBe('PUT')
    expect(JSON.parse(seenBody).status).toBe('cancelled')
    expect(out.status).toBe('cancelled')
  })

  it('getAuthorizedPayment normaliza preapprovalId + paymentStatus', async () => {
    const client = new RealMercadoPagoClient({
      accessToken: 't',
      sleep: noSleep,
      fetchFn: (async () =>
        res(200, { id: 'ap-1', preapproval_id: 'pre-9', status: 'processed', payment: { status: 'approved' }, transaction_amount: 14.9 })) as unknown as typeof fetch,
    })
    const out = await client.getAuthorizedPayment('ap-1')
    expect(out).toMatchObject({ id: 'ap-1', preapprovalId: 'pre-9', status: 'processed', paymentStatus: 'approved', amount: 14.9 })
  })
})
