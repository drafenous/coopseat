import { createRequire } from 'node:module';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const { resolveBff } = createRequire(import.meta.url)('./electron/bff.cjs') as {
  resolveBff(input?: { packaged?: boolean; dev?: boolean; envName?: string; override?: string }): string;
};

export default defineConfig(({ command }) => {
  const bffUrl = command === 'build'
    ? resolveBff({ packaged: true })
    : resolveBff({ dev: true, envName: process.env.COOPSEAT_ENV, override: process.env.COOPSEAT_BFF_URL });
  return {
    plugins: [react(), tailwindcss(), {
      name: 'bff-csp',
      transformIndexHtml(html: string) {
        const devConnect = command === 'serve' ? 'ws://127.0.0.1:5173 ' : '';
        let next = html.replaceAll('%DEV_CONNECT%', devConnect).replaceAll('%BFF_ORIGIN%', bffUrl);
        if (command === 'serve') next = next.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'");
        return next;
      },
    }],
    base: './',
    resolve: { dedupe: ['react', 'react-dom'] },
    server: { host: '127.0.0.1', port: 5173, strictPort: true },
  };
});
