// ~/ditonachat-new/src/app/chat/page.tsx

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Realtime } from 'ably';

export default function ChatPage() {
  const [status, setStatus] = useState('Initializing…');
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. إنشاء عميل Ably
    const ably = new Realtime({ key: process.env.NEXT_PUBLIC_ABLY_KEY! });
    const channel = ably.channels.get('chat-demo');

    // 2. محاولة الربط (attach) مع callback
    setStatus('Connecting to Ably…');
    channel.attach((err) => {
      if (err) {
        console.error('Ably attach error:', err);
        setStatus('Error connecting to Ably');
        return;
      }
      // عند النجاح
      setStatus('Connected to Ably');
      channel.subscribe('chat-message', (msg) => {
        setMessages((prev) => [...prev, msg.data as string]);
      });
    });

    // تنظيف عند الخروج
    return () => {
      channel.detach();
      ably.close();
    };
  }, []);

  // دالة إرسال الرسالة
  const sendMessage = async () => {
    if (!input.trim()) return;

    const ably = new Realtime({ key: process.env.NEXT_PUBLIC_ABLY_KEY! });
    const channel = ably.channels.get('chat-demo');
    try {
      await channel.publish('chat-message', input);
      setInput('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Publish error:', err);
    } finally {
      ably.close();
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl mb-4">{status}</h1>

      <div className="border p-2 h-64 overflow-auto mb-4">
        {messages.map((msg, i) => (
          <div key={i} className="mb-1">
            {msg}
          </div>
        ))}
      </div>

      <div className="flex">
        <input
          ref={inputRef}
          className="flex-1 border p-2 rounded"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="ml-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}
