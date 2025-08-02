'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Realtime, Types } from 'ably';

const ABLY_KEY = process.env.NEXT_PUBLIC_ABLY_KEY!;
const SIGNALING_CHANNEL = 'webrtc-signaling-channel';

export default function ChatPage() {
  // ... كل ما قبلُه كما في النسخة السابقة ...

  // نضيف هذان المرجعان لحفظهم بين الريندرز
  const channelRef      = useRef<Types.RealtimeChannelCallbacks>();
  const localStreamRef  = useRef<MediaStream>();

  useEffect(() => {
    let ably: Realtime;
    let channel: Types.RealtimeChannelCallbacks;
    let pc: RTCPeerConnection;

    const start = async () => {
      // 1) احصل على الميديا
      const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = localStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

      // 2) تهيئة Ably
      ably = new Realtime({ key: ABLY_KEY });
      channel = ably.channels.get(SIGNALING_CHANNEL);
      await channel.attach();
      channelRef.current = channel;

      // 2.1) اطلب شريك
      channel.publish('ready', {});
      setStatus('Searching for partner…');

      // بقية الإعداد (partner, offer/answer, ICE…) كما في الكود السابق
      // …
    };

    start();

    return () => {
      // تنظيف
      pc?.close();
      channelRef.current?.detach();
      ably?.close();
    };
  }, []);

  // 7) أزرار التحكم بعد التعديل
  const toggleMute = () => { /* كما كان */ };
  const toggleCam  = () => { /* كما كان */ };
  // هنا نرسل “ready” من جديد ونمسح بثّ الشريك القديم
  const requestNext = () => {
    setStatus('Searching for partner…');
    // مسح الفيديو البعيد
    if (remoteVideoRef.current) {
      (remoteVideoRef.current.srcObject as MediaStream | null) = null;
    }
    // إرسال إشارة البحث عن شريك جديد
    channelRef.current?.publish('ready', {});
  };
  const disconnect = () => { /* كما كان */ };

  return (
    <div>
      {/* ... الواجهة نفسها ... */}
      <button onClick={toggleMute}>🎤 Mute/Unmute</button>
      <button onClick={toggleCam}>📷 Toggle Camera</button>
      <button onClick={requestNext}>⏭️ Next</button>
      <button onClick={disconnect}>❌ Disconnect</button>
      {/* ... الفيديوهات ... */}
    </div>
  );
}
