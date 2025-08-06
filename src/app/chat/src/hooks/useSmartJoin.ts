// src/hooks/useSmartJoin.ts

import { useEffect, useRef } from 'react';
import Ably from 'ably';
import { useUser } from '@/context/UserContext';
import { matchUsers, User, Gender } from '@/utils/matching';

interface JoinMessage {
  userId: string;
  preferences: User;
}

export const useSmartJoin = () => {
  const { userPreferences, checkBoostExpiry } = useUser();
  const ablyRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.Types.RealtimeChannelCallbacks | null>(null);
  const currentUserId = useRef('user_' + Math.random().toString(36).substr(2, 9));
  const connectedRef = useRef(false);

  useEffect(() => {
    checkBoostExpiry();

    ablyRef.current = new Ably.Realtime({
      key: process.env.NEXT_PUBLIC_ABLY_API_KEY!,
    });

    const ably = ablyRef.current;
    const channel = ably.channels.get('chat-room');
    channelRef.current = channel;
    
    // تم حذف المتغير validGenders لأنه غير مستخدم

    const myUser: User = {
      isVip: userPreferences.isVip,
      isBoosted: userPreferences.isBoosted,
      // تم التأكد من أن userPreferences.gender هو الآن مصفوفة ([Gender])
      gender: userPreferences.gender,
      countries: userPreferences.countries,
      currentCountry: userPreferences.countries?.[0] || 'Unknown',
    };

    const joinMessage: JoinMessage = {
      userId: currentUserId.current,
      preferences: myUser,
    };

    // انضم للقناة وشارك تفضيلاتك
    channel.publish('join', joinMessage);

    // الاستماع للرسائل من مستخدمين آخرين
    channel.subscribe('join', (message) => {
      const other: JoinMessage = message.data;
      if (other.userId === currentUserId.current || connectedRef.current) return;

      const isMatch = matchUsers(myUser, other.preferences);

      if (isMatch) {
        connectedRef.current = true;
        // قم باستدعاء دالة WebRTC لتبدأ الاتصال
        // sendOffer(other.userId, currentUserId.current, channel);
      } else {
        // autoNext();
      }
    });

    return () => {
      channel.unsubscribe('join');
      ably.close();
    };
  }, [userPreferences, checkBoostExpiry]);
};
