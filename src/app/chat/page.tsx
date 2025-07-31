'use client';
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SIGNALING_SERVER_URL = "https://ditonachat-backend.onrender.com";
const ICE_SERVERS: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

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
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                
                socket.on('connect', () => {
                    setStatus("Waiting for partner...");
                    socket.emit('ready');
                });

                socket.on('partner', (data: { partnerId: string, isInitiator: boolean }) => {
                    setStatus("Connecting to partner...");
                    pcRef.current = createPeerConnection(data.partnerId);
                    if (data.isInitiator) {
                        pcRef.current.createOffer()
                            .then(offer => pcRef.current!.setLocalDescription(offer))
                            .then(() => {
                                socket.emit('offer', { target: data.partnerId, offer: pcRef.current!.localDescription });
                            });
                    }
                });

                socket.on('offer', (data: { from: string, offer: RTCSessionDescriptionInit }) => {
                    pcRef.current = createPeerConnection(data.from);
                    pcRef.current.setRemoteDescription(new RTCSession-description(data.offer))
                        .then(() => pcRef.current!.createAnswer())
                        .then(answer => pcRef.current!.setLocalDescription(answer))
                        .then(() => {
                            socket.emit('answer', { target: data.from, answer: pcRef.current!.localDescription });
                        });
                });

                socket.on('answer', (data: { from: string, answer: RTCSessionDescriptionInit }) => {
                    pcRef.current!.setRemoteDescription(new RTCSessionDescription(data.answer));
                });

                socket.on('ice-candidate', (candidate: RTCIceCandidateInit) => {
                    pcRef.current!.addIceCandidate(new RTCIceCandidate(candidate));
                });

            } catch (err) {
                setStatus("Error");
            }
        };

        const createPeerConnection = (partnerId: string) => {
            const pc = new RTCPeerConnection(ICE_SERVERS);
            localStreamRef.current?.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
            pc.ontrack = (event) => {
                setStatus("Connected");
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
            };
            pc.onicecandidate = (event) => {
                if (event.candidate) socket.emit('ice-candidate', { target: partnerId, candidate: event.candidate });
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
