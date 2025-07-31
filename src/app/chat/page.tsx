'use client';
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SIGNALING_SERVER_URL = "https://ditonachat-backend.onrender.com";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    // This is the corrected line
    { urls: "stun:global.stun.twilio.com:3478" },
  ],
};

export default function ChatPage() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const start = async () => {
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        localStreamRef.current = localStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });

        pc.ontrack = (event: RTCTrackEvent) => {
          const [remoteStream] = event.streams;
          if (remoteVideoRef.current && remoteStream) {
            if (remoteVideoRef.current.srcObject !== remoteStream) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          }
        };

        pc.onicecandidate = (event) => {
          const candidate = event.candidate;
          if (candidate && socketRef.current) {
            socketRef.current.emit("ice-candidate", candidate);
          }
        };

        const socket = io(SIGNALING_SERVER_URL, {
          autoConnect: true,
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          socket.emit("ready");
        });

        socket.on("partner", async (data: { isInitiator?: boolean }) => {
          if (!pcRef.current) return;
          if (data?.isInitiator) {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit("offer", offer);
            } catch (err) {
              console.error("Failed to create or send offer", err);
            }
          }
        });

        socket.on("offer", async (offer: RTCSessionDescriptionInit) => {
          const pc = pcRef.current;
          if (!pc) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("answer", answer);
          } catch (err) {
            console.error("Error handling received offer", err);
          }
        });

        socket.on("answer", async (answer: RTCSessionDescriptionInit) => {
          const pc = pcRef.current;
          if (!pc) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (err) {
            console.error("Error setting remote description from answer", err);
          }
        });

        socket.on(
          "ice-candidate",
          async (candidate: RTCIceCandidateInit) => {
            const pc = pcRef.current;
            if (!pc || !candidate) return;
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.error("Error adding received ICE candidate", err);
            }
          },
        );
      } catch (err) {
        console.error("Error during WebRTC initialisation", err);
      }
    };

    start();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-gray-900">
      <video
        ref={remoteVideoRef}
        className="h-full w-full rounded-md bg-black"
        autoPlay
        playsInline
      />
      <video
        ref={localVideoRef}
        className="absolute bottom-4 right-4 h-32 w-40 rounded-md border border-white bg-black"
        autoPlay
        playsInline
        muted
      />
    </div>
  );
}
