'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Realtime, Types } from 'ably';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

const ABLY_KEY = process.env.NEXT_PUBLIC_ABLY_KEY!;
const SIGNALING_CHANNEL = 'webrtc-signal-channel';

export default function ChatPage() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const selfPreviewRef = useRef<HTMLDivElement>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isCamOn, setIsCamOn] = useState(true);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCamIndex, setCurrentCamIndex] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(true);

  const ablyRef = useRef<Realtime | null>(null);
  const channelRef = useRef<Types.RealtimeChannelCallbacks | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const getCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setCameras(videoDevices);
      return videoDevices;
    } catch {
      return [];
    }
  }, []);

  const initCamera = useCallback(async (deviceId?: string) => {
    const constraints: MediaStreamConstraints = {
      video: deviceId ? { deviceId: { exact: deviceId } } : true,
      audio: true
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    localStreamRef.current = stream;
    stream.getTracks().forEach(track => pcRef.current?.addTrack(track, stream));
  }, []);

  const toggleCameraDevice = useCallback(async () => {
    const next = (currentCamIndex + 1) % cameras.length;
    setCurrentCamIndex(next);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    const newId = cameras[next].deviceId;
    await initCamera(newId);
    const newStream = localStreamRef.current!;
    const videoTrack = newStream.getVideoTracks()[0];
    const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video');
    if (sender) await sender.replaceTrack(videoTrack);
  }, [currentCamIndex, cameras, initCamera]);

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = !isMuted;
    setIsMuted(!isMuted);
  };
  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) track.enabled = !isCamOn;
    setIsCamOn(!isCamOn);
  };

  useEffect(() => {
    (async () => {
      const cams = await getCameras();
      ablyRef.current = new Realtime({ key: ABLY_KEY });
      channelRef.current = ablyRef.current.channels.get(SIGNALING_CHANNEL);
      await channelRef.current.attach();

      pcRef.current = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pcRef.current.onicecandidate = e => {
        if (e.candidate) channelRef.current?.publish('ice-candidate', e.candidate);
      };
      pcRef.current.ontrack = e => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      };
      pcRef.current.onnegotiationneeded = async () => {
        const offer = await pcRef.current!.createOffer();
        await pcRef.current!.setLocalDescription(offer);
        channelRef.current?.publish('offer', offer);
      };

      channelRef.current.subscribe('offer', async msg => {
        await pcRef.current!.setRemoteDescription(msg.data as RTCSessionDescriptionInit);
        const answer = await pcRef.current!.createAnswer();
        await pcRef.current!.setLocalDescription(answer);
        channelRef.current?.publish('answer', answer);
      });
      channelRef.current.subscribe('answer', msg => {
        pcRef.current!.setRemoteDescription(msg.data as RTCSessionDescriptionInit);
      });
      channelRef.current.subscribe('ice-candidate', msg => {
        pcRef.current?.addIceCandidate(msg.data);
      });

      await initCamera(cams[0]?.deviceId);
    })();

    return () => {
      pcRef.current?.close();
      channelRef.current?.detach();
      ablyRef.current?.close();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [getCameras, initCamera]);

  const handleNext = () => { /* TODO: matching logic */ };
  const handlePrev = () => { /* TODO: matching logic */ };
  const handleDisconnect = () => { /* TODO: disconnect logic */ };

  // pinch-to-zoom support
  useEffect(() => {
    const el = selfPreviewRef.current;
    if (!el) return;
    let startDist = 0, startScale = 1;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const [a,b] = e.touches;
        startDist = Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
        startScale = el.getBoundingClientRect().width / 150;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const [a,b] = e.touches;
        const curDist = Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
        const scale = startScale * (curDist/startDist);
        el.style.transform = `scale(${scale})`;
      }
    };
    el.addEventListener('touchstart', onStart);
    el.addEventListener('touchmove', onMove);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
    };
  }, []);

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden">
      <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />

      <motion.div
        ref={selfPreviewRef}
        drag
        dragMomentum={false}
        whileDrag={{ scale: 1.1 }}
        className="absolute w-36 h-36 bottom-6 right-6 rounded-full overflow-hidden border-4 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] z-20 touch-none"
      >
        <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        {cameras.length > 1 && (
          <button onClick={toggleCameraDevice} className="absolute top-2 left-2 p-2 bg-black bg-opacity-50 rounded-full text-white z-10">
            🔄
          </button>
        )}
      </motion.div>

      {isChatOpen && (
        <motion.div
          className="absolute top-6 left-6 w-80 h-[70%] bg-black bg-opacity-70 backdrop-blur-sm rounded-lg p-4 flex flex-col z-20"
          initial={{ x: -200, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        >
          <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            {/* مثال للرسائل */}
            <div className="self-start bg-gray-700 bg-opacity-30 text-gray-100 px-3 py-2 rounded-lg max-w-[80%] font-medium">
              رسالة من الطرف الآخر
            </div>
            <div className="self-end bg-blue-500 bg-opacity-30 text-blue-100 px-3 py-2 rounded-lg max-w-[80%] font-medium">
              رسالتي أنا
            </div>
          </div>
          <div className="flex">
            <input type="text" placeholder="أكتب رسالة…" className="flex-1 p-2 rounded-l-lg focus:outline-none bg-white bg-opacity-10 text-white" />
            <button className="px-4 bg-blue-500 rounded-r-lg font-semibold">إرسال</button>
            <button onClick={()=>setIsChatOpen(false)} className="ml-2 text-white">✕</button>
          </div>
        </motion.div>
      )}

      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
        <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-full px-6 py-3 flex items-center space-x-4">
          <button onClick={handlePrev} className="text-2xl bg-blue-500 p-3 rounded-full">⏮️</button>
          <button onClick={toggleCameraDevice} className="text-2xl bg-blue-500 p-3 rounded-full">📷</button>
          <button onClick={toggleMute} className="text-2xl bg-blue-500 p-3 rounded-full">{isMuted ? '🔇' : '🎤'}</button>
          <button onClick={() => setIsChatOpen(o => !o)} className="text-2xl bg-blue-500 p-3 rounded-full">💬</button>
          <button onClick={handleDisconnect} className="text-2xl bg-red-500 p-3 rounded-full">⏹️</button>
          <button onClick={handleNext} className="text-2xl bg-blue-500 p-3 rounded-full">⏭️</button>
        </div>
      </div>
    </main>
  );
}
