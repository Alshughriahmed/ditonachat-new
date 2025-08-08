'use client';

import { useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMatchingQueue } from '@/hooks/useMatchingQueue';

type Choice = 'male' | 'female' | 'couple' | 'lgbt' | 'any';

export default function ChatPage() {
  const search = useSearchParams();
  const router = useRouter();

  const type = (search.get('type') || 'any') as Choice;
  const { status, roomId, enqueue, leave } = useMatchingQueue();

  // حمولة الانضمام للطابور
  const payload = useMemo(() => ({
    gender: 'any' as const,   // لاحقاً اربطه بملف المستخدم
    lookingFor: type,
    isVip: false,
    boosted: false,
    country: 'unknown',
    username: 'Guest',
    avatar: '',
  }), [type]);

  // انضم تلقائياً عند فتح الصفحة
  useEffect(() => {
    enqueue(payload);
    return () => { leave(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  // عند إيجاد مطابقة، انقل المستخدم إلى صفحة الغرفة
  useEffect(() => {
    if (roomId) {
      router.push(`/chat/${roomId}?type=${type}`);
    }
  }, [roomId, router, type]);

  return (
    <div style={{ padding: 12 }}>
      {/* واجهتك الحالية ستظهر كما هي، وهذا البانِل فقط للتشخيص مؤقتاً */}
      <div style={{
        position: 'fixed', bottom: 12, left: 12, background: '#fff',
        padding: 10, borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,.15)'
      }}>
        <div><b>Queue status:</b> {status}</div>
        <div><b>Looking for:</b> {type}</div>
        <button onClick={() => enqueue(payload)} style={{ marginTop: 6 }}>Re-Join</button>
        <button onClick={() => leave()} style={{ marginLeft: 8 }}>Leave</button>
      </div>
    </div>
  );
}

