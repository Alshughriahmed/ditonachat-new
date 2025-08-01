"use client";

import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SIGNALING_SERVER =
  process.env.NEXT_PUBLIC_SIGNALING_URL ||
  "https://ditonachat-backend.onrender.com";

export default function ChatPage() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const [status, setStatus] = useState("Connecting to server...");

  useEffect(() => {
    console.log("🔄 ChatPage useEffect fired");
    let cancelled = false;

    async function start() {
      setStatus("Connecting to server...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const socket = io(SIGNALING_SERVER);
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("✅ Socket connected, id =", socket.id);
        setStatus("Waiting for partner...");
        socket.emit("ready");
      });

      socket.on("partner", async (data: { isInitiator?: boolean }) => {
        setStatus("Negotiating...");
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        // أضف مسارات الصوت+فيديو
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        // إرسال ICE candidates
        pc.onicecandidate = (e) => {
          if (e.candidate) socket.emit("ice-candidate", e.candidate);
        };
        // استقبال المسار البعيد
        pc.ontrack = (e) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = e.streams[0];
            setStatus("Connected");
          }
        };

        if (data.isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", offer);
        }
      });

      socket.on("offer", async (offer: RTCSessionDescriptionInit) => {
        setStatus("Answering...");
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        pc.onicecandidate = (e) => {
          if (e.candidate) socket.emit("ice-candidate", e.candidate);
        };
        pc.ontrack = (e) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = e.streams[0];
            setStatus("Connected");
          }
        };

        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", answer);
      });

      socket.on("answer", async (answer: RTCSessionDescriptionInit) => {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(answer);
        }
      });

      socket.on(
        "ice-candidate",
        async (candidate: RTCIceCandidateInit) => {
          if (pcRef.current) {
            await pcRef.current.addIceCandidate(candidate);
          }
        }
      );
    }

    start();

    return () => {
      cancelled = true;
      pcRef.current?.close();
      socketRef.current?.disconnect();
      if (localVideoRef.current?.srcObject instanceof MediaStream) {
        (localVideoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <h1 className="mb-4 text-xl text-white">{status}</h1>
      <div className="relative w-full max-w-4xl aspect-video">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-2 right-2 w-40 h-24 object-cover border-2 border-white rounded"
        />
      </div>
    </div>
  );
}
