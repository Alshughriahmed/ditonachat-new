
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

      pcRef.current = new RTCPeerConnection({ iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] });
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
        className="absolute top-4 right-4 z-30 w-36 h-36 rounded-full overflow-hidden
                   border-4 border-pink-500 shadow-lg"
        drag dragMomentum={false}
        style={{ touchAction: 'none' }}
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
          className="absolute top-20 left-4 z-20 w-80 max-h-96 overflow-y-auto
               bg-black bg-opacity-70 backdrop-blur-sm p-4 rounded-lg"
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
        >
          {/* محتوى الدردشة هنا */}
          <p className="text-white">محتوى الدردشة هنا</p>
        </motion.div>
      )}

      <div
        className="absolute bottom-4 left-1/2 z-20 flex space-x-4
                   bg-black bg-opacity-60 backdrop-blur-md p-2 rounded-full
                   transform -translate-x-1/2"
      >
        <button onClick={handlePrev}>⏮️</button>
        <button onClick={toggleCameraDevice}>🔄</button>
        <button onClick={toggleMute}>{isMuted ? '🔇' : '🎤'}</button>
        <button onClick={handleDisconnect}>⏹️</button>
        <button onClick={handleNext}>⏭️</button>
      </div>
    </main>
  );
}


