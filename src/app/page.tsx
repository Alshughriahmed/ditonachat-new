// src/app/page.tsx
"use client";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <h1 className="text-3xl font-bold mb-6">Welcome to DitonaChat 🚀</h1>
      <a
        href="/chat"
        className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-md text-lg"
      >
        Start Chatting
      </a>
    </main>
  );
}
