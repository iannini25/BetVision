import { Resend } from 'resend'

const resendKey = process.env.RESEND_API_KEY
const fromAddress = process.env.RESEND_FROM || 'BetV <noreply@betv.online>'
const isMock = !resendKey

let resend: Resend | null = null
if (!isMock) {
  resend = new Resend(resendKey)
}

function log(type: string, to: string, subject: string) {
  console.log(`[EMAIL MOCK] ${type} → ${to} | ${subject}`)
}

export async function sendWelcomeEmail(to: string, name: string) {
  const subject = 'Bem-vindo ao BetV!'
  const html = `
    <h1>Olá, ${name}!</h1>
    <p>Seu acesso ao BetV está ativo. Aproveite o copiloto de apostas mais inteligente do Brasil.</p>
    <p>Acesse: <a href="${process.env.APP_URL}/hoje">${process.env.APP_URL}/hoje</a></p>
    <p style="color:#666;font-size:12px">Conteúdo informativo. Não é recomendação de aposta. 18+.</p>
  `
  if (isMock) return log('welcome', to, subject)
  await resend!.emails.send({ from: fromAddress, to, subject, html })
}

export async function sendVerificationEmail(to: string, token: string) {
  const subject = 'Verifique seu e-mail — BetV'
  const link = `${process.env.APP_URL}/verificar-email/${token}`
  const html = `
    <h1>Verificação de e-mail</h1>
    <p>Clique no link abaixo para verificar seu e-mail:</p>
    <a href="${link}">${link}</a>
    <p style="color:#666;font-size:12px">Este link expira em 24 horas.</p>
  `
  if (isMock) return log('verification', to, subject)
  await resend!.emails.send({ from: fromAddress, to, subject, html })
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const subject = 'Redefinir senha — BetV'
  const link = `${process.env.APP_URL}/redefinir-senha/${token}`
  const html = `
    <h1>Redefinição de senha</h1>
    <p>Clique no link abaixo para criar uma nova senha:</p>
    <a href="${link}">${link}</a>
    <p style="color:#666;font-size:12px">Este link expira em 1 hora. Se você não solicitou, ignore este e-mail.</p>
  `
  if (isMock) return log('password-reset', to, subject)
  await resend!.emails.send({ from: fromAddress, to, subject, html })
}

export async function sendPaymentReceivedEmail(to: string, name: string, setPasswordLink: string) {
  const subject = 'Recebemos seu pagamento — BetV'
  const html = `
    <h1>Pagamento confirmado, ${name}!</h1>
    <p>Recebemos seu pagamento e seu passe da Copa já está ativo (45 dias).</p>
    <p>Falta só um passo: crie sua senha para acessar a sua conta.</p>
    <a href="${setPasswordLink}">Criar minha senha</a>
    <p style="color:#666;font-size:12px">Este link expira em 24 horas. Conteúdo informativo, não é recomendação de aposta. 18+.</p>
  `
  if (isMock) return log('payment-received', to, subject)
  await resend!.emails.send({ from: fromAddress, to, subject, html })
}

export async function sendRenewalConfirmationEmail(to: string, name: string, expiraEm: Date) {
  const ateQuando = expiraEm.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const subject = 'Passe renovado — BetV'
  const html = `
    <h1>Renovação confirmada, ${name}!</h1>
    <p>Seu passe BetV foi renovado e segue ativo até <strong>${ateQuando}</strong>.</p>
    <a href="${process.env.APP_URL}/hoje">Continuar no BetV</a>
    <p style="color:#666;font-size:12px">Conteúdo informativo, não é recomendação de aposta. 18+.</p>
  `
  if (isMock) return log('renewal-confirmation', to, subject)
  await resend!.emails.send({ from: fromAddress, to, subject, html })
}

export async function sendExpirationWarningEmail(to: string, name: string, daysLeft: number) {
  const subject = `Seu passe BetV expira em ${daysLeft} dias`
  const html = `
    <h1>Olá, ${name}</h1>
    <p>Seu passe BetV expira em <strong>${daysLeft} dias</strong>. Renove para continuar acessando probabilidades, análises e o radar de valor.</p>
    <a href="${process.env.APP_URL}/renovar">Renovar agora</a>
  `
  if (isMock) return log('expiration-warning', to, subject)
  await resend!.emails.send({ from: fromAddress, to, subject, html })
}

// --- Assinatura recorrente (cartão com trial) ---

const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })

/** Início do trial: cria senha + deixa explícito quando/quanto cobra e como cancelar (anti-chargeback). */
export async function sendTrialStartedEmail(to: string, name: string, setPasswordLink: string, firstChargeDate: Date) {
  const subject = 'Seu teste grátis de 2 dias começou — BetV'
  const html = `
    <h1>Bem-vindo, ${name}!</h1>
    <p>Seu teste grátis de 2 dias está ativo. Falta só criar sua senha para entrar:</p>
    <a href="${setPasswordLink}">Criar minha senha</a>
    <p>Depois do teste, cobramos <strong>R$ 14,90</strong> em <strong>${fmtDate(firstChargeDate)}</strong> e seguimos mensalmente. Você pode cancelar quando quiser, sem pegadinha, em ${process.env.APP_URL}/conta.</p>
    <p style="color:#666;font-size:12px">Este link de senha expira em 24 horas. Conteúdo informativo, não é recomendação de aposta. 18+.</p>
  `
  if (isMock) return log('trial-started', to, subject)
  await resend!.emails.send({ from: fromAddress, to, subject, html })
}

/** Anti-chargeback: aviso na manhã do 2º dia, ANTES da 1ª cobrança. */
export async function sendTrialPreChargeEmail(to: string, name: string, chargeDate: Date, amount: number) {
  const subject = 'Seu teste grátis termina amanhã — BetV'
  const html = `
    <h1>Olá, ${name}!</h1>
    <p>Seu teste grátis de 2 dias termina amanhã e <strong>R$ ${amount.toFixed(2)}</strong> serão cobrados no seu cartão em <strong>${fmtDate(chargeDate)}</strong>.</p>
    <p>Se não quiser continuar, é só cancelar — sem pegadinha:</p>
    <a href="${process.env.APP_URL}/conta">Gerenciar / cancelar assinatura</a>
    <p style="color:#666;font-size:12px">Conteúdo informativo, não é recomendação de aposta. 18+.</p>
  `
  if (isMock) return log('trial-pre-charge', to, subject)
  await resend!.emails.send({ from: fromAddress, to, subject, html })
}

export async function sendRecurringChargeSuccessEmail(to: string, name: string, amount: number, nextChargeAt: Date) {
  const subject = 'Pagamento da assinatura confirmado — BetV'
  const html = `
    <h1>Tudo certo, ${name}!</h1>
    <p>Recebemos <strong>R$ ${amount.toFixed(2)}</strong> da sua assinatura BetV. Próxima cobrança em <strong>${fmtDate(nextChargeAt)}</strong>.</p>
    <a href="${process.env.APP_URL}/hoje">Continuar no BetV</a>
    <p style="color:#666;font-size:12px">Você pode cancelar quando quiser em ${process.env.APP_URL}/conta. 18+.</p>
  `
  if (isMock) return log('recurring-charge-success', to, subject)
  await resend!.emails.send({ from: fromAddress, to, subject, html })
}

export async function sendRecurringChargeFailedEmail(to: string, name: string) {
  const subject = 'Não conseguimos cobrar sua assinatura — BetV'
  const html = `
    <h1>Olá, ${name}</h1>
    <p>A cobrança da sua assinatura BetV não foi aprovada. O Mercado Pago vai tentar de novo, mas vale conferir os dados do cartão para não perder o acesso.</p>
    <a href="${process.env.APP_URL}/conta">Atualizar pagamento</a>
    <p style="color:#666;font-size:12px">18+.</p>
  `
  if (isMock) return log('recurring-charge-failed', to, subject)
  await resend!.emails.send({ from: fromAddress, to, subject, html })
}

export async function sendSubscriptionCancelledEmail(to: string, name: string, accessUntil: Date) {
  const subject = 'Assinatura cancelada — BetV'
  const html = `
    <h1>Cancelamento confirmado, ${name}.</h1>
    <p>Sua assinatura foi cancelada e não haverá novas cobranças. Você mantém o acesso até <strong>${fmtDate(accessUntil)}</strong>.</p>
    <a href="${process.env.APP_URL}/conta">Voltar a assinar quando quiser</a>
    <p style="color:#666;font-size:12px">18+.</p>
  `
  if (isMock) return log('subscription-cancelled', to, subject)
  await resend!.emails.send({ from: fromAddress, to, subject, html })
}
