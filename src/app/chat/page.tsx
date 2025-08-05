'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Realtime, Types } from 'ably';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

// --- Environment Variables ---
const ABLY_KEY = process.env.NEXT_PUBLIC_ABLY_KEY!;
const SIGNALING_CHANNEL = 'webrtc-signal-channel';

// --- Main Component ---
export default function ChatPage() {
  // --- Refs for persistent objects between renders ---
  const ablyRef = useRef<Realtime | null>(null);
  const channelRef = useRef<Types.RealtimeChannelCallbacks | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // --- State Management ---
  const [status, setStatus] = useState('Connecting to server...');
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOn, setIsCamOn] = useState(true);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCamIndex, setCurrentCamIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState<
    { text: string; sender: 'self' | 'other' }[]
  >([]);
  const [isChatOpen, setIsChatOpen] = useState(true);

  const router = useRouter();

  // --- Get available cameras ---
  const getCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setCameras(videoDevices);
      return videoDevices;
    } catch (err) {
      console.error('Error enumerating devices:', err);
      return [];
    }
  }, []);

  // --- Initialize camera stream ---
  const initCamera = useCallback(
    async (deviceId?: string) => {
      try {
        const constraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : true,
          audio: true,
        };
        const stream = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        localStreamRef.current = stream;
        stream.getTracks().forEach(track =>
          pcRef.current?.addTrack(track, stream)
        );
        setStatus('Ready to connect with a partner...');
      } catch (err) {
        console.error('Failed to get media:', err);
        setStatus('Error: Failed to access camera. Please check permissions.');
      }
    },
    []
  );

  // --- Toggle camera device ---
  const toggleCamera = useCallback(async () => {
    if (cameras.length < 2) return;
    const next = (currentCamIndex + 1) % cameras.length;
    setCurrentCamIndex(next);

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    await initCamera(cameras[next].deviceId);

    const newStream = localVideoRef.current?.srcObject as MediaStream;
    if (newStream) {
      const videoTrack = newStream.getVideoTracks()[0];
      const sender = pcRef.current
        ?.getSenders()
        .find(s => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(videoTrack);
    }
  }, [cameras, currentCamIndex, initCamera]);

  // --- Toggle mute/unmute ---
  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // --- Toggle cam on/off ---
  const toggleCam = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !isCamOn;
      setIsCamOn(!isCamOn);
    }
  };

  // --- Handle partner controls ---
  const handleNextPartner = () => {
    alert('Requesting next partner…');
    // هنا يمكن إضافة منطق المطابقة لاحقاً
  };
  const handlePrevPartner = () => {
    alert('Requesting previous partner…');
  };
  const handleDisconnect = () => {
    alert('Disconnecting…');
    router.push('/');
  };

  // --- Pinch-to-zoom setup for self-preview ---
  const selfPreviewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = selfPreviewRef.current;
    if (!el) return;
    let initDist = 0;
    let initScale = 1;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const m = new DOMMatrixReadOnly(
          window.getComputedStyle(el).transform
        );
        initScale = m.a;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const currDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const s = initScale * (currDist / initDist);
        el.style.transform = `scale(${s})`;
      }
    };
    el.addEventListener('touchstart', onTouchStart);
    el.addEventListener('touchmove', onTouchMove);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  // --- Component Mount: setup Ably & WebRTC ---
  useEffect(() => {
    (async () => {
      const cams = await getCameras();
      ablyRef.current = new Realtime({ key: ABLY_KEY });
      channelRef.current = ablyRef.current.channels.get(
        SIGNALING_CHANNEL
      );
      await channelRef.current.attach();

      pcRef.current = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current.onicecandidate = e =>
        e.candidate &&
        channelRef.current?.publish('ice-candidate', e.candidate);
      pcRef.current.ontrack = e => {
        if (remoteVideoRef.current)
          remoteVideoRef.current.srcObject = e.streams[0];
      };
      pcRef.current.onnegotiationneeded = async () => {
        const offer = await pcRef.current!.createOffer();
        await pcRef.current!.setLocalDescription(offer);
        channelRef.current?.publish('offer', offer);
      };

      channelRef.current.subscribe(
        'offer',
        async (msg: Types.Message) => {
          await pcRef.current!.setRemoteDescription(
            msg.data as RTCSessionDescriptionInit
          );
          const answer = await pcRef.current!.createAnswer();
          await pcRef.current!.setLocalDescription(answer);
          channelRef.current?.publish('answer', answer);
        }
      );
      channelRef.current.subscribe(
        'answer',
        (msg: Types.Message) =>
          pcRef.current!.setRemoteDescription(
            msg.data as RTCSessionDescriptionInit
          )
      );
      channelRef.current.subscribe('ice-candidate', (msg: Types.Message) =>
        pcRef.current?.addIceCandidate(msg.data)
      );

      await initCamera(cams[0]?.deviceId);
    })();

    return () => {
      pcRef.current?.close();
      channelRef.current?.detach();
      ablyRef.current?.close();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [getCameras, initCamera]);

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden">
      {/* --- Main partner video --- */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* --- Self-preview (draggable & pinch-to-zoom) --- */}
      <motion.div
        ref={selfPreviewRef}
        className="absolute z-20"
        drag
        dragMomentum={false}
        whileDrag={{ scale: 1.1 }}
        style={{
          width: 150,
          height: 150,
          bottom: 20,
          right: 20,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '3px solid #3B82F6',
          boxShadow: '0 0 10px rgba(59,130,246,0.6)',
          touchAction: 'none',
          cursor: 'grab',
        }}
      >
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {cameras.length > 1 && (
          <button
            onClick={toggleCamera}
            className="absolute top-2 left-2 p-2 rounded-full bg-black bg-opacity-50 text-white"
          >
            🔄
          </button>
        )}
      </motion.div>

      {/* --- Chat panel --- */}
      {isChatOpen && (
        <motion.div
          className="absolute z-20 top-16 left-4 w-80 h-96 bg-black bg-opacity-70 backdrop-blur-sm rounded-lg p-4 flex flex-col"
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
        >
          <div className="flex-1 overflow-auto space-y-2">
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[80%] p-2 rounded-lg ${
                  m.sender === 'self'
                    ? 'self-end bg-blue-500 bg-opacity-30 text-blue-100'
                    : 'self-start bg-gray-700 bg-opacity-30 text-gray-100'
                }`}
              >
                <span className="font-medium">{m.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto flex space-x-2">
            <input
              className="flex-1 rounded px-2 py-1 bg-white text-black"
              placeholder="Type a message…"
            />
            <button className="px-4 rounded bg-blue-500 text-white">
              Send
            </button>
          </div>
        </motion.div>
      )}

      {/* --- Toolbar --- */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
        <div className="flex items-center space-x-4 bg-black bg-opacity-70 backdrop-blur-sm rounded-full px-6 py-3">
          <button
            onClick={handlePrevPartner}
            className="text-2xl bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600"
          >
            ⏮️
          </button>
          <button
            onClick={toggleMute}
            className={`text-2xl p-3 rounded-full ${
              isMuted
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>
          <button
            onClick={toggleCam}
            className="text-2xl bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600"
          >
            {isCamOn ? '📷' : '📸'}
          </button>
          <button
            className="text-2xl bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600"
            onClick={() => setIsChatOpen(o => !o)}
          >
            🗨️
          </button>
          <button
            className="text-2xl bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600"
          >
            ⚙️
          </button>
          <button
            onClick={handleDisconnect}
            className="text-2xl bg-red-500 text-white p-3 rounded-full hover:bg-red-600"
          >
            ⏹️
          </button>
          <button
            onClick={handleNextPartner}
            className="text-2xl bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600"
          >
            ⏭️
          </button>
        </div>
      </div>
    </main>
  );
}
