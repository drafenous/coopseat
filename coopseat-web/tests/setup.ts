import { generateKeyPairSync } from 'node:crypto';

process.env.APP_URL = 'https://coopseat.com';
process.env.SUPABASE_URL = 'https://project.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
process.env.TICKET_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.DOC_FINGERPRINT_SECRET = 'fingerprint-test-secret';
process.env.TURNSTILE_SECRET_KEY = '';

const roomKeys = generateKeyPairSync('ed25519', {
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
process.env.PARTY_TOKEN_PRIVATE_KEY = roomKeys.privateKey;
process.env.PARTY_TOKEN_PUBLIC_KEY = roomKeys.publicKey;
process.env.PARTY_SIGNAL_URL = 'https://signal.test';
process.env.PARTY_SIGNAL_SECRET = 'signal-test-secret';
