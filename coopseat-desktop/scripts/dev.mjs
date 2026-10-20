import { watch } from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import electron from 'electron';

const server = await createServer();
await server.listen();

let child = null;
let restarting = false;
let queued = false;
let quitting = false;
let restartTimer = null;

function launch() {
  const proc = spawn(electron, ['.'], {
    stdio: 'inherit',
    env: { ...process.env, INPUT_DEV: '1' },
  });
  child = proc;
  proc.on('exit', async (code) => {
    if (child === proc) child = null;
    if (restarting) return;
    await server.close();
    process.exit(code ?? 0);
  });
}

async function restart() {
  if (quitting) return;
  if (restarting) {
    queued = true;
    return;
  }
  const current = child;
  if (!current) {
    launch();
    return;
  }
  restarting = true;
  console.log('Reiniciando o Electron…');
  const exited = new Promise((resolve) => current.once('exit', resolve));
  current.kill();
  await exited;
  restarting = false;
  if (quitting) {
    await server.close();
    process.exit(0);
  }
  launch();
  if (queued) {
    queued = false;
    await restart();
  }
}

function scheduleRestart() {
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    void restart();
  }, 200);
}

watch(path.resolve('electron'), { recursive: true }, (_event, filename) => {
  if (!filename || !/\.(cjs|mjs|js|json)$/i.test(filename)) return;
  scheduleRestart();
});

launch();

for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    quitting = true;
    child?.kill();
  });
