'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as Ably from 'ably';

const ABLY_KEY = process.env.NEXT_PUBLIC_ABLY_KEY!;

export default function ChatPage() {
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('Initializing…');
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    let ably = new Ably.Realtime.Promise({ key: ABLY_KEY });
    let channel = ably.channels.get('chat-demo');

    setStatus('Connecting to Ably…');
    channel.attach().then(() => {
      setStatus('Connected to Ably, ready to chat.');
      // استقبال الرسائل
      channel.subscribe('chat-message', msg => {
        setMessages(msgs => [...msgs, msg.data as string]);
      });
    }).catch(err => {
      console.error(err);
      setStatus('Error connecting to Ably');
    });

    return () => {
      channel.unsubscribe();
      ably.close();
    };
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    let ably = new Ably.Realtime.Promise({ key: ABLY_KEY });
    let channel = ably.channels.get('chat-demo');
    await channel.publish('chat-message', input);
    setInput('');
  };

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">{status}</h1>
      <div className="border p-2 h-64 overflow-auto mb-4">
        {messages.map((m,i) => (
          <div key={i} className="mb-1">{m}</div>
        ))}
      </div>
      <div className="flex">
        <input
          className="border flex-1 p-2"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your message…"
        />
        <button
          className="ml-2 bg-blue-500 text-white px-4"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
}
