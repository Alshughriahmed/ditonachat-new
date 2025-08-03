'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Realtime, Types } from 'ably';

const ABLY_KEY = process.env.NEXT_PUBLIC_ABLY_KEY!;

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomType = searchParams.get('type') || 'random';
  const SIGNALING_CHANNEL = `webrtc-signaling-${roomType}`;
  
  const [status, setStatus] = useState<string>('Connecting...');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [text, setText] = useState<string>('');
  const [messages, setMessages] = useState<Array<{text: string, sender: 'me' | 'partner'}>>([]);
  const [hasMediaAccess, setHasMediaAccess] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);

  // نضيف هذان المرجعان لحفظهم بين الريندرز
  const channelRef      = useRef<Types.RealtimeChannelCallbacks>(null);
  const localStreamRef  = useRef<MediaStream>(null);
  const localVideoRef   = useRef<HTMLVideoElement>(null);
  const remoteVideoRef  = useRef<HTMLVideoElement>(null);
  const pcRef           = useRef<RTCPeerConnection>(null);

  useEffect(() => {
    let ably: Realtime;
    let channel: Types.RealtimeChannelCallbacks;
    let pc: RTCPeerConnection;

    const start = async () => {
      try {
        // 1) احصل على الميديا
        const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = localStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
        setHasMediaAccess(true);

        // 2) تهيئة Ably
        ably = new Realtime({ key: ABLY_KEY });
        channel = ably.channels.get(SIGNALING_CHANNEL);
        await channel.attach();
        channelRef.current = channel;

        pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pcRef.current = pc;

        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setStatus('Connected');
            setIsConnected(true);
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.publish('ice-candidate', event.candidate);
          }
        };

        channel.subscribe('ready', async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.publish('offer', offer);
        });

        channel.subscribe('offer', async (message) => {
          await pc.setRemoteDescription(message.data);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.publish('answer', answer);
        });

        channel.subscribe('answer', async (message) => {
          await pc.setRemoteDescription(message.data);
        });

        channel.subscribe('ice-candidate', async (message) => {
          await pc.addIceCandidate(message.data);
        });

        channel.subscribe('next', () => {
          // إعادة تعيين الاتصال للبحث عن شريك جديد
          setStatus('Searching for partner…');
          setIsConnected(false);
          setMessages([]); // مسح الرسائل عند البحث عن شريك جديد
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
        });

        channel.subscribe('text', (message) => {
          setMessages(prev => [...prev, { text: message.data.message, sender: 'partner' }]);
        });

        // 2.1) اطلب شريك
        channel.publish('ready', {});
        setStatus('Searching for partner…');

      } catch (error) {
        console.error('Error starting chat:', error);
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          setStatus('Camera/microphone access denied');
        } else if (error instanceof DOMException && error.name === 'NotFoundError') {
          setStatus('Camera/microphone not found');
        } else {
          setStatus('Error connecting');
        }
        setHasMediaAccess(false);
      }
    };

    start();

    return () => {
      // تنظيف
      pcRef.current?.close();
      channelRef.current?.detach();
      ably?.close();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [SIGNALING_CHANNEL]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  const requestNext = () => {
    // إرسال إشارة "next" إلى القناة
    channelRef.current?.publish('next', {});
    
    // إعادة تعيين الحالة للبحث عن شريك جديد
    setStatus('Searching for partner…');
    setIsConnected(false);
    
    // مسح الفيديو البعيد
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    // إرسال إشارة البحث عن شريك جديد
    channelRef.current?.publish('ready', {});
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !channelRef.current) return;
    
    await channelRef.current.publish('text', { message: text });
    setMessages(prev => [...prev, { text: text, sender: 'me' }]);
    setText('');
  };

  const disconnect = () => {
    if (pcRef.current) {
      pcRef.current.close();
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    channelRef.current?.detach();
    
    router.push('/');
  };

  useEffect(() => {
    const container = document.getElementById('text-messages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">DitonaChat - {roomType.charAt(0).toUpperCase() + roomType.slice(1)} Room</h1>
        
        {/* Video Container */}
        <div className="relative w-full max-w-4xl mx-auto mb-6">
          {/* Remote Video - Main */}
          <div className="relative w-full aspect-video bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Local Video - PiP */}
            <div className="absolute bottom-4 right-4 w-32 h-24 bg-gray-700 rounded-lg overflow-hidden border-2 border-white shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 px-1 py-0.5 rounded text-xs text-white">
                You
              </div>
            </div>
            
            {/* Status Badge Overlay */}
            {status !== 'Connected' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                <span className={`px-6 py-3 rounded-full text-lg font-medium ${
                  status === 'Searching for partner…' ? 'bg-yellow-600' : 
                  status.includes('Error') || status.includes('denied') || status.includes('not found') ? 'bg-red-600' :
                  'bg-blue-600'
                } text-white`}>
                  {status}
                </span>
              </div>
            )}
            
            {/* Partner Label */}
            {isConnected && (
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm text-white">
                Partner
              </div>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center items-center gap-4 mb-6">
          <button
            onClick={toggleMute}
            disabled={!hasMediaAccess}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium ${
              !hasMediaAccess ? 'bg-gray-600 cursor-not-allowed text-gray-400' :
              isMuted ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            {isMuted ? '🔇' : '🎤'} {isMuted ? 'Unmute' : 'Mute'}
          </button>
          
          <button
            onClick={toggleCam}
            disabled={!hasMediaAccess}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium ${
              !hasMediaAccess ? 'bg-gray-600 cursor-not-allowed text-gray-400' :
              isCameraOff ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            {isCameraOff ? '📷' : '📹'} Camera
          </button>
          
          <button
            onClick={requestNext}
            disabled={!isConnected}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium ${
              isConnected 
                ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                : 'bg-gray-600 cursor-not-allowed text-gray-400'
            }`}
          >
            ⏭️ Next
          </button>
          
          <button
            onClick={disconnect}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-6 py-3 rounded-lg transition-colors text-white font-medium"
          >
            ❌ End
          </button>
        </div>

        {/* Chat Panel - Responsive */}
        <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
          {/* Video area spacer on desktop */}
          <div className="hidden lg:block lg:flex-1"></div>
          
          {/* Chat Panel */}
          <div className="w-full lg:w-80 bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 text-center text-white">Text Chat</h3>
            
            {/* Messages */}
            <div 
              id="text-messages"
              className="h-64 lg:h-80 overflow-y-auto bg-gray-900/50 rounded-lg p-3 mb-4 space-y-2"
            >
              {messages.length === 0 ? (
                <div className="text-gray-400 text-center py-8 text-sm">
                  {isConnected ? 'Start a conversation...' : 'Connect with a partner to start chatting'}
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                        msg.sender === 'me'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-100'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendText} className="flex gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your message…"
                disabled={!isConnected}
                className="flex-1 px-3 py-2 bg-gray-800/50 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
              <button
                type="submit"
                disabled={!isConnected || !text.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 text-white p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading chat...</p>
        </div>
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
