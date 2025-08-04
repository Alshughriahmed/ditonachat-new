import Stripe from 'stripe';
type AllowedApiVersion = Stripe.StripeConfig['apiVersion'] | '2022-11-15';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15' as AllowedApiVersion,
});
