import { describe, expect, it } from 'vitest'
import { cadastroSchema, forgotPasswordSchema, loginSchema, registerSchema } from '../schemas'

describe('email schemas', () => {
  it('normaliza o e-mail no login antes da autenticacao', () => {
    const parsed = loginSchema.parse({
      email: '  ESQUEMA@DINHEIRO.COM.BR  ',
      password: 'Money@26',
    })

    expect(parsed.email).toBe('esquema@dinheiro.com.br')
  })

  it('normaliza o mesmo campo nos fluxos que buscam usuario por e-mail', () => {
    const forgotPassword = forgotPasswordSchema.parse({ email: '  USER@BETV.ONLINE ' })
    const register = registerSchema.parse({
      name: 'Ana',
      email: ' ANA@BETV.ONLINE ',
      password: '123456',
    })
    const cadastro = cadastroSchema.parse({
      name: 'Ana Betv',
      email: ' ANA@BETV.ONLINE ',
      phone: '(11) 99999-9999',
      over18: true,
    })

    expect(forgotPassword.email).toBe('user@betv.online')
    expect(register.email).toBe('ana@betv.online')
    expect(cadastro.email).toBe('ana@betv.online')
  })
})
