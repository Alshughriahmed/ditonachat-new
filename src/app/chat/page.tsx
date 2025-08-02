'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Realtime } from 'ably';

const ABLY_KEY = process.env.NEXT_PUBLIC_ABLY_KEY!;
const SIGNALING_CHANNEL = 'webrtc-signal-channel';

export default function ChatPage() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('Initializing…');

  const pcRef = useRef<RTCPeerConnection>();
  const channelRef = useRef<ReturnType<Realtime['channels']['get']>>();
  const ablyRef = useRef<Realtime>();

  useEffect(() => {
    async function start() {
      setStatus('Accessing local media…');
      const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      // Initialize Ably Realtime
      const ably = new Realtime({ key: ABLY_KEY });
      ablyRef.current = ably;
      const channel = ably.channels.get(SIGNALING_CHANNEL);
      channelRef.current = channel;
      await channel.attach();
      setStatus('Connected to signaling channel');

      // Setup PeerConnection
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pcRef.current = pc;
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channel.publish('ice-candidate', event.candidate);
        }
      };

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Subscribe to signaling messages
      channel.subscribe('offer', async (msg) => {
        setStatus('Received offer, creating answer…');
        await pc.setRemoteDescription(msg.data);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.publish('answer', answer);
      });

      channel.subscribe('answer', async (msg) => {
        setStatus('Received answer, establishing connection…');
        await pc.setRemoteDescription(msg.data);
      });

      channel.subscribe('ice-candidate', async (msg) => {
        try {
          await pc.addIceCandidate(msg.data);
        } catch (err) {
          console.error('Error adding received ICE candidate', err);
        }
      });

      // Create offer if none exists
      const history = await channel.history({ limit: 1, direction: 'backwards' });
      const last = history.items[0];
      if (!last || last.name !== 'offer') {
        setStatus('Creating offer…');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channel.publish('offer', offer);
      } else {
        setStatus('Waiting for offer…');
      }
    }

    start().catch(err => {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    });

    return () => {
      if (pcRef.current) pcRef.current.close();
      if (channelRef.current) channelRef.current.detach();
      if (ablyRef.current) ablyRef.current.close();
    };
  }, []);

  return (
    <main style={{ padding: '1rem' }}>
      <h1>Video Chat</h1>
      <p>Status: {status}</p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '45%', border: '1px solid #ccc' }}
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{ width: '45%', border: '1px solid #ccc' }}
        />
      </div>
    </main>
  );
}
