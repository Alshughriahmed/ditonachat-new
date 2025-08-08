'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

export type Gender = 'male' | 'female' | 'couple' | 'lgbt' | 'any';
export type LookingFor =
  | 'any' | 'male' | 'female' | 'couple' | 'lgbt' | 'same-gender' | 'opposite-gender';

export interface QueuePayload {
  userId: string;
  gender: Gender;
  lookingFor: LookingFor;
  isVip?: boolean;
  boosted?: boolean;
  country?: string;
  avatar?: string;
  username?: string;
}

type Status = 'idle' | 'connecting' | 'enqueued' | 'waiting' | 'matched' | 'error';

/** يولّد ID ثابت ويخزّنه في localStorage */
function getStoredUserId(): string {
  if (typeof window === 'undefined') return '';
  const KEY = 'ditona_uid';
  let id = localStorage.getItem(KEY) || '';
  if (!id) {
    id = uuidv4();
    localStorage.setItem(KEY, id);
  }
  return id;
}

/** الهوك — مُصدَّر باسم useMatchingQueue */
export function useMatchingQueue() {
  const [status, setStatus] = useState<Status>('idle');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string>('');
  const [userId, setUserId] = useState<string>(''); // يُحدد بعد mount
  const socketRef = useRef<Socket | null>(null);

  // URL السوكيت من البيئة (أو localhost كافتراضي)
  const socketUrl = useMemo(
    () => process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000',
    []
  );

  // عيّن userId بعد mount لتفادي hydration mismatch
  useEffect(() => {
    setUserId(getStoredUserId());
  }, []);

  // أنشئ اتصال Socket.IO
  useEffect(() => {
    if (!userId) return; // لا تفتح قبل توفر userId

    setStatus('connecting');
    const s = io(socketUrl, {
      path: '/api/socket',
      // اسمح بالـ polling fallback لتجنّب أخطاء الشبكات
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      query: { userId },
    });

    socketRef.current = s;

    s.on('connect', () => {
      setStatus('idle');
      setLastError('');
      console.log('[socket] connected', s.id);
    });

    s.on('connect_error', (err) => {
      console.error('[socket] connect_error', err?.message);
      setStatus('error');
      setLastError(err?.message || 'connect_error');
    });

    s.on('error', (err) => {
      console.error('[socket] error', err);
      setStatus('error');
      setLastError(typeof err === 'string' ? err : (err?.message || 'socket_error'));
    });

    s.on('matching:matchFound', (rid: string) => {
      console.log('[socket] matchFound', rid);
      setRoomId(rid);
      setStatus('matched');
    });

    s.on('matching:noMatch', () => {
      console.log('[socket] noMatch');
      setStatus('waiting');
    });

    s.on('left', () => {
      console.log('[socket] left');
      setStatus('idle');
      setRoomId(null);
    });

    return () => {
      s.removeAllListeners();
      s.disconnect();
      socketRef.current = null;
    };
  }, [socketUrl, userId]);

  const enqueue = useCallback((payload: Omit<QueuePayload, 'userId'>) => {
    const s = socketRef.current;
    if (!s || !userId) return;
    s.emit('matching:enqueue', { userId, ...payload });
    setStatus('enqueued');
  }, [userId]);

  const leave = useCallback(() => {
    const s = socketRef.current;
    if (!s || !userId) return;
    s.emit('matching:leave', { userId });
  }, [userId]);

  return { status, roomId, lastError, enqueue, leave, userId };
}
