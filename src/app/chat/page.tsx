'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Realtime, Types } from 'ably';

const ABLY_KEY = process.env.NEXT_PUBLIC_ABLY_KEY!;

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomType = searchParams.get('type') || 'random';
  const SIGNALING_CHANNEL = `room-${roomType}`;
  
  const [status, setStatus] = useState<string>('Connecting...');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [text, setText] = useState<string>('');
  const [messages, setMessages] = useState<Array<{text: string, sender: 'me' | 'partner'}>>([]);
  const [hasMediaAccess, setHasMediaAccess] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);

  const channelRef      = useRef<Types.RealtimeChannelCallbacks>(null);
  const localStreamRef  = useRef<MediaStream>(null);
  const localVideoRef   = useRef<HTMLVideoElement>(null);
  const remoteVideoRef  = useRef<HTMLVideoElement>(null);
  const pcRef           = useRef<RTCPeerConnection>(null);
  const isInitiatorRef  = useRef<boolean>(false);

  useEffect(() => {
    let ably: Realtime;
    let channel: Types.RealtimeChannelCallbacks;
    let pc: RTCPeerConnection;
    let joinTimeout: NodeJS.Timeout;

    const start = async () => {
      try {
        console.debug(`🚀 Starting chat in room: ${roomType}`);
        console.debug(`📡 Using channel: ${SIGNALING_CHANNEL}`);
        
        console.debug('🎥 Requesting media access...');
        const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = localStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
        setHasMediaAccess(true);
        console.debug('✅ Media access granted');

        console.debug('🔗 Connecting to Ably...');
        ably = new Realtime({ key: ABLY_KEY });
        channel = ably.channels.get(SIGNALING_CHANNEL);
        await channel.attach();
        channelRef.current = channel;
        console.debug('✅ Ably connected and channel attached');

        console.debug('🌐 Setting up WebRTC peer connection...');
        pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        pcRef.current = pc;

        localStream.getTracks().forEach(track => {
          console.debug(`➕ Adding ${track.kind} track to peer connection`);
          pc.addTrack(track, localStream);
        });

        pc.ontrack = (event) => {
          console.debug('📺 Received remote stream');
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setStatus('Connected');
            setIsConnected(true);
            console.debug('✅ Remote video connected successfully');
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.debug('🧊 Sending ICE candidate');
            channel.publish('ice-candidate', event.candidate);
          }
        };

        pc.onconnectionstatechange = () => {
          console.debug(`🔄 Connection state: ${pc.connectionState}`);
          if (pc.connectionState === 'connected') {
            setStatus('Connected');
            setIsConnected(true);
            console.debug('✅ WebRTC connection established');
          } else if (pc.connectionState === 'failed') {
            setStatus('Connection failed - trying again...');
            setIsConnected(false);
            console.debug('❌ Connection failed, will retry');
          }
        };

        console.debug('📞 Setting up signaling handlers...');

        channel.subscribe('join', async (message) => {
          console.debug('👋 Received join request from peer');
          if (joinTimeout) {
            clearTimeout(joinTimeout);
            console.debug('🎯 Clearing join timeout, becoming answerer');
          }
          isInitiatorRef.current = false;
        });

        channel.subscribe('offer', async (message) => {
          try {
            console.debug('📞 Received offer, creating answer...');
            await pc.setRemoteDescription(message.data);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await channel.publish('answer', answer);
            console.debug('✅ Answer sent');
          } catch (error) {
            console.error('❌ Error handling offer:', error);
            setStatus(`Error connecting: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });

        channel.subscribe('answer', async (message) => {
          try {
            console.debug('✅ Received answer, finalizing connection...');
            await pc.setRemoteDescription(message.data);
            console.debug('✅ Answer processed, waiting for ICE connection');
          } catch (error) {
            console.error('❌ Error handling answer:', error);
            setStatus(`Error connecting: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });

        channel.subscribe('ice-candidate', async (message) => {
          try {
            console.debug('🧊 Received ICE candidate');
            await pc.addIceCandidate(message.data);
            console.debug('✅ ICE candidate added');
          } catch (error) {
            console.error('❌ Error adding ICE candidate:', error);
          }
        });

        channel.subscribe('next', () => {
          console.debug('⏭️ Partner requested next, resetting connection...');
          setStatus('Searching for partner…');
          setIsConnected(false);
          setMessages([]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          setTimeout(() => {
            channel.publish('join', { timestamp: Date.now() });
          }, 1000);
        });

        channel.subscribe('text', (message) => {
          console.debug('💬 Received text message');
          setMessages(prev => [...prev, { text: message.data.message, sender: 'partner' }]);
        });

        console.debug('🚪 Joining room and looking for partners...');
        setStatus('Searching for partner…');
        
        await channel.publish('join', { timestamp: Date.now() });
        
        joinTimeout = setTimeout(async () => {
          if (!isConnected && pc.connectionState !== 'connected') {
            console.debug('🎯 No peer response after 3 seconds, becoming initiator...');
            isInitiatorRef.current = true;
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              await channel.publish('offer', offer);
              console.debug('📤 Offer sent as initiator');
            } catch (error) {
              console.error('❌ Error creating offer:', error);
              setStatus(`Error connecting: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }, 3000);

      } catch (error) {
        console.error('❌ Error starting chat:', error);
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          setStatus('Camera/microphone access denied');
        } else if (error instanceof DOMException && error.name === 'NotFoundError') {
          setStatus('Camera/microphone not found');
        } else {
          setStatus(`Error connecting: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        setHasMediaAccess(false);
      }
    };

    start();

    return () => {
      console.debug('🧹 Cleaning up chat session...');
      if (joinTimeout) clearTimeout(joinTimeout);
      pcRef.current?.close();
      channelRef.current?.detach();
      ably?.close();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [SIGNALING_CHANNEL, roomType]);

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

  const requestNext = async () => {
    console.debug('⏭️ Requesting next partner...');
    
    if (channelRef.current) {
      await channelRef.current.publish('next', {});
    }
    
    setStatus('Searching for partner…');
    setIsConnected(false);
    setMessages([]);
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    if (pcRef.current) {
      pcRef.current.close();
      
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      pcRef.current = pc;
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }
      
      pc.ontrack = (event) => {
        console.debug('📺 Received remote stream');
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setStatus('Connected');
          setIsConnected(true);
          console.debug('✅ Remote video connected successfully');
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          console.debug('🧊 Sending ICE candidate');
          channelRef.current.publish('ice-candidate', event.candidate);
        }
      };

      pc.onconnectionstatechange = () => {
        console.debug(`🔄 Connection state: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
          setStatus('Connected');
          setIsConnected(true);
          console.debug('✅ WebRTC connection established');
        } else if (pc.connectionState === 'failed') {
          setStatus('Connection failed - trying again...');
          setIsConnected(false);
          console.debug('❌ Connection failed, will retry');
        }
      };
    }
    
    setTimeout(async () => {
      if (channelRef.current) {
        console.debug('🚪 Rejoining room after next request...');
        await channelRef.current.publish('join', { timestamp: Date.now() });
      }
    }, 1000);
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
        
        {/* Video Container - Improved Layout */}
        <div className="video-container flex flex-col md:flex-row items-center justify-center gap-4 p-4 mb-6">
          {/* Remote Video - Main (75% width on desktop) */}
          <div className="relative w-full md:w-3/4 aspect-video bg-gray-800 rounded-lg overflow-hidden shadow-2xl">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover bg-black"
            />
            
            {/* Local Video - PiP Style */}
            <div className="local-pip absolute bottom-6 right-6 w-32 h-24 bg-gray-700 rounded-lg overflow-hidden border-4 border-white shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 left-1 bg-black/70 px-1 py-0.5 rounded text-xs text-white">
                You
              </div>
            </div>
            
            {/* Status Badge Overlay */}
            {status !== 'Connected' && (
              <div className="status-badge absolute inset-0 flex items-center justify-center text-white text-lg bg-black/60 rounded-lg backdrop-blur-sm">
                <div className="text-center">
                  <div className={`inline-flex items-center px-6 py-3 rounded-full text-lg font-medium ${
                    status === 'Searching for partner…' ? 'bg-yellow-500 text-yellow-900' : 
                    status.includes('Connecting') ? 'bg-blue-500 text-white' :
                    status.includes('Error') || status.includes('denied') || status.includes('not found') ? 'bg-red-500 text-white' :
                    'bg-blue-500 text-white'
                  } shadow-lg`}>
                    {status === 'Searching for partner…' && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-900 mr-2"></div>
                    )}
                    {status.includes('Connecting') && (
                      <div className="animate-pulse rounded-full h-4 w-4 bg-blue-300 mr-2"></div>
                    )}
                    {status === 'Searching for partner…' ? 'Searching for partner…' 
                      : status.includes('Connecting') ? 'Connecting…'
                      : status.includes('Error') ? `Error: ${status.replace('Error connecting: ', '')}`
                      : status}
                  </div>
                  {status.includes('Error') && (
                    <p className="text-white/80 text-sm mt-2 max-w-xs">
                      Please check your camera/microphone permissions and try again
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Partner Label */}
            {isConnected && (
              <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-sm text-white">
                Partner
              </div>
            )}
          </div>
        </div>

        {/* Controls - Horizontal Row with Better Responsive Design */}
        <div className="controls flex justify-center space-x-6 mt-4 mb-6">
          <button
            onClick={toggleMute}
            disabled={!hasMediaAccess}
            className={`control-button flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-4 md:py-3 rounded-full md:rounded-lg transition-all duration-200 font-medium text-sm md:text-base ${
              !hasMediaAccess ? 'bg-gray-600 cursor-not-allowed text-gray-400' :
              isMuted ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg' : 'bg-gray-700 hover:bg-gray-600 text-white shadow-md'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <span className="text-xl md:text-base">{isMuted ? '🔇' : '🎤'}</span>
            <span className="hidden md:inline ml-2">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          
          <button
            onClick={toggleCam}
            disabled={!hasMediaAccess}
            className={`control-button flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-4 md:py-3 rounded-full md:rounded-lg transition-all duration-200 font-medium text-sm md:text-base ${
              !hasMediaAccess ? 'bg-gray-600 cursor-not-allowed text-gray-400' :
              isCameraOff ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg' : 'bg-gray-700 hover:bg-gray-600 text-white shadow-md'
            }`}
            title="Toggle Camera"
          >
            <span className="text-xl md:text-base">{isCameraOff ? '📷' : '📹'}</span>
            <span className="hidden md:inline ml-2">Camera</span>
          </button>
          
          <button
            onClick={requestNext}
            disabled={!hasMediaAccess || !isConnected}
            className={`control-button flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-6 md:py-3 rounded-full md:rounded-lg transition-all duration-200 font-medium text-sm md:text-base ${
              hasMediaAccess && isConnected
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-xl' 
                : 'bg-gray-600 cursor-not-allowed text-gray-400'
            }`}
            title="Next Partner"
          >
            <span className="text-xl md:text-base">⏭️</span>
            <span className="hidden md:inline ml-2">Next</span>
          </button>
          
          <button
            onClick={disconnect}
            className="control-button flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-6 md:py-3 rounded-full md:rounded-lg transition-all duration-200 bg-red-600 hover:bg-red-500 text-white font-medium shadow-lg hover:shadow-xl text-sm md:text-base"
            title="End Chat"
          >
            <span className="text-xl md:text-base">❌</span>
            <span className="hidden md:inline ml-2">End</span>
          </button>
        </div>

        {/* Chat Panel - Responsive Design */}
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 shadow-xl border border-white/20">
            <h3 className="text-lg font-semibold mb-4 text-center text-white flex items-center justify-center">
              <span className="mr-2">💬</span>
              Text Chat
            </h3>
            
            {/* Messages Container */}
            <div 
              id="text-messages"
              className="h-64 md:h-80 max-h-[40vh] overflow-y-auto bg-gray-900/60 rounded-lg p-3 mb-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
            >
              {messages.length === 0 ? (
                <div className="text-gray-400 text-center py-12 text-sm">
                  <div className="mb-2 text-2xl">💭</div>
                  {isConnected ? 'Start a conversation...' : 'Connect with a partner to start chatting'}
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-sm px-4 py-2 rounded-2xl text-sm shadow-md ${
                        msg.sender === 'me'
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-gray-700 text-gray-100 rounded-bl-md'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input Form */}
            <form onSubmit={handleSendText} className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={isConnected ? "Type your message…" : "Connect to start chatting"}
                  disabled={!isConnected}
                  className="w-full px-4 py-3 bg-gray-800/60 text-white rounded-full border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 placeholder-gray-400"
                  required
                  maxLength={500}
                />
                {text.length > 400 && (
                  <div className="absolute -top-6 right-2 text-xs text-gray-400">
                    {text.length}/500
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={!isConnected || !text.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center min-w-[60px]"
                title="Send message"
              >
                <span className="text-lg">📤</span>
              </button>
            </form>
            
            {/* Connection Status Indicator */}
            <div className="mt-3 text-center">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                isConnected 
                  ? 'bg-green-600/20 text-green-400 border border-green-600/30' 
                  : 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
                }`}></div>
                {isConnected ? 'Connected' : 'Waiting for connection...'}
              </span>
            </div>
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
