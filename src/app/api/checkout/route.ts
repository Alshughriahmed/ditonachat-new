// src/app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY missing');
  return new Stripe(key, { apiVersion: '2023-10-16' });
}

const PRICE_MAP: Record<string, string> = {
  daily:  'price_1RtCE8CvVF5x8SlyZpxmqKSQ', // 1.49€ يومي
  weekly: 'price_1RtCd4CvVF5x8SlyqkB2vGCB', // أسبوعي
  monthly:'price_1RtCdtCvVF5x8SlySvjxs1M3', // شهري
  yearly: 'price_1RtCf1CvVF5x8SlywUTpgAX1', // سنوي
};

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const { plan, email } = await req.json();

    if (!plan || !PRICE_MAP[plan]) {
      return NextResponse.json({ ok: false, error: 'invalid_plan' }, { status: 400 });
    }

    // نضمن وجود مستخدم بهذا الإيميل ونحافظ عليه
    let user = null as null | { id: string; email: string | null };
    if (email) {
      user = await prisma.user.upsert({
        where: { email },
        create: { email },
        update: {},
        select: { id: true, email: true },
      });
    }

    // أنشئ/اربط Customer في Stripe
    // ملاحظة: لو عندك user مسبق بخانة stripeCustomerId، الأفضل تجيبه وتضعه في "customer"
    const customer = email
      ? await stripe.customers.create({ email })
      : await stripe.customers.create();

    // جلسة checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: PRICE_MAP[plan], quantity: 1 }],
      customer: customer.id,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe/cancel`,
      // مفيد للربط عند الويبهوك إذا ما توفر email
      client_reference_id: user?.id ?? undefined,
      metadata: {
        userId: user?.id ?? '',
        plan,
      },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (e: any) {
    console.error('[checkout] error:', e?.message || e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
