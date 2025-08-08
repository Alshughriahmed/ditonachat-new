/* src/app/api/subscription/route.ts */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is missing');
  return new Stripe(key, { apiVersion: '2023-10-16' });
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();

  const sig = req.headers.get('stripe-signature');
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !whSecret) {
    return NextResponse.json(
      { ok: false, error: 'Missing stripe-signature or STRIPE_WEBHOOK_SECRET' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // مهم: لا تستخدم req.json()؛ لازم raw body
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, whSecret);
  } catch (err: any) {
    console.error('[Stripe Webhook] signature verify failed:', err?.message);
    return NextResponse.json({ ok: false, error: err?.message ?? 'Bad signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        const customerId = session.customer as string | null;
        const subscriptionId = session.subscription as string | null;
        const email = session.customer_details?.email ?? null;

        // خزّن/حدّث المستخدم/الاشتراك حسب customerId
        if (customerId) {
          await prisma.user.upsert({
            where: { stripeCustomerId: customerId },
            create: {
              stripeCustomerId: customerId,
              email: email ?? undefined,
              status: 'ACTIVE',
            },
            update: {
              email: email ?? undefined,
              status: 'ACTIVE',
            },
          });
        }

        if (subscriptionId) {
          await prisma.subscription.upsert({
            where: { stripeSubId: subscriptionId },
            create: {
              stripeSubId: subscriptionId,
              status: 'ACTIVE',
              // اربطها بالمستخدم لو قدرنا
              user: customerId
                ? {
                    connect: { stripeCustomerId: customerId },
                  }
                : undefined,
            },
            update: {
              status: 'ACTIVE',
            },
          });
        }

        console.log('[Webhook] checkout.session.completed OK', {
          customerId,
          subscriptionId,
        });
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string | null;
        if (subscriptionId) {
          await prisma.subscription.updateMany({
            where: { stripeSubId: subscriptionId },
            data: { status: 'ACTIVE' },
          });
        }
        console.log('[Webhook] invoice.paid OK', { subscriptionId });
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.upsert({
          where: { stripeSubId: sub.id },
          create: {
            stripeSubId: sub.id,
            status: sub.status.toUpperCase(),
          },
          update: {
            status: sub.status.toUpperCase(),
          },
        });
        console.log('[Webhook] subscription.updated', { id: sub.id, status: sub.status });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubId: sub.id },
          data: { status: 'CANCELED' },
        });
        console.log('[Webhook] subscription.deleted', { id: sub.id });
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.warn('[Webhook] payment failed', { id: pi.id, lastPaymentError: pi.last_payment_error?.message });
        break;
      }

      default:
        // للأمان: سجّل أي أحداث غير مغطاة
        console.log('[Webhook] Unhandled event:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[Webhook] handler error:', err);
    return NextResponse.json({ ok: false, error: 'Handler error' }, { status: 500 });
  }
}
