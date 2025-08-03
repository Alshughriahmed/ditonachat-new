"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [gender, setGender] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [language, setLanguage] = useState('English');
  const router = useRouter();

  const handleStartChat = () => {
    if (gender && ageConfirmed) {
      router.push('/chat');
    }
  };

  return (
    <div className="hero bg-cover bg-center min-h-screen flex items-center justify-center relative" 
         style={{ backgroundImage: "url('/background.jpg')" }}>
      <div className="absolute inset-0 bg-black/20"></div>
      
      <div className="card relative bg-white/30 backdrop-blur-md rounded-2xl p-6 w-full max-w-md mx-4 text-center space-y-4 z-10 shadow-2xl">
        <img 
          src="/logo.png" 
          alt="DitonaChat Logo" 
          className="logo absolute top-4 left-4 w-16 sm:w-12"
        />
        
        <div className="absolute top-4 right-4">
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="text-sm bg-white/80 rounded px-2 py-1 text-gray-800"
          >
            <option>English</option>
            <option>Español</option>
            <option>Français</option>
            <option>Deutsch</option>
            <option>العربية</option>
          </select>
        </div>
        
        <h1 className="mt-8 text-2xl font-bold text-white">DitonaChat: Meet fun-loving people.</h1>
        
        <select 
          name="gender" 
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          required
          className="mt-4 w-full py-2 px-4 rounded-full bg-white/80 text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
        >
          <option value="" disabled>Gender</option>
          <option value="male">♂️ Male</option>
          <option value="female">♀️ Female</option>
          <option value="couple">⚤ Couple</option>
          <option value="lgbtq">🏳️‍🌈 LGBTQ+</option>
        </select>
        
        <label className="flex items-center justify-center mt-4 text-white cursor-pointer">
          <input 
            type="checkbox" 
            checked={ageConfirmed}
            onChange={(e) => setAgeConfirmed(e.target.checked)}
            required
            className="mr-2 w-4 h-4 rounded border-2 border-white/30 bg-white/20 checked:bg-pink-600 checked:border-pink-600 focus:ring-2 focus:ring-pink-500"
          />
          <span className="text-sm">I am 18 or over</span>
        </label>
        
        <button 
          onClick={handleStartChat}
          disabled={!gender || !ageConfirmed}
          className="btn-primary mt-6 w-full py-3 rounded-full font-bold bg-pink-600 text-white hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
        >
          START VIDEO CHAT
        </button>
        
        <div className="text-xs mt-4 text-white/80 space-x-2">
          <Link href="/terms" className="hover:text-white underline">Terms of Use</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-white underline">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
