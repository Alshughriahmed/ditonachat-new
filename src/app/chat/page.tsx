'use client';

import React, { useEffect, useRef, useState } from 'react';  // useCallback محذوف لأنه غير مستخدم
import { motion, useMotionValue } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import { WebRTCManager } from '@/utils/webrtc';
import socket from '@/utils/socket';

interface Message {
  text: string;
  isUser: boolean;
}

interface UserInfo {
  country: string;
  city: string;
  gender: 'male' | 'female' | 'group' | 'other';
  likes: number;
  isVip: boolean;
}

export default function ChatPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [webrtc, setWebrtc] = useState<WebRTCManager | null>(null);
  const [_remotePeerId, setRemotePeerId] = useState<string | null>(null);
  const [userInfo] = useState<UserInfo>({
    country: 'السعودية',
    city: 'جدة',
    gender: 'male',
    likes: 123,
    isVip: true,
  });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !window.navigator?.mediaDevices?.getUserMedia
    ) {
      console.error(
        'Browser APIs (navigator.mediaDevices) are not available.'
      );
      return;
    }

    socket.connect();
    const manager = new WebRTCManager(socket);
    setWebrtc(manager);

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        manager.setLocalStream(stream);
        const peerId = 'REMOTE_PEER_ID';
        setRemotePeerId(peerId);
        manager.sendOffer(
          peerId,
          (remoteStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          },
          (candidate) => {
            manager.sendCandidate(peerId, candidate);
          }
        );
      } catch (err) {
        console.error('🎥 Media error:', err);
      }
    })();

    socket.on('offer', (data) => {
      if (!manager) return;
      manager.handleOffer(
        data,
        manager.getLocalStream()!,
        (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        },
        (candidate) => {
          manager.sendCandidate(data.to, candidate);
        }
      );
    });
    socket.on('answer', (data) => webrtc?.handleAnswer(data));
    socket.on('candidate', (data) => webrtc?.handleCandidate(data));
    socket.on('leave', () => {
      webrtc?.closeConnection?.();
      setRemotePeerId(null);
      setTimeout(() => setRemotePeerId('NEW_PEER_ID'), 1000);
    });

    return () => {
      webrtc?.closeConnection?.();
      socket.disconnect();
    };
  }, []);

  const bindGestures = useGesture({
    onDrag: ({ swipe }) => {
      if (swipe[0] === 1 || swipe[0] === -1) {
        webrtc?.closeConnection?.();
      }
    },
  });

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    setMessages((prev) => [...prev, { text: inputText, isUser: true }]);
    setInputText('');
    setTimeout(
      () =>
        setMessages((prev) => [
          ...prev,
          { text: '👋 مرحباً بك!', isUser: false },
        ]),
      1000
    );
  };

  const handlePrevious = () => webrtc?.closeConnection?.();
  const handleNext = () => webrtc?.closeConnection?.();
  const handleToggleCamera = () => console.log('📷 Toggle camera');
  const handleToggleMute = () => console.log('🎤 Toggle mute');
  const handleSettings = () => console.log('⚙️ Settings');
  const handleEndChat = () => webrtc?.closeConnection?.();

  return (
    <main
      className="relative w-full h-screen bg-black overflow-hidden"
      {...bindGestures()}
    >
      <video
        ref={remoteVideoRef}
        autoPlay
        className="absolute inset-0 w-full h-full object-cover"
      />

      <motion.div
        className="absolute top-4 right-4 z-30 w-36 h-36 rounded-full overflow-hidden border-4 border-pink-500 shadow-lg"
        drag
        dragMomentum={false}
        style={{ touchAction: 'none' }}
      >
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </motion.div>

      <div className="absolute top-5 left-5 bg-[rgba(0,0,0,0.6)] backdrop-blur px-3 py-2 rounded-lg text-white space-y-1">
        <div>🌍 {userInfo.country} - {userInfo.city}</div>
        <div>{userInfo.gender === 'male' ? '👨' : userInfo.gender === 'female' ? '👩' : '👥'}</div>
        <div>👍 {userInfo.likes}</div>
        {userInfo.isVip && <div>💎 VIP</div>}
      </div>

      <div className="absolute bottom-4 left-1/2 z-20 flex space-x-4 bg-black bg-opacity-60 backdrop-blur-md p-2 rounded-full transform -translate-x-1/2">
        <button onClick={handlePrevious}>⏮️</button>
        <button onClick={handleNext}>⏭️</button>
        <button onClick={handleToggleCamera}>📷</button>
        <button onClick={handleToggleMute}>🎤</button>
        <button onClick={handleSettings}>⚙️</button>
        <button onClick={handleEndChat}>⏹️</button>
        <button onClick={() => setIsChatOpen(!isChatOpen)}>💬</button>
      </div>

      {isChatOpen && (
        <motion.div
          className="absolute top-20 left-4 z-20 w-80 max-h-96 overflow-y-auto bg-black bg-opacity-70 backdrop-blur-sm p-4 rounded-lg"
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
        >
          <div className="flex flex-col h-[calc(100%-60px)] overflow-y-auto">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`${
                  msg.isUser
                    ? 'bg-blue-400/30 text-blue-200 ml-auto'
                    : 'bg-gray-300/30 text-gray-100'
                } font-medium text-sm rounded-xl px-3 py-2 my-1 max-w-[80%]`}
              >
                {msg.text}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-gray-800/50 text-white rounded-xl px-3 py-2"
              placeholder="اكتب رسالتك..."
            />
            <button onClick={handleSendMessage}>✉️</button>
          </div>
        </motion.div>
      )}
    </main>
  );
}
