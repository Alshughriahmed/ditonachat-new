"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [gender, setGender] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const router = useRouter();

  const handleStartChat = () => {
    if (gender && ageConfirmed) {
      router.push('/chat');
    }
  };

  return (
    <div className="hero min-h-screen flex items-center justify-center bg-cover bg-center relative" 
         style={{ backgroundImage: "url('/background.jpg')" }}>
      <div className="absolute inset-0 bg-black/20"></div>
      
      <div className="card bg-white/30 backdrop-blur-md rounded-2xl p-6 w-full max-w-md mx-4 text-center space-y-4 relative z-10 shadow-2xl">
        <img 
          src="/logo-small.png" 
          alt="DitonaChat Logo" 
          className="logo mx-auto w-20 h-20 mb-4"
        />
        
        <h1 className="text-3xl font-bold text-white mb-2">Welcome to DitonaChat</h1>
        <p className="text-white/90 text-lg mb-6">
          Unleash the excitement<br/>
          Let your wild side shine
        </p>
        
        <select 
          name="gender" 
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          required
          className="block w-full p-3 rounded-lg border border-white/20 bg-white/20 text-white placeholder-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
        >
          <option value="" disabled className="text-gray-800">Select your gender</option>
          <option value="male" className="text-gray-800">Male</option>
          <option value="female" className="text-gray-800">Female</option>
          <option value="couple" className="text-gray-800">Couple</option>
        </select>
        
        <label className="flex items-center justify-center space-x-3 text-white cursor-pointer">
          <input 
            type="checkbox" 
            checked={ageConfirmed}
            onChange={(e) => setAgeConfirmed(e.target.checked)}
            required
            className="w-5 h-5 rounded border-2 border-white/30 bg-white/20 checked:bg-pink-600 checked:border-pink-600 focus:ring-2 focus:ring-pink-500"
          />
          <span className="text-sm">I confirm I am 18 or older</span>
        </label>
        
        <button 
          onClick={handleStartChat}
          disabled={!gender || !ageConfirmed}
          className="btn-primary w-full bg-pink-600 text-white font-bold py-4 px-6 rounded-lg hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 text-lg shadow-lg"
        >
          START VIDEO CHAT
        </button>
        
        <div className="footer-links text-white/80 text-sm mt-6 space-x-2">
          <Link href="/terms" className="hover:text-white underline">Terms of Use</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-white underline">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
