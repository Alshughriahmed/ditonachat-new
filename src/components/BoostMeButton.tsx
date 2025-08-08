'use client';
import { useState } from 'react';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';

export default function BoostMeButton() {
  const { isLoading, hasAccess } = useSubscriptionAccess();
  const [isBoosting, setIsBoosting] = useState(false);

  const handleBoost = async () => {
    if (!hasAccess) {
      alert('🚀 ميزة الـ Boost متاحة فقط للمشتركين. يرجى الاشتراك أولاً.');
      return;
    }

    try {
      setIsBoosting(true);
      // TODO: أضف هنا الكود الذي يرسل طلب Boost للسيرفر / WebRTC
      console.log('Boost started!');
      await new Promise((res) => setTimeout(res, 2000)); // محاكاة عملية البوست
      console.log('Boost completed!');
    } catch (error) {
      console.error('Boost failed:', error);
    } finally {
      setIsBoosting(false);
    }
  };

  if (isLoading) {
    return <button className="boost-btn disabled">جار التحميل...</button>;
  }

  return (
    <button
      onClick={handleBoost}
      disabled={isBoosting}
      className={`boost-btn ${isBoosting ? 'loading' : ''}`}
    >
      {isBoosting ? '🚀 جار التنفيذ...' : '🚀 Boost Me'}
    </button>
  );
}
