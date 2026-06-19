# Product

## Register

brand

## Users

Apostadores e fãs de futebol brasileiros durante a Copa de 2026 — majoritariamente mobile,
no calor do evento. Querem entender a **probabilidade real** de cada jogo (e onde há valor)
antes de decidir qualquer aposta; um segundo público são curiosos que só querem "entender o
jogo". Contexto de uso: decidindo se/como apostar, comparando odds, sob hype e pressa. A
landing é a porta de entrada (marketing); o app (`/app/*`) é a plataforma em si.

## Product Purpose

BetV é um app de estatística de futebol ao vivo / radar de valor para apostas. A landing
existe para converter o visitante no **Passe da Copa** (R$ 14,90 · PIX · 45 dias · a Copa
inteira), fazendo-o **sentir** que a plataforma calcula probabilidade real em tempo real —
sempre informativo, **nunca** uma casa de aposta e **nunca** prometendo lucro. Sucesso =
conversões para `/checkout` mantendo compliance integral (18+, "valor estimado", "não é
recomendação"). Funil: "Entrar" → `/login`; "Garantir meu passe" → `/checkout` (o pagamento
cria a conta; checkout é público).

## Brand Personality

**Inteligente · Confiante · Cósmico-técnico.** Voz clara, direta e sóbria, com ousadia
técnica (o olho-logo em partículas, predição ao vivo, dados em tempo real). Trata o leitor
como inteligente e **admite incerteza** quando não há dados (confiança baixa) — a honestidade
é o que gera confiança. Mantra: "Não é mágica. É estatística." Destaque tipográfico mapeado a
significado: serifa-itálica = o que você NÃO deve fazer / o que NÃO é; gradiente da marca = o
que o produto É.

## Anti-references

- **SaaS genérico de IA** (anti-ref principal): fundo cream/beige, eyebrow trackado em toda
  seção, grid de cards idênticos, gradient-text **decorativo**, marcadores 01/02/03 como
  scaffolding. Se parece com qualquer landing de ferramenta de IA, falhou.
- **Casa de aposta / cassino neon**: verde-amarelo berrante, roleta, urgência predatória,
  "ganhe fácil". BetV é informativo, não é casa, não promete lucro.
- **Bandeira do Brasil chapada**: verde/amarelo como wash. Aqui são acentos pontuais da Copa
  sobre **base violeta dominante**.
- **Editorial-magazine clichê**: serifa display + drop caps + grid de jornal num brief que não
  é revista.

## Design Principles

1. **Informar, não transacionar nem prometer.** Confiança vem da honestidade — mostrar
   incerteza, rotular "demonstração/exemplo", repetir "não é recomendação".
2. **Mostrar, não contar.** O produto se prova na própria hero (o olho que calcula, a predição
   ao vivo), não em adjetivos.
3. **O olho (a logo) é o protagonista vivo.** A identidade conduz a narrativa: viaja e morfa
   pela página para reforçar a mensagem de cada seção — senão, descansa.
4. **Violeta é a marca; verde/amarelo são acentos da Copa.** Nunca wash; o verde marca "ao
   vivo / valor" e o ponto do "i" da logo.
5. **Compliance é design, não rodapé.** 18+, "valor estimado", "não é recomendação" aparecem
   onde a informação aparece, não escondidos no fim.

## Accessibility & Inclusion

WCAG **AA**: contraste AA em corpo e rótulos (text-low já corrigido para 5.78:1), foco
visível, skip-link, landmarks/aria, tablists navegáveis por teclado. `prefers-reduced-motion`
desliga **todo** movimento (canvas off, sem dissolve/tilt/parallax). Degrade obrigatório em
todo efeito: mobile / low-power / sem-WebGL caem para estados estáticos legíveis (a logo real
nítida substitui o olho de partículas). Mobile-first, alvos de toque confortáveis, `100svh`
para evitar pulo do viewport no iOS.
