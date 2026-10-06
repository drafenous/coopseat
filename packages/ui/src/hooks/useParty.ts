import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LAYOUTS,
  ROOM_TOKEN_REFRESH_MS,
  type EndReason,
  type Layout,
  type Participant,
  type PendingUser,
  type RemovalReason,
  type Self,
  type ServerMessage,
} from '../party/protocol';
import { ApiError } from '../lib/api';
import { errorText } from '../lib/errors';
import {
  isLive,
  partyApi,
  type Access,
  type LiveAccess,
} from '../lib/party/api';
import { slotQuality, stageSlots } from '../lib/party/layout';
import type { StreamSource } from '../lib/stream-source';
import { PARTY_LAYOUT_KEY } from '../lib/storage';
import { useT } from '../i18n';
import { useChat } from './useChat';
import { usePeerMesh } from './usePeerMesh';
import { useSignal } from './useSignal';
import { useStreamSource } from './useStreamSource';

export type PartyPhase =
  | 'loading'
  | 'gate'
  | 'connecting'
  | 'pending'
  | 'live'
  | 'ended'
  | 'removed'
  | 'error';
type Options = {
  nickname: string;
  enabled: boolean;
  setError(message: string): void;
  setNotice(message: string): void;
};

const OFFLINE_POLL_MS = 30_000;
/** Server errors that mean our stream_start was refused. */
const STREAM_REFUSED = new Set([
  'owner_not_live',
  'stream_full',
  'stream_forbidden',
]);

function savedLayout(): Layout | null {
  try {
    const v = localStorage.getItem(PARTY_LAYOUT_KEY);
    return (LAYOUTS as readonly string[]).includes(v ?? '')
      ? (v as Layout)
      : null;
  } catch {
    return null;
  }
}

/** Everything a Gaming-Party client needs: admission, the signaling socket, presence, chat, streams and moderation. */
export function useParty({ nickname, enabled, setError, setNotice }: Options) {
  const t = useT().party;
  const tRef = useRef(t);
  tRef.current = t;
  const [access, setAccessState] = useState<Access | null>(null);
  const accessRef = useRef<Access | null>(null);
  const [phase, setPhase] = useState<PartyPhase>('loading');
  const [failure, setFailure] = useState('');
  const [self, setSelf] = useState<Self | null>(null);
  const [peers, setPeers] = useState<Record<string, Participant>>({});
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [requests, setRequests] = useState<PendingUser[]>([]);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [requested, setRequested] = useState(false);
  const [endReason, setEndReason] = useState<EndReason | null>(null);
  const [removedReason, setRemovedReason] = useState<RemovalReason | null>(
    null,
  );
  const [endsAt, setEndsAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [layout, setLayoutState] = useState<Layout | null>(savedLayout);
  const [focus, setFocus] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  /** A stream_start waiting for this session's socket to be authenticated. */
  const [pendingStart, setPendingStart] = useState(false);
  const chat = useChat();
  /** Profile ids whose approve/deny request is already in flight. */
  const deciding = useRef(new Set<string>());

  const setAccess = useCallback((a: Access | null) => {
    accessRef.current = a;
    setAccessState(a);
  }, []);
  const live = access && isLive(access) ? access : null;
  const ownerId = access?.room.ownerId ?? '';
  const isOwner = Boolean(
    self?.role === 'owner' || (access?.state === 'offline' && access.isOwner),
  );

  const fail = useCallback(
    (e: unknown) => {
      setError(errorText(e));
    },
    [setError],
  );

  // ── admission ──

  const enter = useCallback(
    (a: Access) => {
      setAccess(a);
      if (isLive(a)) {
        setPhase((p) => (p === 'live' || p === 'pending' ? p : 'connecting'));
        setEndsAt(a.endsAt);
      } else setPhase('gate');
    },
    [setAccess],
  );

  const load = useCallback(
    async (body: { password?: string } = {}) => {
      if (!enabled) return;
      try {
        setFailure('');
        enter(await partyApi.join(nickname, body));
      } catch (e) {
        if (e instanceof ApiError && e.code === 'party_password_invalid')
          throw e;
        setFailure(errorText(e));
        setPhase('error');
      }
    },
    [enabled, nickname, enter],
  );

  useEffect(() => {
    setPhase('loading');
    void load();
  }, [load]);

  /** Renews the token for the same session; a non-live answer means admission was lost. */
  const refresh = useCallback(async (): Promise<boolean> => {
    const a = accessRef.current;
    if (!a || !isLive(a)) return false;
    try {
      const next = await partyApi.refresh(nickname, a.sessionId);
      if (isLive(next) && next.sessionId === a.sessionId) {
        setAccess(next);
        return true;
      }
      enter(next);
      return false;
    } catch (e) {
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
        fail(e);
        setPhase('error');
        setFailure(errorText(e));
        return false;
      }
      return true;
    }
  }, [nickname, enter, fail, setAccess]);

  // Offline rooms are re-checked now and then so viewers drop in when the owner goes live.
  useEffect(() => {
    if (phase !== 'gate' || access?.state !== 'offline' || access.isOwner)
      return;
    const id = setInterval(() => void load(), OFFLINE_POLL_MS);
    return () => clearInterval(id);
  }, [phase, access, load]);

  // ── signaling ──

  const tokenNow = useCallback(() => {
    const a = accessRef.current;
    return a && isLive(a) ? a.token : null;
  }, []);
  const signal = useSignal({
    url: live?.signalUrl ?? null,
    token: async () => tokenNow(),
    onMessage: (msg) => onMessageRef.current(msg),
    onInvalid: refresh,
  });
  const meshActive = phase === 'live' && Boolean(self);
  const mesh = usePeerMesh({
    selfId: self?.id ?? null,
    active: meshActive,
    token: tokenNow,
    send: signal.send,
  });
  // A source ending on its own (share stopped, capture stopped) must not end the session: the owner is
  // asked to pick a source again, members just stop.
  const stream = useStreamSource(() => {
    if (isOwner) setStale(true);
    else signal.send({ t: 'stream_stop' });
  });

  const resetSession = useCallback(() => {
    stream.stop();
    chat.reset();
    setPeers({});
    setPending([]);
    setRequests([]);
    setRequested(false);
    setSelf(null);
    setFocus(null);
    setStale(false);
    setPendingStart(false);
  }, [stream, chat]);

  const onMessage = (msg: ServerMessage) => {
    mesh.handle(msg);
    switch (msg.t) {
      case 'welcome':
        setSelf(msg.you);
        setEndsAt(msg.session.endsAt);
        setChatEnabled(msg.chatEnabled);
        setPeers(Object.fromEntries(msg.peers.map((p) => [p.id, p])));
        chat.reset(msg.chat);
        setPending(msg.pending);
        setRequests(msg.requests);
        setPhase(msg.you.status === 'pending' ? 'pending' : 'live');
        {
          const serverStreaming = msg.peers.some(
            (p) => p.id === msg.you.id && p.streaming,
          );
          // Live on the server but nothing to send (page reloaded): members just stop; the owner is asked
          // to pick a source again, since stopping would end the session.
          if (serverStreaming && !stream.source) {
            if (msg.you.role === 'owner') setStale(true);
            else signal.send({ t: 'stream_stop' });
          }
          // Sending locally but the server forgot it (reconnected after the grace window): announce again.
          else if (
            !serverStreaming &&
            stream.source &&
            msg.you.status === 'admitted'
          )
            setPendingStart(true);
        }
        break;
      case 'presence':
        setPeers((x) => ({ ...x, [msg.peer.id]: msg.peer }));
        if (msg.peer.id === self?.id)
          setSelf((s) => s && { ...s, canStream: msg.peer.canStream });
        break;
      case 'left':
        setPeers((x) => {
          const n = { ...x };
          delete n[msg.id];
          return n;
        });
        break;
      case 'chat':
        chat.add(msg.msg, msg.msg.from === self?.id);
        break;
      case 'chat_deleted':
        chat.remove(msg.id);
        break;
      case 'pending':
        setPending((x) => [...x.filter((p) => p.id !== msg.user.id), msg.user]);
        break;
      case 'pending_removed':
        setPending((x) => x.filter((p) => p.id !== msg.id));
        break;
      case 'stream_request':
        setRequests((x) => [
          ...x.filter((p) => p.id !== msg.user.id),
          msg.user,
        ]);
        break;
      case 'stream_request_removed':
        setRequests((x) => x.filter((p) => p.id !== msg.id));
        break;
      case 'approved':
      case 'refresh_token':
        void refresh().then((ok) => {
          if (ok) void signal.reauth();
        });
        break;
      case 'stream_granted':
        setRequested(false);
        setNotice(tRef.current.granted);
        break;
      case 'stream_revoked':
        setRequested(false);
        stream.stop();
        setNotice(tRef.current.revoked);
        break;
      case 'removed':
        resetSession();
        setRemovedReason(msg.reason);
        setPhase('removed');
        break;
      case 'session_end':
        resetSession();
        setEndReason(msg.reason);
        setPhase('ended');
        break;
      case 'error':
        if (STREAM_REFUSED.has(msg.code)) stream.stop();
        if (msg.code !== 'not_subscribed' && msg.code !== 'invalid_target')
          setError(
            tRef.current.errors[msg.code as keyof typeof t.errors] ??
              tRef.current.errors.generic,
          );
        break;
    }
  };
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  // Tokens last 10 minutes; renew well before and re-authenticate the open socket.
  useEffect(() => {
    if (!live) return;
    const id = setInterval(
      () =>
        void refresh().then((ok) => {
          if (ok) void signal.reauth();
        }),
      ROOM_TOKEN_REFRESH_MS,
    );
    return () => clearInterval(id);
  }, [live?.sessionId, refresh, signal.reauth]);

  // ── streams ──

  const selfPeer = self ? peers[self.id] : undefined;
  const streaming = Boolean(selfPeer?.streaming);
  const ownerLive = Boolean(peers[ownerId]?.streaming);
  const canStream = Boolean(
    self && !self.streamBlocked && (selfPeer?.canStream ?? self.canStream),
  );

  useEffect(() => {
    if (meshActive) void mesh.setLocalStream(stream.source?.stream ?? null);
  }, [meshActive, stream.source, mesh.setLocalStream]);

  const startStreaming = useCallback(
    async (source: StreamSource) => {
      setBusy(true);
      try {
        const a = accessRef.current;
        if (isOwner && (!a || !isLive(a))) {
          const next = await partyApi.startSession();
          enter(next);
          if (!isLive(next)) {
            source.stop();
            return;
          }
        }
        stream.use(source);
        setStale(false);
        // Not sent here: when this call just opened the session, its socket doesn't exist yet.
        setPendingStart(true);
      } catch (e) {
        source.stop();
        fail(e);
      } finally {
        setBusy(false);
      }
    },
    [isOwner, enter, stream, fail],
  );

  useEffect(() => {
    if (!pendingStart || phase !== 'live' || !self || signal.status !== 'open')
      return;
    setPendingStart(false);
    if (!stream.source) return;
    mesh.resetOutgoing();
    signal.send({ t: 'stream_start' });
  }, [
    pendingStart,
    phase,
    self,
    signal.status,
    signal.send,
    stream.source,
    mesh.resetOutgoing,
  ]);

  /** Swaps what is being sent without stopping the stream (tracks are replaced on every link). */
  const switchSource = useCallback(
    (source: StreamSource) => {
      stream.use(source);
    },
    [stream],
  );

  const stopStreaming = useCallback(async () => {
    signal.send({ t: 'stream_stop' });
    stream.stop();
    // The owner's stream defines the session: stopping it ends the session for everyone.
    if (isOwner) await partyApi.endSession().catch(fail);
  }, [signal, stream, isOwner, fail]);

  const requestStream = useCallback(() => {
    signal.send({ t: 'stream_request' });
    setRequested(true);
  }, [signal]);

  // ── layout and visibility ──

  const roomLayout = access?.room.defaultLayout ?? 'stage';
  const currentLayout = layout ?? roomLayout;
  const setLayout = useCallback((l: Layout) => {
    setLayoutState(l);
    try {
      localStorage.setItem(PARTY_LAYOUT_KEY, l);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const streamers = useMemo(
    () =>
      Object.values(peers)
        .filter((p) => p.streaming)
        .map((p) => p.id),
    [peers],
  );
  const slots = useMemo(
    () => stageSlots(currentLayout, streamers, focus, ownerId),
    [currentLayout, streamers, focus, ownerId],
  );
  useEffect(() => {
    if (!meshActive || !self) return;
    const wanted = slotQuality(currentLayout, slots);
    delete wanted[self.id];
    mesh.applyVisibility(wanted);
  }, [meshActive, self, currentLayout, slots, mesh.applyVisibility]);

  // ── moderation ──

  const perms = self?.mod ?? null;
  const act = useCallback(
    async (fn: () => Promise<unknown>, done?: string) => {
      try {
        await fn();
        if (done) setNotice(done);
      } catch (e) {
        fail(e);
      }
    },
    [fail, setNotice],
  );
  const moderation = {
    approve: (id: string, ok: boolean) => {
      if (deciding.current.has(id)) return;
      deciding.current.add(id);
      let removed: PendingUser | undefined;
      setPending((list) => {
        removed = list.find((p) => p.id === id);
        return list.filter((p) => p.id !== id);
      });
      return act(async () => {
        try {
          await partyApi.approve(nickname, id, ok);
        } catch (e) {
          if (removed) {
            const person = removed;
            setPending((list) =>
              list.some((p) => p.id === person.id) ? list : [...list, person],
            );
          }
          throw e;
        } finally {
          deciding.current.delete(id);
        }
      });
    },
    grant: (id: string) => signal.send({ t: 'stream_grant', to: id }),
    revoke: (id: string) => signal.send({ t: 'stream_revoke', to: id }),
    kill: (id: string) => signal.send({ t: 'stream_kill', to: id }),
    kick: (id: string) => signal.send({ t: 'kick', to: id }),
    ban: (id: string, hours?: number) =>
      act(
        () => partyApi.ban(nickname, id, hours ? { hours } : {}),
        tRef.current.banned,
      ),
    deleteMessage: (id: string) => signal.send({ t: 'chat_delete', id }),
  };

  const sendChat = useCallback(
    (text: string) => signal.send({ t: 'chat', text }),
    [signal],
  );
  const endSession = useCallback(async () => {
    signal.send({ t: 'end' });
    stream.stop();
    await partyApi.endSession().catch(fail);
  }, [signal, stream, fail]);
  const leave = useCallback(() => {
    resetSession();
    setAccess(null);
    setPhase('loading');
  }, [resetSession, setAccess]);
  const rejoin = useCallback(() => {
    setEndReason(null);
    setRemovedReason(null);
    setPhase('loading');
    void load();
  }, [load]);

  return {
    nickname,
    phase,
    failure,
    access,
    live: live as LiveAccess | null,
    self,
    peers,
    pending,
    requests,
    chat,
    chatEnabled,
    endsAt,
    isOwner,
    ownerId,
    ownerLive,
    streaming,
    canStream,
    requested,
    busy,
    perms,
    stale,
    signalStatus: signal.status,
    endReason,
    removedReason,
    layout: currentLayout,
    setLayout,
    focus,
    setFocus,
    slots,
    source: stream.source,
    remoteStreams: mesh.streams,
    links: mesh.links,
    metrics: mesh.metrics,
    join: load,
    rejoin,
    leave,
    startStreaming,
    switchSource,
    stopStreaming,
    requestStream,
    sendChat,
    endSession,
    moderation,
  };
}

export type Party = ReturnType<typeof useParty>;
