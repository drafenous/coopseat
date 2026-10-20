import { AsyncLocalStorage } from 'node:async_hooks';

const authDb = new AsyncLocalStorage<true>();

/** Runs `fn` so `adminDb()` uses the auth pool instead of the application pool. */
export function withAuthDb<T>(fn: () => Promise<T>): Promise<T> {
  return authDb.run(true, fn);
}

export function useAuthDb(): boolean {
  return authDb.getStore() === true;
}
