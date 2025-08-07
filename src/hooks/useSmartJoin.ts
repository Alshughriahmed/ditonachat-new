'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';

interface MatchResponse {
  matchFound: boolean;
  partnerId?: string;
  roomId?: string;
}

export const useSmartJoin = () => {
  const router = useRouter();
  const { user } = useUser();

  const [isJoining, setIsJoining] = useState(false);
  const [matchFound, setMatchFound] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);

  // 1️⃣ دالة إرسال المستخدم إلى طابور المطابقة
  const joinQueue = useCallback(async () => {
    if (!user) return;

    setIsJoining(true);

    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          gender: user.gender,
          lookingFor: user.lookingFor ?? 'ALL',
          country: user.country ?? '',
          subscriptionStatus: user.subscriptionStatus,
          boostActive: user.boostActive ?? false,
        }),
      });

      const data: MatchResponse = await res.json();

      if (data.matchFound && data.roomId) {
        setMatchFound(true);
        setRoomId(data.roomId);
        router.push(`/chat?room=${data.roomId}`);
      } else {
        console.log('No match found (timeout or queue ended)');
        setIsJoining(false);
      }
    } catch (error) {
      console.error('Join queue error:', error);
      setIsJoining(false);
    }
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    // إعادة تعيين عند تغيّر المستخدم
    setMatchFound(false);
    setRoomId(null);
  }, [user]);

  return {
    isJoining,
    matchFound,
    roomId,
    joinQueue,
  };
};
