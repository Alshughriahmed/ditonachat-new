'use client';
import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const MatchPage = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const socket = io('https://ditonachat-backend.onrender.com');
    socketRef.current = socket;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        socket.emit('ready');
      })
      .catch(err => {
        console.error("Error accessing camera:", err);
      });

    const createPeerConnection = (partnerId: string) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { target: partnerId, candidate: event.candidate });
        }
      };

      // --- THIS IS THE CORRECTED PART ---
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };
      // --- END OF CORRECTION ---

      localStreamRef.current?.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });

      return pc;
    };

    socket.on('partner', async (partnerId) => {
      peerConnectionRef.current = createPeerConnection(partnerId);
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      socket.emit('offer', { target: partnerId, offer });
    });

    socket.on('offer', async ({ from, offer }) => {
      peerConnectionRef.current = createPeerConnection(from);
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      socket.emit('answer', { target: from, answer });
    });

    socket.on('answer', async ({ answer }) => {
      await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice-candidate', (candidate) => {
      peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
      socket.disconnect();
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      peerConnectionRef.current?.close();
    };
  }, []);

  return (
    // ... The JSX remains the same ...
    <main className="relative w-full h-screen bg-black overflow-hidden">
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute top-0 left-0 w-full h-full object-cover z-0"></video>
        <div className="relative z-20 flex flex-col h-full p-4">
            {/* ... UI Elements ... */}
        </div>
        <div className="absolute bottom-6 right-6 w-32 h-48 md:w-40 md:h-56 bg-gray-800 rounded-lg border-2 border-white overflow-hidden">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
        </div>
    </main>
  );
};

export default MatchPage;
