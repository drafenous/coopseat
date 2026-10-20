import { createRequire } from 'node:module';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

type Resolve = (input?: {
  packaged?: boolean;
  dev?: boolean;
  envName?: string;
  override?: string;
}) => string;
const { resolveBff, resolveSignal, socketOrigin } = createRequire(
  import.meta.url,
)('./electron/bff.cjs') as {
  resolveBff: Resolve;
  resolveSignal: Resolve;
  socketOrigin(httpOrigin: string): string;
};

export default defineConfig(({ command }) => {
  const resolve = (fn: Resolve, override?: string) =>
    command === 'build'
      ? fn({ packaged: true })
      : fn({ dev: true, envName: process.env.COOPSEAT_ENV, override });
  const bffUrl = resolve(resolveBff, process.env.COOPSEAT_BFF_URL);
  const signalUrl = resolve(resolveSignal, process.env.COOPSEAT_SIGNAL_URL);
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'bff-csp',
        transformIndexHtml(html: string) {
          const devConnect = command === 'serve' ? 'ws://127.0.0.1:5173 ' : '';
          let next = html
            .replaceAll('%DEV_CONNECT%', devConnect)
            .replaceAll('%BFF_ORIGIN%', bffUrl)
            .replaceAll(
              '%SIGNAL_ORIGINS%',
              `${signalUrl} ${socketOrigin(signalUrl)}`,
            );
          if (command === 'serve')
            next = next.replace(
              "script-src 'self'",
              "script-src 'self' 'unsafe-inline'",
            );
          return next;
        },
      },
    ],
    base: './',
    resolve: { dedupe: ['react', 'react-dom'] },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      // Main-process files are not in the renderer graph. A page reload would
      // call IPC on the Electron process that has not loaded them yet.
      watch: { ignored: ['**/electron/**', '**/tests/**'] },
    },
  };
});
