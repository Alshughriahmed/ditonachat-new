// File: src/hooks/useSmartJoin.ts
'use client';

import { useEffect } from 'react';
import WebRTCManager from '@/utils/webrtc';
import socket from '@/utils/socket';
import { useUser } from '@/context/UserContext';
import { Gender } from '@/utils/matching'; // Assuming Gender is exported from here

type SmartJoinOptions = {
  manager: WebRTCManager;
  onRemoteStream: (stream: MediaStream) => void;
  onCandidate: (candidate: RTCIceCandidateInit) => void;
  setRemotePeerId: (id: string | null) => void;
};

export default function useSmartJoin({
  manager,
  onRemoteStream,
  onCandidate,
  setRemotePeerId,
}: SmartJoinOptions) {
  const { userPreferences } = useUser();

  useEffect(() => {
    if (!manager || !userPreferences) return;

    // ✅ الاتصال بالسيرفر
    socket.connect();

    // ✅ إرسال تفضيلات المستخدم
    socket.emit('join', {
      gender: userPreferences.gender as Gender[], // Ensure userPreferences.gender is Gender[]
      countries: userPreferences.countries,
      isVip: userPreferences.isVip,
    });

    // ✅ عند حدوث مطابقة
    socket.on('match', async ({ userId }: { userId: string }) => {
      setRemotePeerId(userId);
      try {
        // sendOffer expects: to, onTrack, onIceCandidate
        await manager.sendOffer(userId, onRemoteStream, onCandidate);
      } catch (error) {
        console.error('❌ Failed to send offer:', error);
      }
    });

    // ✅ استقبال عرض
    socket.on('offer', async ({ from, offer }) => {
      setRemotePeerId(from);
      try {
        // handleOffer expects: data (SignalingPayload), localStream, onTrack, onIceCandidate
        await manager.handleOffer(
          { from, offer }, // data: SignalingPayload
          manager.getLocalStream()!, // localStream
          onRemoteStream, // onTrack
          onCandidate // onIceCandidate
        );
      } catch (error) {
        console.error('❌ Failed to handle offer:', error);
      }
    });

    // ✅ استقبال جواب
    socket.on('answer', ({ from, answer }) => {
      // handleAnswer expects: data (SignalingPayload)
      manager.handleAnswer({ from, answer });
    });

    // ✅ استقبال مرشح ICE
    socket.on('candidate', ({ from, candidate }) => {
      // handleCandidate expects: data (SignalingPayload)
      manager.handleCandidate({ from, candidate });
    });

    // ✅ مغادرة الطرف الآخر
    socket.on('leave', () => {
      manager.closeConnection();
      setRemotePeerId(null);
    });

    // 🧼 تنظيف عند تفكيك الكمبوننت
    return () => {
      socket.disconnect();
      manager.closeConnection();
      setRemotePeerId(null);
    };
  }, [manager, userPreferences, onRemoteStream, onCandidate, setRemotePeerId]);
}
