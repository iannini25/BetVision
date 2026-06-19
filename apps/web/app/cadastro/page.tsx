'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { utils } from 'animejs'
import { cadastroSchema, maskPhone, type CadastroInput } from '@betv/shared'
import { Input } from '@/components/ui/input'
import { MaskedInput } from '@/components/ui/masked-input'
import { Button } from '@/components/ui/button'
import { Disclaimer18 } from '@/components/ui/disclaimer'
import { BetvLogo } from '@/components/landing/v2/betv-logo'
import { staggerReveal, prefersReducedMotion } from '@/lib/motion'

export default function CadastroPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const columnRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CadastroInput>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { name: '', email: '', phone: '', over18: false },
  })

  useLayoutEffect(() => {
    const column = columnRef.current
    if (!column) return
    const children = Array.from(column.children) as Element[]
    if (!prefersReducedMotion()) utils.set(children, { opacity: 0 })
    const anim = staggerReveal(children)
    return () => {
      anim?.revert()
    }
  }, [])

  async function onSubmit(data: CadastroInput) {
    setServerError('')
    const res = await fetch('/api/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setServerError(body.error || 'Erro ao processar o cadastro')
      return
    }
    router.push('/checkout')
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-5 py-10">
      <div ref={columnRef} className="w-full max-w-sm flex flex-col gap-6">
        <Link href="/landing" className="flex items-center gap-2.5 self-center" aria-label="BetV">
          <BetvLogo height={26} priority />
        </Link>

        <div className="text-center flex flex-col gap-1">
          <h1 className="font-display font-extrabold text-2xl">Crie seu acesso</h1>
          <p className="text-sm text-text-secondary">Passe da Copa — 45 dias. Só seus dados para liberar o pagamento.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field label="Nome completo" error={errors.name?.message}>
            <Input {...register('name')} placeholder="Seu nome" autoComplete="name" aria-invalid={!!errors.name} />
          </Field>

          <Field label="E-mail" error={errors.email?.message}>
            <Input {...register('email')} type="email" placeholder="voce@email.com" autoComplete="email" aria-invalid={!!errors.email} />
          </Field>

          <Field label="Telefone (com DDD)" error={errors.phone?.message}>
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <MaskedInput
                  value={field.value}
                  onChange={field.onChange}
                  mask={maskPhone}
                  placeholder="(11) 99999-8888"
                  autoComplete="tel"
                  aria-invalid={!!errors.phone}
                />
              )}
            />
          </Field>

          <div className="flex flex-col gap-1.5">
            <label className="flex items-start gap-2.5 text-sm text-text-secondary cursor-pointer">
              <input type="checkbox" {...register('over18')} className="mt-0.5 h-4 w-4 accent-brand-violet" aria-invalid={!!errors.over18} />
              <span>
                Confirmo que tenho <strong className="text-text-primary">18 anos ou mais</strong>.
              </span>
            </label>
            {errors.over18 && <p role="alert" className="text-sm text-accent-red">{errors.over18.message}</p>}
          </div>

          {serverError && <p role="alert" className="text-sm text-accent-red">{serverError}</p>}

          <Button type="submit" loading={isSubmitting} fullWidth>
            Continuar para o pagamento
          </Button>

          <p className="text-center text-sm text-text-muted">
            Já tem conta?{' '}
            <Link href="/login" className="text-brand-violet hover:underline">
              Entrar
            </Link>
          </p>
        </form>

        <Disclaimer18 />
      </div>
    </main>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold tracking-wider text-text-muted uppercase">{label}</label>
      {children}
      {error && <p role="alert" className="text-sm text-accent-red">{error}</p>}
    </div>
  )
}
