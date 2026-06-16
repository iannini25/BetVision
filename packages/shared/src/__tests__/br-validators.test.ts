import { describe, it, expect } from 'vitest'
import { isValidCpf, isValidBrPhone, maskPhone, maskCpf, onlyDigits } from '../br-validators'

describe('isValidCpf (dígitos verificadores)', () => {
  it('aceita CPF válido (com e sem máscara)', () => {
    expect(isValidCpf('123.456.789-09')).toBe(true)
    expect(isValidCpf('12345678909')).toBe(true)
  })
  it('rejeita dígito verificador errado', () => {
    expect(isValidCpf('12345678900')).toBe(false)
  })
  it('rejeita sequência repetida e tamanho errado', () => {
    expect(isValidCpf('11111111111')).toBe(false)
    expect(isValidCpf('123')).toBe(false)
    expect(isValidCpf('')).toBe(false)
  })
})

describe('isValidBrPhone (celular 11 dígitos)', () => {
  it('aceita 11 dígitos', () => {
    expect(isValidBrPhone('(11) 99999-8888')).toBe(true)
    expect(isValidBrPhone('11999998888')).toBe(true)
  })
  it('rejeita 10 dígitos (fixo) ou vazio', () => {
    expect(isValidBrPhone('1199999888')).toBe(false)
    expect(isValidBrPhone('')).toBe(false)
  })
})

describe('máscaras progressivas', () => {
  it('telefone', () => {
    expect(maskPhone('')).toBe('')
    expect(maskPhone('11')).toBe('(11')
    expect(maskPhone('1199999')).toBe('(11) 99999')
    expect(maskPhone('11999998888')).toBe('(11) 99999-8888')
    expect(maskPhone('11999998888999')).toBe('(11) 99999-8888') // trunca em 11 dígitos
  })
  it('cpf', () => {
    expect(maskCpf('123')).toBe('123')
    expect(maskCpf('123456')).toBe('123.456')
    expect(maskCpf('12345678909')).toBe('123.456.789-09')
  })
  it('onlyDigits limpa qualquer formatação', () => {
    expect(onlyDigits('(11) 99999-8888')).toBe('11999998888')
  })
})
