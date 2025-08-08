import { NextRequest, NextResponse } from 'next/server';
import stripe from '@/lib/stripe';

const PLAN_TO_PRICE: Record<string, string | undefined> = {
  weekly: process.env.STRIPE_PRO_WEEKLY_ID,
  monthly: process.env.STRIPE_VIP_MONTHLY_ID,
  yearly: process.env.STRIPE_ELITE_YEARLY_ID,
  boost: process.env.STRIPE_BOOST_ME_DAILY_ID,
};

export async function POST(req: NextRequest) {
  try {
    const { plan, customerEmail } = await req.json();
    const priceId = PLAN_TO_PRICE[String(plan)];
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: plan === 'boost' ? 'payment' : 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/subscribe?success=1&plan=${encodeURIComponent(plan)}`,
      cancel_url: `${baseUrl}/subscribe?canceled=1&plan=${encodeURIComponent(plan)}`,
      customer_email: customerEmail || undefined,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ id: session.id, url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'stripe_error' }, { status: 500 });
  }
}
