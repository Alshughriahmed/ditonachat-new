'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { useUser } from '@/context/UserContext';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string
);

const BoostMeModal: React.FC = () => {
  const router = useRouter();
  const { userPreferences, setUserPreferences } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // عرض المودال فقط للمستخدم المجاني داخل صفحة /chat
  useEffect(() => {
    const path = window.location.pathname;
    if (
      path === '/chat' &&
      !userPreferences.isVip &&
      !userPreferences.isBoosted
    ) {
      setShowModal(true);
    }
  }, [userPreferences]);

  // في حالة رجوع من الدفع الناجح
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const boostSuccess = params.get('boost') === 'success';
    if (boostSuccess) {
      const expiry = Date.now() + 60 * 60 * 1000; // 60 دقيقة
      setUserPreferences({ isBoosted: true, boostExpiry: expiry });
      setShowModal(false);
      router.replace('/chat'); // إزالة البراميتر من الرابط
    }
  }, [router, setUserPreferences]);

  const handleBoostPurchase = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: 'boost_me' }),
      });

      if (!res.ok) throw new Error('Failed to start payment');

      const { sessionId } = await res.json();
      const stripe = await stripePromise;
      await stripe?.redirectToCheckout({ sessionId });
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Payment error. Try again.');
      setLoading(false);
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-sm text-center">
        <h2 className="text-xl font-bold mb-4">Boost Me</h2>
        <p className="mb-4 text-gray-700">
          🚀 Get access to gender & country filters for 60 minutes.
        </p>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <button
          onClick={handleBoostPurchase}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          {loading ? 'Processing...' : 'Pay Now'}
        </button>
      </div>
    </div>
  );
};

export default BoostMeModal;
