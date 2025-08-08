'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMatchingQueue } from '@/hooks/useMatchingQueue';

type Choice = 'male' | 'female' | 'couple' | 'lgbt' | 'any';

export default function MatchTestPage() {
  const router = useRouter();
  const [type, setType] = useState<Choice>('any');
  const { status, roomId, enqueue, leave, userId } = useMatchingQueue();

  const payload = useMemo(() => ({
    gender: 'any' as const,
    lookingFor: type,
    isVip: false,
    boosted: false,
    country: 'unknown',
    username: 'Guest',
    avatar: '',
  }), [type]);

  const join = () => enqueue(payload);

  useEffect(() => {
    if (roomId) {
      router.push(`/chat/${roomId}?type=${type}`);
    }
  }, [roomId, router, type]);

  return (
    <div style={{ background: 'red', minHeight: '100vh', padding: 20 }}>
      <h1>Match Test</h1>
      <p><b>UserID:</b> {userId}</p>
      <p><b>Status:</b> {status}</p>
      {roomId && <p><b>Room:</b> {roomId}</p>}

      <select value={type} onChange={e => setType(e.target.value as Choice)}>
        <option value="any">Any</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="couple">Couple</option>
        <option value="lgbt">LGBT</option>
      </select>
      <button onClick={join}>Join Queue</button>
      <button onClick={leave}>Leave</button>

      <p>افتح هذه الصفحة على جهازين (كمبيوتر وموبايل) وجرب الانضمام للطابور.</p>
    </div>
  );
}
