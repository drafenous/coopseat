import { resolve4, resolve6, resolveMx } from 'node:dns/promises';
import domains from 'disposable-email-domains';
import wildcards from 'disposable-email-domains/wildcard.json';
import { ApiError } from './http';

/**
 * Domains seen in signups that `disposable-email-domains` does not list yet.
 * Match the registrable domain (`temp-mail.example`), not a single address.
 */
const EXTRA_BLOCKED: readonly string[] = [];

/**
 * Permanent alias services. They are real mailboxes, even when a disposable
 * list mentions the domain (AnonAddy is on the wildcard list).
 */
const ALLOWED = new Set([
  'privaterelay.appleid.com',
  'relay.firefox.com',
  'mozmail.com',
  'duck.com',
  'simplelogin.com',
  'simplelogin.fr',
  'slmail.me',
  'aleeas.com',
  'anonaddy.com',
  'anonaddy.me',
  'addy.io',
]);

const BLOCKED = new Set<string>([...domains, ...EXTRA_BLOCKED]);
const WILDCARDS = new Set<string>(wildcards);

const CACHE_TTL_MS = 60 * 60 * 1000;
const LOOKUP_TIMEOUT_MS = 2000;

type Probe = 'found' | 'absent' | 'nxdomain' | 'error';

const deliverability = new Map<
  string,
  { deliverable: boolean | null; expiresAt: number }
>();

/** The domain itself, then each parent, stopping before the TLD. */
function suffixes(domain: string): string[] {
  const labels = domain.split('.');
  const out: string[] = [];
  for (let i = 0; i < labels.length - 1; i++)
    out.push(labels.slice(i).join('.'));
  return out;
}

function emailDomain(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at !== trimmed.indexOf('@')) return null;
  let domain = trimmed.slice(at + 1);
  if (domain.endsWith('.')) domain = domain.slice(0, -1);
  if (
    domain.length === 0 ||
    domain.length > 253 ||
    !domain.includes('.') ||
    domain.startsWith('.') ||
    domain.includes('..') ||
    /[\s[\]]/.test(domain)
  )
    return null;
  return domain;
}

function isDisposableDomain(domain: string): boolean {
  const parts = suffixes(domain);
  if (parts.some((suffix) => ALLOWED.has(suffix))) return false;
  return parts.some(
    (suffix, index) =>
      BLOCKED.has(suffix) || (index > 0 && WILDCARDS.has(suffix)),
  );
}

function dnsCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error('dns timeout') as NodeJS.ErrnoException;
      err.code = 'ETIMEOUT';
      reject(err);
    }, LOOKUP_TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function probe(
  domain: string,
  run: () => Promise<readonly unknown[]>,
): Promise<Probe> {
  try {
    const records = await withTimeout(run());
    return records.length > 0 ? 'found' : 'absent';
  } catch (err) {
    const code = dnsCode(err);
    if (code === 'ENOTFOUND' || code === 'NXDOMAIN') return 'nxdomain';
    if (code === 'ENODATA') return 'absent';
    console.error('email domain lookup failed', domain, code ?? err);
    return 'error';
  }
}

/** True when the domain can receive mail, false when it cannot, null when DNS did not answer. */
async function domainAcceptsMail(domain: string): Promise<boolean | null> {
  const now = Date.now();
  const cached = deliverability.get(domain);
  if (cached && cached.expiresAt > now) return cached.deliverable;

  const mx = await probe(domain, () => resolveMx(domain));
  let deliverable: boolean | null;
  if (mx === 'found') deliverable = true;
  else if (mx === 'error') deliverable = null;
  else if (mx === 'nxdomain') deliverable = false;
  else {
    const [v4, v6] = await Promise.all([
      probe(domain, () => resolve4(domain)),
      probe(domain, () => resolve6(domain)),
    ]);
    if (v4 === 'found' || v6 === 'found') deliverable = true;
    else if (v4 === 'error' || v6 === 'error') deliverable = null;
    else deliverable = false;
  }

  deliverability.set(domain, {
    deliverable,
    expiresAt: now + CACHE_TTL_MS,
  });
  return deliverable;
}

/** Rejects disposable domains and domains that cannot receive the confirmation mail. */
export async function assertLegitimateEmail(email: string): Promise<void> {
  const domain = emailDomain(email);
  if (!domain) throw new ApiError(400, 'email_invalid');
  if (isDisposableDomain(domain)) throw new ApiError(400, 'email_disposable');
  const accepts = await domainAcceptsMail(domain);
  if (accepts === false) throw new ApiError(400, 'email_undeliverable');
}
