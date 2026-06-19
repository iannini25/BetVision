# Contexto da Equipe

Arquivo de alinhamento para registrar decisoes, alteracoes e acoes relevantes no projeto.

## Regra de registro

- Toda alteracao feita pelo Codex deve ser registrada neste arquivo com data e hora local.
- Acoes relevantes de diagnostico, verificacao, testes, deploy, comandos operacionais e decisoes tecnicas tambem devem ser registradas.
- O registro deve explicar o que foi feito, onde foi feito e qualquer impacto/pendencia para a equipe.
- Para explicacao simples e orientada a desenvolvimento, registrar tambem em `ALTERACOES.md`. Esse arquivo deve ser usado por Codex, Claude e devs humanos.

## Coordenacao com trabalho paralelo

- O projeto tambem pode receber alteracoes de outras pessoas e de sessoes usando Claude.
- Antes de alterar arquivos, o Codex deve conferir o contexto atual dos arquivos envolvidos e preservar mudancas que nao foram feitas por ele.
- Se encontrar alteracoes paralelas que afetem a tarefa, o Codex deve trabalhar em cima delas quando for seguro ou pedir orientacao antes de sobrescrever comportamento.
- Ao terminar, o Codex deve deixar registrado neste arquivo quais arquivos/areas foram impactados, quais verificacoes foram feitas e qualquer ponto que a equipe precise saber.

## Historico

### 2026-06-18 21:13:39 -03:00

- Criado `ALTERACOES.md` como changelog tecnico simples para Codex, Claude e devs humanos registrarem alteracoes de forma facil de entender.
- O arquivo inclui regra de uso, modelo rapido e a primeira entrada resumindo a correcao do erro interno de login.
- Atualizada a regra de registro deste `CONTEXTOEQUIPE.md` para apontar que explicacoes de mudanca tambem devem entrar em `ALTERACOES.md`.
- Arquivos alterados nesta entrada: `ALTERACOES.md` e `CONTEXTOEQUIPE.md`.

### 2026-06-18 21:09:08 -03:00

- Corrigido o erro interno de login com o usuario seed `esquema@dinheiro.com.br` / `Money@26`.
- Causa real capturada no stack trace do Next local: `Login error: error: column "phone" does not exist`. O codigo atual selecionava colunas novas de `users`, mas o banco local do Docker estava com schema antigo.
- Acao no banco: executado `pnpm.cmd --filter @betv/shared exec drizzle-kit push --force` com `DATABASE_URL=postgresql://betv:betv_secret@localhost:5433/betv`, apos autorizacao por precisar escrever cache fora do sandbox. O Drizzle aplicou as mudancas e a tabela `users` passou a ter `phone`, `cpf` e `mp_customer_id`.
- Arquivos alterados: `apps/web/lib/db.ts` ganhou fallback local para `postgresql://betv:betv_secret@localhost:5433/betv`; `apps/web/services/auth.service.ts` passou a normalizar e-mail antes da busca; `packages/shared/src/schemas.ts` passou a normalizar e-mail nos schemas; `packages/shared/src/__tests__/schemas.test.ts` foi criado; `.env.example` foi alinhado para portas locais `5433`/`6380`; `.env` local de desenvolvimento/mock foi criado e esta ignorado pelo git.
- Validacoes: login em `http://localhost:3000/api/auth/login` retornou HTTP 200 com e-mail exato e tambem com e-mail em maiusculas/espacos; `/api/auth/session` retornou HTTP 200 com assinatura ativa; instancia limpa temporaria em `localhost:3002` validou login HTTP 200, sessao HTTP 200 e `/hoje` HTTP 200.
- Testes: `pnpm.cmd exec vitest run` em `packages/shared` passou com 6 arquivos e 56 testes; `pnpm.cmd typecheck` passou no monorepo.
- Observacao para a equipe: se o dev server antigo em `localhost:3000` ainda mostrar 404 em `/hoje` no navegador, reiniciar o `pnpm dev` para limpar o manifest antigo; o erro interno de login ja foi removido e validado.

### 2026-06-18 20:46:37 -03:00

- Diagnostico do erro de login realizado pelo Codex, sem alteracao no codigo de autenticacao.
- Fluxo validado no ambiente Docker atual via `http://localhost`: login com `esquema@dinheiro.com.br` e `Money@26` retornou HTTP 200, emitiu cookie `betv-session`, `/api/auth/session` retornou HTTP 200 e `/hoje` abriu com HTTP 200.
- Banco validado no Postgres do Docker: usuario seed existe com `password_hash` preenchido, e assinatura `active` com `expira_em` futuro.
- Erro reproduzido com precisao: `ESQUEMA@DINHEIRO.COM.BR` + `Money@26` retorna HTTP 401 `E-mail ou senha incorretos`, apesar de ser o mesmo e-mail do usuario seed.
- Causa encontrada: o cadastro normaliza e-mail com `trim().toLowerCase()`, mas o login envia/consulta o e-mail cru; `authenticateUser` compara com igualdade exata no banco.
- Arquivos analisados: `apps/web/app/login/page.tsx`, `apps/web/app/api/auth/login/route.ts`, `apps/web/services/auth.service.ts`, `packages/shared/src/schemas.ts`, `apps/web/services/cadastro.service.ts`, `apps/web/lib/auth.ts`, `apps/web/middleware.ts`, `db/seed.ts`.
- Pendencia sugerida: normalizar o e-mail no login antes da consulta, idealmente no schema/entrada compartilhada, e cobrir com teste para e-mail em maiusculas e com espacos.

### 2026-06-18 20:42:34 -03:00

- Registrada regra de coordenacao para trabalho paralelo: o projeto tambem esta sendo alterado por outras pessoas e por sessoes usando Claude.
- Impacto para proximas alteracoes: antes de editar, o Codex deve conferir o estado atual dos arquivos, preservar mudancas alheias e registrar neste arquivo o que foi feito.
- Arquivo alterado nesta entrada: `CONTEXTOEQUIPE.md`.

### 2026-06-18 20:41:38 -03:00

- Registrada a regra de coordenacao: tudo que o Codex alterar ou fizer no projeto deve ser documentado neste arquivo com data e hora.
- Contexto anterior imediato: o Codex estudou a estrutura do projeto sem alterar arquivos, mapeando `apps/web`, `apps/agent`, `apps/realtime`, `packages/shared`, `packages/emails`, Docker, seed, banco, pagamentos, realtime e docs de deploy.
- Verificacoes feitas antes deste registro: `pnpm.cmd typecheck` passou; testes unitarios de `packages/shared` passaram com 54 testes; testes unitarios de `apps/agent` passaram com 62 testes.
- Observacao operacional: `git` nao estava disponivel no PATH do shell usado pelo Codex naquele momento.
