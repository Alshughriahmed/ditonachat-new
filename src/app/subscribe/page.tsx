'use client';

import { useState } from 'react';

export default function SubscribePage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  const startCheckout = async (plan: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    try {
      setLoading(plan);
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, email: email || undefined }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'checkout_failed');
      window.location.href = data.url;
    } catch (e: any) {
      alert(e?.message || 'Error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Ditonachat — الاشتراكات</h1>
      <p>أدخل بريدك (اختياري لتسهيل الربط):</p>
      <input
        placeholder="email@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: '100%', padding: 10, marginBottom: 20 }}
      />

      <div style={{ display: 'grid', gap: 12 }}>
        <button disabled={loading === 'daily'} onClick={() => startCheckout('daily')}>
          {loading === 'daily' ? 'جارٍ التحويل...' : 'يومي — 1.49€'}
        </button>
        <button disabled={loading === 'weekly'} onClick={() => startCheckout('weekly')}>
          {loading === 'weekly' ? 'جارٍ التحويل...' : 'أسبوعي — 5.99€'}
        </button>
        <button disabled={loading === 'monthly'} onClick={() => startCheckout('monthly')}>
          {loading === 'monthly' ? 'جارٍ التحويل...' : 'شهري — 16.99€'}
        </button>
        <button disabled={loading === 'yearly'} onClick={() => startCheckout('yearly')}>
          {loading === 'yearly' ? 'جارٍ التحويل...' : 'سنوي — 99.99€'}
        </button>
      </div>
    </div>
  );
}

