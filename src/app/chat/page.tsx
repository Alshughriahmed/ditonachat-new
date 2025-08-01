"use client";

import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SIGNALING_SERVER = process.env.NEXT_PUBLIC_SIGNALING_URL!;

export default function ChatPage() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState("Connecting to server...");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setStatus("Connecting to server...");
      // 1) احصل على وسائط الكاميرا+ميكروفون
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 2) أصل WebSocket إلى نفس الـ SIGNALING_SERVER
      const socket: Socket = io(SIGNALING_SERVER, {
        transports: ["websocket"],
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("✅ Socket connected, id =", socket.id);
        setStatus("Waiting for partner...");
        socket.emit("ready");
      });

      // 3) عند وصول “partner” تبدأ إنشاء RTCPeerConnection
      socket.on("partner", async (data: { isInitiator?: boolean }) => {
        setStatus("Negotiating...");
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        // أضف مسارات الصوت والفيديو
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        // أرسل ICE للآخر
        pc.onicecandidate = (e) => {
          if (e.candidate) socket.emit("ice-candidate", e.candidate);
        };
        // استقبل المسار عن بُعد
        pc.ontrack = (e) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = e.streams[0];
            setStatus("Connected");
          }
        };

        // لو أنت المُنشئ (initiator) ترسل offer
        if (data.isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", offer);
        }
      });

      // 4) لو استقبلت عرض (offer)، تجاوب بـ answer
      socket.on("offer", async (offer) => {
        setStatus("Answering...");
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        pc.onicecandidate = (e) => {
          if (e.candidate) socket.emit("ice-candidate", e.candidate);
        };
        pc.ontrack = (e) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = e.streams[0];
            setStatus("Connected");
          }
        };

        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", answer);
      });

      // 5) لو استلمت جواب (answer)، ضبّطه كـ remoteDescription
      socket.on("answer", async (answer) => {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(answer);
        }
      });

      // 6) استقبال ICE candidates
      socket.on("ice-candidate", async (cand) => {
        if (pcRef.current) {
          await pcRef.current.addIceCandidate(cand);
        }
      });
    }

    start();

    return () => {
      cancelled = true;
      pcRef.current?.close();
      socketRef.current?.disconnect();
      if (
        localVideoRef.current?.srcObject instanceof MediaStream
      ) {
        (localVideoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="mb-4 text-xl">{status}</h1>
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
