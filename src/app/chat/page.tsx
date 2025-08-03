'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Realtime, Types } from 'ably';

const ABLY_KEY = process.env.NEXT_PUBLIC_ABLY_KEY!;
const SIGNALING_CHANNEL = 'webrtc-signaling-channel';

export default function ChatPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>('Connecting...');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // نضيف هذان المرجعان لحفظهم بين الريندرز
  const channelRef      = useRef<Types.RealtimeChannelCallbacks>(null);
  const localStreamRef  = useRef<MediaStream>(null);
  const localVideoRef   = useRef<HTMLVideoElement>(null);
  const remoteVideoRef  = useRef<HTMLVideoElement>(null);
  const pcRef           = useRef<RTCPeerConnection>(null);

  useEffect(() => {
    let ably: Realtime;
    let channel: Types.RealtimeChannelCallbacks;
    let pc: RTCPeerConnection;

    const start = async () => {
      try {
        // 1) احصل على الميديا
        const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = localStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

        // 2) تهيئة Ably
        ably = new Realtime({ key: ABLY_KEY });
        channel = ably.channels.get(SIGNALING_CHANNEL);
        await channel.attach();
        channelRef.current = channel;

        pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pcRef.current = pc;

        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setStatus('Connected');
            setIsConnected(true);
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.publish('ice-candidate', event.candidate);
          }
        };

        channel.subscribe('ready', async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.publish('offer', offer);
        });

        channel.subscribe('offer', async (message) => {
          await pc.setRemoteDescription(message.data);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.publish('answer', answer);
        });

        channel.subscribe('answer', async (message) => {
          await pc.setRemoteDescription(message.data);
        });

        channel.subscribe('ice-candidate', async (message) => {
          await pc.addIceCandidate(message.data);
        });

        channel.subscribe('next', () => {
          // إعادة تعيين الاتصال للبحث عن شريك جديد
          setStatus('Searching for partner…');
          setIsConnected(false);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
        });

        // 2.1) اطلب شريك
        channel.publish('ready', {});
        setStatus('Searching for partner…');

      } catch (error) {
        console.error('Error starting chat:', error);
        setStatus('Error connecting');
      }
    };

    start();

    return () => {
      // تنظيف
      pcRef.current?.close();
      channelRef.current?.detach();
      ably?.close();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  };

  const requestNext = () => {
    // إرسال إشارة "next" إلى القناة
    channelRef.current?.publish('next', {});
    
    // إعادة تعيين الحالة للبحث عن شريك جديد
    setStatus('Searching for partner…');
    setIsConnected(false);
    
    // مسح الفيديو البعيد
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    // إرسال إشارة البحث عن شريك جديد
    channelRef.current?.publish('ready', {});
  };

  const disconnect = () => {
    if (pcRef.current) {
      pcRef.current.close();
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    channelRef.current?.detach();
    
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-center">DitonaChat</h1>
        
        {/* عرض الحالة */}
        <div className="text-center mb-6">
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            status === 'Connected' ? 'bg-green-600' : 
            status === 'Searching for partner…' ? 'bg-yellow-600' : 
            'bg-blue-600'
          }`}>
            {status}
          </span>
        </div>

        {/* منطقة الفيديو */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* الفيديو المحلي */}
          <div className="relative">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-64 bg-gray-800 rounded-lg object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
              You
            </div>
          </div>

          {/* الفيديو البعيد */}
          <div className="relative">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-64 bg-gray-800 rounded-lg object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
              {isConnected ? 'Partner' : 'Waiting...'}
            </div>
          </div>
        </div>

        {/* أزرار التحكم تحت الفيديو المحلي */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={toggleMute}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
          >
            🎤 Mute/Unmute
          </button>
          <button
            onClick={toggleCam}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
          >
            📷 Toggle Camera
          </button>
        </div>

        {/* أزرار Next و End */}
        <div className="flex justify-center gap-4">
          <button
            onClick={requestNext}
            disabled={!isConnected}
            className={`px-6 py-2 rounded-lg transition-colors ${
              isConnected 
                ? 'bg-blue-600 hover:bg-blue-500' 
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            ⏭️ Next
          </button>
          <button
            onClick={disconnect}
            className="bg-red-600 hover:bg-red-500 px-6 py-2 rounded-lg transition-colors"
          >
            ❌ End
          </button>
        </div>
      </div>
    </div>
  );
}
