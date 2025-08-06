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

  // useEffect الرئيسي
  useEffect(() => {
    // التحقق من وجود نافذة المتصفح قبل الوصول إلى navigator
    if (typeof window === 'undefined' || !window.navigator || !window.navigator.mediaDevices) {
      console.error("Browser APIs (navigator.mediaDevices) are not available.");
      return;
    }

    socket.connect();
    const manager = new WebRTCManager(socket);
    setWebrtc(manager);

    const getLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // استخدام manager لإرسال العرض بعد الحصول على stream المحلي
        manager.setLocalStream(stream);

        // هنا يمكنك تحديد الـ Peer ID الفعلي بدلاً من 'REMOTE_PEER_ID'
        const peerId = 'REMOTE_PEER_ID';
        setRemotePeerId(peerId);

        manager.sendOffer(
          peerId,
          (remoteStream: MediaStream) => {
            if (remoteVideoRef.current && remoteStream instanceof MediaStream) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          },
          (candidate: RTCIceCandidateInit) => {
            if (peerId) {
              manager.sendCandidate(peerId, candidate);
            }
          }
        );
      } catch (err) {
        console.error("🎥 Media error:", err);
      }
    };

    getLocalStream();

    socket.on('offer', (data) => {
      // التأكد من أن manager موجود قبل استخدامه
      if (!webrtc) return;
      webrtc.handleOffer(
        data,
        webrtc.getLocalStream()!,
        (remoteStream: MediaStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        },
        (candidate: RTCIceCandidateInit) => {
          webrtc.sendCandidate(data.to, candidate);
        }
      );
    });

    socket.on('answer', data => webrtc?.handleAnswer(data));
    socket.on('candidate', data => webrtc?.handleCandidate(data));

    socket.on('leave', () => {
      webrtc?.closeConnection?.();
      setRemotePeerId(null);
      setTimeout(() => setRemotePeerId('NEW_PEER_ID'), 1000);
    });

    return () => {
      webrtc?.closeConnection?.();
      socket.disconnect();
    };
  }, [webrtc]);

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
        className="w-[150px] h-[150px] rounded-full border-[3px] border-blue-500 overflow-hidden absolute z-10"
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
      <div className="absolute top-5 left-5 bg-[rgba(0,0,0,0.6)] backdrop-blur-md text-white p-3 rounded-lg flex flex-col gap-1 z-20">
        <div>🌍 {userInfo.country} - {userInfo.city}</div>
        <div>{userInfo.gender === 'male' ? '👨' : userInfo.gender === 'female' ? '👩' : '👤'}</div>
        <div>👍 {userInfo.likes}</div>
        {userInfo.isVip && <div>💎 VIP</div>}
      </div>

      {/* ✅ شريط الأدوات */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-[rgba(0,0,0,0.6)] backdrop-blur-md text-white rounded-full p-2 flex gap-4 z-20">
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
          className="absolute top-5 right-5 w-[300px] h-[70%] bg-[rgba(0,0,0,0.6)] backdrop-blur-md p-4 rounded-lg flex flex-col z-20"
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
              className="flex-1 bg-gray-800/50 text-white rounded-xl px-3 py-2 outline-none"
              placeholder="اكتب رسالتك..."
            />
            <button onClick={handleSendMessage}>✉️</button>
          </div>
        </motion.div>
      )}
    </main>
  );
}
