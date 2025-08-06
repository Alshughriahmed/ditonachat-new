'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import WebRTCManager from '@/utils/webrtc';
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
  const [remotePeerId, setRemotePeerId] = useState<string | null>(null);

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
    socket.connect();
    const manager = new WebRTCManager(socket);
    setWebrtc(manager);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        setRemotePeerId('REMOTE_PEER_ID');

        manager.sendOffer(
          'REMOTE_PEER_ID',
          (remoteStream: MediaStream) => {
            if (remoteVideoRef.current && remoteStream instanceof MediaStream) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          },
          (candidate: RTCIceCandidateInit) => {
            if (remotePeerId) {
              manager.sendCandidate(remotePeerId, candidate);
            }
          }
        );
      })
      .catch(err => console.error("🎥 Media error:", err));

    socket.on('offer', (data) => {
      manager.handleOffer(
        data,
        manager.getLocalStream()!,
        (remoteStream: MediaStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        },
        (candidate: RTCIceCandidateInit) => {
          manager.sendCandidate(data.to, candidate);
        }
      );
    });

    socket.on('answer', data => manager.handleAnswer(data));
    socket.on('candidate', data => manager.handleCandidate(data));

    socket.on('leave', () => {
      manager.closeConnection?.();
      setRemotePeerId(null);
      setTimeout(() => setRemotePeerId('NEW_PEER_ID'), 1000);
    });

    return () => {
      manager.closeConnection?.();
      socket.disconnect();
    };
  }, [remotePeerId]);

  const bindGestures = useGesture({
    onDrag: ({ swipe }) => {
      if (swipe[0] === 1 || swipe[0] === -1) {
        webrtc?.closeConnection?.();
      }
    },
  });

  const handleSendMessage = () => {
    if (inputText.trim()) {
      setMessages([...messages, { text: inputText, isUser: true }]);
      setInputText('');
      setTimeout(() => {
        setMessages(prev => [...prev, { text: '👋 مرحباً بك!', isUser: false }]);
      }, 1000);
    }
  };

  const handlePrevious = () => webrtc?.closeConnection?.();
  const handleNext = () => webrtc?.closeConnection?.();
  const handleToggleCamera = () => console.log('📷 Toggle camera');
  const handleToggleMute = () => console.log('🎤 Toggle mute');
  const handleSettings = () => console.log('⚙️ Settings');
  const handleEndChat = () => webrtc?.closeConnection?.();

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden" {...bindGestures()}>
      {/* فيديو الطرف الآخر */}
      <video
        ref={remoteVideoRef}
        autoPlay
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* ✅ المعاينة الذاتية */}
      <motion.div
        className="w-[150px] h-[150px] rounded-full border-[3px] border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] overflow-hidden absolute bottom-5 right-5 z-50"
        style={{ x, y, scale }}
        drag
        dragMomentum={false}
      >
        <video
          ref={localVideoRef}
          autoPlay
          muted
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* ✅ معلومات الطرف الآخر */}
      <div className="absolute top-5 left-5 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm p-3 rounded-lg text-white space-y-1 text-sm">
        <div>🌍 {userInfo.country} - {userInfo.city}</div>
        <div>{userInfo.gender === 'male' ? '👨' : userInfo.gender === 'female' ? '👩' : userInfo.gender === 'group' ? '👥' : '❓'} {userInfo.gender}</div>
        <div>👍 {userInfo.likes}</div>
        {userInfo.isVip && <div>💎 VIP</div>}
      </div>

      {/* ✅ شريط الأدوات */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-[rgba(0,0,0,0.7)] backdrop-blur-sm p-2 rounded-full flex gap-3 text-white text-xl">
        <button onClick={handlePrevious}>⏮️</button>
        <button onClick={handleNext}>⏭️</button>
        <button onClick={handleToggleCamera}>📷</button>
        <button onClick={handleToggleMute}>🎤</button>
        <button onClick={handleSettings}>⚙️</button>
        <button onClick={handleEndChat}>⏹️</button>
        <button onClick={() => setIsChatOpen(!isChatOpen)}>💬</button>
      </div>

      {/* ✅ دردشة نصية */}
      {isChatOpen && (
        <motion.div
          className="absolute top-5 right-5 w-[300px] h-[70%] bg-[rgba(0,0,0,0.7)] backdrop-blur-md p-4 rounded-lg text-white"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col h-[calc(100%-60px)] overflow-y-auto">
            {messages.map((msg, index) => (
              <div
                key={index}
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
              className="flex-1 bg-gray-800/50 text-white rounded-xl px-3 py-2 text-sm"
              placeholder="اكتب رسالتك..."
            />
            <button onClick={handleSendMessage}>✉️</button>
          </div>
        </motion.div>
      )}
    </main>
  );
}
