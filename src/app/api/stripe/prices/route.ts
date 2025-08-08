import { NextResponse } from 'next/server';
import stripe from '@/lib/stripe';

export async function GET() {
  const ids = [
    process.env.STRIPE_PRO_WEEKLY_ID!,
    process.env.STRIPE_VIP_MONTHLY_ID!,
    process.env.STRIPE_ELITE_YEARLY_ID!,
    process.env.STRIPE_BOOST_ME_DAILY_ID!,
  ].filter(Boolean);

  const prices = await Promise.all(ids.map(id => stripe.prices.retrieve(id)));
  // نرجّع map بالprice.id → amount/interval
  const result: Record<string, { amount: number; currency: string; interval?: string }> = {};
  for (const p of prices) {
    result[p.id] = {
      amount: (p.unit_amount ?? 0) / 100,
      currency: p.currency.toUpperCase(),
      interval: p.recurring?.interval,
    };
  }
  return NextResponse.json(result);
}
