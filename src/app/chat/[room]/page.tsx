'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { RTCClient } from '@/utils/rtcClient';

export default function ChatRoomPage() {
  const { room } = useParams<{ room: string }>();
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<RTCClient | null>(null);

  const socketUrl = useMemo(
    () => process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000',
    []
  );

  useEffect(() => {
    if (!room || !localRef.current || !remoteRef.current) return;

    const client = new RTCClient();
    clientRef.current = client;

    client.start({
      socketUrl,
      roomId: room,
      localEl: localRef.current,
      remoteEl: remoteRef.current,
    }).catch((e) => {
      console.error('RTC start error:', e?.message || e);
      alert('Camera/mic may require HTTPS on mobile. Test from desktop first.');
    });

    return () => {
      clientRef.current?.stop().catch(() => {});
      clientRef.current = null;
    };
  }, [room, socketUrl]);

  return (
    <div style={{ padding: 12 }}>
      <h2>Room: {room}</h2>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12 }}>
        <video ref={localRef} playsInline autoPlay style={{ width:'100%', background:'#000' }} />
        <video ref={remoteRef} playsInline autoPlay style={{ width:'100%', background:'#000' }} />
      </div>

      <p style={{marginTop:8}}>
        ملاحظة: على الموبايل عبر IP غير آمن (HTTP)، قد تُمنع الكاميرا/المايك. جرّب من كمبيوترين أو فعّل HTTPS لاحقًا.
      </p>
    </div>
  );
}
