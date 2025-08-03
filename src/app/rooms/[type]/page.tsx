"use client";
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const roomLabels = {
  random: 'Random Video Chat',
  girls: 'Chat with Girls',
  'cam-to-cam': 'Cam to Cam',
  dirty: 'Dirty Chat',
  anonymous: 'Anonymous Chat',
  lgbtq: 'LGBTQ+ Chat',
  text: 'Text Chat Only'
} as const;

type RoomType = keyof typeof roomLabels;

const roomDescriptions = {
  random: 'Connect with random people from around the world for video chat',
  girls: 'Video chat exclusively with female users',
  'cam-to-cam': 'Direct camera-to-camera video conversations',
  dirty: 'Adult-oriented chat for mature conversations',
  anonymous: 'Chat anonymously without revealing your identity',
  lgbtq: 'Safe space for LGBTQ+ community members to connect',
  text: 'Text-only conversations without video'
};

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const [isValidRoom, setIsValidRoom] = useState(true);
  
  const type = params?.type as string;

  useEffect(() => {
    if (type && !Object.keys(roomLabels).includes(type)) {
      setIsValidRoom(false);
    }
  }, [type]);

  if (!isValidRoom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Room Not Found</h1>
          <p className="text-gray-600 mb-6">The chat room you&apos;re looking for doesn&apos;t exist.</p>
          <Link 
            href="/"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const roomType = type as RoomType;
  const roomLabel = roomLabels[roomType];
  const roomDescription = roomDescriptions[roomType];

  const handleStartChat = () => {
    router.push(`/chat?type=${type}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{roomLabel}</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {roomDescription}
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">HD Video Quality</h3>
              <p className="text-sm text-gray-600">Crystal clear video chat experience</p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Safe & Secure</h3>
              <p className="text-sm text-gray-600">Your privacy and safety are our priority</p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Instant Connection</h3>
              <p className="text-sm text-gray-600">Connect with people in seconds</p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <button
              onClick={handleStartChat}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition duration-200 shadow-md"
            >
              Start Chatting
            </button>
            <p className="text-sm text-gray-500 mt-4">
              By clicking &quot;Start Chatting&quot;, you agree to our{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
