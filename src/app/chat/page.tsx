'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Define the structure for a chat message
type Message = {
    sender: 'You' | 'Stranger';
    text: string;
};

// Define the possible states of the connection
type ConnectionStatus = 'connecting' | 'waiting' | 'connected' | 'error' | 'disconnected';

const SIGNALING_SERVER_URL = "https://ditonachat-backend.onrender.com";

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" },
    ],
};

const MatchPage = () => {
    // Refs for DOM elements and WebRTC/Socket objects
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const socketRef = useRef<Socket | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    // State management for the UI
    const [status, setStatus] = useState<ConnectionStatus>('connecting');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isLocalMicMuted, setIsLocalMicMuted] = useState(false);
    const [isLocalVideoOff, setIsLocalVideoOff] = useState(false);

    useEffect(() => {
        // Main setup function
        const setup = async () => {
            try {
                // 1. Get User Media
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localStreamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                // 2. Connect to Signaling Server
                const socket = io(SIGNALING_SERVER_URL);
                socketRef.current = socket;

                // --- Socket Event Listeners ---
                socket.on('connect', () => {
                    setStatus('waiting');
                    socket.emit('ready');
                });

                socket.on('partner', async (data: { partnerId: string, isInitiator: boolean }) => {
                    setStatus('connected');
                    peerConnectionRef.current = createPeerConnection(data.partnerId);
                    
                    if (data.isInitiator) {
                        const offer = await peerConnectionRef.current.createOffer();
                        await peerConnectionRef.current.setLocalDescription(offer);
                        socket.emit('offer', { target: data.partnerId, offer });
                    }
                });
                
                // ... other listeners like 'offer', 'answer', 'ice-candidate'

                socket.on('disconnect', () => {
                    setStatus('disconnected');
                    cleanup();
                });
                
                socket.on('connect_error', () => {
                    setStatus('error');
                });

            } catch (error) {
                console.error("Initialization failed:", error);
                setStatus('error');
            }
        };

        setup();

        // Cleanup function
        const cleanup = () => {
            localStreamRef.current?.getTracks().forEach(track => track.stop());
            peerConnectionRef.current?.close();
            socketRef.current?.disconnect();
        };

        return cleanup;
    }, []);
    
    // Helper to create and configure the Peer Connection
    const createPeerConnection = (partnerId: string) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        
        localStreamRef.current?.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!);
        });

        pc.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };
        
        // ... onicecandidate logic
        
        return pc;
    };


    // --- Render logic based on status ---
    
    // Error and Disconnected Overlay
    if (status === 'error' || status === 'disconnected') {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-black text-white">
                <h1 className="text-2xl mb-4">{status === 'error' ? 'Connection Error' : 'Disconnected'}</h1>
                <button onClick={() => window.location.reload()} className="p-3 bg-pink-600 rounded-lg">Try Again</button>
            </div>
        );
    }
    
    // Main UI
    return (
        <main className="relative w-full h-screen bg-black text-white">
            {/* Videos */}
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-20 right-4 w-40 h-32 rounded-lg border-2 border-white" />

            {/* Status Overlay */}
            {(status === 'connecting' || status === 'waiting') && (
                <div className="absolute inset-0 flex flex-col justify-center items-center bg-black bg-opacity-70">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                    <p className="mt-4 text-lg">{status === 'connecting' ? 'Connecting to Server...' : 'Waiting for a Partner...'}</p>
                </div>
            )}
            
            {/* Controls and Chat */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center">
                 {/* ... Buttons and Chat UI from the agent's description would go here ... */}
            </div>
        </main>
    );
};

export default MatchPage;
