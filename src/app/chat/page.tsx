/* -------------------------------------------------
 *  src/app/chat/page.tsx
 *  صفحة الدردشة بالفيديو (WebRTC + Socket.io)
 * -------------------------------------------------*/

'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

/* — متغيّرات البيئة للـ WebSocket — */
const WS_URL  = process.env.NEXT_PUBLIC_WS_URL!;
const WS_PATH = process.env.NEXT_PUBLIC_WS_PATH!;

export default function ChatPage() {
  const localVideoRef  = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef      = useRef<Socket | null>(null);
  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState('Connecting to signaling server…');

  useEffect(() => {
    let cancelled = false;

    function cleanup() {
      socketRef.current?.disconnect();
      pcRef.current?.close();
      if (localVideoRef.current?.srcObject instanceof MediaStream) {
        (localVideoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach(t => t.stop());
      }
    }

    async function start() {
      setStatus('Requesting media devices…');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      pc.onicecandidate = e => {
        if (e.candidate) socketRef.current?.emit('ice-candidate', e.candidate);
      };
      pc.ontrack = e => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
        setStatus('Connected');
      };

      setStatus('Connecting to signaling server…');
      console.log('🔌 Connecting socket to:', WS_URL, 'path:', WS_PATH);
      const socket: Socket = io(WS_URL, {
        path: WS_PATH,
        transports: ['websocket'],
        secure: true,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('✅ Socket connected, id =', socket.id);
        setStatus('Waiting for partner…');
        socket.emit('ready');
      });

      socket.on('partner', async ({ isInitiator }: { isInitiator?: boolean }) => {
        setStatus('Negotiating…');
        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', offer);
        }
      });

      socket.on('offer', async offer => {
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', answer);
      });

      socket.on('answer', async answer => {
        await pc.setRemoteDescription(answer);
      });

      socket.on('ice-candidate', async cand => {
        try { await pc.addIceCandidate(cand); }
        catch (err) { console.error('Error adding remote ICE:', err); }
      });

      socket.on('disconnect', reason => {
        console.warn('Socket disconnected:', reason);
        if (!cancelled) setStatus('Disconnected – refresh to retry');
      });
    }

    start().catch(err => {
      console.error(err);
      setStatus('Error: ' + err.message);
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="mb-4 text-xl">{status}</h1>
      <div className="relative w-full max-w-4xl aspect-video">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover bg-gray-900"
        />
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="absolute bottom-2 right-2 w-40 h-28 object-cover border-2 border-white rounded"
        />
      </div>
    </div>
  );
}
