// src/app/subscribe/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// خطط الاشتراك مع مُعرفات الأسعار الحقيقية من Stripe
const subscriptionPlans = [
  {
    name: 'Boost Me - 1 Day',
    price: '€1.49',
    priceId: process.env.NEXT_PUBLIC_STRIPE_BOOST_ME_DAILY_ID,
    description: 'وصول كامل لجميع الميزات لمدة يوم واحد.',
  },
  {
    name: 'Pro Weekly',
    price: '€5.99',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_WEEKLY_ID,
    description: 'وصول كامل لجميع الميزات لمدة أسبوع كامل.',
  },
  {
    name: 'VIP Monthly',
    price: '€16.99',
    priceId: process.env.NEXT_PUBLIC_STRIPE_VIP_MONTHLY_ID,
    description: 'أفضل قيمة للمستخدمين الجادين، وصول شهري غير محدود.',
  },
  {
    name: 'Elite Yearly',
    price: '€99.99',
    priceId: process.env.NEXT_PUBLIC_STRIPE_ELITE_YEARLY_ID,
    description: 'أفضل توفير! وصول كامل لسنة كاملة بسعر مخفض.',
  },
];

export default function SubscribePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // إعادة التوجيه لصفحة تسجيل الدخول إذا كان المستخدم غير مسجل الدخول
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const handleCheckout = async (priceId: string | undefined) => {
    if (!priceId) {
      setError('خطأ: لم يتم العثور على مُعرف السعر.');
      return;
    }

    setLoading(priceId);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // إعادة توجيه المستخدم إلى صفحة دفع Stripe
        window.location.href = data.url;
      } else {
        setError(data.error || 'فشل إنشاء جلسة الدفع.');
      }
    } catch (err) {
      console.error('Stripe checkout error:', err);
      setError('حدث خطأ أثناء الاتصال بالخادم.');
    } finally {
      setLoading(null);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-screen text-xl font-semibold">
        جارٍ التحقق من حالة المستخدم...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8 text-center">اختر خطة الاشتراك المناسبة لك</h1>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl w-full">
        {subscriptionPlans.map((plan) => (
          <div
            key={plan.priceId}
            className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center text-center"
          >
            <h2 className="text-2xl font-semibold mb-2">{plan.name}</h2>
            <p className="text-gray-600 mb-4">{plan.description}</p>
            <p className="text-xl font-bold mb-4">{plan.price}</p>
            <button
              onClick={() => handleCheckout(plan.priceId)}
              disabled={loading === plan.priceId}
              className={`w-full py-2 px-4 rounded text-white ${
                loading === plan.priceId ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {loading === plan.priceId ? 'جارٍ التحميل...' : 'اشترك الآن'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
