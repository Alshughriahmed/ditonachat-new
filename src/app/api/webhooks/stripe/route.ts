// src/app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: Request) {
  const sig = (await headers()).get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await req.text();

  if (!sig || !webhookSecret) {
    console.error('Missing stripe-signature or STRIPE_WEBHOOK_SECRET');
    return new Response('Bad Request', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('✅ checkout.session.completed', session);

        if (session.customer && session.metadata?.userId) {
          await prisma.user.update({
            where: { id: session.metadata.userId },
            data: { stripeCustomerId: session.customer.toString() },
          });
          console.log(`🔗 Stripe customer linked to user ${session.metadata.userId}`);
        } else {
          console.warn('⚠️ Missing customer or userId in metadata');
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;

        // نحاول إيجاد المستخدم عبر stripeCustomerId
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: sub.customer.toString() },
        });

        if (!user) {
          console.warn('⚠️ No user found for this Stripe customer:', sub.customer);
          break;
        }

        const existing = await prisma.subscription.findFirst({
          where: { stripeSubId: sub.id },
        });

        if (existing) {
          // تحديث الاشتراك
          await prisma.subscription.update({
            where: { id: existing.id },
            data: {
              status: sub.status,
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              updatedAt: new Date(),
            },
          });
          console.log(`🔄 Subscription updated for user ${user.id}`);
        } else {
          // إنشاء اشتراك جديد
          await prisma.subscription.create({
            data: {
              userId: user.id,
              plan: sub.items.data[0]?.price.id || 'unknown',
              status: sub.status,
              stripeSubId: sub.id,
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            },
          });
          console.log(`🆕 Subscription created for user ${user.id}`);
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('❌ Error processing webhook event:', error);
    return new Response('Internal Server Error', { status: 500 });
  }

  return new Response('OK', { status: 200 });
}
