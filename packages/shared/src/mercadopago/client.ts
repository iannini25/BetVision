import type { PaymentMethod } from '../payments'

/**
 * Adapter do Mercado Pago (server-only — usa fetch + Access Token; não re-exportar de index.ts).
 * A API do MP fica atrás das NOSSAS formas (encapsular limites): o resto do app nunca vê o
 * corpo cru do MP. Resiliência espelha apps/agent/src/providers/sportmonks/client.ts.
 *
 * Gating de mock: sem MP_ACCESS_TOKEN, `getMercadoPagoClient()` devolve o cliente mock, que
 * produz respostas determinísticas (PIX QR fake, status pending) — o app inteiro roda sem chave.
 */

export type MpPayer = {
  email: string
  firstName?: string
  lastName?: string
  identification?: { type: string; number: string }
}

export type MpPaymentRequest = {
  /** UUID da nossa linha local: vira `external_reference` E `X-Idempotency-Key` (dedupe ponta a ponta). */
  externalReference: string
  amount: number
  method: PaymentMethod
  description: string
  payer: MpPayer
  token?: string
  installments?: number
  paymentMethodId?: string
  issuerId?: string
  customerId?: string
}

export type MpPaymentResponse = {
  id: string
  status: string
  statusDetail?: string
  externalReference?: string
  pixQrCode?: string
  pixQrCodeBase64?: string
  boletoUrl?: string
  approvedAt?: string | null
}

export type MpCustomerInput = {
  email: string
  firstName?: string
  lastName?: string
  identification?: { type: string; number: string }
}

export type MpSavedCard = { id: string; lastFour: string; brand: string }

export interface MercadoPagoClient {
  createPayment(req: MpPaymentRequest): Promise<MpPaymentResponse>
  getPayment(id: string): Promise<MpPaymentResponse>
  createCustomer(input: MpCustomerInput): Promise<{ id: string }>
  saveCard(customerId: string, cardToken: string): Promise<MpSavedCard>
}

// ---------------------------------------------------------------------------
// Cliente real
// ---------------------------------------------------------------------------

const API = 'https://api.mercadopago.com'
const DEFAULTS = { timeoutMs: 15_000, maxRetries: 3, backoffBaseMs: 500, backoffCapMs: 8_000 }

export class MercadoPagoError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'MercadoPagoError'
  }
}

export type MpClientDeps = {
  accessToken: string
  fetchFn?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  random?: () => number
  timeoutMs?: number
  maxRetries?: number
}

const PIX_METHOD_ID = 'pix'
const BOLETO_METHOD_ID = 'bolbradesco'

export class RealMercadoPagoClient implements MercadoPagoClient {
  private accessToken: string
  private fetchFn: typeof fetch
  private sleep: (ms: number) => Promise<void>
  private random: () => number
  private timeoutMs: number
  private maxRetries: number

  constructor(deps: MpClientDeps) {
    if (!deps.accessToken) throw new MercadoPagoError('MP_ACCESS_TOKEN ausente')
    this.accessToken = deps.accessToken
    this.fetchFn = deps.fetchFn ?? fetch
    this.sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
    this.random = deps.random ?? Math.random
    this.timeoutMs = deps.timeoutMs ?? DEFAULTS.timeoutMs
    this.maxRetries = deps.maxRetries ?? DEFAULTS.maxRetries
  }

  async createPayment(req: MpPaymentRequest): Promise<MpPaymentResponse> {
    const body = this.buildPaymentBody(req)
    const raw = await this.send('POST', '/v1/payments', body, req.externalReference)
    return normalizePayment(raw)
  }

  async getPayment(id: string): Promise<MpPaymentResponse> {
    const raw = await this.send('GET', `/v1/payments/${id}`)
    return normalizePayment(raw)
  }

  async createCustomer(input: MpCustomerInput): Promise<{ id: string }> {
    const raw = await this.send('POST', '/v1/customers', {
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      identification: input.identification,
    })
    return { id: String((raw as { id: string }).id) }
  }

  async saveCard(customerId: string, cardToken: string): Promise<MpSavedCard> {
    const raw = (await this.send('POST', `/v1/customers/${customerId}/cards`, { token: cardToken })) as {
      id: string
      last_four_digits: string
      payment_method?: { id?: string }
    }
    return { id: String(raw.id), lastFour: raw.last_four_digits, brand: raw.payment_method?.id ?? 'card' }
  }

  private buildPaymentBody(req: MpPaymentRequest): Record<string, unknown> {
    const base: Record<string, unknown> = {
      transaction_amount: req.amount,
      description: req.description,
      external_reference: req.externalReference,
      payer: {
        email: req.payer.email,
        first_name: req.payer.firstName,
        last_name: req.payer.lastName,
        identification: req.payer.identification,
        ...(req.customerId ? { type: 'customer', id: req.customerId } : {}),
      },
    }
    if (req.method === 'pix') return { ...base, payment_method_id: PIX_METHOD_ID }
    if (req.method === 'boleto') return { ...base, payment_method_id: BOLETO_METHOD_ID }
    // Saldo MP (wallet): sem token/issuer de cartão — só o método que o Brick resolveu.
    if (req.method === 'wallet') return { ...base, payment_method_id: req.paymentMethodId }
    // Cartão (crédito/débito): o Brick já resolveu token + método + parcelas + issuer.
    return {
      ...base,
      token: req.token,
      installments: req.installments ?? 1,
      payment_method_id: req.paymentMethodId,
      issuer_id: req.issuerId,
    }
  }

  private async send(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
    idempotencyKey?: string
  ): Promise<unknown> {
    let attempt = 0
    for (;;) {
      try {
        const res = await this.fetchWithTimeout(method, path, body, idempotencyKey)
        const json = (await res.json().catch(() => ({}))) as { message?: string }
        if (res.status === 429 || res.status >= 500) {
          if (attempt++ >= this.maxRetries) throw new MercadoPagoError(json.message || `MP ${res.status}`, res.status)
          await this.sleep(this.backoff(attempt))
          continue
        }
        if (!res.ok) throw new MercadoPagoError(json.message || `MP HTTP ${res.status}`, res.status)
        return json
      } catch (err) {
        // 4xx (≠429) é erro de cliente: não re-tentar nem mascarar.
        if (err instanceof MercadoPagoError && err.status && err.status < 500 && err.status !== 429) throw err
        if (attempt++ < this.maxRetries) {
          await this.sleep(this.backoff(attempt))
          continue
        }
        throw err
      }
    }
  }

  private async fetchWithTimeout(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
    idempotencyKey?: string
  ): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      return await this.fetchFn(`${API}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
    } finally {
      clearTimeout(timer)
    }
  }

  private backoff(attempt: number): number {
    const exp = Math.min(DEFAULTS.backoffCapMs, DEFAULTS.backoffBaseMs * 2 ** (attempt - 1))
    return exp / 2 + this.random() * (exp / 2)
  }
}

function normalizePayment(raw: unknown): MpPaymentResponse {
  const p = raw as {
    id: string | number
    status: string
    status_detail?: string
    external_reference?: string
    date_approved?: string | null
    point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } }
    transaction_details?: { external_resource_url?: string }
  }
  const tx = p.point_of_interaction?.transaction_data
  return {
    id: String(p.id),
    status: p.status,
    statusDetail: p.status_detail,
    externalReference: p.external_reference,
    pixQrCode: tx?.qr_code,
    pixQrCodeBase64: tx?.qr_code_base64,
    boletoUrl: p.transaction_details?.external_resource_url,
    approvedAt: p.date_approved ?? null,
  }
}

// ---------------------------------------------------------------------------
// Cliente mock (sem chave) — determinístico, exercita o mesmo fluxo
// ---------------------------------------------------------------------------

const MOCK_PIX_QR = '00020126580014br.gov.bcb.pix0136mock-pix-betv-online5204000053039865802BR'
const MOCK_PIX_QR_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC'

export class MockMercadoPagoClient implements MercadoPagoClient {
  async createPayment(req: MpPaymentRequest): Promise<MpPaymentResponse> {
    return {
      id: `mock-${req.externalReference}`,
      status: 'pending',
      statusDetail: 'pending_waiting_payment',
      externalReference: req.externalReference,
      pixQrCode: req.method === 'pix' ? MOCK_PIX_QR : undefined,
      pixQrCodeBase64: req.method === 'pix' ? MOCK_PIX_QR_BASE64 : undefined,
      boletoUrl: req.method === 'boleto' ? 'https://mock.betv.online/boleto' : undefined,
      approvedAt: null,
    }
  }

  async getPayment(id: string): Promise<MpPaymentResponse> {
    const externalReference = id.startsWith('mock-') ? id.slice('mock-'.length) : id
    return { id, status: 'pending', externalReference, approvedAt: null }
  }

  async createCustomer(input: MpCustomerInput): Promise<{ id: string }> {
    return { id: `mock-cust-${input.email}` }
  }

  async saveCard(customerId: string, _cardToken: string): Promise<MpSavedCard> {
    return { id: `mock-card-${customerId}`, lastFour: '4242', brand: 'visa' }
  }
}

/** Fonte única do gate de mock do Mercado Pago. */
export function isMockMP(): boolean {
  return !process.env.MP_ACCESS_TOKEN
}

/**
 * O branch mock do webhook (aprova por {paymentId,status} sem assinatura) NUNCA pode ficar
 * exposto por engano num ambiente público: só roda fora de produção OU com opt-in explícito
 * (ALLOW_MOCK_PAYMENTS=true) — usado para a demo em mock na VPS.
 */
export function mockPaymentsAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_MOCK_PAYMENTS === 'true'
}

export function getMercadoPagoClient(): MercadoPagoClient {
  if (isMockMP()) return new MockMercadoPagoClient()
  return new RealMercadoPagoClient({ accessToken: process.env.MP_ACCESS_TOKEN as string })
}
