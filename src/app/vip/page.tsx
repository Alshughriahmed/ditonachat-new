"use client";

import React from "react";

const plans = [
  {
    id: "price_weekly_XXXX",   // Replace with your actual Stripe Price ID
    name: 'Weekly',
    price: '$4.99',
    features: ['Priority matching', 'No ads', 'Basic stats'],
  },
  {
    id: "price_monthly_YYYY",
    name: 'Monthly',
    price: '$9.99',
    features: ['All weekly features', 'Advanced stats', 'Custom filters'],
  },
  {
    id: "price_yearly_ZZZZ",
    name: 'Yearly',
    price: '$99.99',
    features: ['All monthly features', 'VIP badge', 'Early access to new features'],
  },
];

export default function VIPPage() {
  const handleSubscribe = async (planId: string) => {
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: planId }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        alert(`Error: ${error}`);
        return;
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred. Please try again later.');
    }
  };

  return (
    <main className="p-8 bg-white">
      <h1 className="text-4xl font-bold mb-8 text-center">VIP Subscription</h1>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-4">{plan.name}</h2>
            <p className="text-xl mb-4">{plan.price}</p>
            <ul className="list-disc list-inside mb-6">
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(plan.id)}
              className="w-full py-2 bg-pink-500 text-white rounded hover:bg-pink-600 transition"
            >
              Subscribe
            </button>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className="border px-4 py-2">Feature</th>
              {plans.map((plan) => (
                <th key={plan.id} className="border px-4 py-2">{plan.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(new Set(plans.flatMap((p) => p.features))).map(
              (feature) => (
                <tr key={feature}>
                  <td className="border px-4 py-2">{feature}</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="border px-4 py-2 text-center">
                      {plan.features.includes(feature) ? '✔️' : '—'}
                    </td>
                  ))}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
