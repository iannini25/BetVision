# Alteracoes do Projeto

Este arquivo e o changelog tecnico simples do time. Use para explicar mudancas de um jeito que outra pessoa consiga continuar codando sem precisar reconstruir todo o contexto.

## Como registrar

- Crie sempre uma entrada nova no topo do historico.
- Informe data e hora local.
- Identifique quem fez: `Codex`, `Claude` ou nome da pessoa.
- Explique em poucas linhas o que mudou e por que mudou.
- Liste arquivos/areas afetadas.
- Liste testes, comandos ou validacoes feitas.
- Registre pendencias ou cuidados para quem pegar depois.

## Modelo rapido

```md
### YYYY-MM-DD HH:mm:ss -03:00 - Autor

**Resumo:** Uma frase dizendo o que mudou.

**Motivo:** Por que a mudanca foi necessaria.

**Arquivos/areas:** `caminho/do/arquivo.ts`, `area afetada`.

**Validacao:** comando rodado, teste manual ou "nao validado".

**Pendencias:** algo que o proximo dev precisa saber, ou "nenhuma".
```

## Historico

### 2026-06-18 21:09:08 -03:00 - Codex

**Resumo:** Corrigido o erro interno que impedia login com o usuario seed do sistema.

**Motivo:** O backend retornava HTTP 500 no login porque o banco local estava com schema antigo. O stack trace mostrou `column "phone" does not exist` na tabela `users`.

**Arquivos/areas:** `apps/web/lib/db.ts`, `apps/web/services/auth.service.ts`, `packages/shared/src/schemas.ts`, `packages/shared/src/__tests__/schemas.test.ts`, `.env.example`, `.env` local, banco Postgres local.

**Validacao:** `drizzle-kit push --force` aplicou o schema; login em `localhost:3000/api/auth/login` retornou HTTP 200; e-mail em maiusculas/espacos tambem retornou HTTP 200; `/api/auth/session` retornou HTTP 200; instancia limpa temporaria validou `/hoje` com HTTP 200; `pnpm.cmd exec vitest run` em `packages/shared` passou com 56 testes; `pnpm.cmd typecheck` passou.

**Pendencias:** Se um dev server antigo ainda mostrar rota quebrada em `localhost:3000`, reiniciar `pnpm dev` para limpar manifest/cache do Next.
