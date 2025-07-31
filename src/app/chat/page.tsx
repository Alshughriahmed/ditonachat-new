'use client';
import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SIGNALING_SERVER_URL = "https://ditonachat-backend.onrender.com";
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const MatchPage = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState('Initializing...');

  useEffect(() => {
    const socket = io(SIGNALING_SERVER_URL);
    socketRef.current = socket;

    const start = async () => {
      try {
        setStatus("Getting camera...");
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        setStatus("Connecting to server...");
        socket.connect();
      } catch (err) {
        console.error("Failed to get media", err);
        setStatus("Camera Error");
      }
    };

    start();

    const createPeerConnection = (partnerId: string) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      localStreamRef.current?.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
      pc.ontrack = event => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };
      pc.onicecandidate = event => {
        if (event.candidate) socket.emit('ice-candidate', { target: partnerId, candidate: event.candidate });
      };
      return pc;
    };

    socket.on('connect', () => {
        setStatus("Waiting for a Partner...");
        socket.emit('ready');
    });

    socket.on('partner', async (data: { partnerId: string, isInitiator: boolean }) => {
        setStatus("Connecting to Peer...");
        pcRef.current = createPeerConnection(data.partnerId);
        if (data.isInitiator) {
            const offer = await pcRef.current.createOffer();
            await pcRef.current.setLocalDescription(offer);
            socket.emit('offer', { target: data.partnerId, offer });
        }
    });

    socket.on('offer', async ({ from, offer }) => {
        setStatus("Connecting to Peer...");
        pcRef.current = createPeerConnection(from);
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit('answer', { target: from, answer });
    });

    socket.on('answer', async ({ answer }) => {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice-candidate', (candidate) => {
        pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
      socket.disconnect();
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      pcRef.current?.close();
    };
  }, []);

  return (
    <main className="relative w-full h-screen bg-black text-white flex justify-center items-center">
      <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <p className="absolute text-lg">{status}</p>
      <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-4 right-4 w-40 h-32 border-2 border-white rounded-lg" />
    </main>
  );
};

export default MatchPage;
