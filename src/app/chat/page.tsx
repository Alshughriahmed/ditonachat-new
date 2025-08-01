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
    let cancelled = false;

    const start = async () => {
      setStatus("Connecting to server...");
      const localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      const socket = io(SIGNALING_SERVER);
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
        setStatus("Waiting for partner...");
        socket.emit("ready");
      });

      socket.on("partner", async (data: { isInitiator?: boolean }) => {
        console.log("Partner event:", data);
        setStatus("Partner found. Negotiating...");

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        // إضافة المسارات المحلية
        localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit("ice-candidate", e.candidate);
          }
        };
        pc.ontrack = (e) => {
          console.log("ontrack", e.streams);
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
        console.log("Received offer");
        const localStream = (localVideoRef.current?.srcObject ||
          null) as MediaStream;
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        pc.onicecandidate = (e) => {
          if (e.candidate) socket.emit("ice-candidate", e.candidate);
        };
        pc.ontrack = (e) => {
          console.log("ontrack answer", e.streams);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = e.streams[0];
            setStatus("Connected");
          }
        };

        localStream?.getTracks().forEach((t) => pc.addTrack(t, localStream));
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", answer);
      });

      socket.on(
        "answer",
        async (answer: RTCSessionDescriptionInit) => {
          console.log("Received answer");
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(answer);
          }
        }
      );

      socket.on(
        "ice-candidate",
        async (candidate: RTCIceCandidateInit) => {
          console.log("Received ICE candidate");
          if (pcRef.current) {
            try {
              await pcRef.current.addIceCandidate(candidate);
            } catch (err) {
              console.error("ICE add error", err);
            }
          }
        }
      );
    };

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
