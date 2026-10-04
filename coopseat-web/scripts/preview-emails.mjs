// Writes every Auth e-mail with sample data to .email-preview/ so they can be checked in a browser.
// Usage: npm run email:preview
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { authEmails } from '../supabase/templates/emails.mjs';

const appUrl = 'https://coopseat.com';
const sample = {
  SiteURL: appUrl,
  TokenHash: 'pkce_0123456789abcdef',
  Token: '482913',
  Email: 'player@example.com',
  NewEmail: 'new-address@example.com',
  OldEmail: 'old-address@example.com',
  Provider: 'google',
  FactorType: 'totp',
};

/** Covers the subset of Go templates the e-mails use: `{{ .Var }}` and `{{ if .Var }}…{{ else }}…{{ end }}`. */
function fill(html, data) {
  return html
    .replace(/\{\{ if \.(\w+) \}\}([\s\S]*?)(?:\{\{ else \}\}([\s\S]*?))?\{\{ end \}\}/g, (_, key, yes, no = '') => (data[key] ? yes : no))
    .replace(/\{\{ \.(\w+) \}\}/g, (_, key) => {
      if (!(key in data)) throw new Error(`No sample value for {{ .${key} }}`);
      return data[key];
    });
}

const out = join(import.meta.dirname, '..', '.email-preview');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const pages = [];
for (const [name, email] of Object.entries(authEmails(appUrl))) {
  const variants = name === 'email_change' ? [['', sample], ['-no-email', { ...sample, Email: '' }]] : [['', sample]];
  for (const [suffix, data] of variants) {
    const file = `${name}${suffix}.html`;
    await writeFile(join(out, file), fill(email.html, data));
    pages.push(`<li><a href="${file}">${name}${suffix}</a> <small>(${email.kind})</small> ${fill(email.subject, data)}</li>`);
  }
}
await writeFile(join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>CoopSeat e-mails</title><ul>${pages.join('')}</ul>`);
console.log(`Wrote ${pages.length} previews to ${join(out, 'index.html')}`);
