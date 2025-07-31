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

    // Get camera and microphone access
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        socket.emit('ready'); // Tell the server we are ready
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

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Add local tracks to send to the other user
      localStreamRef.current?.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });

      return pc;
    };

    // --- Socket.IO Event Handlers ---

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
    <main className="relative w-full h-screen bg-black overflow-hidden">
      {/* Remote User's Video */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      ></video>

      {/* Main UI container */}
      <div className="relative z-20 flex flex-col h-full p-4">
        {/* Top Bar */}
        <div className="w-full flex justify-between items-center text-white">
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg">Username</span>
            <span title="Country">DE</span>
            <span title="Likes">❤️ 123</span>
          </div>
          <button className="text-2xl" title="Settings">⚙️</button>
        </div>

        <div className="flex-grow"></div>

        {/* Chat Input */}
        <div className="w-full max-w-2xl mx-auto mb-4">
          <input
            type="text"
            placeholder="اكتب رسالتك..."
            className="w-full p-3 bg-black bg-opacity-60 text-white border border-gray-600 rounded-lg"
          />
        </div>

        {/* Control Buttons */}
        <div className="w-full flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-4">
                <button className="flex items-center gap-2 text-white text-xl p-3 bg-gray-700 rounded-lg opacity-50">⏪️ <span className="hidden md:inline">السابق</span> <span>🔒</span></button>
                <button className="text-white text-xl p-4 bg-red-600 rounded-full scale-110">⏹️</button>
                <button className="flex items-center gap-2 text-white text-xl p-3 bg-blue-600 rounded-lg"><span className="hidden md:inline">التالي</span> ⏩️</button>
            </div>
             <div className="flex items-center justify-center gap-6 mt-2 text-white text-2xl p-2 bg-black bg-opacity-40 rounded-full">
                <button title="Mute Mic">🎙️</button>
                <button title="Mute Audio">🔈</button>
                <button title="Report">🚩</button>
             </div>
        </div>
      </div>

      {/* Local User's Video */}
      <div className="absolute bottom-6 right-6 w-32 h-48 md:w-40 md:h-56 bg-gray-800 rounded-lg border-2 border-white overflow-hidden">
        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
        <button className="absolute top-2 right-2 text-white text-2xl bg-black bg-opacity-50 rounded-full p-1">🔄</button>
      </div>
    </main>
  );
};

export default MatchPage;
