/* -------------------------------------------------
 *  src/app/chat/page.tsx
 *  صفحة الدردشة بالفيديو (WebRTC + Socket.io)
 *  ------------------------------------------------
 *  التنبيهات المهمّة:
 *  1) يجب ضبط متغيّري البيئة في Vercel/Local:
 *     - NEXT_PUBLIC_WS_URL  = wss://ditonachat-backend.onrender.com
 *     - NEXT_PUBLIC_WS_PATH = /ws
 *  2) الملف مُعلَّم كـ client component ويُجبر Next على
 *     التصرّف ديناميكياً لمنع الـ prerender.
 * -------------------------------------------------*/

'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

/* — متغيّرات البيئة — */
const WS_URL  = process.env.NEXT_PUBLIC_WS_URL!;
const WS_PATH = process.env.NEXT_PUBLIC_WS_PATH!;
/* — مكوّن الصفحة الرئيسي — */
export default function ChatPage() {
  /* مراجع الفيديو والاتصال */
  const localVideoRef  = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef      = useRef<Socket | null>(null);
  const pcRef          = useRef<RTCPeerConnection | null>(null);

  /* حالة واجهة المستخدم */
  const [status, setStatus] = useState('Connecting to server…');

  useEffect(() => {
    let cancelled = false;

    /* دالّة الإيقاف والتنظيف */
    function cleanup() {
      socketRef.current?.disconnect();
      pcRef.current?.close();
      if (localVideoRef.current?.srcObject instanceof MediaStream) {
        (localVideoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach(t => t.stop());
      }
    }

    /* الخطوة 1: الحصول على الكاميرا/الميكروفون */
    async function start() {
      setStatus('Requesting media devices…');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      /* إظهار الفيديو المحلي */
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      /* إنشاء PeerConnection */
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      /* تمرير مسارات الصوت/الفيديو إلى الاتصال */
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      /* بثّ ICE candidates إلى الطرف الآخر عبر Socket.io */
      pc.onicecandidate = (e) => {
        if (e.candidate) socketRef.current?.emit('ice-candidate', e.candidate);
      };

      /* عندما يصل مسار من الطرف الآخر */
      pc.ontrack = (e) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
        setStatus('Connected');
      };

      /* الخطوة 2: الاتصال بـ Socket.io */
      setStatus('Connecting to signaling server…');
      const socket: Socket = io(WS_URL, {
        path: WS_PATH,
        transports: ['websocket'],
        secure: true,
      });
      socketRef.current = socket;

      /* عند نجاح الاتصال */
      socket.on('connect', () => {
        console.log('✅ Socket connected, id =', socket.id);
        setStatus('Waiting for partner…');
        socket.emit('ready');
      });

      /* الطرف المقابل انضمّ ويجب إرسال offer */
      socket.on('partner', async ({ isInitiator }: { isInitiator?: boolean }) => {
        setStatus('Negotiating…');

        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', offer);
        }
      });

      /* استلام offer من الطرف الآخر */
      socket.on('offer', async (offer) => {
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', answer);
      });

      /* استلام answer بعد إرسال offer */
      socket.on('answer', async (answer) => {
        await pc.setRemoteDescription(answer);
      });

      /* استلام ICE من الطرف الآخر */
      socket.on('ice-candidate', async (cand) => {
        try {
          await pc.addIceCandidate(cand);
        } catch (err) {
          console.error('Error adding remote ICE:', err);
        }
      });

      /* معالجة حالات فصل الاتصال */
      socket.on('disconnect', (reason) => {
        console.warn('Socket disconnected:', reason);
        if (!cancelled) setStatus('Disconnected – refresh to retry');
      });
    }

    start().catch((err) => {
      console.error(err);
      setStatus('Error: ' + err.message);
    });

    /* تنظيف عند مغادرة الصفحة */
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  /* — واجهة المستخدم — */
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="mb-4 text-xl">{status}</h1>

      <div className="relative w-full max-w-4xl aspect-video">
        {/* فيديو الطرف الآخر */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover bg-gray-900"
        />

        {/* الفيديو المحلي (صغير في الزاوية) */}
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
