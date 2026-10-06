# coopseat-web

Site, contas e BFF (backend for frontend) do CoopSeat em `https://coopseat.com`. Next.js 16 (App Router), Supabase Auth e Postgres, Prisma 8.

O navegador e o app desktop falam **só** com `/api`. O BFF valida tudo com Zod, aplica rate limit e conversa com o Supabase (GoTrue via REST e Postgres via Prisma). As chaves do Supabase nunca saem do servidor.

## Rodar localmente

Este site faz parte de um monorepo (npm workspaces) com o app desktop (`../coopseat`) e a interface compartilhada (`../packages/ui`). Instale as dependências na raiz:

```bash
npm ci                       # na raiz do repositório
cd coopseat-web
cp .env.example .env.local   # preencha os valores
npm run dev                  # emite o contrato Prisma e sobe em http://localhost:3000
```

## App no navegador (`/play`)

`/play` roda a mesma interface do app desktop (`@coopseat/ui`), só no modo Compatibilidade (`getUserMedia`): o núcleo nativo (Media Foundation, Direct3D, WASAPI) e "Sempre no topo" existem apenas no desktop. A conta usa os cookies do site; "Sign in" abre `/login?next=/play`. A rota tem layout raiz próprio (`src/app/play/layout.tsx`) para o CSS do app não se misturar com o Tailwind das páginas em `src/app/(main)`; navegar entre os dois recarrega a página.

Primeira configuração do Supabase (projeto, role `prisma`, migrations, SQL, Auth, provedores OAuth, SMTP e Turnstile): veja [`docs/supabase-setup.md`](docs/supabase-setup.md).

| Script                                            | O que faz                                                                         |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `npm run contract:emit`                           | Gera `src/prisma/contract.json` e `contract.d.ts` a partir de `contract.prisma`   |
| `npm run migration:plan -- --name <nome>`         | Planeja uma migration (offline) em `migrations/`                                  |
| `npm run db:migrate`                              | Aplica as migrations planejadas (`DIRECT_URL`)                                    |
| `npm run db:sql`                                  | Aplica `supabase/sql/*.sql` (trigger, grants, Custom Access Token Hook, pg_cron)  |
| `npm run relay:revoke -- --user <uuid>` / `--all` | Revoga na Cloudflare as credenciais TURN ainda válidas                            |
| `npm run supabase:configure`                      | Configura o Auth pela Management API (templates bilíngues, MFA, provedores, SMTP) |
| `npm run lint` / `typecheck` / `test` / `build`   | Verificações usadas no CI                                                         |

## Idiomas

O site, as mensagens da API e o `@coopseat/ui` estão em inglês (padrão) e português do Brasil, sem prefixo na URL. O idioma vem do cookie `locale` (seletor no rodapé, no login e em `/account`) e, sem ele, do `Accept-Language`. No app (desktop e `/play`), o ícone de idioma no cabeçalho, ao lado de ajuda e solução de problemas, guarda a escolha localmente e a envia no `Accept-Language`. As rotas antigas em português (`/entrar`, `/cadastro`, `/conta`...) redirecionam com 308 para as novas (`next.config.ts`). Os e-mails do Supabase são bilíngues, com o inglês primeiro.

## Contas

- **Cadastro**: e-mail e senha (com confirmação por e-mail) ou Google. O Google pode ser vinculado e desvinculado depois em `/account`, desde que reste pelo menos uma forma de login.
- **Unicidade**: e-mail é único no Supabase Auth; o apelido é único sem diferenciar maiúsculas (coluna `nicknameKey` = `lower(nickname)` com índice único e check constraint).
- **Maioridade (ECA Digital)**: só maiores de 18 anos. O cadastro exige a declaração, e chat e salas exigem a verificação de idade por um provedor de KYC plugável (`src/server/identity`). Guardamos só o resultado, a data e uma impressão HMAC do documento para impedir reuso. Nenhuma imagem é armazenada.
- **2FA**: TOTP opcional. Com ele ativo, ações sensíveis (e-mail, vínculos, exclusão, verificação, criar salas) exigem sessão `aal2`.
- **Exclusão**: `DELETE /api/me` remove o usuário do Auth; perfil, verificações e vínculos caem por `ON DELETE CASCADE`.

### Permissões na watch party (`src/lib/gates.ts`)

| Ação              | Requisitos                                        |
| ----------------- | ------------------------------------------------- |
| Assistir          | Nenhum (convidado anônimo)                        |
| Chat              | E-mail confirmado, apelido, idade verificada      |
| Criar sala (host) | Os mesmos, e sessão `aal2` se o 2FA estiver ativo |

`GET /api/me` devolve `permissions` já calculadas, e o Custom Access Token Hook adiciona `age_verified` e `nickname_set` ao JWT para validação nos serviços da sessão.

## Sessões

- **Web**: cookies `httpOnly` (`cs_at`, `cs_rt`), renovados pelo `src/proxy.ts`. Mutações com cookie exigem `Origin` igual a `APP_URL`.
- **Desktop**: `Authorization: Bearer` e o cabeçalho `x-coopseat-client: desktop`; os tokens vêm no corpo da resposta. O CORS de `/api` é aberto, mas sem credenciais.
- **OAuth no desktop**: `GET /api/auth/oauth/<provedor>?client=desktop&challenge=<S256>` → callback do BFF → ticket de uso único (60 s, criptografado, ligado ao PKCE) → `coopseat://auth/callback?ticket=…` → `POST /api/auth/desktop/exchange {ticket, verifier}`.
- O login por e-mail no desktop não usa Turnstile (não roda em `file://`) e depende do rate limit por IP e por e-mail. Cadastro e recuperação de senha do desktop abrem estas páginas no navegador.

## Gaming-Party (`/party/<apelido>`)

Watch party com até 10 transmissores. Cada conta verificada tem uma sala em `/party/<apelido>` (atalho "Minha sala" em `/account` e no cabeçalho do app). Quem não está logado vai para o login e volta para a sala.

- **Peças**: o BFF decide o acesso e emite um _room token_ (JWT Ed25519, 10 minutos, renovado a cada 8); o Worker [`coopseat-signal`](../coopseat-signal) (um Durable Object por sessão) só confere o token com a chave pública e repassa presença, chat e sinalização WebRTC. A mídia vai em malha P2P (cada transmissor envia uma cópia por espectador), com o TURN abaixo como plano B. BFF e Worker conversam por HTTP assinado com HMAC (`PARTY_SIGNAL_SECRET`, timestamp de até 60 s e nonce).
- **Sessão**: começa quando o dono inicia a transmissão e acaba quando ele para, quando fica fora por mais de `ownerGraceSeconds`, ao atingir `sessionMaxHours` ou por sanção. No fim, todos são desconectados e o chat (só em memória no Durable Object) some. Sessões encerradas saem da lista de ativas (`party_sessions."endedAt"`).
- **Acesso**: assistir, conversar, transmitir e moderar exigem conta verificada (e-mail, apelido, 18+); transmitir também exige 2FA na sessão quando ativado. A sala precisa de pelo menos uma proteção: senha (scrypt), aprovação ou lista de convidados (que pode liberar transmissão). Outros só transmitem enquanto o dono transmite, com permissão do dono ou por pedido aprovado, que vale só para a sessão.
- **Moderação**: o dono escolhe moderadores com permissões granulares (remover, banir, parar transmissões, aprovar, liberar transmissão, apagar mensagens). Ninguém age sobre o dono e moderadores não agem entre si. Toda ação fica em `party_moderation_events`.
- **Variáveis**: `PARTY_TOKEN_PRIVATE_KEY`, `PARTY_TOKEN_PUBLIC_KEY`, `PARTY_SIGNAL_URL`, `PARTY_SIGNAL_SECRET` (veja `.env.example`). No Worker: `wrangler secret put PARTY_TOKEN_PUBLIC_KEY` e `PARTY_SIGNAL_SECRET`. Localmente, `npm run dev:signal` na raiz sobe o Worker em `http://localhost:8787`.
- **CSP**: `/party/*` recebe `Content-Security-Policy` (o `connect-src` libera a origem de `PARTY_SIGNAL_URL`) e `Referrer-Policy: no-referrer`. ICE (STUN/TURN) não passa pela CSP.

### Controle da Gaming-Party

Como no relay, os limites ficam no Postgres e valem na próxima requisição. Tokens já emitidos carregam os limites da sala, então mudanças chegam às sessões ao vivo em até 10 minutos (na renovação do token).

| Tabela                                                          | Chave                                             | Efeito                                                                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `party_policy` (linha `global`; sem a linha, valem os defaults) | `enabled`                                         | Fecha todas as salas                                                                                                                   |
|                                                                 | `maxParticipants` (10, de 2 a 50)                 | Capacidade padrão das salas (`party_rooms."maxParticipants"` sobrescreve por sala)                                                     |
|                                                                 | `maxStreamers` (10, de 1 a 10)                    | Transmissores simultâneos por sessão                                                                                                   |
|                                                                 | `sessionMaxHours` (12) / `ownerGraceSeconds` (60) | Duração máxima da sessão / tolerância de queda do dono                                                                                 |
|                                                                 | `chatEnabled`                                     | Desliga o chat de todas as salas                                                                                                       |
| `platform_sanctions`                                            | `scope`, `expiresAt`, `revokedAt`                 | Sanção do CoopSeat: `platform` (conta toda), `party_host`, `party_stream`, `party_join` ou `party_chat`; `expiresAt` null = permanente |

```sql
-- fechar todas as salas (volte com enabled = true)
insert into party_policy (id, enabled, "updatedAt") values ('global', false, now())
  on conflict (id) do update set enabled = excluded.enabled, "updatedAt" = now();

-- capacidade padrão 6 e no máximo 4 transmissores
update party_policy set "maxParticipants" = 6, "maxStreamers" = 4, "updatedAt" = now() where id = 'global';

-- sessões ao vivo
select s.id, p.nickname as dono, s."startedAt" from party_sessions s
  join profiles p on p.id = s."roomId" where s."endedAt" is null order by s."startedAt";

-- sanções em vigor
select * from platform_sanctions
  where "revokedAt" is null and ("expiresAt" is null or "expiresAt" > now()) order by "createdAt" desc;
```

Para aplicar sanções, prefira o script, que também tira a pessoa das sessões ao vivo na hora (um `insert` direto só vale na próxima renovação do token):

```bash
npm run party:sanction -- --user <uuid> --scope party_stream --hours 72 --reason "conteúdo proibido"
npm run party:sanction -- --user <uuid> --scope platform            # permanente
npm run party:sanction -- --revoke <id da sanção>
```

## TURN (watch party)

`POST /api/turn` recebe `{ roomToken }` e devolve `{ iceServers, expiresAt, relay: true, maxRelayBitrateKbps }` com credenciais do TURN da Cloudflare Realtime (`CLOUDFLARE_TURN_KEY_ID` e `CLOUDFLARE_TURN_API_TOKEN`), para usar direto em `new RTCPeerConnection({ iceServers })`. Exige sessão, um room token admitido de uma sessão ao vivo (ninguém usa o relay de graça fora de uma sala) e tem limite por usuário. O app desktop envia `X-CoopSeat-Version` para as regras de versão.

Só o tráfego que passa pelo relay é cobrado; conexões diretas (P2P) não custam nada. Quando a política nega o relay, a rota responde 200 com `{ iceServers: [STUN], relay: false, reason, message }`: conexões diretas continuam funcionando e só quem depende do relay fica sem conexão. `@coopseat/ui/webrtc` (`packages/ui/src/lib/webrtc/relay.ts`) detecta se a conexão caiu no relay (`getSelectedCandidateType`) e limita o bitrate nesse caso (`applyRelayBitrateCap`); o evento de telemetria `rtc_connected` com `candidateType` mede a taxa real de relay.

### Controle do relay

As chaves ficam no Postgres e valem na próxima requisição, sem deploy. Edite pelo SQL Editor do Supabase. As tabelas têm RLS sem policies, então só o backend as lê.

| Tabela                                                          | Chave                                                               | Efeito                                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `relay_policy` (linha `global`; sem a linha, valem os defaults) | `enabled`                                                           | Desliga o relay para todos                                                          |
|                                                                 | `membersEnabled` / `guestsEnabled`                                  | Desliga por público                                                                 |
|                                                                 | `minAppVersion` / `blockedAppVersions` (lista separada por vírgula) | Bloqueia versões do app desktop                                                     |
|                                                                 | `dailyCredentialQuota` (12)                                         | Credenciais por usuário em 24 horas                                                 |
|                                                                 | `credentialTtlSeconds` (14400)                                      | Validade de cada credencial (60 a 86400)                                            |
|                                                                 | `maxRelayBitrateKbps` (4000)                                        | Limite de bitrate enviado ao cliente quando a conexão está no relay                 |
|                                                                 | `monthlyBudgetGb` (900; `null` desliga)                             | Teto mensal de egress do TURN; ao atingir, o relay para até o mês seguinte          |
| `relay_user_overrides`                                          | `blocked`, `dailyQuota`, `reason`, `expiresAt`                      | Bloqueio ou cota por usuário; com `expiresAt` no passado, o override deixa de valer |
| `relay_credentials`                                             | (auditoria)                                                         | Cada credencial emitida, usada para a cota e para revogar                           |
| `relay_usage`                                                   | (cache)                                                             | Egress do TURN no mês (`month` = `AAAA-MM`, UTC), atualizado pelo backend           |

**Teto mensal.** A Cloudflare cobra só o egress, com 1.000 GB grátis por mês (compartilhados com o SFU, que não usamos). Antes de emitir credenciais, o backend lê o egress do TURN no mês pela GraphQL Analytics API (`CLOUDFLARE_ACCOUNT_ID` e `CLOUDFLARE_ANALYTICS_API_TOKEN`, permissão _Account Analytics: Read_), guarda a leitura em `relay_usage` por 5 minutos e nega o relay quando ela chega em `monthlyBudgetGb`. O padrão de 900 GB deixa margem para o atraso das métricas e para as sessões que já têm credenciais, que continuam até expirar (use `relay:revoke -- --all` para cortá-las). O mês é o calendário UTC; o ciclo de cobrança da Cloudflare também é mensal. O teto falha fechado: se a Cloudflare não responder e a última leitura tiver mais de 1 hora, ou se as variáveis faltarem em produção, o relay fica desligado. Fora de produção, sem as variáveis, o teto é ignorado.

```sql
-- desligar o relay para todos (volte com enabled = true)
insert into relay_policy (id, enabled, "updatedAt") values ('global', false, now())
  on conflict (id) do update set enabled = excluded.enabled, "updatedAt" = now();

-- só para convidados, ou só para versões antigas do app
update relay_policy set "guestsEnabled" = false, "updatedAt" = now() where id = 'global';
update relay_policy set "minAppVersion" = '0.3.0', "blockedAppVersions" = '0.3.2', "updatedAt" = now() where id = 'global';

-- bloquear um usuário por 7 dias (expiresAt null = sem prazo)
insert into relay_user_overrides ("profileId", blocked, reason, "expiresAt")
  values ('<uuid>', true, 'suspeita de abuso', now() + interval '7 days')
  on conflict ("profileId") do update set blocked = true, reason = excluded.reason, "expiresAt" = excluded."expiresAt";

-- desbloquear
delete from relay_user_overrides where "profileId" = '<uuid>';

-- consumo do mês em GB e teto atual
select u.month, round(u."egressBytes" / 1e9, 1) as gb, p."monthlyBudgetGb", u."checkedAt"
  from relay_usage u left join relay_policy p on p.id = 'global' order by u.month desc;

-- mudar o teto (ou null para desligar)
update relay_policy set "monthlyBudgetGb" = 500, "updatedAt" = now() where id = 'global';

-- quem mais pegou credenciais nas últimas 24 horas
select "profileId", count(*) from relay_credentials
  where "issuedAt" > now() - interval '1 day' group by 1 order by 2 desc;
```

Bloquear só impede **novas** credenciais. Para cortar as que já foram emitidas, revogue na Cloudflare: `npm run relay:revoke -- --user <uuid>` ou `npm run relay:revoke -- --all` (usa `DIRECT_URL` e as chaves do TURN). Último recurso: apagar ou rotacionar a TURN key no painel da Cloudflare.

A página `/download` mostra a versão, as opções instalador e portátil e os requisitos do sistema. `GET /download/installer` e `GET /download/portable` redirecionam para o `*-Setup.exe` e o `*-Portable.exe` da última release publicada do repositório privado do app (`GITHUB_RELEASES_REPO`), usando um token fine-grained só de leitura (`GITHUB_RELEASES_TOKEN`). O GitHub entrega uma URL assinada que expira em poucos minutos, então o site acompanha cada nova release sem deploy.

## KYC

`KYC_PROVIDER=mock` usa a página `/verification/mock`, permitida apenas fora de produção ou com `ALLOW_MOCK_KYC=1`.

`KYC_PROVIDER=didit` usa o fluxo hospedado do [Didit](https://didit.me) (500 verificações completas grátis por mês). No console do Didit:

1. Crie um workflow com verificação de documento (prova de vida e comparação de rosto recomendadas) e copie o id para `DIDIT_WORKFLOW_ID`. Os checks grátis só valem dentro de workflows.
2. Em _API & Webhooks_, copie a API key para `DIDIT_API_KEY` e adicione o destino `<APP_URL>/api/identity/webhooks/didit` (versão v3, evento `status.updated`). O segredo de assinatura vai em `DIDIT_WEBHOOK_SECRET`.
3. Para testar localmente, exponha o servidor com um túnel HTTPS (`cloudflared tunnel --url http://localhost:3000`) e use _Try Webhook_ no console.

O webhook confere `X-Signature-V2` (HMAC-SHA256 do JSON canônico) e `X-Timestamp` (até 5 minutos). Eventos intermediários (_Not Started_, _In Progress_) recebem 200 e são ignorados; _Abandoned_ e _Expired_ contam como recusa para o perfil não ficar preso em `PENDING`. A maioridade vem do campo `age` do documento, e a impressão do documento usa `issuing_state` + `document_number`.

Para outro provedor, implemente `IdentityProvider` (`createSession` e `parseWebhook` com verificação de assinatura) em `src/server/identity/providers/` e registre-o em `src/server/identity/index.ts`. O webhook fica em `POST /api/identity/webhooks/<provedor>`.

## Testes

- `npm test` (Vitest, roda no CI): criptografia e PKCE, tickets de uso único, validação, permissões, mapeamento de erros do GoTrue, rate limit, KYC (menor de idade, documento reutilizado, idempotência, limite de tentativas), Gaming-Party (decisão de acesso, room tokens, senhas, hierarquia de moderação, sanções, HMAC, chat, alocação de bitrate e layouts) e rotas (`login` web/desktop/MFA, `desktop/exchange`, `nicknames/available`, webhook assinado). O banco é substituído por um fake em memória (`tests/fake-db.ts`) que reproduz o índice único parcial de documentos.
- `npm run db:test`: roda `supabase/tests/*.sql` num projeto Supabase de **desenvolvimento** (`SQL_ADMIN_URL`), sempre com rollback. Cobre o trigger de perfil, as constraints de apelido, o índice de documento, o Custom Access Token Hook, a RLS e os grants. Não roda no CI porque precisa de um banco real.
- Ponta a ponta (Playwright) ainda não existe: o fluxo cadastro → confirmação → verificação mock depende de um projeto Supabase com SMTP. O roteiro manual está em [`docs/supabase-setup.md`](docs/supabase-setup.md).

## Estrutura

- `src/prisma/contract.prisma`: modelos `Profile`, `IdentityVerification`, `AuthTicket`, `RateLimitHit`, os de controle do relay (`RelayPolicy`, `RelayUserOverride`, `RelayCredential`, `RelayUsage`) e os da Gaming-Party (`Party*`, `PlatformSanction`), com RLS.
- `src/server/`: GoTrue, JWT (JWKS), sessões, tickets, rate limit, captcha, perfis, KYC, política do relay TURN e `party/` (acesso, room tokens, sanções, chamadas ao signal).
- `src/app/api/`: rotas do BFF.
- `src/app/(main)/(auth)`, `src/app/(main)/account`, `src/app/(main)/(site)`: páginas.
- `src/i18n/`: idiomas (inglês padrão e pt-BR), dicionários e detecção pelo cookie `locale` ou `Accept-Language`.
- `supabase/`: SQL complementar e templates de e-mail.
