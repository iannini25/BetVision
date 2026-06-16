import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { onlyDigits, type CadastroInput } from '@betv/shared'
import { createCustomerForUser } from './payment.service'

const { users } = schema

export type CadastroResult = { ok: true; userId: string } | { ok: false; reason: 'already_registered' }

/**
 * Cadastro-first: cria (ou reaproveita) um usuário SEM senha e garante um Customer no MP.
 * Recusa "bridge" para conta já existente COM senha (anti account-takeover) — nesse caso o usuário
 * deve fazer login. A senha é criada depois, pelo link enviado por e-mail após o pagamento aprovado.
 */
export async function registerForCheckout(input: CadastroInput): Promise<CadastroResult> {
  const email = input.email.trim().toLowerCase()
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (existing && existing.passwordHash) return { ok: false, reason: 'already_registered' }

  let userId: string
  if (existing) {
    // Cadastro abandonado retomado: reaproveita a linha SEM sobrescrever nome/telefone (um terceiro
    // não pode alterar os dados de outro e-mail). Só preenche o que ainda estiver vazio.
    const patch: Partial<{ name: string; phone: string }> = {}
    if (!existing.name) patch.name = input.name
    if (!existing.phone) patch.phone = onlyDigits(input.phone)
    if (Object.keys(patch).length) {
      await db.update(users).set({ ...patch, atualizadoEm: new Date() }).where(eq(users.id, existing.id))
    }
    userId = existing.id
  } else {
    const [created] = await db
      .insert(users)
      .values({ email, name: input.name, phone: onlyDigits(input.phone), passwordHash: '' })
      .returning()
    userId = created.id
  }

  await createCustomerForUser(userId)
  return { ok: true, userId }
}
