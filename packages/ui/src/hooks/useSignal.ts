import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, ServerMessage } from '../party/protocol';
import { SignalClient, type SignalStatus } from '../lib/party/signal-client';

type Options = {
  url: string | null;
  token(): Promise<string | null>;
  onMessage(msg: ServerMessage): void;
  onInvalid(): Promise<boolean>;
  onEnded?(reason: string): void;
};

/** Keeps one SignalClient per signal URL (i.e. per session) for the component's lifetime. */
export function useSignal({ url, token, onMessage, onInvalid, onEnded }: Options) {
  const [status, setStatus] = useState<SignalStatus>('closed');
  const client = useRef<SignalClient | null>(null);
  const refs = useRef({ token, onMessage, onInvalid, onEnded });
  refs.current = { token, onMessage, onInvalid, onEnded };

  useEffect(() => {
    if (!url) return;
    const c = new SignalClient({
      url,
      token: () => refs.current.token(),
      onMessage: (m) => refs.current.onMessage(m),
      onInvalid: () => refs.current.onInvalid(),
      onEnded: (reason) => refs.current.onEnded?.(reason),
      onStatus: setStatus,
    });
    client.current = c;
    return () => {
      c.close();
      if (client.current === c) client.current = null;
    };
  }, [url]);

  const send = useCallback(
    (msg: ClientMessage) => client.current?.send(msg),
    [],
  );
  const reauth = useCallback(
    () => client.current?.reauth() ?? Promise.resolve(),
    [],
  );
  return { status, send, reauth };
}
