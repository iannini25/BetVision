# Fase 5 — betv.online + HTTPS (Caddy)

Reverse proxy: **Caddy 2** (HTTPS automático via Let's Encrypt). Sem certbot/nginx.
Deploy: push em `main` → GitHub Actions SSH na VPS + cron de 2 min (`scripts/betv-pull-deploy.sh`)
faz `git reset --hard origin/main` e `docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d`.

## O que já está no código (este commit)
- `Caddyfile` é parametrizado por `$CADDY_SITE`: local = `:80` (HTTP, mock); prod = `betv.online www.betv.online` (HTTPS).
- `docker-compose.prod.yml`: abre **443** no Caddy, injeta `CADDY_SITE`, e `APP_URL` default = `https://betv.online`.
- Redirect **http→https** (automático do Caddy em host nomeado) e **www→apex** (regra no Caddyfile).
- Headers de segurança: HSTS, X-Content-Type-Options, Referrer-Policy, X-Frame-Options; `encode zstd gzip`.
- Cookie de sessão já vira **Secure** sozinho quando `APP_URL` começa com `https://` (`apps/web/lib/auth.ts`).
- `/ws*` → serviço `realtime` (upgrade wss transparente).

## Checklist de ativação (ações fora do código)

### 1. DNS (no registrador de betv.online) — JÁ FEITO ✓
- `A  betv.online      → 76.13.229.195` (IP da VPS) ✓ (resolve)
- `A  www.betv.online  → 76.13.229.195` ✓ (resolve)
- Apex é o canônico; www redireciona para apex (tratado no Caddy).

### 2. Resend (entrega do e-mail "criar sua senha")
No painel da Resend, adicionar o domínio `betv.online` e criar os registros TXT que ela gerar:
- **SPF**: `TXT  betv.online  "v=spf1 include:_spf.resend.com ~all"` (ou o valor exato da Resend).
- **DKIM**: o(s) `TXT`/`CNAME` `resend._domainkey...` que a Resend fornecer.
- **DMARC** (básico): `TXT  _dmarc.betv.online  "v=DMARC1; p=none; rua=mailto:bernardo.iannini14@gmail.com"`.
- Depois de verificar, manter `RESEND_FROM="BetV <noreply@betv.online>"` (já é o default).

### 3. Firewall (ufw na VPS)
```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (redirect + desafio ACME)
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
sudo ufw status
```
Postgres/Redis NÃO são publicados em prod (o overlay faz `ports: !reset []`), então não precisam de regra.
Obs.: o Docker publica portas direto no iptables; por isso o overlay já despublica DB/Redis — confira `docker compose -f docker-compose.yml -f docker-compose.prod.yml ps` e `ss -tlnp` que só 80/443/22 estão expostos.

### 4. Boot / restart
- Serviços já têm `restart: unless-stopped`.
- Garantir que o Docker sobe no boot: `sudo systemctl enable docker`.
- (Opcional) unit systemd para garantir o `up -d` no boot:
  ```ini
  # /etc/systemd/system/betv.service
  [Unit]
  Description=BetV stack
  Requires=docker.service
  After=docker.service network-online.target

  [Service]
  Type=oneshot
  RemainAfterExit=yes
  WorkingDirectory=/opt/betv
  ExecStart=/usr/bin/docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
  ExecStop=/usr/bin/docker compose -f docker-compose.yml -f docker-compose.prod.yml down

  [Install]
  WantedBy=multi-user.target
  ```
  `sudo systemctl enable betv` (o cron de pull-deploy já mantém o stack vivo de qualquer forma).

### 5. VPS `.env` (NÃO commitar)
```
APP_URL=https://betv.online
AUTH_SESSION_SECRET=<segredo forte>
RESEND_API_KEY=<chave real quando o domínio estiver verificado>
RESEND_FROM=BetV <noreply@betv.online>
# Mercado Pago: manter VAZIO até ter as chaves reais (fica em mock).
MP_ACCESS_TOKEN=
MP_PUBLIC_KEY=
MP_WEBHOOK_SECRET=
ALLOW_MOCK_PAYMENTS=
```
Sem `MP_ACCESS_TOKEN` o checkout fica em **mock** (paridade). `ALLOW_MOCK_PAYMENTS` vazio = webhook mock DESLIGADO em prod.

### 6. Mercado Pago (quando as chaves reais existirem — NÃO inventar agora)
- Cadastrar a URL do webhook no painel do MP: **`https://betv.online/api/webhooks/mercadopago`** (manual).
- Preencher `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET` no `.env` da VPS e redeploy.

## Verificação pós-deploy (rodar após o push/deploy)
```bash
curl -I https://betv.online                 # 200/307 + cert Let's Encrypt
curl -I http://betv.online                  # 308 -> https://betv.online
curl -I https://www.betv.online             # 308 -> https://betv.online
# wss: abrir /checkout ou /hoje no browser e confirmar o WebSocket conecta sobre wss:// (DevTools > Network > WS)
```
Esperado: emissor do certificado = **Let's Encrypt** (R10/R11/E1...), sem mixed-content em /checkout e /conta.
