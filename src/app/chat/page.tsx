'use client';

import React, { useState, useEffect, useRef } from 'react';

const MatchPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    console.log("1. useEffect for camera has started.");

    const getMedia = async () => {
      console.log("2. getMedia function is called.");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        console.log("3. Successfully got the media stream.");
        
        if (localVideoRef.current) {
          console.log("4. localVideoRef is available. Attaching stream.");
          localVideoRef.current.srcObject = stream;
        } else {
          console.error("5. ERROR: localVideoRef is NOT available.");
        }

      } catch (err) {
        console.error("6. CATCH BLOCK: Error accessing media devices.", err);
        alert("Could not access your camera. Please check browser permissions.");
      } finally {
        console.log("7. FINALLY BLOCK: Hiding loading screen.");
        setIsLoading(false);
      }
    };

    getMedia();

    console.log("8. useEffect for camera has finished its setup.");
  }, []);

  // ... (The rest of the component remains the same)

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-black text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-pink-500"></div>
        <p className="mt-4 text-lg">جاري تجهيز الاتصال...</p>
      </div>
    );
  }

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden">
      {/* ... (The rest of the JSX is the same) ... */}
    </main>
  );
};

export default MatchPage;
