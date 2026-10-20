import { resolve4, resolve6, resolveMx } from 'node:dns/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assertLegitimateEmail } from '@/server/email-legitimacy';
import { ApiError } from '@/server/http';

vi.mock('node:dns/promises', () => ({
  resolveMx: vi.fn(),
  resolve4: vi.fn(),
  resolve6: vi.fn(),
}));

function dnsError(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(code), { code });
}

beforeEach(() => {
  vi.mocked(resolveMx).mockReset();
  vi.mocked(resolve4).mockReset();
  vi.mocked(resolve6).mockReset();
  vi.mocked(resolveMx).mockImplementation(async (domain: string) => {
    if (
      domain === 'gmail.com' ||
      domain === 'privaterelay.appleid.com' ||
      domain === 'hide.anonaddy.com' ||
      domain === 'anonaddy.com'
    ) {
      return [{ exchange: 'mx.example', priority: 10 }];
    }
    if (domain === 'no-mx.test') throw dnsError('ENODATA');
    if (domain === 'dns-down.test') throw dnsError('ESERVFAIL');
    throw dnsError('ENOTFOUND');
  });
  vi.mocked(resolve4).mockRejectedValue(dnsError('ENOTFOUND'));
  vi.mocked(resolve6).mockRejectedValue(dnsError('ENOTFOUND'));
});

async function codeOf(email: string): Promise<string | undefined> {
  try {
    await assertLegitimateEmail(email);
    return undefined;
  } catch (err) {
    expect(err).toBeInstanceOf(ApiError);
    return (err as ApiError).code;
  }
}

describe('assertLegitimateEmail', () => {
  it('rejects disposable domains and their subdomains', async () => {
    expect(await codeOf('person@mailinator.com')).toBe('email_disposable');
    expect(await codeOf('person@a.mailinator.com')).toBe('email_disposable');
    expect(await codeOf('person@foo.freeml.net')).toBe('email_disposable');
    expect(resolveMx).not.toHaveBeenCalled();
  });

  it('accepts a normal provider and a permanent alias relay', async () => {
    await expect(
      assertLegitimateEmail('Person@Gmail.com'),
    ).resolves.toBeUndefined();
    await expect(
      assertLegitimateEmail('hide@privaterelay.appleid.com'),
    ).resolves.toBeUndefined();
    await expect(
      assertLegitimateEmail('box@hide.anonaddy.com'),
    ).resolves.toBeUndefined();
    expect(resolveMx).toHaveBeenCalledWith('gmail.com');
    expect(resolveMx).toHaveBeenCalledWith('privaterelay.appleid.com');
    expect(resolveMx).toHaveBeenCalledWith('hide.anonaddy.com');
  });

  it('rejects a domain with no mail exchanger', async () => {
    expect(await codeOf('person@no-mx.test')).toBe('email_undeliverable');
    expect(resolve4).toHaveBeenCalledWith('no-mx.test');
    expect(resolve6).toHaveBeenCalledWith('no-mx.test');
  });

  it('accepts the address when the resolver fails', async () => {
    await expect(
      assertLegitimateEmail('person@dns-down.test'),
    ).resolves.toBeUndefined();
  });
});
