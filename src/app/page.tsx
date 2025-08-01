"use client";

import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SIGNALING_SERVER = process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:3001";

export default function ChatPage() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<any>(null);
  const [status, setStatus] = useState("Connecting to server...");

  useEffect(() => {
    const start = async () => {
      setStatus("Connecting to server...");
      const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      socketRef.current = io(SIGNALING_SERVER);

      socketRef.current.on("connect", () => {
        console.log("Socket connected");
        setStatus("Waiting for partner...");
      });

      socketRef.current.on("partner-found", async () => {
        console.log("Partner found. Creating RTCPeerConnection");
        setStatus("Partner found. Connecting...");
        const pc = createPeerConnection(localStream);
        pcRef.current = pc;

        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit("offer", offer);
      });

      socketRef.current.on("offer", async (offer: RTCSessionDescriptionInit) => {
        console.log("Received offer");
        const pc = createPeerConnection(localStream);
        pcRef.current = pc;

        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current.emit("answer", answer);
      });

      socketRef.current.on("answer", async (answer: RTCSessionDescriptionInit) => {
        console.log("Received answer");
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(answer);
        }
      });

      socketRef.current.on("ice-candidate", async (candidate: RTCIceCandidateInit) => {
        console.log("Received ICE candidate");
        try {
          await pcRef.current?.addIceCandidate(candidate);
        } catch (err) {
          console.error("Error adding ICE candidate", err);
        }
      });
    };

    start();
  }, []);

  const createPeerConnection = (stream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice-candidate", event.candidate);
      }
    };

    pc.ontrack = (event) => {
      console.log("Remote track received", event.streams);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setStatus("Connected");
      }
    };

    return pc;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-xl mb-4">{status}</h1>
      <div className="relative w-full max-w-4xl flex justify-center items-center">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full rounded border border-gray-700"
        />
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-4 right-4 w-40 border-2 border-white rounded shadow"
        />
      </div>
    </div>
  );
}
