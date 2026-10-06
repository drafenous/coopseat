// Supabase Auth e-mails rendered from one shared layout. They are bilingual (English first) because GoTrue
// renders a single template for everyone. `{{ ... }}` is Go template syntax that GoTrue fills in when sending.

export const SUPPORT_EMAIL = 'suporte@coopseat.com';

const COLORS = {
  page: '#0b0d12',
  card: '#151922',
  text: '#e6e8ee',
  title: '#ffffff',
  muted: '#8a90a0',
  border: '#262c38',
  accent: '#6d5efc',
  link: '#a99dff',
};
const FONT = 'Arial,Helvetica,sans-serif';

/** Our BFF route verifies the token server-side, so the session lands in an httpOnly cookie instead of a URL fragment. */
const confirmUrl = (type) =>
  `{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=${type}`;

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px"><tr>
              <td bgcolor="${COLORS.accent}" style="border-radius:8px">
                <a href="${href}" style="display:inline-block;padding:12px 20px;font-family:${FONT};font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px">${label}</a>
              </td>
            </tr></table>`;
}

function code(value) {
  return `<p style="margin:0 0 24px;padding:16px;background:${COLORS.page};border-radius:8px;text-align:center;font-family:'Courier New',monospace;font-size:28px;font-weight:bold;letter-spacing:6px;color:${COLORS.title}">${value}</p>`;
}

function heading({ title, body }, level) {
  const size = level === 'h1' ? 22 : 18;
  return `<${level} style="margin:0 0 16px;font-size:${size}px;line-height:1.3;color:${COLORS.title}">${title}</${level}>
            <p style="margin:0 0 24px;line-height:1.5">${body}</p>`;
}

function note(text) {
  return text
    ? `<p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:${COLORS.muted}">${text}</p>`
    : '';
}

/**
 * @param {{
 *   siteUrl: string;
 *   preheader: string;
 *   en: { title: string; body: string; note?: string };
 *   pt: { title: string; body: string; note?: string };
 *   action?: { href: string; label: string; fallback?: boolean } | { code: string };
 * }} email
 */
export function renderEmail({ siteUrl, preheader, en, pt, action }) {
  const host = new URL(siteUrl).host;
  let actionHtml = '';
  let fallbackHtml = '';
  if (action && 'code' in action) {
    actionHtml = code(action.code);
  } else if (action) {
    actionHtml = button(action.href, action.label);
    if (action.fallback !== false) {
      fallbackHtml = `<p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:${COLORS.muted};word-break:break-all">
              Button not working? Copy this link into your browser.<br>
              O botão não funciona? Copie este link no navegador.<br>
              <a href="${action.href}" style="color:${COLORS.link}">${action.href}</a>
            </p>`;
    }
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <title>${en.title}</title>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.page}">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${COLORS.page}" style="background:${COLORS.page};font-family:${FONT};color:${COLORS.text}">
      <tr><td align="center" style="padding:32px 16px">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px">
          <tr><td style="padding:0 4px 16px;font-size:20px;font-weight:bold;color:${COLORS.title}">Coop<span style="color:${COLORS.accent}">Seat</span></td></tr>
          <tr><td bgcolor="${COLORS.card}" style="background:${COLORS.card};border-radius:12px;padding:32px;font-size:15px;color:${COLORS.text}">
            ${heading(en, 'h1')}
            ${actionHtml}
            ${note(en.note)}
            <hr style="margin:8px 0 24px;border:0;border-top:1px solid ${COLORS.border}">
            <div lang="pt-BR">
            ${heading(pt, 'h2')}
            ${note(pt.note)}
            </div>
            ${fallbackHtml}
          </td></tr>
          <tr><td style="padding:16px 4px 0;font-size:12px;line-height:1.5;color:${COLORS.muted}">
            Automatic message, please do not reply. Questions: ${SUPPORT_EMAIL}<br>
            Mensagem automática, não responda. Dúvidas: ${SUPPORT_EMAIL}<br>
            <a href="${siteUrl}" style="color:${COLORS.muted}">${host}</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
`;
}

const NOT_YOU_EN = `If this wasn't you, reset your password right away and write to ${SUPPORT_EMAIL}.`;
const NOT_YOU_PT = `Se não foi você, redefina sua senha agora e escreva para ${SUPPORT_EMAIL}.`;

/**
 * Every Auth e-mail CoopSeat sends. `kind` decides the Supabase config keys: `auth` e-mails are triggered by
 * a user request, `notification` ones are security alerts sent after the change.
 * @param {string} appUrl
 */
export function authEmails(appUrl) {
  const siteUrl = appUrl.replace(/\/$/, '');
  const forgot = `${siteUrl}/forgot-password`;
  const securityAlert = (
    /** @type {Omit<Parameters<typeof renderEmail>[0], 'siteUrl' | 'action'>} */ email,
  ) =>
    renderEmail({
      siteUrl,
      ...email,
      action: {
        href: forgot,
        label: 'Reset password / Redefinir senha',
        fallback: false,
      },
    });

  return {
    confirmation: {
      kind: 'auth',
      subject: 'Confirm your CoopSeat e-mail / Confirme seu e-mail no CoopSeat',
      html: renderEmail({
        siteUrl,
        preheader: 'Activate your account · Ative sua conta',
        en: {
          title: 'Welcome to CoopSeat',
          body: 'Confirm your e-mail to activate your account. The link is valid for 1 hour.',
          note: 'If you did not create a CoopSeat account, ignore this e-mail.',
        },
        pt: {
          title: 'Bem-vindo ao CoopSeat',
          body: 'Confirme seu e-mail pelo botão acima para ativar a conta. O link vale por 1 hora.',
          note: 'Se você não criou uma conta no CoopSeat, ignore este e-mail.',
        },
        action: {
          href: confirmUrl('signup'),
          label: 'Confirm e-mail / Confirmar e-mail',
        },
      }),
    },
    invite: {
      kind: 'auth',
      subject:
        "You're invited to CoopSeat / Você foi convidado para o CoopSeat",
      html: renderEmail({
        siteUrl,
        preheader: 'Accept the invite · Aceite o convite',
        en: {
          title: "You're invited to CoopSeat",
          body: 'Accept the invite to activate your account. Then set a password under My account. The link is valid for 1 hour.',
          note: "If you weren't expecting this invite, ignore this e-mail.",
        },
        pt: {
          title: 'Você foi convidado para o CoopSeat',
          body: 'Aceite o convite pelo botão acima para ativar a conta e depois crie uma senha em Minha conta. O link vale por 1 hora.',
          note: 'Se você não esperava este convite, ignore este e-mail.',
        },
        action: {
          href: confirmUrl('invite'),
          label: 'Accept invite / Aceitar convite',
        },
      }),
    },
    magic_link: {
      kind: 'auth',
      subject: 'Your CoopSeat sign-in link / Seu link de acesso ao CoopSeat',
      html: renderEmail({
        siteUrl,
        preheader: 'Sign in with one click · Entre com um clique',
        en: {
          title: 'Sign in to CoopSeat',
          body: 'Use the button below to sign in. The link is valid for 1 hour and works only once.',
          note: "If this wasn't you, ignore this e-mail.",
        },
        pt: {
          title: 'Acesse o CoopSeat',
          body: 'Use o botão acima para entrar. O link vale por 1 hora e só funciona uma vez.',
          note: 'Se não foi você, ignore este e-mail.',
        },
        action: { href: confirmUrl('magiclink'), label: 'Sign in / Entrar' },
      }),
    },
    recovery: {
      kind: 'auth',
      subject: 'CoopSeat password reset / Redefinição de senha do CoopSeat',
      html: renderEmail({
        siteUrl,
        preheader: 'Choose a new password · Escolha uma nova senha',
        en: {
          title: 'Reset password',
          body: 'We received a request to reset the password of your CoopSeat account. The link is valid for 1 hour.',
          note: "If this wasn't you, ignore this e-mail. Your password stays the same.",
        },
        pt: {
          title: 'Redefinir senha',
          body: 'Recebemos um pedido para redefinir a senha da sua conta CoopSeat. Use o botão acima; o link vale por 1 hora.',
          note: 'Se não foi você, ignore este e-mail. Sua senha continua a mesma.',
        },
        action: {
          href: confirmUrl('recovery'),
          label: 'Create new password / Criar nova senha',
        },
      }),
    },
    // Accounts created without an e-mail have an empty {{ .Email }}; secure e-mail change sends this to both addresses.
    email_change: {
      kind: 'auth',
      subject:
        'Confirm your new CoopSeat e-mail / Confirme seu novo e-mail no CoopSeat',
      html: renderEmail({
        siteUrl,
        preheader: 'Confirm the e-mail change · Confirme a troca de e-mail',
        en: {
          title: 'Confirm your e-mail change',
          body:
            '{{ if .Email }}Confirm changing your CoopSeat account e-mail from <strong>{{ .Email }}</strong> to <strong>{{ .NewEmail }}</strong>. ' +
            'For your security we sent this link to both addresses: confirm on both to finish.' +
            '{{ else }}Confirm <strong>{{ .NewEmail }}</strong> as the e-mail of your CoopSeat account.{{ end }} The link is valid for 1 hour.',
          note: `If this wasn't you, change your password right away and write to ${SUPPORT_EMAIL}.`,
        },
        pt: {
          title: 'Confirme a troca de e-mail',
          body:
            '{{ if .Email }}Confirme pelo botão acima a troca do e-mail da sua conta CoopSeat de <strong>{{ .Email }}</strong> para <strong>{{ .NewEmail }}</strong>. ' +
            'Por segurança, enviamos este link aos dois endereços: confirme nos dois para concluir.' +
            '{{ else }}Confirme pelo botão acima <strong>{{ .NewEmail }}</strong> como e-mail da sua conta CoopSeat.{{ end }} O link vale por 1 hora.',
          note: `Se não foi você, altere sua senha agora e escreva para ${SUPPORT_EMAIL}.`,
        },
        action: {
          href: confirmUrl('email_change'),
          label: 'Confirm change / Confirmar troca',
        },
      }),
    },
    reauthentication: {
      kind: 'auth',
      subject:
        'Your CoopSeat verification code / Seu código de verificação do CoopSeat',
      html: renderEmail({
        siteUrl,
        preheader: 'Your verification code · Seu código de verificação',
        en: {
          title: 'Verification code',
          body: 'Enter this code in CoopSeat to confirm it is you. It is valid for 1 hour.',
          note: `If you didn't request a code, someone may know your password: change it and write to ${SUPPORT_EMAIL}.`,
        },
        pt: {
          title: 'Código de verificação',
          body: 'Digite o código acima no CoopSeat para confirmar que é você. Ele vale por 1 hora.',
          note: `Se você não pediu um código, alguém pode saber sua senha: troque-a e escreva para ${SUPPORT_EMAIL}.`,
        },
        action: { code: '{{ .Token }}' },
      }),
    },
    password_changed: {
      kind: 'notification',
      subject:
        'Your CoopSeat password was changed / A senha do seu CoopSeat foi alterada',
      html: securityAlert({
        preheader: 'Security alert · Alerta de segurança',
        en: {
          title: 'Your password was changed',
          body: 'The password of your CoopSeat account (<strong>{{ .Email }}</strong>) was just changed.',
          note: NOT_YOU_EN,
        },
        pt: {
          title: 'Sua senha foi alterada',
          body: 'A senha da sua conta CoopSeat (<strong>{{ .Email }}</strong>) acabou de ser alterada.',
          note: NOT_YOU_PT,
        },
      }),
    },
    email_changed: {
      kind: 'notification',
      subject:
        'Your CoopSeat e-mail was changed / O e-mail do seu CoopSeat foi alterado',
      html: securityAlert({
        preheader: 'Security alert · Alerta de segurança',
        en: {
          title: 'Your e-mail was changed',
          body: 'The e-mail of your CoopSeat account was changed from <strong>{{ .OldEmail }}</strong> to <strong>{{ .Email }}</strong>.',
          note: `If this wasn't you, write to ${SUPPORT_EMAIL} right away.`,
        },
        pt: {
          title: 'Seu e-mail foi alterado',
          body: 'O e-mail da sua conta CoopSeat foi alterado de <strong>{{ .OldEmail }}</strong> para <strong>{{ .Email }}</strong>.',
          note: `Se não foi você, escreva agora para ${SUPPORT_EMAIL}.`,
        },
      }),
    },
    mfa_factor_enrolled: {
      kind: 'notification',
      subject:
        'Two-step verification turned on / Verificação em duas etapas ativada',
      html: securityAlert({
        preheader: 'Security alert · Alerta de segurança',
        en: {
          title: 'Two-step verification added',
          body: 'A verification method ({{ .FactorType }}) was added to your CoopSeat account (<strong>{{ .Email }}</strong>).',
          note: NOT_YOU_EN,
        },
        pt: {
          title: 'Verificação em duas etapas adicionada',
          body: 'Um método de verificação ({{ .FactorType }}) foi adicionado à sua conta CoopSeat (<strong>{{ .Email }}</strong>).',
          note: NOT_YOU_PT,
        },
      }),
    },
    mfa_factor_unenrolled: {
      kind: 'notification',
      subject:
        'Two-step verification removed / Verificação em duas etapas removida',
      html: securityAlert({
        preheader: 'Security alert · Alerta de segurança',
        en: {
          title: 'Two-step verification removed',
          body: 'A verification method ({{ .FactorType }}) was removed from your CoopSeat account (<strong>{{ .Email }}</strong>).',
          note: NOT_YOU_EN,
        },
        pt: {
          title: 'Verificação em duas etapas removida',
          body: 'Um método de verificação ({{ .FactorType }}) foi removido da sua conta CoopSeat (<strong>{{ .Email }}</strong>).',
          note: NOT_YOU_PT,
        },
      }),
    },
    identity_linked: {
      kind: 'notification',
      subject:
        'New sign-in method on CoopSeat / Novo método de acesso no CoopSeat',
      html: securityAlert({
        preheader: 'Security alert · Alerta de segurança',
        en: {
          title: 'Sign-in method linked',
          body: 'Your <strong>{{ .Provider }}</strong> account can now sign in to your CoopSeat account (<strong>{{ .Email }}</strong>).',
          note: NOT_YOU_EN,
        },
        pt: {
          title: 'Método de acesso vinculado',
          body: 'Sua conta <strong>{{ .Provider }}</strong> agora pode entrar na sua conta CoopSeat (<strong>{{ .Email }}</strong>).',
          note: NOT_YOU_PT,
        },
      }),
    },
    identity_unlinked: {
      kind: 'notification',
      subject:
        'Sign-in method removed from CoopSeat / Método de acesso removido do CoopSeat',
      html: securityAlert({
        preheader: 'Security alert · Alerta de segurança',
        en: {
          title: 'Sign-in method removed',
          body: 'Your <strong>{{ .Provider }}</strong> account can no longer sign in to your CoopSeat account (<strong>{{ .Email }}</strong>).',
          note: NOT_YOU_EN,
        },
        pt: {
          title: 'Método de acesso removido',
          body: 'Sua conta <strong>{{ .Provider }}</strong> não pode mais entrar na sua conta CoopSeat (<strong>{{ .Email }}</strong>).',
          note: NOT_YOU_PT,
        },
      }),
    },
  };
}

/** Management API `config/auth` fields for every template; notifications are switched on as well. */
export function authEmailConfig(appUrl) {
  /** @type {Record<string, string | boolean>} */
  const config = {};
  for (const [name, email] of Object.entries(authEmails(appUrl))) {
    if (email.kind === 'auth') {
      config[`mailer_subjects_${name}`] = email.subject;
      config[`mailer_templates_${name}_content`] = email.html;
    } else {
      config[`mailer_notifications_${name}_enabled`] = true;
      config[`mailer_subjects_${name}_notification`] = email.subject;
      config[`mailer_templates_${name}_notification_content`] = email.html;
    }
  }
  return config;
}
