import { useCallback, useRef, useState } from 'react';
import {
  CHAT_HISTORY,
  graphemeCount,
  sanitizeChat,
  type ChatMessage,
} from '../party/protocol';

/** Ephemeral session chat: lives in memory only and is wiped when the session ends. */
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const viewing = useRef(false);

  const setViewing = useCallback((v: boolean) => {
    viewing.current = v;
    if (v) setUnread(0);
  }, []);
  const reset = useCallback((initial: ChatMessage[] = []) => {
    setMessages(initial.slice(-CHAT_HISTORY));
    setUnread(0);
  }, []);
  const add = useCallback((msg: ChatMessage, mine: boolean) => {
    setMessages((x) =>
      x.some((m) => m.id === msg.id) ? x : [...x, msg].slice(-CHAT_HISTORY),
    );
    if (!mine && !viewing.current) setUnread((n) => n + 1);
  }, []);
  const remove = useCallback(
    (id: string) => setMessages((x) => x.filter((m) => m.id !== id)),
    [],
  );

  return {
    messages,
    unread,
    setViewing,
    reset,
    add,
    remove,
  };
}

/** Client-side mirror of the server rule, so the counter and the send button agree with it. */
export const chatLength = (text: string) =>
  graphemeCount(text.normalize('NFC'));
export const validChat = (text: string) => sanitizeChat(text) !== null;
