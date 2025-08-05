'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Realtime, Types } from 'ably';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

// --- Environment Variables ---
const ABLY_KEY = process.env.NEXT_PUBLIC_ABLY_KEY!;
const SIGNALING_CHANNEL = 'webrtc-signal-channel';

export default function ChatPage() {
  // ——— Refs for persistent objects ———
  const ablyRef = useRef<Realtime | null>(null);
  const channelRef = useRef<Types.RealtimeChannelCallbacks | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // ——— Video element refs ———
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // ——— UI state ———
  const [status, setStatus] = useState('Connecting to server...');
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOn, setIsCamOn] = useState(true);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCamIndex, setCurrentCamIndex] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(true);

  // ——— Helper: enumerate cameras ———
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

  // ——— Helper: start camera ———
  const initCamera = useCallback(
    async (deviceId?: string) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
          audio: true,
        });
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        localStreamRef.current = stream;
        stream.getTracks().forEach(track => pcRef.current?.addTrack(track, stream));
        setStatus('Ready to connect with a partner...');
      } catch (err) {
        console.error('Failed to get media:', err);
        setStatus('Error: Failed to access camera. Please check permissions.');
      }
    },
    []
  );

  // ——— Toggle between cameras ———
  const toggleCamera = useCallback(async () => {
    if (cameras.length < 2) return;
    const next = (currentCamIndex + 1) % cameras.length;
    setCurrentCamIndex(next);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    await initCamera(cameras[next].deviceId);
    const newStream = localVideoRef.current?.srcObject as MediaStream;
    const videoTrack = newStream.getVideoTracks()[0];
    const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video');
    if (sender) await sender.replaceTrack(videoTrack);
  }, [cameras, currentCamIndex, initCamera]);

  // ——— Mute/unmute ———
  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = isMuted;
      setIsMuted(!isMuted);
    }
  };

  // ——— Cam on/off ———
  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !isCamOn;
      setIsCamOn(!isCamOn);
    }
  };

  // ——— Lifecycle: setup Ably + WebRTC ———
  useEffect(() => {
    const start = async () => {
      await getCameras();

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
      channelRef.current.subscribe('answer', msg =>
        pcRef.current!.setRemoteDescription(msg.data as RTCSessionDescriptionInit)
      );
      channelRef.current.subscribe('ice-candidate', msg =>
        pcRef.current?.addIceCandidate(msg.data)
      );

      await initCamera();
    };

    start();
    return () => {
      pcRef.current?.close();
      channelRef.current?.detach();
      ablyRef.current?.close();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [getCameras, initCamera]);

  // ——— Partner controls ———
  const handleNextPartner = () => alert('⏭️ Next Partner');
  const handlePreviousPartner = () => alert('⏮️ Previous Partner');
  const handleDisconnect = () => alert('⏹️ Disconnect');

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden">
      {/* Partner’s video full-screen */}
      <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />

      {/* Self-preview: draggable & pinch-to-zoom */}
      <motion.div
        className="absolute top-4 right-4 z-20"
        drag
        dragMomentum={false}
        style={{ touchAction: 'none', width: 150, height: 150 }}
        initial={{ scale: 1 }}
        whileDrag={{ scale: 1.1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        ref={localVideoRef /* for pinch-to-zoom logic if implemented */}
      >
        <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full rounded-full overflow-hidden border-4 border-blue-500 shadow-lg" />
        {cameras.length > 1 && (
          <button onClick={toggleCamera} className="absolute top-2 left-2 bg-black bg-opacity-50 p-2 rounded-full text-white">
            🔄
          </button>
        )}
      </motion.div>

      {/* Status & Partner Info */}
      <div className="absolute top-4 left-4 z-20 bg-black bg-opacity-60 p-3 rounded-lg text-white">
        <p className="text-sm">{status}</p>
      </div>

      {/* Bottom toolbar */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
        <div className="flex items-center space-x-4 bg-black bg-opacity-70 backdrop-blur-sm rounded-full px-6 py-3">
          <button onClick={handlePreviousPartner} className="text-2xl bg-blue-500 p-3 rounded-full hover:bg-blue-600">
            ⏮️
          </button>
          <button onClick={toggleCam} className={`text-2xl p-3 rounded-full ${isCamOn ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500'}`}>
            {isCamOn ? '📷' : '📸'}
          </button>
          <button onClick={toggleMute} className={`text-2xl p-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-blue-500 hover:bg-blue-600'}`}>
            {isMuted ? '🔇' : '🎤'}
          </button>
          <button className="text-2xl p-3 rounded-full bg-blue-500 hover:bg-blue-600">⚙️</button>
          <button onClick={handleDisconnect} className="text-2xl p-3 rounded-full bg-red-500 hover:bg-red-600">
            ⏹️
          </button>
          <button onClick={handleNextPartner} className="text-2xl bg-blue-500 p-3 rounded-full hover:bg-blue-600">
            ⏭️
          </button>
        </div>
      </div>

      {/* Chat panel */}
      {isChatOpen && (
        <motion.div
          className="absolute top-20 left-4 z-20 w-80 h-96 bg-black bg-opacity-70 backdrop-blur-sm rounded-lg p-4 flex flex-col space-y-2 overflow-y-auto"
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Messages would be mapped here */}
          <div className="mt-auto flex space-x-2">
            <input
              type="text"
              className="flex-1 bg-white bg-opacity-20 rounded px-3 py-2 placeholder-gray-300 text-white focus:outline-none"
              placeholder="Type a message..."
            />
            <button className="bg-blue-500 hover:bg-blue-600 text-white rounded px-4">Send</button>
          </div>
        </motion.div>
      )}
    </main>
);
