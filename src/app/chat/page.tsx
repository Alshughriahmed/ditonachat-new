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

  // نضيف هذان المرجعان لحفظهم بين الريندرز
  const channelRef      = useRef<Types.RealtimeChannelCallbacks>(null);
  const localStreamRef  = useRef<MediaStream>(null);
  const localVideoRef   = useRef<HTMLVideoElement>(null);
  const remoteVideoRef  = useRef<HTMLVideoElement>(null);
=======
    // --- Refs for Video Elements ---
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    // --- State Management ---
    const [status, setStatus] = useState('Connecting to server...');
    const [isMuted, setIsMuted] = useState(false);
    const [isCamOn, setIsCamOn] = useState(true);
    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
    const [currentCamIndex, setCurrentCamIndex] = useState(0);
>>>>>>> 818f8c5 (WIP: UI tweaks on chat page and initial layout changes)

    // --- WebRTC and Ably Setup ---
    const ablyRef = useRef<Realtime | null>(null);
    const channelRef = useRef<Types.RealtimeChannelCallbacks | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    // --- Get available cameras ---
    const getCameras = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            setCameras(videoDevices);
            return videoDevices;
        } catch (err) {
            console.error('Error enumerating devices:', err);
            return [];
        }
    }, []);

    // --- Initialize camera stream ---
    const initCamera = useCallback(async (deviceId?: string) => {
        try {
            const constraints = {
                video: deviceId ? { deviceId: { exact: deviceId } } : true,
                audio: true,
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            localStreamRef.current = stream;

            // Add tracks to peer connection
            stream.getTracks().forEach(track => pcRef.current?.addTrack(track, stream));
            setStatus('Ready to connect with a partner...');
        } catch (err) {
            console.error('Failed to get media:', err);
            setStatus('Error: Failed to access camera. Please check permissions.');
        }
    }, []);

    // --- Toggle camera function ---
    const toggleCamera = useCallback(async () => {
        const nextCamIndex = (currentCamIndex + 1) % cameras.length;
        setCurrentCamIndex(nextCamIndex);

        // Stop current tracks
        localStreamRef.current?.getTracks().forEach(track => track.stop());

        // Re-initialize camera with new device ID
        const newCamId = cameras[nextCamIndex].deviceId;
        await initCamera(newCamId);

        // Update sender tracks in peer connection
        const newStream = localVideoRef.current?.srcObject as MediaStream;
        if (newStream) {
            const videoTrack = newStream.getVideoTracks()[0];
            const sender = pcRef.current?.getSenders().find(s => s.track?.kind === videoTrack.kind);
            if (sender) {
                await sender.replaceTrack(videoTrack);
            }
        }
    }, [currentCamIndex, cameras, initCamera]);

    // --- Toggle Mute function ---
    const toggleMute = () => {
        const stream = localStreamRef.current;
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !isMuted;
                setIsMuted(!isMuted);
            }
        }
    };

    // --- Toggle Cam On/Off function ---
    const toggleCam = () => {
        const stream = localStreamRef.current;
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !isCamOn;
                setIsCamOn(!isCamOn);
            }
        }
    };

    // --- Component Mount Effect ---
    useEffect(() => {
        const start = async () => {
            await getCameras();

            // --- Ably & WebRTC Setup ---
            ablyRef.current = new Realtime({ key: ABLY_KEY });
            channelRef.current = ablyRef.current.channels.get(SIGNALING_CHANNEL);
            await channelRef.current.attach();

            pcRef.current = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            });

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

            channelRef.current.subscribe('offer', async (msg: Types.Message) => {
                await pcRef.current!.setRemoteDescription(msg.data as RTCSessionDescriptionInit);
                const answer = await pcRef.current!.createAnswer();
                await pcRef.current!.setLocalDescription(answer);
                channelRef.current?.publish('answer', answer);
            });

            channelRef.current.subscribe('answer', async (msg: Types.Message) => {
                await pcRef.current!.setRemoteDescription(msg.data as RTCSessionDescriptionInit);
            });

            channelRef.current.subscribe('ice-candidate', (msg: Types.Message) => {
                pcRef.current?.addIceCandidate(msg.data);
            });

            await initCamera();
        };

        start();

        return () => {
            pcRef.current?.close();
            channelRef.current?.detach();
            ablyRef.current?.close();
            localStreamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, [initCamera, getCameras]);

    const handleNextPartner = () => {
        // Here we will add the logic for the "Next" button
        // For now, we will simply alert
        alert("Next Partner button clicked. Matching logic will be implemented here.");
    };

    const handleDisconnect = () => {
        // Here we will add the logic to disconnect
        // For now, we will simply alert
        alert("Disconnect button clicked. Disconnecting and redirecting...");
        // You can add a router.push('/') here when needed
    };

    return (
        <main className="relative w-full h-screen bg-black overflow-hidden">
            {/* --- Main Partner Video --- */}
            <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* --- Draggable & Resizable Self-Preview Video --- */}
            <motion.div
                className="absolute"
                drag
                dragMomentum={false}
                style={{
                    width: 150,
                    height: 150,
                    bottom: 20,
                    right: 20,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '3px solid #ff69b4', // Glowing pink border
                    boxShadow: '0 0 10px #ff69b4',
                    cursor: 'grab'
                }}
            >
                <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                />
                
                {/* --- Camera Toggle Button --- */}
                {cameras.length > 1 && (
                    <button
                        onClick={toggleCamera}
                        className="absolute top-2 left-2 p-2 rounded-full bg-black bg-opacity-50 text-white z-10"
                    >
                        🔄
                    </button>
                )}
            </motion.div>

            {/* --- Partner Info Panel (Simplified) --- */}
            <div className="absolute top-4 left-4 p-4 rounded-lg bg-black bg-opacity-60 text-white z-10">
                <p>{status}</p>
                <div className="flex items-center space-x-2 mt-2">
                    <span>❤️</span>
                    <span>1,234</span>
                    <span>👑</span>
                    <span>🇩🇪</span>
                </div>
            </div>

            {/* --- Toolbar --- */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4 p-4 rounded-full bg-black bg-opacity-70 text-white z-10">
                <button onClick={toggleMute} className="p-2 rounded-full hover:bg-gray-700">
                    {isMuted ? '🔇' : '🎤'}
                </button>
                <button onClick={toggleCam} className="p-2 rounded-full hover:bg-gray-700">
                    {isCamOn ? '📷' : '📸'}
                </button>
                <button className="p-2 rounded-full hover:bg-gray-700">🎭</button>
                <button className="p-2 rounded-full hover:bg-gray-700">⚙️</button>
                <button onClick={handleNextPartner} className="p-2 rounded-full bg-pink-600 hover:bg-pink-700">⏭️</button>
                <button className="p-2 rounded-full hover:bg-gray-700">🚩</button>
                <button className="p-2 rounded-full hover:bg-gray-700">⭐</button>
                <button className="p-2 rounded-full hover:bg-gray-700">📜</button>
                <button onClick={handleDisconnect} className="p-2 rounded-full bg-red-600 hover:bg-red-700">❌</button>
            </div>
            
            {/* --- Text Chat Panel (Placeholder) --- */}
            <div className="absolute top-1/2 right-0 transform -translate-y-1/2 w-80 h-3/4 rounded-l-lg bg-black bg-opacity-70 text-white z-10">
                {/* Chat messages and input field will go here */}
            </div>
        </main>
    );
}
