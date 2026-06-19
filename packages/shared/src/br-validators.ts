/** Validadores e máscaras de documentos/telefone brasileiros (puros, sem dependências). */

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** CPF válido por dígitos verificadores (não só tamanho). Rejeita sequências repetidas. */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const digits = cpf.split('').map(Number)
  for (let position = 9; position < 11; position++) {
    let sum = 0
    for (let i = 0; i < position; i++) sum += digits[i] * (position + 1 - i)
    let check = (sum * 10) % 11
    if (check === 10) check = 0
    if (check !== digits[position]) return false
  }
  return true
}

/** Celular com DDD: 11 dígitos (formato (00) 00000-0000). */
export function isValidBrPhone(value: string): boolean {
  return onlyDigits(value).length === 11
}

/** Máscara progressiva de celular: (00) 00000-0000. */
export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Máscara progressiva de CPF: 000.000.000-00. */
export function maskCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  if (!d) return ''
  let out = d.slice(0, 3)
  if (d.length > 3) out += `.${d.slice(3, 6)}`
  if (d.length > 6) out += `.${d.slice(6, 9)}`
  if (d.length > 9) out += `-${d.slice(9, 11)}`
  return out
}
