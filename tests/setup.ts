process.env.APP_URL = 'https://coopseat.com';
process.env.SUPABASE_URL = 'https://project.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
process.env.TICKET_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.DOC_FINGERPRINT_SECRET = 'fingerprint-test-secret';
process.env.TURNSTILE_SECRET_KEY = '';
