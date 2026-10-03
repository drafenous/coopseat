// Applies the CoopSeat Auth settings through the Supabase Management API.
// Usage: SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... npm run supabase:configure
// OAuth client ids/secrets and RESEND_API_KEY (or SMTP_*) are read from the env when present.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: ['.env.local', '.env'], quiet: true });
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
const appUrl = (process.env.APP_URL ?? 'https://coopseat.com').replace(/\/$/, '');
if (!token || !ref) {
  console.error('Set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.');
  process.exit(1);
}

const templates = join(import.meta.dirname, '..', 'supabase', 'templates');
const tpl = (name) => readFile(join(templates, `${name}.html`), 'utf8');

function provider(name, idVar, secretVar) {
  const id = process.env[idVar];
  const secret = process.env[secretVar];
  if (!id || !secret) return {};
  return {
    [`external_${name}_enabled`]: true,
    [`external_${name}_client_id`]: id,
    [`external_${name}_secret`]: secret,
  };
}

// Resend SMTP by default; SMTP_* overrides it with another provider.
const resendKey = process.env.RESEND_API_KEY;
const smtpServer = process.env.SMTP_HOST
  ? {
      smtp_host: process.env.SMTP_HOST,
      smtp_port: process.env.SMTP_PORT ?? '587',
      smtp_user: process.env.SMTP_USER,
      smtp_pass: process.env.SMTP_PASS,
    }
  : resendKey
    ? { smtp_host: 'smtp.resend.com', smtp_port: '465', smtp_user: 'resend', smtp_pass: resendKey }
    : null;
const smtp = smtpServer
  ? { ...smtpServer, smtp_admin_email: 'no-reply@coopseat.com', smtp_sender_name: 'CoopSeat', rate_limit_email_sent: 100 }
  : {};

// The free plan rejects the leaked-password check and, without custom SMTP, custom templates.
const pro = process.env.SUPABASE_PLAN === 'pro';
const customTemplates = Boolean(smtpServer) || pro;
const emailTemplates = customTemplates
  ? {
      mailer_subjects_confirmation: 'Confirm your CoopSeat e-mail / Confirme seu e-mail no CoopSeat',
      mailer_subjects_recovery: 'CoopSeat password reset / Redefinição de senha do CoopSeat',
      mailer_subjects_email_change: 'Confirm your new CoopSeat e-mail / Confirme seu novo e-mail no CoopSeat',
      mailer_subjects_magic_link: 'Your CoopSeat sign-in link / Seu link de acesso ao CoopSeat',
      mailer_templates_confirmation_content: await tpl('confirmation'),
      mailer_templates_recovery_content: await tpl('recovery'),
      mailer_templates_email_change_content: await tpl('email-change'),
      mailer_templates_magic_link_content: await tpl('magic-link'),
    }
  : {};

const config = {
  site_url: appUrl,
  uri_allow_list: [...new Set([`${appUrl}/**`, 'https://coopseat.com/**', 'http://localhost:3000/**'])].join(','),
  disable_signup: false,
  mailer_autoconfirm: false,
  mailer_secure_email_change_enabled: true,
  mailer_otp_exp: 3600,
  security_manual_linking_enabled: true,
  password_min_length: 8,
  password_required_characters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789',
  password_hibp_enabled: pro,
  security_refresh_token_reuse_interval: 10,
  jwt_exp: 3600,
  mfa_totp_enroll_enabled: true,
  mfa_totp_verify_enabled: true,
  mfa_max_enrolled_factors: 3,
  hook_custom_access_token_enabled: true,
  hook_custom_access_token_uri: 'pg-functions://postgres/public/custom_access_token_hook',
  // Captcha is verified by the BFF (Turnstile); GoTrue is only reachable through it.
  security_captcha_enabled: false,
  ...emailTemplates,
  ...provider('google', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'),
  ...provider('facebook', 'FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET'),
  ...provider('x', 'X_CLIENT_ID', 'X_CLIENT_SECRET'),
  ...provider('discord', 'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET'),
  ...smtp,
};

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(config),
});
if (!res.ok) {
  console.error(`Management API ${res.status}: ${await res.text()}`);
  process.exitCode = 1;
} else {
  console.log('Supabase Auth configured.');
  if (!pro) console.warn('Free plan: leaked-password protection (HaveIBeenPwned) is off. Set SUPABASE_PLAN=pro after upgrading.');
  if (!customTemplates) {
    console.warn(
      'Email templates skipped: set RESEND_API_KEY (or SMTP_*) to use the PT-BR templates. Until then Supabase sends its ' +
        'default emails (only to members of your Supabase organization) and password reset links will not work.',
    );
  }
}
