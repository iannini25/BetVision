import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export const updateAccountSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
}).refine(
  (data) => {
    if (data.newPassword && !data.currentPassword) return false
    return true
  },
  { message: 'Senha atual necessária para trocar a senha', path: ['currentPassword'] }
)

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  matchId: z.number().optional(),
  sessionId: z.string().uuid().optional(),
})

export const createPaymentSchema = z.object({
  plan: z.enum(['45_days']),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
export type ChatMessageInput = z.infer<typeof chatMessageSchema>
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
