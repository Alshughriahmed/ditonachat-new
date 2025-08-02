'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Realtime } from 'ably';

const ABLY_KEY = process.env.NEXT_PUBLIC_ABLY_KEY!;          // تأكد من إضافة هذا المتغير في .env.local
const SIGNALING_CHANNEL = 'webrtc-signaling-channel';        // اسم القناة نفسها على الـ backend

export default function ChatPage() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('Initializing…');

  useEffect(() => {
    let ably: Realtime;
    let channel: ReturnType<Realtime['channels']['get']>;
    let pc: RTCPeerConnection;

    const start = async () => {
      // 1) تأكد أن المتصفح يدعم getUserMedia
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('Error: getUserMedia not supported');
        return;
      }

      try {
        // 2) الوصول إلى الكاميرا والميكروفون
        setStatus('Accessing local media…');
        const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        // 3) إنشاء عميل Ably والاشتراك في قناة الـ signaling
        setStatus('Initializing signaling…');
        ably = new Realtime({ key: ABLY_KEY });
        channel = ably.channels.get(SIGNALING_CHANNEL);
        await channel.attach();
        setStatus('Connected to signaling channel');

        // 4) إنشاء الـ RTCPeerConnection
        pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        // أضف مسارات الصوت/الفيديو
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

        // 5) عند وجود مرشح ICE جديد
        pc.onicecandidate = (e) => {
          if (e.candidate) channel.publish('ice-candidate', e.candidate);
        };

        // 6) استقبال مرشحات ICE من الشريك
        channel.subscribe('ice-candidate', msg => {
          pc.addIceCandidate(msg.data as RTCIceCandidate);
        });

        // 7) عند استلام مسار من الشريك، اعرضه في الـ video البعيد
        pc.ontrack = (e) => {
          const [remoteStream] = e.streams;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        };

        // 8) offer/answer negotiation
        pc.onnegotiationneeded = async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.publish('offer', pc.localDescription);
        };
        channel.subscribe('offer', async msg => {
          const offer = msg.data as RTCSessionDescriptionInit;
          await pc.setRemoteDescription(offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.publish('answer', answer);
        });
        channel.subscribe('answer', async msg => {
          const answer = msg.data as RTCSessionDescriptionInit;
          await pc.setRemoteDescription(answer);
        });

      } catch (err) {
        console.error(err);
        setStatus('Error initializing chat');
      }
    };

    start();

    return () => {
      // تنظيف عند إلغاء التثبيت
      pc?.close();
      channel?.detach();
      ably?.close();
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>DitonaChat</h1>
      <p>Status: {status}</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <video ref={localVideoRef} autoPlay muted playsInline style={{ width: 200, background: '#000' }} />
        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: 200, background: '#000' }} />
      </div>
    </div>
  );
}
