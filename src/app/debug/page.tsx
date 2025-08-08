'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState<string>('');
  const socketRef = useRef<Socket | null>(null);

  // هوية اختبارية لكل جهاز/متصفح
  const userId = useMemo(() => 'u_' + Math.random().toString(36).slice(2, 10), []);
  const baseUrl = useMemo(() => process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', []);

  const pushLog = (m: string) => setLogs((prev) => [new Date().toISOString() + ' ' + m, ...prev].slice(0, 200));

  useEffect(() => {
    pushLog(`Init socket to ${baseUrl} as ${userId}`);
    const s = io(baseUrl, { path: '/api/socket', transports: ['websocket'], query: { userId } });
    socketRef.current = s;

    s.on('connect', () => {
      setConnected(true);
      pushLog('Socket connected id=' + s.id);
    });
    s.on('disconnect', () => {
      setConnected(false);
      pushLog('Socket disconnected');
    });
    s.on('connect_error', (e) => pushLog('connect_error: ' + e.message));

    s.on('matching:matchFound', (rid: string) => {
      setRoomId(rid);
      pushLog('Received matchFound roomId=' + rid);
    });
    s.on('matching:noMatch', () => pushLog('Received noMatch'));

    return () => {
      try { s.emit('matching:leave', { userId }); } catch {}
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, userId]);

  const enqueue = () => {
    const payload = {
      userId,
      gender: 'any',
      lookingFor: 'any',
      isVip: false,
      boosted: false,
      country: 'NA',
      avatar: '',
      username: 'debugger',
    };
    socketRef.current?.emit('matching:enqueue', payload);
    pushLog('Emitted matching:enqueue ' + JSON.stringify(payload));
  };

  const leave = () => {
    socketRef.current?.emit('matching:leave', { userId });
    pushLog('Emitted matching:leave');
  };

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h1>Debug / Socket</h1>
      <p><b>Connected:</b> {String(connected)} | <b>UserId:</b> {userId}</p>
      <p><b>roomId:</b> {roomId || '-'}</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={enqueue}>Enqueue</button>
        <button onClick={leave}>Leave</button>
      </div>
      <pre style={{ background: '#111', color: '#0f0', padding: 12, height: 280, overflow: 'auto' }}>
        {logs.join('\n')}
      </pre>
    </div>
  );
}
