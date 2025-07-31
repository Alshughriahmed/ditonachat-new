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

  // --- The rest of the JSX is the same ---
  return (
    <main className="relative w-full h-screen bg-black overflow-hidden">
        {/* ... (The same JSX layout as before) ... */}
    </main>
  );
};

export default MatchPage;
