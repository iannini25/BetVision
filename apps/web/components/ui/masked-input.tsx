'use client'

import type { InputHTMLAttributes } from 'react'
import { Input } from './input'

type MaskedInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  value: string
  onChange: (masked: string) => void
  /** Função de máscara progressiva (ex.: maskPhone, maskCpf de @betv/shared). */
  mask: (raw: string) => string
}

// Campo mascarado para react-hook-form (Controller): exibe o valor formatado e propaga o valor
// formatado no onChange (a validação/serviço aplicam onlyDigits). Limitação conhecida sem lib de
// máscara: o cursor vai para o fim ao editar no meio — aceitável para entrada append-only.
export function MaskedInput({ value, onChange, mask, ...rest }: MaskedInputProps) {
  return <Input value={mask(value)} onChange={(e) => onChange(mask(e.target.value))} inputMode="numeric" {...rest} />
}
