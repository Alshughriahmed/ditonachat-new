This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Payments

DitonaChat uses Stripe for subscription payments. The application supports both checkout sessions (VIP page) and direct Stripe Elements integration (Upgrade page).

### Environment Setup

Add the following environment variables to your `.env.local` file:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Price IDs Configuration

Update the Price IDs in the following files with your actual Stripe Price IDs:

- `src/app/vip/page.tsx` - Lines 7, 13, 19 (checkout sessions)
- `src/app/api/subscribe/route.ts` - Line 42 (direct subscription)

### Testing in Sandbox

Use Stripe test cards for testing:

- **Successful payment**: `4242424242424242`
- **Requires authentication**: `4000002500003155`
- **Declined payment**: `4000000000000002`

**Test Flow:**
1. Navigate to `/upgrade` for Stripe Elements integration
2. Enter test card: `4242424242424242`, any future expiry, any CVC
3. Click "اشترك الآن" (Subscribe Now)
4. Verify subscription creation in Stripe Dashboard

### API Endpoints

- `/api/checkout` - Creates Stripe checkout sessions (used by VIP page)
- `/api/subscribe` - Creates direct subscriptions with payment methods (used by Upgrade page)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
