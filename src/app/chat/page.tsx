'use client';

import React, { useState, useEffect } from 'react';

const MatchPage = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-black text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-pink-500"></div>
        <p className="mt-4 text-lg">جاري تجهيز الاتصال...</p>
        <p className="text-sm text-gray-400">تذكر: هذه الخدمة مخصصة للبالغين فقط +18</p>
      </div>
    );
  }

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden">
      <video
        autoPlay
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      ></video>
      <div className="absolute inset-0 bg-black bg-opacity-20 z-10"></div>
      <div className="relative z-20 flex flex-col h-full p-4">
        <div className="w-full flex justify-between items-center text-white">
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg">Username</span>
            <span title="Country">🇩🇪</span>
            <span title="Likes">❤️ 123</span>
            <span title="VIP Status">👑</span>
          </div>
          <button className="text-2xl" title="Settings" aria-label="Settings">
            ⚙️
          </button>
        </div>
        <div className="flex-grow"></div>
        <div className="w-full max-w-2xl mx-auto mb-4">
          <div className="h-24 overflow-y-auto p-2 space-y-2">
             <div className="text-white bg-black bg-opacity-40 rounded-lg p-2 max-w-xs">
                <p className="font-bold text-pink-400">Stranger</p>
                <p>Hello there! This is a sample message.</p>
             </div>
             <div className="text-white bg-black bg-opacity-40 rounded-lg p-2 max-w-xs self-end ml-auto">
                <p className="font-bold text-blue-400 text-right">You</p>
                <p>Hi! I can see the persistent chat box.</p>
             </div>
          </div>
          <input
            type="text"
            placeholder="اكتب رسالتك... كن محترماً."
            className="w-full p-3 bg-black bg-opacity-60 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-pink-500"
          />
        </div>
        <div className="w-full flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-4">
                <button className="flex items-center gap-2 text-white text-xl p-3 bg-gray-700 rounded-lg opacity-50 cursor-not-allowed" title="Previous (VIP)" aria-label="Previous (VIP)">
                    ⏪️
                    <span className="hidden md:inline">السابق</span>
                    <span>🔒</span>
                </button>
                <button className="text-white text-xl p-4 bg-red-600 rounded-full scale-110" title="Stop" aria-label="Stop Chat">
                    ⏹️
                </button>
                <button className="flex items-center gap-2 text-white text-xl p-3 bg-blue-600 rounded-lg" title="Next" aria-label="Next Chat">
                    <span className="hidden md:inline">التالي</span>
                    ⏩️
                </button>
            </div>
             <div className="flex items-center justify-center gap-6 mt-2 text-white text-2xl p-2 bg-black bg-opacity-40 rounded-full">
                <button title="Mute Your Mic" aria-label="Mute Your Mic">🎙️</button>
                <button title="Mute Stranger's Audio" aria-label="Mute Stranger's Audio">🔈</button>
                <button title="Report User" aria-label="Report User">🚩</button>
             </div>
        </div>
      </div>
      <div
        className="absolute bottom-6 right-6 w-32 h-48 md:w-40 md:h-56 bg-gray-800 rounded-lg border-2 border-white overflow-hidden"
      >
        <video
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
