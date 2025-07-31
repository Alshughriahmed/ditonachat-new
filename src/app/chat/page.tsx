'use client';

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

// Define constants at the top level
const SIGNALING_SERVER_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || "https://ditonachat-backend.onrender.com";
const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
    ],
};

// Define the main component and export it as the default
export default function ChatPage() {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    const [status, setStatus] = useState("Connecting...");

    useEffect(() => {
        const socket = io(SIGNALING_SERVER_URL);
        socketRef.current = socket;

        const start = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                localStreamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                socket.on('connect', () => {
                    setStatus("Waiting for a partner...");
                    socket.emit('ready');
                });

                socket.on('partner', (data: { isInitiator: boolean }) => {
                    setStatus("Connecting to partner...");
                    pcRef.current = createPeerConnection();
                    if (data.isInitiator) {
                        pcRef.current.createOffer()
                            .then(offer => pcRef.current!.setLocalDescription(offer))
                            .then(() => {
                                socket.emit('offer', pcRef.current!.localDescription);
                            });
                    }
                });

                socket.on('offer', (offer: RTCSessionDescriptionInit) => {
                    pcRef.current = createPeerConnection();
                    pcRef.current.setRemoteDescription(new RTCSessionDescription(offer))
                        .then(() => pcRef.current!.createAnswer())
                        .then(answer => pcRef.current!.setLocalDescription(answer))
                        .then(() => {
                            socket.emit('answer', pcRef.current!.localDescription);
                        });
                });

                socket.on('answer', (answer: RTCSessionDescriptionInit) => {
                    pcRef.current!.setRemoteDescription(new RTCSessionDescription(answer));
                });

                socket.on('ice-candidate', (candidate: RTCIceCandidateInit) => {
                    pcRef.current!.addIceCandidate(new RTCIceCandidate(candidate));
                });

            } catch (err) {
                console.error("Initialization error:", err);
                setStatus("Error initializing");
            }
        };

        const createPeerConnection = () => {
            const pc = new RTCPeerConnection(ICE_SERVERS);
            
            localStreamRef.current?.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });

            pc.ontrack = (event) => {
                setStatus("Connected");
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            };

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice-candidate', event.candidate);
                }
            };
            return pc;
        };

        start();

        return () => {
            socket.disconnect();
            pcRef.current?.close();
            localStreamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, []);

    return (
        <div className="relative h-full w-full bg-black text-white">
            <video ref={remoteVideoRef} className="h-full w-full object-cover" autoPlay playsInline />
            <video ref={localVideoRef} className="absolute bottom-4 right-4 h-32 w-40 rounded-md border border-white bg-black" autoPlay playsInline muted />
            {status !== 'Connected' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <p className="text-lg">{status}</p>
                </div>
            )}
        </div>
    );
}
