// src/app/chat/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL  = process.env.NEXT_PUBLIC_WS_URL  || '';
const WS_PATH = process.env.NEXT_PUBLIC_WS_PATH || '/ws';

export default function ChatPage() {
  const localVideoRef  = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef      = useRef<Socket | null>(null);
  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState('Connecting to server…');

  useEffect(() => {
    let cancelled = false;
    let partnerId: string;  // هنا نحفظ partnerId عند استلامه

    async function start() {
      setStatus('Requesting media devices…');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // إنشاء PeerConnection
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      // بثّ ICE candidates للطرف الآخر
      pc.onicecandidate = e => {
        if (e.candidate && socketRef.current) {
          socketRef.current.emit('ice-candidate', {
            target: partnerId,
            candidate: e.candidate
          });
        }
      };

      pc.ontrack = e => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
        setStatus('Connected');
      };

      // اتصال Socket.io
      setStatus('Connecting to signaling server…');
      const socket = io(WS_URL, {
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

      // استلام partner ويحتوي على isInitiator و partnerId
      socket.on('partner', async (data: { isInitiator: boolean; partnerId: string }) => {
        setStatus('Negotiating…');
        partnerId = data.partnerId;

        if (data.isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { target: partnerId, offer });
        }
      });

      // استلام offer مع from
      socket.on('offer', async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
        setStatus('Answering…');
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { target: from, answer });
      });

      // استلام answer مع from
      socket.on('answer', async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
        await pcRef.current?.setRemoteDescription(answer);
      });

      // استلام ICE candidate مع from
      socket.on('ice-candidate', async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
        try {
          await pcRef.current?.addIceCandidate(candidate);
        } catch (err) {
          console.error('Error adding remote ICE:', err);
        }
      });

      socket.on('disconnect', reason => {
        if (!cancelled) setStatus('Disconnected – refresh to retry');
      });
    }

    start().catch(err => {
      console.error(err);
      setStatus('Error: ' + (err as Error).message);
    });

    return () => {
      cancelled = true;
      pcRef.current?.close();
      socketRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="mb-4 text-xl">{status}</h1>
      <div className="relative w-full max-w-4xl aspect-video">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover bg-gray-900" />
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
