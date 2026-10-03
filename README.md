# coopseat-web

Site, contas e BFF (backend for frontend) do CoopSeat em `https://coopseat.com`. Next.js 16 (App Router), Supabase Auth e Postgres, Prisma 8.

O navegador e o app desktop falam **só** com `/api`. O BFF valida tudo com Zod, aplica rate limit e conversa com o Supabase (GoTrue via REST e Postgres via Prisma). As chaves do Supabase nunca saem do servidor.

## Rodar localmente

```bash
cp .env.example .env.local   # preencha os valores
npm ci
npm run dev                  # emite o contrato Prisma e sobe em http://localhost:3000
```

Primeira configuração do Supabase (projeto, role `prisma`, migrations, SQL, Auth, provedores OAuth, SMTP e Turnstile): veja [`docs/supabase-setup.md`](docs/supabase-setup.md).

| Script | O que faz |
|---|---|
| `npm run contract:emit` | Gera `src/prisma/contract.json` e `contract.d.ts` a partir de `contract.prisma` |
| `npm run migration:plan -- --name <nome>` | Planeja uma migration (offline) em `migrations/` |
| `npm run db:migrate` | Aplica as migrations planejadas (`DIRECT_URL`) |
| `npm run db:sql` | Aplica `supabase/sql/*.sql` (trigger, grants, Custom Access Token Hook, pg_cron) |
| `npm run supabase:configure` | Configura o Auth pela Management API (templates PT-BR, MFA, provedores, SMTP) |
| `npm run lint` / `typecheck` / `test` / `build` | Verificações usadas no CI |

## Contas

- **Cadastro**: e-mail e senha (com confirmação por e-mail) ou Google, Facebook, X e Discord. Os provedores podem ser vinculados e desvinculados depois em `/conta`, desde que reste pelo menos uma forma de login.
- **Unicidade**: e-mail é único no Supabase Auth; o apelido é único sem diferenciar maiúsculas (coluna `nicknameKey` = `lower(nickname)` com índice único e check constraint).
- **Maioridade (ECA Digital)**: só maiores de 18 anos. O cadastro exige a declaração, e chat, voz e salas exigem a verificação de idade por um provedor de KYC plugável (`src/server/identity`). Guardamos só o resultado, a data e uma impressão HMAC do documento para impedir reuso. Nenhuma imagem é armazenada.
- **2FA**: TOTP opcional. Com ele ativo, ações sensíveis (e-mail, vínculos, exclusão, verificação, criar salas) exigem sessão `aal2`.
- **Exclusão**: `DELETE /api/me` remove o usuário do Auth; perfil, verificações e vínculos caem por `ON DELETE CASCADE`.

### Permissões na watch party (`src/lib/gates.ts`)

| Ação | Requisitos |
|---|---|
| Assistir | Nenhum (convidado anônimo) |
| Chat e voz | E-mail confirmado, apelido, idade verificada |
| Criar sala (host) | Os mesmos, e sessão `aal2` se o 2FA estiver ativo |

`GET /api/me` devolve `permissions` já calculadas, e o Custom Access Token Hook adiciona `age_verified` e `nickname_set` ao JWT para validação nos serviços da sessão.

## Sessões

- **Web**: cookies `httpOnly` (`cs_at`, `cs_rt`), renovados pelo `src/proxy.ts`. Mutações com cookie exigem `Origin` igual a `APP_URL`.
- **Desktop**: `Authorization: Bearer` e o cabeçalho `x-coopseat-client: desktop`; os tokens vêm no corpo da resposta. O CORS de `/api` é aberto, mas sem credenciais.
- **OAuth no desktop**: `GET /api/auth/oauth/<provedor>?client=desktop&challenge=<S256>` → callback do BFF → ticket de uso único (60 s, criptografado, ligado ao PKCE) → `coopseat://auth/callback?ticket=…` → `POST /api/auth/desktop/exchange {ticket, verifier}`.
- O login por e-mail no desktop não usa Turnstile (não roda em `file://`) e depende do rate limit por IP e por e-mail. Cadastro e recuperação de senha do desktop abrem estas páginas no navegador.

## TURN (watch party)

`POST /api/turn` devolve `{ iceServers, expiresAt }` com credenciais de 4 horas do TURN da Cloudflare Realtime (`CLOUDFLARE_TURN_KEY_ID` e `CLOUDFLARE_TURN_API_TOKEN`), para usar direto em `new RTCPeerConnection({ iceServers })`. Exige sessão e tem limite por usuário. Convidados anônimos vão receber credenciais pela futura rota de entrada na sala, presas a um convite válido, para que ninguém use o relay de graça.

## KYC

`KYC_PROVIDER=mock` usa a página `/verificacao/mock`, permitida apenas fora de produção ou com `ALLOW_MOCK_KYC=1`. Para um provedor real, implemente `IdentityProvider` (`createSession` e `parseWebhook` com verificação de assinatura) em `src/server/identity/providers/` e registre-o em `src/server/identity/index.ts`. O webhook fica em `POST /api/identity/webhooks/<provedor>`.

## Testes

- `npm test` (Vitest, roda no CI): criptografia e PKCE, tickets de uso único, validação, permissões, mapeamento de erros do GoTrue, rate limit, KYC (menor de idade, documento reutilizado, idempotência, limite de tentativas) e rotas (`login` web/desktop/MFA, `desktop/exchange`, `nicknames/available`, webhook assinado). O banco é substituído por um fake em memória (`tests/fake-db.ts`) que reproduz o índice único parcial de documentos.
- `npm run db:test`: roda `supabase/tests/*.sql` num projeto Supabase de **desenvolvimento** (`SQL_ADMIN_URL`), sempre com rollback. Cobre o trigger de perfil, as constraints de apelido, o índice de documento, o Custom Access Token Hook, a RLS e os grants. Não roda no CI porque precisa de um banco real.
- Ponta a ponta (Playwright) ainda não existe: o fluxo cadastro → confirmação → verificação mock depende de um projeto Supabase com SMTP. O roteiro manual está em [`docs/supabase-setup.md`](docs/supabase-setup.md).

## Estrutura

- `src/prisma/contract.prisma`: modelos `Profile`, `IdentityVerification`, `AuthTicket` e `RateLimitHit`, com RLS.
- `src/server/`: GoTrue, JWT (JWKS), sessões, tickets, rate limit, captcha, perfis e KYC.
- `src/app/api/`: rotas do BFF.
- `src/app/(auth)`, `src/app/conta`, `src/app/(site)`: páginas.
- `supabase/`: SQL complementar e templates de e-mail.
