'use client';

import React, { useState, useEffect, useRef } from 'react';

const MatchPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Effect 1: This just handles the loading screen visibility
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500); // Show loading for 1.5 seconds

    return () => clearTimeout(timer);
  }, []);

  // Effect 2: This runs ONLY after the loading is finished and the UI is ready
  useEffect(() => {
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing media devices.", err);
        alert("Could not access your camera. Please check browser permissions.");
      }
    };

    // Only run getMedia if the loading is complete
    if (!isLoading) {
      getMedia();
    }
  }, [isLoading]); // This effect depends on the 'isLoading' state

  // If loading, show the loading screen
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-black text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-pink-500"></div>
        <p className="mt-4 text-lg">جاري تجهيز الاتصال...</p>
      </div>
    );
  }

  // Once loading is complete, show the main chat interface
  return (
    <main className="relative w-full h-screen bg-black overflow-hidden">
      {/* 1. Remote User's Video (Background) */}
      <video
        autoPlay
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      ></video>

      {/* Overlay for darkening the video */}
      <div className="absolute inset-0 bg-black bg-opacity-20 z-10"></div>

      {/* Main UI container */}
      <div className="relative z-20 flex flex-col h-full p-4">

        {/* 2. Top Bar: Remote User Info & Settings */}
        <div className="w-full flex justify-between items-center text-white">
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg">Username</span>
            <span title="Country">DE</span>
            <span title="Likes">❤️ 123</span>
          </div>
          <button className="text-2xl" title="Settings" aria-label="Settings">
            ⚙️
          </button>
        </div>

        {/* Spacer to push controls to the bottom */}
        <div className="flex-grow"></div>

        {/* 3. Chat Messages & Input Area */}
        <div className="w-full max-w-2xl mx-auto mb-4">
          <div className="h-24 overflow-y-auto p-2 space-y-2">
            {/* Messages will be added here later */}
          </div>
          <input
            type="text"
            placeholder="اكتب رسالتك..."
            className="w-full p-3 bg-black bg-opacity-60 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-pink-500"
          />
        </div>

        {/* 4. Control Buttons Area */}
        <div className="w-full flex flex-col items-center gap-2">
            {/* Primary Controls */}
            <div className="flex items-center justify-center gap-4">
                <button className="flex items-center gap-2 text-white text-xl p-3 bg-gray-700 rounded-lg opacity-50 cursor-not-allowed" title="Previous (VIP)" aria-label="Previous (VIP)">
                    ⏪
                    <span className="hidden md:inline">السابق</span>
                    <span>🔒</span>
                </button>
                <button className="text-white text-xl p-4 bg-red-600 rounded-full scale-110" title="Stop" aria-label="Stop Chat">
                    ⏹️
                </button>
                <button className="flex items-center gap-2 text-white text-xl p-3 bg-blue-600 rounded-lg" title="Next" aria-label="Next Chat">
                    <span className="hidden md:inline">التالي</span>
                    ⏩
                </button>
            </div>
             {/* Secondary Controls */}
             <div className="flex items-center justify-center gap-6 mt-2 text-white text-2xl p-2 bg-black bg-opacity-40 rounded-full">
                <button title="Mute Your Mic" aria-label="Mute Your Mic">🎙️</button>
                <button title="Mute Stranger's Audio" aria-label="Mute Stranger's Audio">🔈</button>
                <button title="Report User" aria-label="Report User">🚩</button>
             </div>
        </div>

      </div>

      {/* 5. Local User's Video (Picture-in-Picture) */}
      <div
        className="absolute bottom-6 right-6 w-32 h-48 md:w-40 md:h-56 bg-gray-800 rounded-lg border-2 border-white overflow-hidden"
      >
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        ></video>
        <button className="absolute top-2 right-2 text-white text-2xl bg-black bg-opacity-50 rounded-full p-1" title="Flip Camera" aria-label="Flip Camera">
            🔄
        </button>
      </div>

    </main>
  );
};

export default MatchPage;
