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
