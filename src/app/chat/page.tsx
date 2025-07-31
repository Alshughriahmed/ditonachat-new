'use client';
import React, { useEffect, useRef } from 'react';

const MatchPage = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        // This is the corrected line
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error("Camera error:", err);
      });
  }, []);

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden">
      {/* Remote User's Video (will be black for now) */}
      <video
        autoPlay
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      ></video>

      {/* Main UI container */}
      <div className="relative z-20 flex flex-col h-full p-4">
        {/* Top Bar */}
        <div className="w-full flex justify-between items-center text-white">
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg">Username</span>
            <span title="Country">DE</span>
            <span title="Likes">❤️ 123</span>
          </div>
          <button className="text-2xl" title="Settings">⚙️</button>
        </div>

        <div className="flex-grow"></div>

        {/* Chat Input */}
        <div className="w-full max-w-2xl mx-auto mb-4">
          <input
            type="text"
            placeholder="اكتب رسالتك..."
            className="w-full p-3 bg-black bg-opacity-60 text-white border border-gray-600 rounded-lg"
          />
        </div>

        {/* Control Buttons */}
        <div className="w-full flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-4">
                <button className="flex items-center gap-2 text-white text-xl p-3 bg-gray-700 rounded-lg opacity-50">⏪️ <span className="hidden md:inline">السابق</span> <span>🔒</span></button>
                <button className="text-white text-xl p-4 bg-red-600 rounded-full scale-110">⏹️</button>
                <button className="flex items-center gap-2 text-white text-xl p-3 bg-blue-600 rounded-lg"><span className="hidden md:inline">التالي</span> ⏩️</button>
            </div>
             <div className="flex items-center justify-center gap-6 mt-2 text-white text-2xl p-2 bg-black bg-opacity-40 rounded-full">
                <button title="Mute Mic">🎙️</button>
                <button title="Mute Audio">🔈</button>
                <button title="Report">🚩</button>
             </div>
        </div>
      </div>

      {/* Local User's Video */}
      <div className="absolute bottom-6 right-6 w-32 h-48 md:w-40 md:h-56 bg-gray-800 rounded-lg border-2 border-white overflow-hidden">
        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
        <button className="absolute top-2 right-2 text-white text-2xl bg-black bg-opacity-50 rounded-full p-1">🔄</button>
      </div>
    </main>
  );
};

export default MatchPage;
